from typing import Dict, Optional
from schemas.room import RoomState, RoomSettings
from schemas.player import PlayerState
from utils.code_generator import generate_room_code
from constants.game_rules import GameRules

class RoomManager:
    def __init__(self):
        self.rooms: Dict[str, RoomState] = {}
        # Map socket_id to room_id for O(1) lookups on disconnect
        self.player_rooms: Dict[str, str] = {}

    def create_room(self, host_id: str, host_name: str, host_color: str, session_id: str, reconnect_token: str, is_private: bool = False) -> str:
        """Creates a new room and returns its code."""
        room_code = generate_room_code()
        while room_code in self.rooms:
            room_code = generate_room_code()
            
        host_player = PlayerState(
            id=host_id,
            name=host_name,
            color=host_color,
            session_id=session_id,
            reconnect_token=reconnect_token,
        )
        
        new_room = RoomState(
            room_id=room_code,
            host_id=host_id,
            is_private=is_private,
            players={host_id: host_player}
        )
        self.rooms[room_code] = new_room
        self.player_rooms[host_id] = room_code
        return room_code

    def join_room(self, room_code: str, player_id: str, player_name: str, player_color: str, session_id: str, reconnect_token: str) -> Optional[RoomState]:
        """Adds a player to a room. Returns the RoomState if successful, None otherwise."""
        room = self.rooms.get(room_code)
        if not room:
            return None
            
        if room.status != "waiting":
            return None
            
        if len(room.players) >= room.settings.max_players:
            return None
            
        if player_id in room.players:
            # Player already in room
            return room
            
        new_player = PlayerState(
            id=player_id,
            name=player_name,
            color=player_color,
            session_id=session_id,
            reconnect_token=reconnect_token,
        )
        room.players[player_id] = new_player
        self.player_rooms[player_id] = room_code
        return room

    def leave_room(self, player_id: str) -> Optional[RoomState]:
        """Removes a player from their current room. Returns updated RoomState if room still exists."""
        room_code = self.player_rooms.get(player_id)
        if not room_code:
            return None
            
        room = self.rooms.get(room_code)
        if not room:
            return None
            
        if player_id in room.players:
            del room.players[player_id]
            
        if player_id in self.player_rooms:
            del self.player_rooms[player_id]
            
        if not room.players:
            # Room is empty, destroy it
            del self.rooms[room_code]
            return None
            
        # If host left, reassign host
        if room.host_id == player_id:
            room.host_id = list(room.players.keys())[0]
            
        return room

    def get_room(self, room_code: str) -> Optional[RoomState]:
        return self.rooms.get(room_code)

    def get_player_room_code(self, player_id: str) -> Optional[str]:
        return self.player_rooms.get(player_id)

    def update_settings(self, room_code: str, host_id: str, new_settings: dict) -> Optional[RoomState]:
        """Updates room settings if the requester is the host."""
        room = self.rooms.get(room_code)
        if not room or room.host_id != host_id or room.status != "waiting":
            return None
            
        room.settings = RoomSettings.model_validate(new_settings)
        return room

# Global instance for Phase 2
room_manager = RoomManager()
