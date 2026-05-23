import json
import logging
import time
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


def _persist_with_retry(save_fn, description: str):
    """Try persistence with retries and exponential backoff."""
    for attempt in range(_PERSIST_RETRIES):
        try:
            save_fn()
            return
        except Exception as e:
            if attempt < _PERSIST_RETRIES - 1:
                time.sleep(_PERSIST_DELAY * (attempt + 1))
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


def persist_room(room_code: str):
    """Persist room state to DB with retry."""
    def _save():
        room = room_manager.get_room(room_code)
        if room:
            repository.save_room(room_code, room)
    _persist_with_retry(_save, f"persist room {room_code}")


def _build_runtime_json(room_code: str) -> str:
    """Build runtime JSON for a room (auction + trade state)."""
    runtime = {}
    auction = auction_manager.get_auction(room_code)
    if auction:
        runtime["auction"] = auction.model_dump()
    trade_data = {}
    for tid, trade in trade_manager.active_trades.items():
        trade_data[tid] = {
            "trade_id": trade.trade_id,
            "from_player_id": trade.from_player_id,
            "to_player_id": trade.to_player_id,
            "offering_money": trade.offering_money,
            "requesting_money": trade.requesting_money,
            "offering_properties": trade.offering_properties,
            "requesting_properties": trade.requesting_properties,
            "offering_get_out_of_jail_cards": trade.offering_get_out_of_jail_cards,
            "requesting_get_out_of_jail_cards": trade.requesting_get_out_of_jail_cards,
            "status": trade.status,
        }
    if trade_data:
        runtime["trades"] = trade_data
    if trade_manager.player_trades:
        runtime["player_trades"] = trade_manager.player_trades
    return json.dumps(runtime) if runtime else None


def persist_game(room_code: str):
    """Persist game + turn + runtime state to DB with retry."""
    def _save():
        game = turn_manager.get_game(room_code)
        turn = turn_manager.get_turn_state(room_code)
        if game and turn:
            runtime_json = _build_runtime_json(room_code)
            repository.save_game(room_code, game, turn, runtime_json)
    _persist_with_retry(_save, f"persist game {room_code}")


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
