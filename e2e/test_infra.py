"""E2E tests for infrastructure scenarios 16-18.

Scenario 16: Mobile Responsiveness
Scenario 17: LAN Multiplayer (two tabs, room create + join)
Scenario 18: Reconnection after page refresh
"""
import re
import pytest
from playwright.sync_api import Page, BrowserContext

from e2e.conftest import FRONTEND_URL


# ---------------------------------------------------------------------------
# Scenario 16 — Mobile Responsiveness
# ---------------------------------------------------------------------------
class TestMobileResponsiveness:
    """Verify the game renders correctly on a mobile viewport (375x667)."""

    def test_mobile_page_loads(self, browser_context: BrowserContext):
        """Page loads successfully at mobile viewport size."""
        page = browser_context.new_page()
        page.set_viewport_size({"width": 375, "height": 667})
        try:
            page.goto(FRONTEND_URL)
            page.wait_for_load_state("domcontentloaded")
            page.wait_for_selector('[placeholder*="name" i]', timeout=15000)
            title = page.title()
            assert title, f"Page title is empty on mobile viewport"
            page.screenshot(path="e2e/screenshots/mobile-page-loaded.png")
        finally:
            page.close()

    def test_mobile_no_horizontal_overflow(self, browser_context: BrowserContext):
        """No horizontal scrollbar — content fits within 375px width."""
        page = browser_context.new_page()
        page.set_viewport_size({"width": 375, "height": 667})
        try:
            page.goto(FRONTEND_URL)
            page.wait_for_load_state("domcontentloaded")
            page.wait_for_selector('[placeholder*="name" i]', timeout=15000)

            has_overflow = page.evaluate(
                "() => document.documentElement.scrollWidth > window.innerWidth"
            )
            assert not has_overflow, (
                "Horizontal overflow detected — document scrollWidth exceeds viewport width"
            )
            page.screenshot(path="e2e/screenshots/mobile-no-overflow.png")
        finally:
            page.close()

    def test_mobile_controls_visible(self, browser_context: BrowserContext):
        """Key UI elements (name input, create/join buttons) are visible on mobile."""
        page = browser_context.new_page()
        page.set_viewport_size({"width": 375, "height": 667})
        try:
            page.goto(FRONTEND_URL)
            page.wait_for_load_state("domcontentloaded")
            page.wait_for_selector('[placeholder*="name" i]', timeout=15000)

            # The lobby should have at least a name input or action button visible
            visible_interactive = page.evaluate("""() => {
                const inputs = document.querySelectorAll('input, button');
                let count = 0;
                for (const el of inputs) {
                    const rect = el.getBoundingClientRect();
                    if (rect.width > 0 && rect.height > 0 &&
                        rect.right <= window.innerWidth + 1 &&
                        rect.bottom <= window.innerHeight + 1) {
                        count++;
                    }
                }
                return count;
            }""")
            assert visible_interactive > 0, (
                f"No interactive elements visible in mobile viewport (found {visible_interactive})"
            )
            page.screenshot(path="e2e/screenshots/mobile-controls-visible.png")
        finally:
            page.close()


# ---------------------------------------------------------------------------
# Scenario 17 — LAN Multiplayer (two tabs, room create + join)
# ---------------------------------------------------------------------------
class TestLANMultiplayer:
    """Two browser tabs create and join the same room, verifying sync."""

    def test_two_players_see_each_other(self, browser_context: BrowserContext):
        """Host creates a room, second player joins — both appear in player list."""
        # Use separate pages from the shared context (each gets isolated storage)
        host = browser_context.new_page()
        guest = browser_context.new_page()
        try:
            # --- Host creates room ---
            host.goto(FRONTEND_URL)
            host.wait_for_load_state("domcontentloaded")
            host.evaluate("localStorage.clear(); localStorage.setItem('dino_tutorial_done', 'true')")
            host.reload()
            host.wait_for_load_state("domcontentloaded")
            host.wait_for_timeout(3000)
            host.screenshot(path="e2e/screenshots/lan-host-after-clear.png")
            host.wait_for_selector('[placeholder="Enter your name"]', timeout=15000)
            host.wait_for_selector("text=CREATE NEW ROOM", timeout=20000)
            host.get_by_placeholder("Enter your name").fill("HostPlayer")
            host.get_by_text("CREATE NEW ROOM").click()

            # Wait for room code
            host.wait_for_timeout(2_000)
            room_code_el = host.locator(".font-mono").first
            room_code_el.wait_for(state="visible", timeout=10_000)
            room_code = room_code_el.text_content().strip()
            assert room_code and len(room_code) >= 4, f"Got room code: '{room_code}'"

            host.screenshot(path="e2e/screenshots/lan-host-lobby.png")

            # --- Guest joins room ---
            guest.goto(FRONTEND_URL)
            guest.wait_for_load_state("domcontentloaded")
            guest.evaluate("localStorage.clear(); localStorage.setItem('dino_tutorial_done', 'true')")
            guest.reload()
            guest.wait_for_load_state("domcontentloaded")
            guest.wait_for_selector('[placeholder="Enter your name"]', timeout=15000)
            guest.wait_for_selector("text=CREATE NEW ROOM", timeout=20000)
            guest.wait_for_timeout(2_000)
            guest.get_by_placeholder("Enter your name").fill("GuestPlayer")
            guest.get_by_placeholder("ABCDEF").fill(room_code)
            guest.get_by_text("JOIN ROOM").click()

            guest.wait_for_timeout(2_000)
            guest.screenshot(path="e2e/screenshots/lan-guest-joined.png")

            # --- Verify both players visible on host ---
            host.wait_for_timeout(2_000)
            host_body = host.inner_text("body")
            assert "GuestPlayer" in host_body or "guestplayer" in host_body.lower(), (
                "Host does not see GuestPlayer in the lobby"
            )

            # --- Verify both players visible on guest ---
            guest_body = guest.inner_text("body")
            assert "HostPlayer" in guest_body or "hostplayer" in guest_body.lower(), (
                "Guest does not see HostPlayer in the lobby"
            )

            host.screenshot(path="e2e/screenshots/lan-both-visible-host.png")
            guest.screenshot(path="e2e/screenshots/lan-both-visible-guest.png")

        finally:
            guest.close()
            host.close()


# ---------------------------------------------------------------------------
# Scenario 18 — Reconnection after page refresh
# ---------------------------------------------------------------------------
class TestReconnection:
    """A player who refreshes the page should reconnect to the same room."""

    def test_reconnect_after_refresh(self, browser_context: BrowserContext):
        """After refresh during a game, the player auto-rejoins using localStorage credentials."""
        from e2e.qa_helpers import QAController

        host_page = browser_context.new_page()
        player_page = browser_context.new_page()

        qa = QAController()
        try:
            # --- QA creates room ---
            qa.connect()
            create_res = qa._emit("room:create", {"name": "QAHost"})
            assert create_res.get("status") == "success"
            room_code = create_res["room"]["room_id"]

            qa._emit("room:update_settings", {
                "settings": {
                    "max_players": 6, "starting_cash": 15000,
                    "auction_enabled": True, "double_rent_enabled": True,
                    "mortgage_enabled": True, "free_parking_jackpot": False,
                    "turn_timer_seconds": 30, "random_turn_order": False,
                    "jail_strict_mode": True, "board_theme": "pan_india",
                    "mode": "classic", "disconnect_timeout_seconds": 120,
                    "game_paused": False,
                    "qa_mode": {
                        "enabled": True, "dice_mode": "random",
                        "dice_sequence": [], "fixed_dice": [3, 4],
                        "card_mode": "random", "card_index": 0,
                        "turn_timer_seconds": 5, "auto_buy_disabled": True,
                    },
                }
            })

            # --- Host browser joins ---
            host_page.goto(FRONTEND_URL)
            host_page.wait_for_load_state("domcontentloaded")
            host_page.evaluate("localStorage.clear(); localStorage.setItem('dino_tutorial_done', 'true')")
            host_page.reload()
            host_page.wait_for_load_state("domcontentloaded")
            host_page.wait_for_selector('[placeholder="Enter your name"]', timeout=15000)
            host_page.wait_for_selector("text=CREATE NEW ROOM", timeout=20000)
            host_page.wait_for_timeout(2000)
            host_page.get_by_placeholder("Enter your name").fill("ReconnectPlayer")
            host_page.get_by_placeholder("ABCDEF").fill(room_code)
            host_page.get_by_text("JOIN ROOM").click()

            # --- Player browser joins ---
            player_page.goto(FRONTEND_URL)
            player_page.wait_for_load_state("domcontentloaded")
            player_page.evaluate("localStorage.clear(); localStorage.setItem('dino_tutorial_done', 'true')")
            player_page.reload()
            player_page.wait_for_load_state("domcontentloaded")
            player_page.wait_for_selector('[placeholder="Enter your name"]', timeout=15000)
            player_page.wait_for_selector("text=CREATE NEW ROOM", timeout=20000)
            player_page.wait_for_timeout(2000)
            player_page.get_by_placeholder("Enter your name").fill("OtherPlayer")
            player_page.get_by_placeholder("ABCDEF").fill(room_code)
            player_page.get_by_text("JOIN ROOM").click()

            # Wait for both to join
            host_page.wait_for_url(f"**/room/{room_code}*", timeout=20000)
            player_page.wait_for_url(f"**/room/{room_code}*", timeout=20000)
            qa.wait_for_players(room_code, 3, timeout=20)

            # --- Start game (PLAYING state enables reconnect) ---
            start_res = qa._emit("game:start", {})
            assert start_res.get("status") == "success"
            host_page.wait_for_selector('[title="Trade"]', timeout=20000)

            # Verify reconnect token stored
            has_token = host_page.evaluate("() => !!localStorage.getItem('dino_reconnect_token')")
            has_room = host_page.evaluate("() => !!localStorage.getItem('dino_room_code')")
            assert has_token, "Reconnect token not stored"
            assert has_room, "Room code not stored"

            host_page.screenshot(path="e2e/screenshots/reconnect-before-refresh.png")

            # --- Refresh host page (socket disconnects + reconnects) ---
            host_page.reload()
            host_page.wait_for_load_state("domcontentloaded")

            # Wait for socket reconnect + auto-rejoin + game state restore
            host_page.wait_for_timeout(8_000)
            host_page.screenshot(path="e2e/screenshots/reconnect-after-refresh.png")

            # --- Verify player is back in the game ---
            page_text = host_page.inner_text("body")
            has_game = "Trade" in page_text or "ROLL" in page_text or "₹" in page_text
            has_reconnect_ui = "Reconnecting" in page_text or "reconnect" in page_text.lower()

            assert has_game or has_reconnect_ui, (
                f"Player not back in game after reconnect. Page: {page_text[:500]}"
            )

        finally:
            qa.disconnect()
            player_page.close()
            host_page.close()
