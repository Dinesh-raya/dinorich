"""E2E scenarios 9-15: Trade, Auction, Jail, Building, Mortgage, Bankruptcy, Game Over.

QAController creates the room (becoming host) so it can issue qa:* commands.
Both browser pages join as regular players.
"""
import os
import re
import time
import json
import urllib.request

import pytest
from playwright.sync_api import Page, expect

from e2e.conftest import FRONTEND_URL, BACKEND_URL
from e2e.qa_helpers import QAController


SCREENSHOT_DIR = os.path.join(os.path.dirname(__file__), "screenshots")


def _screenshot(page: Page, name: str):
    os.makedirs(SCREENSHOT_DIR, exist_ok=True)
    page.screenshot(path=os.path.join(SCREENSHOT_DIR, f"{name}.png"))


def _setup_game(host_page: Page, player2_page: Page, qa: QAController):
    """Create a game: QA creates room (host), both browsers join.

    Returns (room_code, player_a_id, player_b_id).
    """
    # --- 1. QA creates room (becomes host) ---
    qa.connect()
    create_res = qa._emit("room:create", {"name": "QAHost"})
    assert create_res.get("status") == "success", f"room:create failed: {create_res}"
    room_code = create_res["room"]["room_id"]

    # --- 2. Enable QA mode ---
    settings_res = qa._emit("room:update_settings", {
        "settings": {
            "max_players": 6,
            "starting_cash": 15000,
            "auction_enabled": True,
            "double_rent_enabled": True,
            "mortgage_enabled": True,
            "free_parking_jackpot": False,
            "turn_timer_seconds": 30,
            "random_turn_order": False,
            "jail_strict_mode": True,
            "board_theme": "pan_india",
            "mode": "classic",
            "disconnect_timeout_seconds": 120,
            "game_paused": False,
            "qa_mode": {
                "enabled": True,
                "dice_mode": "random",
                "dice_sequence": [],
                "fixed_dice": [3, 4],
                "card_mode": "random",
                "card_index": 0,
                "turn_timer_seconds": 5,
                "auto_buy_disabled": True,
            },
        }
    })
    assert settings_res.get("status") == "success", f"update_settings failed: {settings_res}"

    # --- 3. Host browser joins ---
    # Dismiss tutorial if it shows
    host_page.evaluate("localStorage.setItem('dino_tutorial_done', 'true')")
    host_page.wait_for_selector('[placeholder="Enter your name"]', timeout=15000)
    host_page.wait_for_selector("text=CREATE NEW ROOM", timeout=20000)
    host_page.wait_for_timeout(2000)
    host_page.get_by_placeholder("Enter your name").fill("PlayerA")
    host_page.get_by_placeholder("ABCDEF").fill(room_code)
    host_page.get_by_text("JOIN ROOM").click()

    # --- 4. Player 2 browser joins ---
    player2_page.evaluate("localStorage.setItem('dino_tutorial_done', 'true')")
    player2_page.wait_for_selector('[placeholder="Enter your name"]', timeout=15000)
    player2_page.wait_for_selector("text=CREATE NEW ROOM", timeout=20000)
    player2_page.wait_for_timeout(2000)
    player2_page.get_by_placeholder("Enter your name").fill("PlayerB")
    player2_page.get_by_placeholder("ABCDEF").fill(room_code)
    player2_page.get_by_text("JOIN ROOM").click()

    # --- 5. Wait for waiting room ---
    host_page.wait_for_url(f"**/room/{room_code}*", timeout=20000)
    player2_page.wait_for_url(f"**/room/{room_code}*", timeout=20000)
    host_page.wait_for_selector('[aria-label="Leave the game room"]', timeout=10000)

    # --- 6. Wait for backend to register both players ---
    players = qa.wait_for_players(room_code, 3, timeout=20)  # QAHost + PlayerA + PlayerB

    # --- 7. Start game via QA ---
    start_res = qa._emit("game:start", {})
    assert start_res.get("status") == "success", f"game:start failed: {start_res}"

    # --- 8. Wait for game board and dismiss tutorial ---
    host_page.wait_for_selector('[title="Trade"]', timeout=20000)
    player2_page.wait_for_selector('[title="Trade"]', timeout=20000)
    # Tutorial auto-shows after 1.5s on first visit — dismiss it
    for page in (host_page, player2_page):
        try:
            close_btn = page.get_by_role("button", name="Got it!")
            if close_btn.is_visible(timeout=3000):
                close_btn.click()
                page.wait_for_timeout(500)
        except Exception:
            pass  # Tutorial already dismissed or not shown

    # --- 9. Resolve player IDs ---
    player_a_id = next(
        (pid for pid, p in players.items() if p.get("name") == "PlayerA"), None
    )
    player_b_id = next(
        (pid for pid, p in players.items() if p.get("name") == "PlayerB"), None
    )
    assert player_a_id, f"PlayerA not found. Players: {players}"
    assert player_b_id, f"PlayerB not found. Players: {players}"

    return room_code, player_a_id, player_b_id


def _wait_for_my_turn(page: Page, timeout: int = 30):
    """Wait until this page's player has the ROLL DICE button."""
    page.wait_for_selector("text=ROLL DICE", timeout=timeout * 1000)


# ---------------------------------------------------------------------------
# Scenario 9: Trade Modal
# ---------------------------------------------------------------------------
def test_scenario_9_trade_modal(
    host_page: Page,
    player2_page: Page,
    qa_controller: QAController,
    servers,
):
    """Seed properties to both players -> open trade modal -> verify it opens."""
    room_code, pa, pb = _setup_game(host_page, player2_page, qa_controller)

    # Seed a property to each player
    qa_controller.seed_property(pa, 1)   # Guwahati  -> PlayerA
    qa_controller.seed_property(pb, 6)   # Ahmedabad -> PlayerB
    time.sleep(1)

    # Click Trade button on host page
    host_page.locator('[title="Trade"]').first.click()

    # Verify trade modal opens
    host_page.wait_for_selector("text=TRADE", timeout=5000)
    expect(host_page.get_by_text("Select Player to Trade With")).to_be_visible()
    _screenshot(host_page, "scenario-9-trade-modal")


# ---------------------------------------------------------------------------
# Scenario 10: Auction UI
# ---------------------------------------------------------------------------
def test_scenario_10_auction_ui(
    host_page: Page,
    player2_page: Page,
    qa_controller: QAController,
    servers,
):
    """Force an auction via QA -> verify auction UI appears."""
    room_code, pa, pb = _setup_game(host_page, player2_page, qa_controller)

    # Force auction on an unowned tile (Jaipur, tile 11)
    res = qa_controller.force_auction(11)
    assert res.get("status") == "success", f"force_auction failed: {res}"
    time.sleep(2)

    # Verify auction modal appears
    host_page.wait_for_selector("text=AUCTION", timeout=10000)
    expect(host_page.get_by_text("AUCTION", exact=True)).to_be_visible()
    _screenshot(host_page, "scenario-10-auction")


# ---------------------------------------------------------------------------
# Scenario 11: Jail State
# ---------------------------------------------------------------------------
def test_scenario_11_jail_state(
    host_page: Page,
    player2_page: Page,
    qa_controller: QAController,
    servers,
):
    """Force jail on a player -> verify jail UI on their turn."""
    room_code, pa, pb = _setup_game(host_page, player2_page, qa_controller)

    # Force PlayerA into jail and set turn to them
    res = qa_controller.force_jail(pa)
    assert res.get("status") == "success", f"force_jail failed: {res}"
    time.sleep(1)

    # Set turn directly to PlayerA
    qa_controller.set_current_player(pa)
    time.sleep(2)

    # Wait for jail UI
    host_page.wait_for_selector("text=IN JAIL", timeout=30000)
    expect(host_page.get_by_text("IN JAIL").first).to_be_visible()
    expect(host_page.get_by_text("PAY FINE").first).to_be_visible()
    _screenshot(host_page, "scenario-11-jail")


# ---------------------------------------------------------------------------
# Scenario 12: Building (complete color group -> build button visible)
# ---------------------------------------------------------------------------
def test_scenario_12_building(
    host_page: Page,
    player2_page: Page,
    qa_controller: QAController,
    servers,
):
    """Seed complete brown group (tiles 1,3) + money -> verify build button."""
    room_code, pa, pb = _setup_game(host_page, player2_page, qa_controller)

    # Give PlayerA the full brown monopoly
    qa_controller.seed_property(pa, 1)   # Guwahati
    qa_controller.seed_property(pa, 3)   # Goa
    qa_controller.add_money(pa, 5000)    # Extra cash
    time.sleep(2)

    # Wait for notifications to clear, then click the tile
    host_page.wait_for_timeout(3000)
    # Use the board tile container (not notification text) to click
    board_tile = host_page.locator('[class*="cursor-pointer"]').filter(has_text="Guwahati").first
    board_tile.click(timeout=10000)

    # Verify BUILD HOUSE button visible
    host_page.wait_for_selector("text=BUILD HOUSE", timeout=5000)
    expect(host_page.get_by_text("BUILD HOUSE").first).to_be_visible()
    _screenshot(host_page, "scenario-12-building")


# ---------------------------------------------------------------------------
# Scenario 13: Mortgage
# ---------------------------------------------------------------------------
def test_scenario_13_mortgage(
    host_page: Page,
    player2_page: Page,
    qa_controller: QAController,
    servers,
):
    """Seed property -> open property detail -> verify mortgage option."""
    room_code, pa, pb = _setup_game(host_page, player2_page, qa_controller)

    # Give PlayerA a property (Jaipur, tile 11, mortgage value 700)
    qa_controller.seed_property(pa, 11)
    time.sleep(2)

    # Wait for notifications to clear, then click the tile
    host_page.wait_for_timeout(3000)
    board_tile = host_page.locator('[class*="cursor-pointer"]').filter(has_text="Jaipur").first
    board_tile.click(timeout=10000)

    # Verify MORTGAGE button visible
    host_page.wait_for_selector("text=MORTGAGE", timeout=5000)
    expect(host_page.get_by_text("MORTGAGE").first).to_be_visible()
    _screenshot(host_page, "scenario-13-mortgage")


# ---------------------------------------------------------------------------
# Scenario 14: Bankruptcy / Debt
# ---------------------------------------------------------------------------
def test_scenario_14_bankruptcy(
    host_page: Page,
    player2_page: Page,
    qa_controller: QAController,
    servers,
):
    """Drain host money, seed property to player 2, land host on it -> debt UI."""
    room_code, pa, pb = _setup_game(host_page, player2_page, qa_controller)

    # Set turn to PlayerA so host page has ROLL DICE
    qa_controller.set_current_player(pa)
    _wait_for_my_turn(host_page, timeout=30)

    # Set up debt scenario:
    #   PlayerA money -> 50 (can't afford airport rent of 250)
    #   PlayerB owns Mumbai Airport (tile 15, rent 250)
    #   PlayerA at Pune (tile 8); dice 3+4 = 7 -> tile 15
    qa_controller.add_money(pa, -14950)   # balance: 50
    qa_controller.seed_property(pb, 15)   # Mumbai Airport -> PlayerB
    qa_controller.jump_to_tile(pa, 8)     # Pune
    qa_controller.set_dice(3, 4)          # roll 7 -> tile 15
    time.sleep(0.5)

    # PlayerA rolls
    host_page.get_by_text("ROLL DICE").click()

    # Verify debt / bankruptcy UI
    host_page.wait_for_selector("text=IN DEBT", timeout=15000)
    expect(host_page.get_by_text("IN DEBT").first).to_be_visible()
    expect(host_page.get_by_text("DECLARE BANKRUPTCY").first).to_be_visible()
    _screenshot(host_page, "scenario-14-bankruptcy")


# ---------------------------------------------------------------------------
# Scenario 15: Game State Endpoint
# ---------------------------------------------------------------------------
def test_scenario_15_game_state(
    host_page: Page,
    player2_page: Page,
    qa_controller: QAController,
    servers,
):
    """Verify health endpoint and QA game state return valid data."""
    room_code, pa, pb = _setup_game(host_page, player2_page, qa_controller)

    # Health endpoint
    resp = urllib.request.urlopen(f"{BACKEND_URL}/health", timeout=5)
    data = json.loads(resp.read())
    assert data.get("status") in ("ok", "degraded"), f"Unexpected health: {data}"

    # QA game state
    state = qa_controller.get_state()
    assert state.get("status") == "success", f"get_state failed: {state}"
    assert "game" in state, "Missing 'game' key"
    assert "turn" in state, "Missing 'turn' key"
    assert "players" in state, "Missing 'players' key"
    assert len(state["players"]) >= 2, "Expected at least 2 players"
    _screenshot(host_page, "scenario-15-game-state")
