import json
from typing import Dict, Tuple
from persistence.db import get_connection
from schemas.room import RoomState
from schemas.game import GameState
from schemas.action import TurnState

def save_snapshot(rooms: Dict[str, RoomState], games: Dict[str, GameState], turns: Dict[str, TurnState]):
    conn = get_connection()
    cursor = conn.cursor()
    
    # Save rooms
    for room_code, room in rooms.items():
        cursor.execute(
            'INSERT OR REPLACE INTO rooms (room_code, state_json) VALUES (?, ?)',
            (room_code, room.model_dump_json())
        )
        
    # Save games
    for room_code, game in games.items():
        if room_code in turns:
            turn = turns[room_code]
            cursor.execute(
                'INSERT OR REPLACE INTO games (room_code, state_json, turn_json) VALUES (?, ?, ?)',
                (room_code, game.model_dump_json(), turn.model_dump_json())
            )
            
    conn.commit()
    conn.close()

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
            print(f"Error loading room {row['room_code']}: {e}")
            
    cursor.execute('SELECT room_code, state_json, turn_json FROM games')
    for row in cursor.fetchall():
        try:
            games[row['room_code']] = GameState.model_validate_json(row['state_json'])
            turns[row['room_code']] = TurnState.model_validate_json(row['turn_json'])
        except Exception as e:
            print(f"Error loading game {row['room_code']}: {e}")
            
    conn.close()
    return rooms, games, turns
