import asyncio
import logging
from typing import Optional, Tuple
from sockets.server import sio
from rooms.manager import room_manager
from engine.turn_manager import turn_manager
from engine.auction import auction_manager
from engine.trade_manager import trade_manager
from schemas.game import GameState
from schemas.action import TurnState
from sockets.events import GAME_EVENTS
from persistence import repository

logger = logging.getLogger(__name__)

_PERSIST_RETRIES = 3
_PERSIST_DELAY = 0.5


async def _persist_with_retry(save_fn, description: str):
    """Try persistence with retries and exponential backoff."""
    for attempt in range(_PERSIST_RETRIES):
        try:
            save_fn()
            return
        except Exception as e:
            if attempt < _PERSIST_RETRIES - 1:
                await asyncio.sleep(_PERSIST_DELAY * (attempt + 1))
            else:
                logger.error(f"Failed to {description} after {_PERSIST_RETRIES} attempts: {e}")


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


async def persist_room(room_code: str):
    """Persist room state to DB with retry."""
    def _save():
        room = room_manager.get_room(room_code)
        if room:
            repository.save_room(room_code, room)
    await _persist_with_retry(_save, f"persist room {room_code}")


def _build_runtime_json(room_code: str) -> str:
    """Build runtime JSON for a room (auction + trade state)."""
    return repository._build_runtime_json(
        room_code,
        {room_code: auction_manager.get_auction(room_code)} if auction_manager.get_auction(room_code) else {},
        trade_manager.active_trades,
        trade_manager.player_trades,
    )


async def persist_game(room_code: str):
    """Persist game + turn + runtime state to DB with retry."""
    def _save():
        game = turn_manager.get_game(room_code)
        turn = turn_manager.get_turn_state(room_code)
        if game and turn:
            runtime_json = _build_runtime_json(room_code)
            repository.save_game(room_code, game, turn, runtime_json)
    await _persist_with_retry(_save, f"persist game {room_code}")


async def emit_game_state(room_code: str, game: GameState, turn: TurnState):
    """Emit a game state update to all players in a room."""
    await sio.emit(
        GAME_EVENTS["STATE_UPDATE"],
        {"game": game.model_dump(), "turn": turn.model_dump()},
        room=room_code,
    )


async def require_session(sid: str, handler_name: str = "unknown") -> Optional[dict]:
    """Get and validate the socket session for a given SID.

    Returns the session dict (with 'session_id' and 'player_name') if valid,
    or None if the session is missing/invalid. Handlers should return early
    with an error if this returns None.
    """
    try:
        session = await sio.get_session(sid)
        if session and "session_id" in session:
            return session
    except Exception:
        pass
    logger.warning(f"Unauthenticated socket access from {sid} in handler '{handler_name}'")
    return None
