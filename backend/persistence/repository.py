import json
import logging
from typing import Dict, List, Optional, Tuple
from persistence.db import get_connection, with_db_lock
from schemas.room import RoomState
from schemas.game import GameState
from schemas.action import TurnState

logger = logging.getLogger(__name__)

def _build_runtime_json(room_code: str, auctions: Dict[str, 'AuctionState'], trades: Dict[str, 'TradeOffer'], player_trades: Dict[str, List[str]]) -> str:
    """Serialize runtime state (auctions + trades) to JSON string."""
    from schemas.action import AuctionState
    from engine.trade_manager import TradeOffer

    runtime = {}
    if room_code in auctions:
        runtime["auction"] = auctions[room_code].model_dump()
    trade_data = {}
    for tid, trade in trades.items():
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
    if player_trades:
        runtime["player_trades"] = player_trades
    return json.dumps(runtime)


def save_snapshot(rooms: Dict[str, RoomState], games: Dict[str, GameState], turns: Dict[str, TurnState],
                  auctions: Dict[str, 'AuctionState'] = None, trade_manager_obj=None):
    def _do_save():
        conn = get_connection()
        try:
            cursor = conn.cursor()
            for room_code, room in rooms.items():
                cursor.execute(
                    'INSERT OR REPLACE INTO rooms (room_code, state_json) VALUES (?, ?)',
                    (room_code, room.model_dump_json())
                )
            for room_code, game in games.items():
                if room_code in turns:
                    turn = turns[room_code]
                    runtime_json = _build_runtime_json(
                        room_code,
                        auctions or {},
                        trade_manager_obj.active_trades if trade_manager_obj else {},
                        trade_manager_obj.player_trades if trade_manager_obj else {},
                    )
                    cursor.execute(
                        'INSERT OR REPLACE INTO games (room_code, state_json, turn_json, runtime_json) VALUES (?, ?, ?, ?)',
                        (room_code, game.model_dump_json(), turn.model_dump_json(), runtime_json)
                    )
            conn.commit()
        except Exception as e:
            logger.error(f"Failed to save snapshot: {e}", exc_info=True)
        finally:
            conn.close()
    with_db_lock(_do_save)

def save_room(room_code: str, room: RoomState):
    def _do():
        conn = get_connection()
        try:
            conn.execute(
                'INSERT OR REPLACE INTO rooms (room_code, state_json) VALUES (?, ?)',
                (room_code, room.model_dump_json())
            )
            conn.commit()
        except Exception as e:
            logger.error(f"Failed to save room {room_code}: {e}", exc_info=True)
        finally:
            conn.close()
    with_db_lock(_do)

def save_game(room_code: str, game: GameState, turn: TurnState,
              runtime_json: str = None):
    def _do():
        conn = get_connection()
        try:
            if runtime_json is not None:
                conn.execute(
                    'INSERT OR REPLACE INTO games (room_code, state_json, turn_json, runtime_json) VALUES (?, ?, ?, ?)',
                    (room_code, game.model_dump_json(), turn.model_dump_json(), runtime_json)
                )
            else:
                conn.execute(
                    'INSERT OR REPLACE INTO games (room_code, state_json, turn_json) VALUES (?, ?, ?)',
                    (room_code, game.model_dump_json(), turn.model_dump_json())
                )
            conn.commit()
        except Exception as e:
            logger.error(f"Failed to save game {room_code}: {e}", exc_info=True)
        finally:
            conn.close()
    with_db_lock(_do)

def delete_room(room_code: str):
    def _do():
        conn = get_connection()
        try:
            conn.execute('DELETE FROM rooms WHERE room_code = ?', (room_code,))
            conn.commit()
        except Exception as e:
            logger.error(f"Failed to delete room {room_code}: {e}", exc_info=True)
        finally:
            conn.close()
    with_db_lock(_do)

def delete_game(room_code: str):
    def _do():
        conn = get_connection()
        try:
            conn.execute('DELETE FROM games WHERE room_code = ?', (room_code,))
            conn.commit()
        except Exception as e:
            logger.error(f"Failed to delete game {room_code}: {e}", exc_info=True)
        finally:
            conn.close()
    with_db_lock(_do)

def purge_invalid_snapshots():
    """Purge any rooms or games that fail validation to prevent startup errors or desync."""
    conn = get_connection()
    try:
        cursor = conn.cursor()

        rooms_to_delete = []
        try:
            cursor.execute('SELECT room_code, state_json FROM rooms')
            for row in cursor.fetchall():
                room_code = row['room_code']
                try:
                    RoomState.model_validate_json(row['state_json'])
                except Exception as e:
                    logger.warning(f"Room {room_code} failed validation during purge: {e}. Marking for deletion.")
                    rooms_to_delete.append(room_code)
        except Exception as e:
            logger.error(f"Error checking rooms during purge: {e}", exc_info=True)

        games_to_delete = []
        try:
            cursor.execute('SELECT room_code, state_json, turn_json FROM games')
            for row in cursor.fetchall():
                room_code = row['room_code']
                try:
                    GameState.model_validate_json(row['state_json'])
                    TurnState.model_validate_json(row['turn_json'])
                except Exception as e:
                    logger.warning(f"Game {room_code} failed validation during purge: {e}. Marking for deletion.")
                    games_to_delete.append(room_code)
        except Exception as e:
            logger.error(f"Error checking games during purge: {e}", exc_info=True)

        all_to_delete = list(set(rooms_to_delete + games_to_delete))

        if all_to_delete:
            def _do_delete():
                conn_write = get_connection()
                try:
                    cursor_write = conn_write.cursor()
                    for room_code in all_to_delete:
                        logger.info(f"Purging stale/invalid data for room {room_code}")
                        cursor_write.execute('DELETE FROM games WHERE room_code = ?', (room_code,))
                        cursor_write.execute('DELETE FROM rooms WHERE room_code = ?', (room_code,))
                        cursor_write.execute('DELETE FROM sessions WHERE room_code = ?', (room_code,))
                    conn_write.commit()
                except Exception as e:
                    logger.error(f"Failed to delete purged rows: {e}", exc_info=True)
                finally:
                    conn_write.close()
            with_db_lock(_do_delete)
    finally:
        conn.close()

def load_snapshot() -> Tuple[Dict[str, RoomState], Dict[str, GameState], Dict[str, TurnState], Dict[str, dict], Dict[str, dict]]:
    conn = get_connection()
    try:
        cursor = conn.cursor()

        rooms = {}
        games = {}
        turns = {}
        runtime_auctions = {}
        runtime_trades = {}

        cursor.execute('SELECT room_code, state_json FROM rooms')
        for row in cursor.fetchall():
            try:
                rooms[row['room_code']] = RoomState.model_validate_json(row['state_json'])
            except Exception as e:
                logger.error(f"Error loading room {row['room_code']}: {e}", exc_info=True)

        cursor.execute('SELECT room_code, state_json, turn_json, runtime_json FROM games')
        for row in cursor.fetchall():
            try:
                games[row['room_code']] = GameState.model_validate_json(row['state_json'])
                turns[row['room_code']] = TurnState.model_validate_json(row['turn_json'])
                runtime_raw = row['runtime_json'] if row['runtime_json'] else '{}'
                runtime = json.loads(runtime_raw)
                if runtime.get("auction"):
                    runtime_auctions[row['room_code']] = runtime["auction"]
                if runtime.get("trades"):
                    runtime_trades[row['room_code']] = {
                        "trades": runtime["trades"],
                        "player_trades": runtime.get("player_trades", {}),
                    }
            except Exception as e:
                logger.error(f"Error loading game {row['room_code']}: {e}", exc_info=True)

        return rooms, games, turns, runtime_auctions, runtime_trades
    finally:
        conn.close()


def get_game_save_info(room_code: str) -> Optional[dict]:
    """Check if a game save exists for a room. Returns metadata dict or None."""
    conn = get_connection()
    try:
        cursor = conn.cursor()
        cursor.execute('SELECT room_code FROM games WHERE room_code = ?', (room_code,))
        row = cursor.fetchone()
        if row:
            return {"room_code": row['room_code']}
        return None
    except Exception as e:
        logger.error(f"Failed to check game save for {room_code}: {e}", exc_info=True)
        return None
    finally:
        conn.close()


def load_game_save(room_code: str) -> Tuple[Optional[GameState], Optional[TurnState]]:
    """Load a saved game for a specific room. Returns (game, turn) or (None, None)."""
    conn = get_connection()
    try:
        cursor = conn.cursor()
        cursor.execute('SELECT state_json, turn_json FROM games WHERE room_code = ?', (room_code,))
        row = cursor.fetchone()
        if row:
            game = GameState.model_validate_json(row['state_json'])
            turn = TurnState.model_validate_json(row['turn_json'])
            return game, turn
        return None, None
    except Exception as e:
        logger.error(f"Failed to load game save for {room_code}: {e}", exc_info=True)
        return None, None
    finally:
        conn.close()


def load_game_save_full(room_code: str) -> Tuple[Optional[GameState], Optional[TurnState], Optional[dict]]:
    """Load a saved game with runtime data for a specific room.
    Returns (game, turn, runtime_dict) or (None, None, None).
    runtime_dict may contain 'auction', 'trades', 'player_trades' keys.
    """
    conn = get_connection()
    try:
        cursor = conn.cursor()
        cursor.execute('SELECT state_json, turn_json, runtime_json FROM games WHERE room_code = ?', (room_code,))
        row = cursor.fetchone()
        if row:
            game = GameState.model_validate_json(row['state_json'])
            turn = TurnState.model_validate_json(row['turn_json'])
            runtime_raw = row['runtime_json'] if row['runtime_json'] else '{}'
            runtime = json.loads(runtime_raw)
            return game, turn, runtime
        return None, None, None
    except Exception as e:
        logger.error(f"Failed to load full game save for {room_code}: {e}", exc_info=True)
        return None, None, None
    finally:
        conn.close()


def save_session(session_id: str, player_name: str, reconnect_token: str,
                 reconnect_expires_at: int, created_at: int, room_code: str = None):
    def _do():
        conn = get_connection()
        try:
            conn.execute(
                'INSERT OR REPLACE INTO sessions (session_id, player_name, reconnect_token, reconnect_expires_at, created_at, room_code) VALUES (?, ?, ?, ?, ?, ?)',
                (session_id, player_name, reconnect_token, reconnect_expires_at, created_at, room_code)
            )
            conn.commit()
        except Exception as e:
            logger.error(f"Failed to save session {session_id}: {e}", exc_info=True)
        finally:
            conn.close()
    with_db_lock(_do)


def delete_session(session_id: str):
    def _do():
        conn = get_connection()
        try:
            conn.execute('DELETE FROM sessions WHERE session_id = ?', (session_id,))
            conn.commit()
        except Exception as e:
            logger.error(f"Failed to delete session {session_id}: {e}", exc_info=True)
        finally:
            conn.close()
    with_db_lock(_do)


def update_session_room(session_id: str, room_code: str):
    def _do():
        conn = get_connection()
        try:
            conn.execute('UPDATE sessions SET room_code = ? WHERE session_id = ?', (room_code, session_id))
            conn.commit()
        except Exception as e:
            logger.error(f"Failed to update session room {session_id}: {e}", exc_info=True)
        finally:
            conn.close()
    with_db_lock(_do)


def load_sessions() -> list[dict]:
    conn = get_connection()
    try:
        cursor = conn.cursor()
        cursor.execute('SELECT session_id, player_name, reconnect_token, reconnect_expires_at, created_at, room_code FROM sessions')
        rows = [dict(row) for row in cursor.fetchall()]
        return rows
    except Exception as e:
        logger.error(f"Failed to load sessions: {e}", exc_info=True)
        return []
    finally:
        conn.close()
