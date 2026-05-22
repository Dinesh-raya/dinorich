"""Tests for rooms.manager."""
import pytest

from schemas.room import RoomStatus
from rooms.manager import RoomManager


# ---------------------------------------------------------------------------
# Tests: create_room
# ---------------------------------------------------------------------------

class TestCreateRoom:
    def test_create_room_returns_code(self):
        rm = RoomManager()
        code = rm.create_room("host1", "Host", "sess1", "token1")
        assert isinstance(code, str)
        assert len(code) == 5

    def test_create_room_registers_host(self):
        rm = RoomManager()
        code = rm.create_room("host1", "Host", "sess1", "token1")
        room = rm.get_room(code)
        assert room is not None
        assert room.host_id == "host1"
        assert "host1" in room.players
        assert room.players["host1"].name == "Host"

    def test_create_room_tracks_player_room(self):
        rm = RoomManager()
        code = rm.create_room("host1", "Host", "sess1", "token1")
        assert rm.get_player_room_code("host1") == code

    def test_create_room_unique_codes(self):
        rm = RoomManager()
        code1 = rm.create_room("host1", "Host1", "s1", "t1")
        code2 = rm.create_room("host2", "Host2", "s2", "t2")
        assert code1 != code2

    def test_create_room_private_flag(self):
        rm = RoomManager()
        code = rm.create_room("host1", "Host", "s1", "t1", is_private=True)
        room = rm.get_room(code)
        assert room.is_private is True


# ---------------------------------------------------------------------------
# Tests: join_room
# ---------------------------------------------------------------------------

class TestJoinRoom:
    def test_join_room_adds_player(self):
        rm = RoomManager()
        code = rm.create_room("host1", "Host", "s1", "t1")
        room = rm.join_room(code, "p2", "Player2", "s2", "t2")
        assert room is not None
        assert "p2" in room.players
        assert room.players["p2"].name == "Player2"

    def test_join_room_tracks_player(self):
        rm = RoomManager()
        code = rm.create_room("host1", "Host", "s1", "t1")
        rm.join_room(code, "p2", "Player2", "s2", "t2")
        assert rm.get_player_room_code("p2") == code

    def test_join_room_returns_none_for_invalid_code(self):
        rm = RoomManager()
        room = rm.join_room("NOPE", "p2", "Player2", "s2", "t2")
        assert room is None

    def test_join_room_returns_none_when_full(self):
        rm = RoomManager()
        code = rm.create_room("host1", "Host", "s1", "t1")
        # Override max_players to 2
        rm.get_room(code).settings.max_players = 2
        rm.join_room(code, "p2", "Player2", "s2", "t2")
        room = rm.join_room(code, "p3", "Player3", "s3", "t3")
        assert room is None

    def test_join_room_returns_none_when_game_started(self):
        rm = RoomManager()
        code = rm.create_room("host1", "Host", "s1", "t1")
        rm.get_room(code).status = RoomStatus.PLAYING
        room = rm.join_room(code, "p2", "Player2", "s2", "t2")
        assert room is None

    def test_join_room_assigns_unique_color(self):
        rm = RoomManager()
        code = rm.create_room("host1", "Host", "s1", "t1")
        room = rm.join_room(code, "p2", "Player2", "s2", "t2")
        colors = [p.color for p in room.players.values()]
        assert len(colors) == len(set(colors))  # All unique

    def test_join_room_deduplicates_name(self):
        rm = RoomManager()
        code = rm.create_room("host1", "SameName", "s1", "t1")
        room = rm.join_room(code, "p2", "SameName", "s2", "t2")
        names = [p.name for p in room.players.values()]
        assert names[0] != names[1]  # Should be different (e.g. SameName and SameName_2)


# ---------------------------------------------------------------------------
# Tests: leave_room
# ---------------------------------------------------------------------------

class TestLeaveRoom:
    def test_leave_room_removes_player(self):
        rm = RoomManager()
        code = rm.create_room("host1", "Host", "s1", "t1")
        rm.join_room(code, "p2", "Player2", "s2", "t2")
        room = rm.leave_room("p2")
        assert room is not None
        assert "p2" not in room.players

    def test_leave_room_cleans_player_tracking(self):
        rm = RoomManager()
        code = rm.create_room("host1", "Host", "s1", "t1")
        rm.join_room(code, "p2", "Player2", "s2", "t2")
        rm.leave_room("p2")
        assert rm.get_player_room_code("p2") is None

    def test_leave_room_host_reassigns(self):
        rm = RoomManager()
        code = rm.create_room("host1", "Host", "s1", "t1")
        rm.join_room(code, "p2", "Player2", "s2", "t2")
        room = rm.leave_room("host1")
        assert room is not None
        assert room.host_id == "p2"

    def test_leave_room_last_player_destroys_room(self):
        rm = RoomManager()
        code = rm.create_room("host1", "Host", "s1", "t1")
        room = rm.leave_room("host1")
        assert room is None
        assert rm.get_room(code) is None

    def test_leave_room_unknown_player_returns_none(self):
        rm = RoomManager()
        room = rm.leave_room("NOPE")
        assert room is None


# ---------------------------------------------------------------------------
# Tests: kick_player
# ---------------------------------------------------------------------------

class TestKickPlayer:
    def test_host_can_kick_player(self):
        rm = RoomManager()
        code = rm.create_room("host1", "Host", "s1", "t1")
        rm.join_room(code, "p2", "Player2", "s2", "t2")
        room = rm.kick_player(code, "host1", "p2")
        assert room is not None
        assert "p2" not in room.players

    def test_kick_cleans_player_tracking(self):
        rm = RoomManager()
        code = rm.create_room("host1", "Host", "s1", "t1")
        rm.join_room(code, "p2", "Player2", "s2", "t2")
        rm.kick_player(code, "host1", "p2")
        assert rm.get_player_room_code("p2") is None

    def test_non_host_cannot_kick(self):
        rm = RoomManager()
        code = rm.create_room("host1", "Host", "s1", "t1")
        rm.join_room(code, "p2", "Player2", "s2", "t2")
        room = rm.kick_player(code, "p2", "host1")
        assert room is None

    def test_host_cannot_kick_self(self):
        rm = RoomManager()
        code = rm.create_room("host1", "Host", "s1", "t1")
        room = rm.kick_player(code, "host1", "host1")
        assert room is None

    def test_kick_returns_none_for_nonexistent_room(self):
        rm = RoomManager()
        room = rm.kick_player("NOPE", "host1", "p2")
        assert room is None

    def test_kick_returns_none_for_nonexistent_target(self):
        rm = RoomManager()
        code = rm.create_room("host1", "Host", "s1", "t1")
        room = rm.kick_player(code, "host1", "NOPE")
        assert room is None
