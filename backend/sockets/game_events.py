from sockets.server import sio
from rooms.manager import room_manager
from engine.game_initializer import init_game_state
from engine.turn_manager import turn_manager
from services.rate_limiter import rate_limiter
from sockets.events import GAME_EVENTS, ROOM_EVENTS
from sockets.helpers import get_room_code_or_error, emit_game_state
from schemas.room import RoomStatus

@sio.on("game:start")
@sio.on("game_start")
async def game_start(sid, data):
    if not rate_limiter.allow(f"{sid}:game_start"):
        return {"status": "error", "message": "Too many requests"}
    room_code = room_manager.get_player_room_code(sid)
    if not room_code:
        return {"status": "error", "message": "Not in a room"}
        
    room = room_manager.get_room(room_code)
    if not room or room.host_id != sid:
        return {"status": "error", "message": "Only host can start game"}
        
    if room.status != "waiting":
        return {"status": "error", "message": "Game already started"}
        
    room.status = RoomStatus.PLAYING
    
    # Initialize Game State
    game_state = init_game_state(room)
    turn_manager.start_game(room_code, game_state)
    
    turn_state = turn_manager.get_turn_state(room_code)
    
    # Broadcast game start and initial state
    await sio.emit(
        GAME_EVENTS["START"],
        {"game": game_state.model_dump(), "turn": turn_state.model_dump()},
        room=room_code
    )
    return {"status": "success"}

@sio.on("game:dice_roll")
@sio.on("game_dice_roll")
async def game_dice_roll(sid, data):
    if not rate_limiter.allow(f"{sid}:game_dice_roll"):
        return {"status": "error", "message": "Too many requests"}
    room_code, err = get_room_code_or_error(sid)
    if err:
        return err

    result = turn_manager.process_roll(room_code, sid)
    if not result:
        return {"status": "error", "message": "Not your turn or cannot roll"}

    await sio.emit(GAME_EVENTS["DICE_RESULT"], result["dice"], room=room_code)
    await emit_game_state(room_code, result["game"], result["turn"])
    return {"status": "success"}

@sio.on("game:end_turn")
@sio.on("game_end_turn")
async def game_end_turn(sid, data):
    if not rate_limiter.allow(f"{sid}:game_end_turn"):
        return {"status": "error", "message": "Too many requests"}
    room_code, err = get_room_code_or_error(sid)
    if err:
        return err

    turn = turn_manager.get_turn_state(room_code)
    if not turn or turn.active_player_id != sid or not turn.can_end_turn:
        return {"status": "error", "message": "Cannot end turn right now"}

    new_turn = turn_manager.next_turn(room_code)
    game = turn_manager.get_game(room_code)
    if game and new_turn:
        await emit_game_state(room_code, game, new_turn)
    return {"status": "success"}
