from typing import Dict, Optional, List
from schemas.room import RoomState, RoomSettings
from schemas.player import PlayerState
from utils.code_generator import generate_room_code
from constants.game_rules import GameRules
from utils.name_generator import ensure_unique_name

# Distinct player colors - easily distinguishable
PLAYER_COLORS = [
    "#ef4444",  # Red
    "#3b82f6",  # Blue
    "#22c55e",  # Green
    "#eab308",  # Yellow
    "#a855f7",  # Purple
    "#f97316",  # Orange
]

class RoomManager:
    def __init__(self):
        self.rooms: Dict[str, RoomState] = {}
        # Map socket_id to room_id for O(1) lookups on disconnect
        self.player_rooms: Dict[str, str] = {}

    def _get_available_color(self, room: RoomState) -> str:
        """Returns the first available color not taken by any player in the room."""
        taken_colors = {p.color for p in room.players.values()}
        for color in PLAYER_COLORS:
            if color not in taken_colors:
                return color
        # If all colors taken, return a random one (shouldn't happen with 6 colors and 6 max players)
        return PLAYER_COLORS[0]

    def create_room(self, host_id: str, host_name: str, session_id: str, reconnect_token: str, is_private: bool = False) -> str:
        """Creates a new room and returns its code. Color is auto-assigned."""
        room_code = generate_room_code()
        while room_code in self.rooms:
            room_code = generate_room_code()

        # First player gets first color
        host_color = PLAYER_COLORS[0]

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

    def join_room(self, room_code: str, player_id: str, player_name: str, session_id: str, reconnect_token: str) -> Optional[RoomState]:
        """Adds a player to a room. Color is auto-assigned uniquely."""
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

        # Ensure unique name within the room
        existing_names = [p.name for p in room.players.values()]
        unique_name = ensure_unique_name(player_name, existing_names)

        # Auto-assign unique color
        player_color = self._get_available_color(room)

        new_player = PlayerState(
            id=player_id,
            name=unique_name,
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
            from persistence import repository
            repository.delete_room(room_code)
            repository.delete_game(room_code)
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

    def kick_player(self, room_code: str, host_id: str, target_id: str) -> Optional[RoomState]:
        """Kicks a player from the room. Only the host can kick, and only in waiting status."""
        room = self.rooms.get(room_code)
        if not room or room.host_id != host_id or room.status != "waiting":
            return None
        if target_id == host_id:
            return None  # Can't kick yourself
        if target_id not in room.players:
            return None

        del room.players[target_id]
        if target_id in self.player_rooms:
            del self.player_rooms[target_id]
        return room

# Global instance for Phase 2
room_manager = RoomManager()
