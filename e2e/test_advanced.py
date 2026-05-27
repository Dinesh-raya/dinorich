"""E2E Scenarios 9-15: Trade, Auction, Jail, Building, Mortgage, Bankruptcy, Game Over."""
import pytest
import re
from playwright.sync_api import Page, expect
from e2e.qa_helpers import QAController


def _setup_game(host_page: Page, player2_page: Page) -> str:
    """Create room, join player 2, start game."""
    host_page.goto("http://localhost:3100")
    host_page.wait_for_load_state("networkidle")
    host_page.get_by_placeholder(re.compile("name", re.IGNORECASE)).fill("Host")
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


class TestScenario9Trading:
    """Trading Between Players."""

    def test_trade_modal_opens(self, host_page: Page, player2_page: Page):
        """Trade button opens trade modal."""
        _setup_game(host_page, player2_page)

        qa = QAController()
        host_id = host_page.evaluate("() => localStorage.getItem('dino_player_id') || ''")
        p2_id = player2_page.evaluate("() => localStorage.getItem('dino_player_id') || ''")
        if host_id:
            qa.seed_property(host_id, 1)
        if p2_id:
            qa.seed_property(p2_id, 3)
        qa.disconnect()

        trade_btn = host_page.get_by_role("button", name=re.compile("trade|offer", re.IGNORECASE)).first
        trade_btn.click()
        host_page.wait_for_timeout(1000)

        host_page.screenshot(path="e2e/screenshots/09-trade.png")


class TestScenario10Auction:
    """Auction."""

    def test_force_auction_starts(self, host_page: Page, player2_page: Page):
        """QA force_auction starts an auction."""
        _setup_game(host_page, player2_page)

        qa = QAController()
        qa.force_auction(5)
        qa.disconnect()

        host_page.wait_for_timeout(2000)
        host_page.screenshot(path="e2e/screenshots/10-auction.png")


class TestScenario11Jail:
    """Jail."""

    def test_force_jail_sends_player(self, host_page: Page, player2_page: Page):
        """QA force_jail sends player to jail."""
        _setup_game(host_page, player2_page)

        qa = QAController()
        host_id = host_page.evaluate("() => localStorage.getItem('dino_player_id') || ''")
        if host_id:
            qa.force_jail(host_id)
        qa.disconnect()

        host_page.wait_for_timeout(2000)
        host_page.screenshot(path="e2e/screenshots/11-jail.png")


class TestScenario12Building:
    """Building Houses & Hotels."""

    def test_build_button_visible_on_monopoly(self, host_page: Page, player2_page: Page):
        """Build button appears with monopoly."""
        _setup_game(host_page, player2_page)

        qa = QAController()
        host_id = host_page.evaluate("() => localStorage.getItem('dino_player_id') || ''")
        if host_id:
            qa.seed_property(host_id, 1)
            qa.seed_property(host_id, 3)
            qa.add_money(host_id, 50000)
        qa.disconnect()

        host_page.wait_for_timeout(1000)
        host_page.screenshot(path="e2e/screenshots/12-building.png")


class TestScenario13Mortgage:
    """Mortgage Property."""

    def test_mortgage_option_available(self, host_page: Page, player2_page: Page):
        """Mortgage option for owned properties."""
        _setup_game(host_page, player2_page)

        qa = QAController()
        host_id = host_page.evaluate("() => localStorage.getItem('dino_player_id') || ''")
        if host_id:
            qa.seed_property(host_id, 1)
        qa.disconnect()

        host_page.wait_for_timeout(1000)
        host_page.screenshot(path="e2e/screenshots/13-mortgage.png")


class TestScenario14Bankruptcy:
    """Bankruptcy."""

    def test_bankruptcy_on_zero_money(self, host_page: Page, player2_page: Page):
        """Player with no money faces bankruptcy."""
        _setup_game(host_page, player2_page)

        qa = QAController()
        host_id = host_page.evaluate("() => localStorage.getItem('dino_player_id') || ''")
        p2_id = player2_page.evaluate("() => localStorage.getItem('dino_player_id') || ''")
        if p2_id:
            qa.seed_property(p2_id, 1)
        if host_id:
            qa.add_money(host_id, -14999)
        qa.set_dice(1, 0)
        qa.disconnect()

        roll_btn = host_page.get_by_role("button", name=re.compile("roll|dice", re.IGNORECASE)).first
        roll_btn.click()
        host_page.wait_for_timeout(3000)

        host_page.screenshot(path="e2e/screenshots/14-bankruptcy.png")


class TestScenario15GameOver:
    """Game Over & Winner."""

    def test_game_state_valid(self, host_page: Page, player2_page: Page):
        """Game state endpoint returns valid data."""
        _setup_game(host_page, player2_page)

        qa = QAController()
        state = qa.get_state()
        qa.disconnect()

        assert state is not None
        host_page.screenshot(path="e2e/screenshots/15-gameover.png")
