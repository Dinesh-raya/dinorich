"""QA socket command wrapper for deterministic E2E testing.

Wraps python-socketio Client to call qa:* events on the backend,
mirroring the handlers in backend/sockets/qa_events.py.
"""
import socketio


BACKEND_URL = "http://127.0.0.1:8100"


class QAController:
    """Socket.io client that sends qa:* commands to the backend.

    Usage::

        qa = QAController()
        qa.connect()
        qa.set_dice(3, 4)
        qa.jump_to_tile(player_id, tile_id)
        state = qa.get_state()
        qa.disconnect()
    """

    def __init__(self, url: str = BACKEND_URL):
        self._url = url
        self._sio = socketio.SimpleClient()
        self._connected = False

    # -- lifecycle ----------------------------------------------------------

    def connect(self):
        """Connect to the backend and wait for session:init."""
        if self._connected:
            return
        self._sio.connect(self._url, wait_timeout=10)
        self._connected = True

    def disconnect(self):
        """Disconnect from the backend."""
        if self._connected:
            try:
                self._sio.disconnect()
            except Exception:
                pass
            self._connected = False

    # -- helpers ------------------------------------------------------------

    def _emit(self, event: str, data: dict | None = None, timeout: float = 5.0):
        """Emit a socket event and wait for the response."""
        if not self._connected:
            self.connect()
        return self._sio.call(event, data or {}, timeout=timeout)

    # -- QA commands --------------------------------------------------------

    def set_dice(self, die1: int, die2: int) -> dict:
        """Queue specific dice values for the next roll.

        Args:
            die1: First die value (1-6).
            die2: Second die value (1-6).

        Returns:
            Server response dict.
        """
        return self._emit("qa:set_dice", {"die1": die1, "die2": die2})

    def jump_to_tile(self, player_id: str, tile_id: int) -> dict:
        """Move a player directly to a board tile.

        Args:
            player_id: Session ID of the player.
            tile_id: Target tile index (0-39).

        Returns:
            Server response dict.
        """
        return self._emit("qa:jump_to_tile", {"player_id": player_id, "tile_id": tile_id})

    def force_jail(self, player_id: str) -> dict:
        """Send a player directly to jail.

        Args:
            player_id: Session ID of the player.

        Returns:
            Server response dict.
        """
        return self._emit("qa:force_jail", {"player_id": player_id})

    def seed_property(self, player_id: str, tile_id: int) -> dict:
        """Assign ownership of a property tile to a player.

        Args:
            player_id: Session ID of the new owner.
            tile_id: Tile index of the property (0-39).

        Returns:
            Server response dict.
        """
        return self._emit("qa:seed_property", {"player_id": player_id, "tile_id": tile_id})

    def force_auction(self, tile_id: int) -> dict:
        """Start an auction for a given property tile.

        Args:
            tile_id: Tile index of the property.

        Returns:
            Server response dict.
        """
        return self._emit("qa:force_auction", {"tile_id": tile_id})

    def add_money(self, player_id: str, amount: int) -> dict:
        """Add (or subtract) money from a player's balance.

        Args:
            player_id: Session ID of the player.
            amount: Amount to add (negative to deduct).

        Returns:
            Server response dict with 'balance' key.
        """
        return self._emit("qa:add_money", {"player_id": player_id, "amount": amount})

    def reset(self) -> dict:
        """Reset all backend game state — for test isolation."""
        return self._emit("qa:reset")

    def get_room_players(self) -> dict:
        """Get room players — works in waiting room (before game start)."""
        return self._emit("qa:room_players")

    def get_state(self) -> dict:
        """Fetch the full current game state (QA view).

        Returns:
            Dict with 'game', 'turn', and 'players' keys.
        """
        return self._emit("qa:get_state")

    def force_card(self, card_type: str, card_index: int = 0) -> dict:
        """Force the next card draw to return a specific card.

        Args:
            card_type: 'treasury' or 'surprise'.
            card_index: Index into the deck (0-based).

        Returns:
            Server response dict with 'card' and 'card_type' keys.
        """
        return self._emit("qa:force_card", {"card_type": card_type, "card_index": card_index})

    def set_current_player(self, player_id: str) -> dict:
        """Set the active player by ID. Skips turn order rotation.

        Args:
            player_id: Session ID of the player to make active.

        Returns:
            Server response dict.
        """
        return self._emit("qa:set_current_player", {"player_id": player_id})

    def wait_for_players(self, room_code: str, count: int, timeout: float = 15.0) -> dict:
        """Poll /qa/rooms/{room_code}/players until the room has at least `count` players.

        Uses HTTP endpoint (works before game:start, no socket dependency).
        Returns the final player dict, or raises TimeoutError.
        """
        import time
        import urllib.request
        import json as _json

        deadline = time.monotonic() + timeout
        port = self._url.rstrip("/").split(":")[-1]
        url = f"http://127.0.0.1:{port}/qa/rooms/{room_code}/players"
        last_players = {}
        while time.monotonic() < deadline:
            try:
                resp = urllib.request.urlopen(url, timeout=3)
                data = _json.loads(resp.read())
                players = data.get("players", {})
                if len(players) >= count:
                    return players
                last_players = players
            except Exception:
                pass
            time.sleep(0.5)
        raise TimeoutError(
            f"Only {len(last_players)} players after {timeout}s (expected {count}): "
            f"{last_players}"
        )
