from sockets.server import sio
from rooms.manager import room_manager
from engine.trade_manager import trade_manager
from services.rate_limiter import rate_limiter
from sockets.helpers import get_room_code_or_error, emit_game_state

@sio.on("trade:create")
async def trade_create(sid, data):
    """Create a new trade offer."""
    if not rate_limiter.allow(f"{sid}:trade_create"):
        return {"status": "error", "message": "Too many requests"}

    room_code, err = get_room_code_or_error(sid)
    if err:
        return err

    game = room_manager.get_game(room_code)
    if not game:
        return {"status": "error", "message": "Game not found"}

    to_player_id = data.get("to_player_id")
    offering_money = data.get("offering_money", 0)
    requesting_money = data.get("requesting_money", 0)
    offering_properties = data.get("offering_properties", [])
    requesting_properties = data.get("requesting_properties", [])
    offering_get_out_of_jail_cards = data.get("offering_get_out_of_jail_cards", 0)
    requesting_get_out_of_jail_cards = data.get("requesting_get_out_of_jail_cards", 0)

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

    game = room_manager.get_game(room_code)
    if not game:
        return {"status": "error", "message": "Game not found"}

    trade_id = data.get("trade_id")
    if not trade_manager.accept_trade(game, trade_id, sid):
        return {"status": "error", "message": "Cannot accept trade"}

    # Emit updated game state
    await emit_game_state(room_code, game)

    # Notify both players
    trade = trade_manager.get_trade(trade_id)
    if trade:
        await sio.emit("trade:completed", {"trade_id": trade_id}, room=trade.from_player_id)
        await sio.emit("trade:completed", {"trade_id": trade_id}, room=trade.to_player_id)

    return {"status": "success"}

@sio.on("trade:reject")
async def trade_reject(sid, data):
    """Reject a trade offer."""
    if not rate_limiter.allow(f"{sid}:trade_reject"):
        return {"status": "error", "message": "Too many requests"}

    room_code, err = get_room_code_or_error(sid)
    if err:
        return err

    trade_id = data.get("trade_id")
    if not trade_manager.reject_trade(trade_id, sid):
        return {"status": "error", "message": "Cannot reject trade"}

    trade = trade_manager.get_trade(trade_id)
    if trade:
        await sio.emit("trade:rejected", {"trade_id": trade_id}, room=trade.from_player_id)

    return {"status": "success"}

@sio.on("trade:cancel")
async def trade_cancel(sid, data):
    """Cancel a trade offer."""
    if not rate_limiter.allow(f"{sid}:trade_cancel"):
        return {"status": "error", "message": "Too many requests"}

    room_code, err = get_room_code_or_error(sid)
    if err:
        return err

    trade_id = data.get("trade_id")
    if not trade_manager.cancel_trade(trade_id, sid):
        return {"status": "error", "message": "Cannot cancel trade"}

    trade = trade_manager.get_trade(trade_id)
    if trade:
        await sio.emit("trade:cancelled", {"trade_id": trade_id}, room=trade.to_player_id)

    return {"status": "success"}
