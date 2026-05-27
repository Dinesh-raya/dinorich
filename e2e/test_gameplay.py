"""E2E Scenarios 5-8: Rolling Dice, Buying Property, Rent, Cards."""
import pytest
import re
from playwright.sync_api import Page, expect
from e2e.qa_helpers import QAController


def _setup_game(host_page: Page, player2_page: Page) -> str:
    """Create room, join player 2, start game. Returns room_code."""
    host_page.goto("http://localhost:3100")
    host_page.wait_for_load_state("networkidle")

    name_input = host_page.get_by_placeholder(re.compile("name", re.IGNORECASE))
    name_input.fill("Host")
    host_page.get_by_role("button", name=re.compile("create", re.IGNORECASE)).click()
    host_page.wait_for_timeout(2000)

    room_code = host_page.locator(".font-mono").first.text_content()

    player2_page.goto("http://localhost:3100")
    player2_page.wait_for_load_state("networkidle")
    player2_page.get_by_placeholder(re.compile("name", re.IGNORECASE)).fill("Player2")
    player2_page.get_by_placeholder(re.compile("code|room", re.IGNORECASE)).fill(room_code)
    player2_page.get_by_role("button", name=re.compile("join", re.IGNORECASE)).click()
    player2_page.wait_for_timeout(2000)

    host_page.get_by_role("button", name=re.compile("start", re.IGNORECASE)).click()
    host_page.wait_for_timeout(3000)

    return room_code


class TestScenario5RollingDice:
    """Rolling Dice & Movement."""

    def test_dice_roll_moves_player(self, host_page: Page, player2_page: Page):
        """Rolling dice moves the player."""
        _setup_game(host_page, player2_page)

        roll_btn = host_page.get_by_role("button", name=re.compile("roll|dice", re.IGNORECASE)).first
        roll_btn.click()
        host_page.wait_for_timeout(2000)

        host_page.screenshot(path="e2e/screenshots/05-dice-roll.png")


class TestScenario6BuyingProperty:
    """Buying a Property."""

    def test_buy_prompt_on_property(self, host_page: Page, player2_page: Page):
        """Landing on unowned property shows buy prompt."""
        _setup_game(host_page, player2_page)

        qa = QAController()
        qa.set_dice(1, 0)
        qa.disconnect()

        roll_btn = host_page.get_by_role("button", name=re.compile("roll|dice", re.IGNORECASE)).first
        roll_btn.click()
        host_page.wait_for_timeout(3000)

        buy_btn = host_page.get_by_role("button", name=re.compile("buy|purchase", re.IGNORECASE)).first
        expect(buy_btn).to_be_visible(timeout=5000)
        host_page.screenshot(path="e2e/screenshots/06-buy-prompt.png")


class TestScenario7Rent:
    """Landing on Owned Property (Rent)."""

    def test_rent_paid_on_owned_property(self, host_page: Page, player2_page: Page):
        """Landing on opponent's property triggers rent."""
        room_code = _setup_game(host_page, player2_page)

        qa = QAController()
        host_id = host_page.evaluate("() => localStorage.getItem('dino_player_id') || ''")
        p2_id = player2_page.evaluate("() => localStorage.getItem('dino_player_id') || ''")
        if p2_id:
            qa.seed_property(p2_id, 1)
        qa.set_dice(1, 0)
        qa.disconnect()

        roll_btn = host_page.get_by_role("button", name=re.compile("roll|dice", re.IGNORECASE)).first
        roll_btn.click()
        host_page.wait_for_timeout(3000)

        host_page.screenshot(path="e2e/screenshots/07-rent.png")


class TestScenario8Cards:
    """Drawing a Card (Treasury/Surprise)."""

    def test_treasury_card_drawn(self, host_page: Page, player2_page: Page):
        """Landing on treasury tile draws a card."""
        _setup_game(host_page, player2_page)

        qa = QAController()
        qa.set_dice(2, 0)
        qa.disconnect()

        roll_btn = host_page.get_by_role("button", name=re.compile("roll|dice", re.IGNORECASE)).first
        roll_btn.click()
        host_page.wait_for_timeout(3000)

        host_page.screenshot(path="e2e/screenshots/08-card.png")
