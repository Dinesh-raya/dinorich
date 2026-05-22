import logging
from typing import Optional, Tuple
from sockets.server import sio
from rooms.manager import room_manager
from engine.turn_manager import turn_manager
from schemas.game import GameState
from schemas.action import TurnState
from sockets.events import GAME_EVENTS
from persistence import repository

logger = logging.getLogger(__name__)


def get_room_code_or_error(sid: str) -> Tuple[Optional[str], Optional[dict]]:
    """Get room code for a socket ID, or return an error response."""
    room_code = room_manager.get_player_room_code(sid)
    if not room_code:
        return None, {"status": "error", "message": "Not in a room"}
    return room_code, None


def get_game_and_turn_or_error(room_code: str) -> Tuple[Optional[GameState], Optional[TurnState], Optional[dict]]:
    """Get game and turn state, or return an error response."""
    game = turn_manager.get_game(room_code)
    turn = turn_manager.get_turn_state(room_code)
    if not game or not turn:
        return None, None, {"status": "error", "message": "No active game"}
    return game, turn, None


def persist_room(room_code: str):
    """Persist room state to DB (non-blocking best-effort)."""
    try:
        room = room_manager.get_room(room_code)
        if room:
            repository.save_room(room_code, room)
    except Exception as e:
        logger.error(f"Failed to persist room {room_code}: {e}")


def persist_game(room_code: str):
    """Persist game + turn state to DB (non-blocking best-effort)."""
    try:
        game = turn_manager.get_game(room_code)
        turn = turn_manager.get_turn_state(room_code)
        if game and turn:
            repository.save_game(room_code, game, turn)
    except Exception as e:
        logger.error(f"Failed to persist game {room_code}: {e}")


async def emit_game_state(room_code: str, game: GameState, turn: TurnState):
    """Emit a game state update to all players in a room."""
    await sio.emit(
        GAME_EVENTS["STATE_UPDATE"],
        {"game": game.model_dump(), "turn": turn.model_dump()},
        room=room_code,
    )
