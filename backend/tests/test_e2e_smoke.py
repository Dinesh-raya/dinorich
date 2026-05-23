"""E2E smoke test: verifies server starts, health endpoint works, and key flows."""
import pytest

try:
    import socketio
    import httpx
    has_deps = True
except ImportError:
    has_deps = False


class TestRoomLifecycle:
    """Tests that can run without python-socketio installed."""

    def test_create_room(self):
        """Test room creation via manager works correctly."""
        from rooms.manager import room_manager
        from schemas.room import RoomState, RoomSettings, RoomStatus
        from schemas.player import PlayerState

        p = PlayerState(id="test_p1", name="Host", color="#ff0000")
        room = RoomState(
            room_id="E2ETEST",
            host_id="test_p1",
            settings=RoomSettings(),
            players={"test_p1": p},
            status=RoomStatus.WAITING,
        )
        room_manager.rooms["E2ETEST"] = room
        room_manager.player_rooms["test_p1"] = "E2ETEST"

        assert room_manager.get_room("E2ETEST") is not None
        assert room_manager.get_player_room_code("test_p1") == "E2ETEST"

        # Verify game initialization works
        from engine.game_initializer import init_game_state
        game = init_game_state(room)
        assert game is not None
        assert len(game.turn_order) == 1
        assert game.room.players["test_p1"].money == 15000


@pytest.mark.skipif(not has_deps, reason="requires python-socketio and httpx in test environment")
class TestHealthEndpoint:
    def test_health_returns_ok(self):
        from fastapi.testclient import TestClient
        from main import app
        client = TestClient(app)
        resp = client.get("/health")
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] in ("ok", "degraded")

    def test_health_has_checks(self):
        from fastapi.testclient import TestClient
        from main import app
        client = TestClient(app)
        resp = client.get("/health")
        data = resp.json()
        assert "checks" in data
        assert "database" in data["checks"]
        assert "rooms" in data["checks"]
        assert "games" in data["checks"]