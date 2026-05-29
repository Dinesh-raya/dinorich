"""E2E tests for scenarios 1-4: Connection, Room Creation, Room Join, Game Start.

Uses Playwright sync_api with two browser pages (host + player2) to verify
the full lobby-to-game flow.

Scenarios:
  1. Connection - frontend loads and connects to backend
  2. Room Creation - host creates a room and receives a room code
  3. Room Join - second player joins using the room code
  4. Game Start - host starts game, both players see the board
"""
import re
import pytest
from playwright.sync_api import Page, expect


SCREENSHOT_DIR = "e2e/screenshots"


# ---------------------------------------------------------------------------
# Scenario 1: Connection
# ---------------------------------------------------------------------------

class TestConnection:
    """Verify the frontend loads and connects to the backend."""

    def test_frontend_loads_lobby(self, host_page: Page):
        """The lobby screen renders with DINO-RICHUP title and name input."""
        host_page.wait_for_load_state("domcontentloaded")
        host_page.wait_for_selector('[placeholder="Enter your name"]', timeout=15000)

        # Wait for lobby heading (may be behind ConnectionScreen initially)
        heading = host_page.get_by_role("heading", name="DINO-RICHUP")
        expect(heading).to_be_visible(timeout=15000)

        # Name input should be visible
        name_input = host_page.get_by_placeholder("Enter your name")
        expect(name_input).to_be_visible()

        host_page.screenshot(path=f"{SCREENSHOT_DIR}/01-lobby-loaded.png")

    def test_create_room_button_visible(self, host_page: Page):
        """The CREATE NEW ROOM button is visible on the lobby."""
        host_page.wait_for_load_state("domcontentloaded")
        host_page.wait_for_selector('[placeholder="Enter your name"]', timeout=15000)
        create_btn = host_page.get_by_role("button", name="Create a new game room")
        expect(create_btn).to_be_visible()

    def test_join_room_button_visible(self, host_page: Page):
        """The JOIN ROOM button is visible on the lobby."""
        host_page.wait_for_load_state("domcontentloaded")
        host_page.wait_for_selector('[placeholder="Enter your name"]', timeout=15000)
        join_btn = host_page.get_by_role("button", name=re.compile("Join room"))
        expect(join_btn).to_be_visible()


# ---------------------------------------------------------------------------
# Scenario 2: Room Creation
# ---------------------------------------------------------------------------

class TestRoomCreation:
    """Verify a host can create a room and receive a room code."""

    def test_create_room_as_host(self, host_page: Page):
        """Host enters name, clicks Create Room, sees waiting room with code."""
        host_page.wait_for_load_state("domcontentloaded")
        host_page.wait_for_selector('[placeholder="Enter your name"]', timeout=15000)

        # Enter player name
        name_input = host_page.get_by_placeholder("Enter your name")
        name_input.fill("HostPlayer")

        host_page.screenshot(path=f"{SCREENSHOT_DIR}/02-name-entered.png")

        # Click Create Room
        create_btn = host_page.get_by_role("button", name="Create a new game room")
        create_btn.click()

        # Wait for the waiting room to appear
        host_page.wait_for_timeout(2000)

        # The room code should be displayed (5-char alphanumeric in a monospace element)
        room_code_display = host_page.locator(".font-mono").first
        expect(room_code_display).to_be_visible(timeout=10000)

        # Extract room code text
        room_code = room_code_display.text_content().strip()
        assert re.match(r"^[A-Z0-9]{4,6}$", room_code), (
            f"Expected 4-6 char alphanumeric room code, got: '{room_code}'"
        )

        host_page.screenshot(path=f"{SCREENSHOT_DIR}/03-room-created.png")

        return room_code


# ---------------------------------------------------------------------------
# Scenario 3: Room Join
# ---------------------------------------------------------------------------

class TestRoomJoin:
    """Verify a second player can join an existing room."""

    def test_player2_joins_room(self, host_page: Page, player2_page: Page):
        """Host creates room, player2 joins using the room code."""
        # --- Host creates room ---
        host_page.wait_for_load_state("domcontentloaded")
        host_page.wait_for_selector('[placeholder="Enter your name"]', timeout=15000)
        name_input = host_page.get_by_placeholder("Enter your name")
        name_input.fill("HostPlayer")
        host_page.get_by_role("button", name="Create a new game room").click()
        host_page.wait_for_timeout(2000)

        # Get room code from waiting room
        room_code_display = host_page.locator(".font-mono").first
        expect(room_code_display).to_be_visible(timeout=10000)
        room_code = room_code_display.text_content().strip()

        host_page.screenshot(path=f"{SCREENSHOT_DIR}/04-host-waiting.png")

        # --- Player 2 joins ---
        player2_page.wait_for_load_state("domcontentloaded")
        player2_page.wait_for_selector('[placeholder="Enter your name"]', timeout=15000)

        # Enter name
        p2_name = player2_page.get_by_placeholder("Enter your name")
        p2_name.fill("Player2")

        # Enter room code
        code_input = player2_page.get_by_placeholder("ABCDEF")
        code_input.fill(room_code)

        player2_page.screenshot(path=f"{SCREENSHOT_DIR}/05-p2-code-entered.png")

        # Click Join Room
        player2_page.get_by_role("button", name=re.compile("Join room")).click()
        player2_page.wait_for_timeout(2000)

        # Player 2 should now see the waiting room
        waiting_heading = player2_page.locator("h2")
        expect(waiting_heading).to_contain_text("WAITING ROOM", timeout=10000)

        player2_page.screenshot(path=f"{SCREENSHOT_DIR}/06-p2-in-waiting-room.png")

        # Host should now see 2 players listed
        host_page.wait_for_timeout(1000)
        players_header = host_page.get_by_text(re.compile(r"PLAYERS \(2/6\)"))
        expect(players_header).to_be_visible(timeout=10000)

        host_page.screenshot(path=f"{SCREENSHOT_DIR}/07-two-players-joined.png")


# ---------------------------------------------------------------------------
# Scenario 4: Game Start
# ---------------------------------------------------------------------------

class TestGameStart:
    """Verify host can start the game and both players see the board."""

    def test_host_starts_game(self, host_page: Page, player2_page: Page):
        """Host creates room, player2 joins, host starts game, both see board."""
        # --- Host creates room ---
        host_page.wait_for_load_state("domcontentloaded")
        host_page.wait_for_selector('[placeholder="Enter your name"]', timeout=15000)
        name_input = host_page.get_by_placeholder("Enter your name")
        name_input.fill("HostPlayer")
        host_page.get_by_role("button", name="Create a new game room").click()
        host_page.wait_for_timeout(2000)

        # Get room code
        room_code_display = host_page.locator(".font-mono").first
        expect(room_code_display).to_be_visible(timeout=10000)
        room_code = room_code_display.text_content().strip()

        # --- Player 2 joins ---
        player2_page.wait_for_load_state("domcontentloaded")
        player2_page.wait_for_selector('[placeholder="Enter your name"]', timeout=15000)
        player2_page.get_by_placeholder("Enter your name").fill("Player2")
        player2_page.get_by_placeholder("ABCDEF").fill(room_code)
        player2_page.get_by_role("button", name=re.compile("Join room")).click()
        player2_page.wait_for_timeout(2000)

        # Wait for player 2 to appear in host's player list
        expect(host_page.get_by_text(re.compile(r"PLAYERS \(2/6\)"))).to_be_visible(timeout=10000)

        # --- Host starts game ---
        start_btn = host_page.get_by_role("button", name="Start the game")
        expect(start_btn).to_be_visible()
        start_btn.click()

        # Wait for game to load
        host_page.wait_for_timeout(3000)

        # --- Verify host sees the game board ---
        # Look for money display (rupee symbol) on host page
        host_money = host_page.locator("text=/₹/").first
        expect(host_money).to_be_visible(timeout=15000)

        host_page.screenshot(path=f"{SCREENSHOT_DIR}/08-host-game-board.png")

        # --- Verify player 2 sees the game board ---
        player2_page.wait_for_timeout(2000)
        p2_money = player2_page.locator("text=/₹/").first
        expect(p2_money).to_be_visible(timeout=15000)

        player2_page.screenshot(path=f"{SCREENSHOT_DIR}/09-p2-game-board.png")
