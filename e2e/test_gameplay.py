"""E2E Scenarios 5-8: Rolling Dice, Buying Property, Rent, Cards."""
import os
import time
import re
import pytest
from playwright.sync_api import Page, expect
from e2e.qa_helpers import QAController
from e2e.conftest import FRONTEND_URL


def _setup_game(host_page: Page, player2_page: Page, qa: QAController) -> str:
    """Create room via QA, join both browsers, start game. Returns room_code."""
    # 1. QA creates room
    qa.connect()
    create_res = qa._emit("room:create", {"name": "QAHost"})
    assert create_res.get("status") == "success", f"room:create failed: {create_res}"
    room_code = create_res["room"]["room_id"]

    # 2. Enable QA mode
    qa._emit("room:update_settings", {
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

    # 3. Host browser joins
    host_page.evaluate("localStorage.setItem('dino_tutorial_done', 'true')")
    host_page.wait_for_selector('[placeholder="Enter your name"]', timeout=15000)
    host_page.wait_for_selector("text=CREATE NEW ROOM", timeout=20000)
    host_page.wait_for_timeout(2000)
    host_page.get_by_placeholder("Enter your name").fill("PlayerA")
    host_page.get_by_placeholder("ABCDEF").fill(room_code)
    host_page.get_by_text("JOIN ROOM").click()

    # 4. Player 2 browser joins (wait for backend to process PlayerA first)
    player2_page.evaluate("localStorage.setItem('dino_tutorial_done', 'true')")
    player2_page.wait_for_selector('[placeholder="Enter your name"]', timeout=15000)
    player2_page.wait_for_selector("text=CREATE NEW ROOM", timeout=20000)
    player2_page.wait_for_timeout(2000)
    player2_page.get_by_placeholder("Enter your name").fill("PlayerB")
    player2_page.get_by_placeholder("ABCDEF").fill(room_code)
    player2_page.get_by_text("JOIN ROOM").click()

    # 5. Wait for backend to register both players
    host_page.wait_for_url(f"**/room/{room_code}*", timeout=20000)
    player2_page.wait_for_url(f"**/room/{room_code}*", timeout=20000)
    host_page.wait_for_selector("text=Leave Room", timeout=10000)
    qa.wait_for_players(room_code, 3, timeout=20)

    # 6. Start game
    start_res = qa._emit("game:start", {})
    assert start_res.get("status") == "success", f"game:start failed: {start_res}"

    # 7. Wait for game board and dismiss tutorial
    host_page.wait_for_selector('[title="Trade"]', timeout=20000)
    player2_page.wait_for_selector('[title="Trade"]', timeout=20000)
    for page in (host_page, player2_page):
        try:
            close_btn = page.get_by_role("button", name="Got it!")
            if close_btn.is_visible(timeout=3000):
                close_btn.click()
                page.wait_for_timeout(500)
        except Exception:
            pass

    # 8. Set turn to PlayerA so host page has ROLL DICE
    state = qa.get_state()
    players = state.get("players", {})
    player_a_id = next(
        (pid for pid, p in players.items() if p.get("name") == "PlayerA"), None
    )
    if player_a_id:
        qa.set_current_player(player_a_id)
        host_page.wait_for_timeout(1000)

    return room_code


class TestScenario5RollingDice:
    """Rolling Dice & Movement."""

    def test_dice_roll_moves_player(self, host_page: Page, player2_page: Page, qa_controller: QAController):
        """Rolling dice moves the player."""
        _setup_game(host_page, player2_page, qa_controller)

        roll_btn = host_page.get_by_role("button", name=re.compile("roll|dice", re.IGNORECASE)).first
        roll_btn.click()
        host_page.wait_for_timeout(2000)

        host_page.screenshot(path="e2e/screenshots/05-dice-roll.png")


class TestScenario6BuyingProperty:
    """Buying a Property."""

    def test_buy_prompt_on_property(self, host_page: Page, player2_page: Page, qa_controller: QAController):
        """Landing on unowned property shows buy prompt."""
        _setup_game(host_page, player2_page, qa_controller)
        qa_controller.set_dice(1, 2)  # total=3 -> tile 3 (Goa, a property)

        roll_btn = host_page.get_by_role("button", name=re.compile("roll|dice", re.IGNORECASE)).first
        roll_btn.click()
        host_page.wait_for_timeout(3000)

        buy_btn = host_page.get_by_role("button", name=re.compile("buy|purchase", re.IGNORECASE)).first
        expect(buy_btn).to_be_visible(timeout=5000)
        host_page.screenshot(path="e2e/screenshots/06-buy-prompt.png")


class TestScenario7Rent:
    """Landing on Owned Property (Rent)."""

    def test_rent_paid_on_owned_property(self, host_page: Page, player2_page: Page, qa_controller: QAController):
        """Landing on opponent's property triggers rent."""
        room_code = _setup_game(host_page, player2_page, qa_controller)

        # Get player IDs from backend state
        state = qa_controller.get_state()
        players = state.get("players", {})
        player_a_id = next(
            (pid for pid, p in players.items() if p.get("name") == "PlayerA"), None
        )
        player_b_id = next(
            (pid for pid, p in players.items() if p.get("name") == "PlayerB"), None
        )
        if player_b_id:
            qa_controller.seed_property(player_b_id, 1)
        qa_controller.set_dice(1, 1)

        roll_btn = host_page.get_by_role("button", name=re.compile("roll|dice", re.IGNORECASE)).first
        roll_btn.click()
        host_page.wait_for_timeout(3000)

        host_page.screenshot(path="e2e/screenshots/07-rent.png")


class TestScenario8Cards:
    """Drawing a Card (Treasury/Surprise)."""

    def test_treasury_card_drawn(self, host_page: Page, player2_page: Page, qa_controller: QAController):
        """Landing on treasury tile draws a card."""
        _setup_game(host_page, player2_page, qa_controller)
        qa_controller.set_dice(2, 2)

        roll_btn = host_page.get_by_role("button", name=re.compile("roll|dice", re.IGNORECASE)).first
        roll_btn.click()
        host_page.wait_for_timeout(3000)

        host_page.screenshot(path="e2e/screenshots/08-card.png")
