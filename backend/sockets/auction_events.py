from pydantic import ValidationError
from sockets.server import sio
from rooms.manager import room_manager
from engine.turn_manager import turn_manager
from engine.auction import auction_manager
from schemas.contracts import PropertyActionPayload, AuctionBidPayload
from schemas.action import TurnPhase
from services.rate_limiter import rate_limiter
from sockets.events import AUCTION_EVENTS
from sockets.helpers import get_room_code_or_error, emit_game_state, persist_game, require_session

@sio.on("auction:start")
async def auction_start(sid, data):
    session = await require_session(sid, "auction_start")
    if not session:
        return {"status": "error", "message": "Not authenticated"}
    session_id = session["session_id"]
    if not rate_limiter.allow(f"{session_id}:auction_start"):
        return {"status": "error", "message": "Too many requests"}
    room_code, err = get_room_code_or_error(sid)
    if err:
        return err

    async with room_manager.get_lock(room_code):
        game = turn_manager.get_game(room_code)
        turn = turn_manager.get_turn_state(room_code)
        if not game or not turn:
            return {"status": "error", "message": "No active game"}

        if turn.active_player_id != session_id or turn.phase != TurnPhase.BUY:
            return {"status": "error", "message": "Cannot start auction now"}

        if not game.room.settings.auction_enabled:
            return {"status": "error", "message": "Auctions are disabled in room settings"}

        try:
            payload = PropertyActionPayload.model_validate(data or {})
        except ValidationError as exc:
            return {"status": "error", "message": exc.errors()[0]["msg"]}
        property_id = payload.property_id

        participants = [p for p in game.turn_order if not game.room.players[p].is_bankrupt]

        auction = auction_manager.start_auction(room_code, property_id, participants)
        if not auction:
            return {"status": "error", "message": "Invalid property"}

        turn.phase = TurnPhase.AUCTION
        turn_manager.clear_buy_timer(room_code)

        await sio.emit(AUCTION_EVENTS["START"], {"auction": auction.model_dump()}, room=room_code)
        await emit_game_state(room_code, game, turn)
        return {"status": "success"}

@sio.on("auction:bid")
async def auction_bid(sid, data):
    session = await require_session(sid, "auction_bid")
    if not session:
        return {"status": "error", "message": "Not authenticated"}
    session_id = session["session_id"]
    if not rate_limiter.allow(f"{session_id}:auction_bid"):
        return {"status": "error", "message": "Too many requests"}
    room_code, err = get_room_code_or_error(sid)
    if err:
        return err

    async with room_manager.get_lock(room_code):
        try:
            payload = AuctionBidPayload.model_validate(data or {})
        except ValidationError as exc:
            return {"status": "error", "message": exc.errors()[0]["msg"]}
        bid_amount = payload.amount
        game = turn_manager.get_game(room_code)
        turn = turn_manager.get_turn_state(room_code)
        if not game or not turn:
            return {"status": "error", "message": "No active game"}

        if turn.phase != TurnPhase.AUCTION:
            return {"status": "error", "message": "Not in auction phase"}
        player = game.room.players.get(session_id)
        if not player:
            return {"status": "error", "message": "Player not found"}

        success, msg = auction_manager.place_bid(room_code, session_id, bid_amount, player.money, player.is_bankrupt)
        if not success:
            return {"status": "error", "message": msg}

        auction = auction_manager.get_auction(room_code)
        await sio.emit(AUCTION_EVENTS["STATE_UPDATE"], {"auction": auction.model_dump()}, room=room_code)
        return {"status": "success"}

@sio.on("auction:end")
async def auction_end(sid, data):
    session = await require_session(sid, "auction_end")
    if not session:
        return {"status": "error", "message": "Not authenticated"}
    session_id = session["session_id"]
    if not rate_limiter.allow(f"{session_id}:auction_end"):
        return {"status": "error", "message": "Too many requests"}
    room_code, err = get_room_code_or_error(sid)
    if err:
        return err

    async with room_manager.get_lock(room_code):
        game = turn_manager.get_game(room_code)
        turn = turn_manager.get_turn_state(room_code)
        if not game or not turn:
            return {"status": "error", "message": "No active game"}

        room = room_manager.get_room(room_code)
        if not room:
            return {"status": "error", "message": "Room not found"}
        if session_id not in {room.host_id, turn.active_player_id}:
            return {"status": "error", "message": "Not authorized to end auction"}

        success, msg = auction_manager.end_auction(room_code, game)
        if not success:
            return {"status": "error", "message": msg}

        turn.phase = TurnPhase.ACTION
        turn.can_end_turn = True
        turn.time_remaining = game.room.settings.turn_timer_seconds
        await sio.emit(AUCTION_EVENTS["END"], {"message": msg}, room=room_code)
        await emit_game_state(room_code, game, turn)
        await persist_game(room_code)
        return {"status": "success"}
