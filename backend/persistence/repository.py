import json
import logging
from typing import Dict, Tuple
from persistence.db import get_connection, with_db_lock
from schemas.room import RoomState
from schemas.game import GameState
from schemas.action import TurnState

logger = logging.getLogger(__name__)

def save_snapshot(rooms: Dict[str, RoomState], games: Dict[str, GameState], turns: Dict[str, TurnState]):
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
                    cursor.execute(
                        'INSERT OR REPLACE INTO games (room_code, state_json, turn_json) VALUES (?, ?, ?)',
                        (room_code, game.model_dump_json(), turn.model_dump_json())
                    )
            conn.commit()
        except Exception as e:
            logger.error(f"Failed to save snapshot: {e}", exc_info=True)
        finally:
            conn.close()
    with_db_lock(_do_save)

def load_snapshot() -> Tuple[Dict[str, RoomState], Dict[str, GameState], Dict[str, TurnState]]:
    conn = get_connection()
    cursor = conn.cursor()
    
    rooms = {}
    games = {}
    turns = {}
    
    cursor.execute('SELECT room_code, state_json FROM rooms')
    for row in cursor.fetchall():
        try:
            rooms[row['room_code']] = RoomState.model_validate_json(row['state_json'])
        except Exception as e:
            logger.error(f"Error loading room {row['room_code']}: {e}", exc_info=True)

    cursor.execute('SELECT room_code, state_json, turn_json FROM games')
    for row in cursor.fetchall():
        try:
            games[row['room_code']] = GameState.model_validate_json(row['state_json'])
            turns[row['room_code']] = TurnState.model_validate_json(row['turn_json'])
        except Exception as e:
            logger.error(f"Error loading game {row['room_code']}: {e}", exc_info=True)
            
    conn.close()
    return rooms, games, turns
