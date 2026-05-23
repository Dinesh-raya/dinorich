import logging

from pydantic import ValidationError

from sockets.server import sio
from engine.trade_manager import trade_manager
from engine.turn_manager import turn_manager
from services.rate_limiter import rate_limiter
from sockets.helpers import get_room_code_or_error, emit_game_state, persist_game
from schemas.contracts import TradeCreatePayload, TradeActionPayload

logger = logging.getLogger(__name__)

@sio.on("trade:create")
async def trade_create(sid, data):
    """Create a new trade offer."""
    if not rate_limiter.allow(f"{sid}:trade_create"):
        return {"status": "error", "message": "Too many requests"}

    room_code, err = get_room_code_or_error(sid)
    if err:
        return err

    game = turn_manager.get_game(room_code)
    if not game:
        return {"status": "error", "message": "Game not found"}

    try:
        payload = TradeCreatePayload(**data)
    except ValidationError as e:
        return {"status": "error", "message": f"Invalid payload: {e}"}
    except Exception as e:
        logger.exception("Error in trade_create")
        return {"status": "error", "message": "Internal error"}

    to_player_id = payload.to_player_id
    offering_money = payload.offering_money
    requesting_money = payload.requesting_money
    offering_properties = payload.offering_properties
    requesting_properties = payload.requesting_properties
    offering_get_out_of_jail_cards = payload.offering_get_out_of_jail_cards
    requesting_get_out_of_jail_cards = payload.requesting_get_out_of_jail_cards

    trade = trade_manager.create_trade(
        game=game,
        from_player_id=sid,
        to_player_id=to_player_id,
        offering_money=offering_money,
        requesting_money=requesting_money,
        offering_properties=offering_properties,
        requesting_properties=requesting_properties,
        offering_get_out_of_jail_cards=offering_get_out_of_jail_cards,
        requesting_get_out_of_jail_cards=requesting_get_out_of_jail_cards
    )

    if not trade:
        return {"status": "error", "message": "Invalid trade"}

    # Notify both players
    trade_data = {
        "trade_id": trade.trade_id,
        "from_player_id": trade.from_player_id,
        "to_player_id": trade.to_player_id,
        "offering_money": trade.offering_money,
        "requesting_money": trade.requesting_money,
        "offering_properties": trade.offering_properties,
        "requesting_properties": trade.requesting_properties,
        "offering_get_out_of_jail_cards": trade.offering_get_out_of_jail_cards,
        "requesting_get_out_of_jail_cards": trade.requesting_get_out_of_jail_cards,
        "status": trade.status
    }

    await sio.emit("trade:offer", trade_data, room=sid)
    await sio.emit("trade:offer", trade_data, room=to_player_id)

    return {"status": "success", "trade_id": trade.trade_id}

@sio.on("trade:accept")
async def trade_accept(sid, data):
    """Accept a trade offer."""
    if not rate_limiter.allow(f"{sid}:trade_accept"):
        return {"status": "error", "message": "Too many requests"}

    room_code, err = get_room_code_or_error(sid)
    if err:
        return err

    game = turn_manager.get_game(room_code)
    if not game:
        return {"status": "error", "message": "Game not found"}

    try:
        payload = TradeActionPayload(**data)
    except ValidationError as e:
        return {"status": "error", "message": f"Invalid payload: {e}"}
    except Exception as e:
        logger.exception("Error in trade_accept")
        return {"status": "error", "message": "Internal error"}

    trade_id = payload.trade_id
    # Save trade data BEFORE accepting (accept_trade deletes it via _cleanup_trade)
    trade = trade_manager.get_trade(trade_id)
    if not trade:
        return {"status": "error", "message": "Trade not found"}

    from_player_id = trade.from_player_id
    to_player_id = trade.to_player_id

    if not trade_manager.accept_trade(game, trade_id, sid):
        return {"status": "error", "message": "Cannot accept trade"}

    # Check if active player's debt was resolved by this trade
    turn_state = turn_manager.get_turn_state(room_code)
    active_id = turn_state.active_player_id if turn_state else ''
    turn_manager.check_debt_resolved(room_code, active_id)
    # Also check for both trade participants
    turn_manager.check_debt_resolved(room_code, from_player_id)
    turn_manager.check_debt_resolved(room_code, to_player_id)

    # Emit updated game state
    turn_state = turn_manager.get_turn_state(room_code)
    if turn_state:
        await emit_game_state(room_code, game, turn_state)

    # Notify both players (use saved IDs since trade was deleted)
    await sio.emit("trade:completed", {"trade_id": trade_id}, room=from_player_id)
    await sio.emit("trade:completed", {"trade_id": trade_id}, room=to_player_id)

    persist_game(room_code)
    return {"status": "success"}

@sio.on("trade:reject")
async def trade_reject(sid, data):
    """Reject a trade offer."""
    if not rate_limiter.allow(f"{sid}:trade_reject"):
        return {"status": "error", "message": "Too many requests"}

    room_code, err = get_room_code_or_error(sid)
    if err:
        return err

    try:
        payload = TradeActionPayload(**data)
    except ValidationError as e:
        return {"status": "error", "message": f"Invalid payload: {e}"}
    except Exception as e:
        logger.exception("Error in trade_reject")
        return {"status": "error", "message": "Internal error"}

    trade_id = payload.trade_id
    # Save sender ID BEFORE rejecting (reject_trade deletes via _cleanup_trade)
    trade = trade_manager.get_trade(trade_id)
    if not trade:
        return {"status": "error", "message": "Trade not found"}
    from_player_id = trade.from_player_id

    if not trade_manager.reject_trade(trade_id, sid):
        return {"status": "error", "message": "Cannot reject trade"}

    await sio.emit("trade:rejected", {"trade_id": trade_id}, room=from_player_id)

    return {"status": "success"}

@sio.on("trade:cancel")
async def trade_cancel(sid, data):
    """Cancel a trade offer."""
    if not rate_limiter.allow(f"{sid}:trade_cancel"):
        return {"status": "error", "message": "Too many requests"}

    room_code, err = get_room_code_or_error(sid)
    if err:
        return err

    try:
        payload = TradeActionPayload(**data)
    except ValidationError as e:
        return {"status": "error", "message": f"Invalid payload: {e}"}
    except Exception as e:
        logger.exception("Error in trade_cancel")
        return {"status": "error", "message": "Internal error"}

    trade_id = payload.trade_id
    # Save recipient ID BEFORE canceling (cancel_trade deletes via _cleanup_trade)
    trade = trade_manager.get_trade(trade_id)
    if not trade:
        return {"status": "error", "message": "Trade not found"}
    to_player_id = trade.to_player_id

    if not trade_manager.cancel_trade(trade_id, sid):
        return {"status": "error", "message": "Cannot cancel trade"}

    await sio.emit("trade:cancelled", {"trade_id": trade_id}, room=to_player_id)

    return {"status": "success"}
