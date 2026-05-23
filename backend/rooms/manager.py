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

import asyncio

class RoomManager:
    def __init__(self):
        self.rooms: Dict[str, RoomState] = {}
        # Map session_id to room_id for O(1) lookups
        self.player_rooms: Dict[str, str] = {}
        # Bidirectional socket to session mappings
        self.socket_to_session: Dict[str, str] = {}
        self.session_to_socket: Dict[str, str] = {}
        self._room_locks: Dict[str, asyncio.Lock] = {}

    def get_lock(self, room_code: str) -> asyncio.Lock:
        """Returns a per-room asyncio lock to serialize game state mutations."""
        if room_code not in self._room_locks:
            self._room_locks[room_code] = asyncio.Lock()
        return self._room_locks[room_code]

    def register_socket(self, socket_id: str, session_id: str):
        """Registers a bidirectional mapping between a socket ID and a stable session ID."""
        self.socket_to_session[socket_id] = session_id
        self.session_to_socket[session_id] = socket_id

    def deregister_socket(self, socket_id: str):
        """Cleans up socket mappings for a disconnected socket ID."""
        session_id = self.socket_to_session.pop(socket_id, None)
        if session_id and self.session_to_socket.get(session_id) == socket_id:
            self.session_to_socket.pop(session_id, None)

    def get_session_id(self, socket_id: str) -> str:
        """Resolves a socket ID to its stable session ID. Returns the socket_id if not mapped."""
        return self.socket_to_session.get(socket_id, socket_id)

    def get_socket_id(self, session_id: str) -> str:
        """Resolves a session ID to its current socket ID. Returns the session_id if not mapped."""
        return self.session_to_socket.get(session_id, session_id)

    def _get_available_color(self, room: RoomState) -> str:
        """Returns the first available color not taken by any player in the room."""
        taken_colors = {p.color for p in room.players.values()}
        for color in PLAYER_COLORS:
            if color not in taken_colors:
                return color
        # If all colors taken, return a random one (shouldn't happen with 6 colors and 6 max players)
        return PLAYER_COLORS[0]

    def create_room(self, host_id: str, host_name: str, session_id: str, reconnect_token: str, is_private: bool = False) -> str:
        """Creates a new room and returns its code. Color is auto-assigned. Player is keyed by session_id."""
        room_code = generate_room_code()
        while room_code in self.rooms:
            room_code = generate_room_code()

        # Register connection mapping
        self.register_socket(host_id, session_id)

        # First player gets first color
        host_color = PLAYER_COLORS[0]

        host_player = PlayerState(
            id=session_id,  # Stable player ID is session_id
            name=host_name,
            color=host_color,
            session_id=session_id,
            reconnect_token=reconnect_token,
            socket_id=host_id,
        )

        new_room = RoomState(
            room_id=room_code,
            host_id=session_id,  # Host ID is stable session ID
            is_private=is_private,
            players={session_id: host_player}
        )
        self.rooms[room_code] = new_room
        self.player_rooms[session_id] = room_code
        return room_code

    def join_room(self, room_code: str, player_id: str, player_name: str, session_id: str, reconnect_token: str) -> Optional[RoomState]:
        """Adds a player to a room. Color is auto-assigned uniquely. Player is keyed by session_id."""
        room = self.rooms.get(room_code)
        if not room:
            return None

        if room.status != "waiting":
            return None

        if len(room.players) >= room.settings.max_players:
            return None

        # Register connection mapping
        self.register_socket(player_id, session_id)

        if session_id in room.players:
            # Player already in room
            return room

        # Ensure unique name within the room
        existing_names = [p.name for p in room.players.values()]
        unique_name = ensure_unique_name(player_name, existing_names)

        # Auto-assign unique color
        player_color = self._get_available_color(room)

        new_player = PlayerState(
            id=session_id,  # Stable player ID is session_id
            name=unique_name,
            color=player_color,
            session_id=session_id,
            reconnect_token=reconnect_token,
            socket_id=player_id,
        )
        room.players[session_id] = new_player
        self.player_rooms[session_id] = room_code
        return room

    def leave_room(self, player_id: str) -> Optional[RoomState]:
        """Removes a player from their current room. Returns updated RoomState if room still exists."""
        # Resolve to session ID
        session_id = self.get_session_id(player_id)
        room_code = self.player_rooms.get(session_id)
        if not room_code:
            return None
            
        room = self.rooms.get(room_code)
        if not room:
            return None
            
        if session_id in room.players:
            del room.players[session_id]
            
        if session_id in self.player_rooms:
            del self.player_rooms[session_id]
            
        if not room.players:
            # Room is empty, destroy it
            del self.rooms[room_code]
            from persistence import repository
            repository.delete_room(room_code)
            repository.delete_game(room_code)
            return None
            
        # If host left, reassign host to the first player's session_id
        if room.host_id == session_id:
            room.host_id = list(room.players.keys())[0]
            
        return room

    def get_room(self, room_code: str) -> Optional[RoomState]:
        return self.rooms.get(room_code)

    def get_player_room_code(self, player_id: str) -> Optional[str]:
        # Resolves either socket_id or session_id to room_code
        session_id = self.get_session_id(player_id)
        return self.player_rooms.get(session_id)

    def update_settings(self, room_code: str, host_id: str, new_settings: dict) -> Optional[RoomState]:
        """Updates room settings if the requester is the host."""
        room = self.rooms.get(room_code)
        session_host_id = self.get_session_id(host_id)
        if not room or room.host_id != session_host_id or room.status != "waiting":
            return None

        room.settings = RoomSettings.model_validate(new_settings)
        return room

    def kick_player(self, room_code: str, host_id: str, target_id: str) -> Optional[RoomState]:
        """Kicks a player from the room. Only the host can kick, and only in waiting status."""
        room = self.rooms.get(room_code)
        session_host_id = self.get_session_id(host_id)
        session_target_id = self.get_session_id(target_id)
        if not room or room.host_id != session_host_id or room.status != "waiting":
            return None
        if session_target_id == session_host_id:
            return None  # Can't kick yourself
        if session_target_id not in room.players:
            return None

        del room.players[session_target_id]
        if session_target_id in self.player_rooms:
            del self.player_rooms[session_target_id]
        return room

# Global instance for Phase 2
room_manager = RoomManager()
