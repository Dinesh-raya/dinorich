from pydantic import ValidationError
from sockets.server import sio
from rooms.manager import room_manager
from engine.turn_manager import turn_manager
from engine.auction import auction_manager
from schemas.contracts import PropertyActionPayload, AuctionBidPayload
from schemas.action import TurnPhase
from services.rate_limiter import rate_limiter
from sockets.events import AUCTION_EVENTS
from sockets.helpers import get_room_code_or_error, emit_game_state

@sio.on("auction:start")
@sio.on("auction_start")
async def auction_start(sid, data):
    if not rate_limiter.allow(f"{sid}:auction_start"):
        return {"status": "error", "message": "Too many requests"}
    room_code, err = get_room_code_or_error(sid)
    if err:
        return err

    game = turn_manager.get_game(room_code)
    turn = turn_manager.get_turn_state(room_code)
    if not game or not turn:
        return {"status": "error", "message": "No active game"}

    if turn.active_player_id != sid or turn.phase != TurnPhase.BUY:
        return {"status": "error", "message": "Cannot start auction now"}

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

    await sio.emit(AUCTION_EVENTS["START"], {"auction": auction.model_dump()}, room=room_code)
    await emit_game_state(room_code, game, turn)
    return {"status": "success"}

@sio.on("auction:bid")
@sio.on("auction_bid")
async def auction_bid(sid, data):
    if not rate_limiter.allow(f"{sid}:auction_bid"):
        return {"status": "error", "message": "Too many requests"}
    room_code, err = get_room_code_or_error(sid)
    if err:
        return err

    try:
        payload = AuctionBidPayload.model_validate(data or {})
    except ValidationError as exc:
        return {"status": "error", "message": exc.errors()[0]["msg"]}
    bid_amount = payload.amount
    game = turn_manager.get_game(room_code)
    if not game:
        return {"status": "error", "message": "No active game"}
    player = game.room.players.get(sid)
    if not player:
        return {"status": "error", "message": "Player not found"}

    success, msg = auction_manager.place_bid(room_code, sid, bid_amount, player.money)
    if not success:
        return {"status": "error", "message": msg}

    auction = auction_manager.get_auction(room_code)
    await sio.emit(AUCTION_EVENTS["STATE_UPDATE"], {"auction": auction.model_dump()}, room=room_code)
    return {"status": "success"}

@sio.on("auction:end")
@sio.on("auction_end")
async def auction_end(sid, data):
    if not rate_limiter.allow(f"{sid}:auction_end"):
        return {"status": "error", "message": "Too many requests"}
    room_code, err = get_room_code_or_error(sid)
    if err:
        return err

    game = turn_manager.get_game(room_code)
    turn = turn_manager.get_turn_state(room_code)
    if not game or not turn:
        return {"status": "error", "message": "No active game"}

    room = room_manager.get_room(room_code)
    if not room:
        return {"status": "error", "message": "Room not found"}
    if sid not in {room.host_id, turn.active_player_id}:
        return {"status": "error", "message": "Not authorized to end auction"}

    success, msg = auction_manager.end_auction(room_code, game)
    if not success:
        return {"status": "error", "message": msg}

    turn.phase = TurnPhase.ACTION
    await sio.emit(AUCTION_EVENTS["END"], {"message": msg}, room=room_code)
    await emit_game_state(room_code, game, turn)
    return {"status": "success"}
