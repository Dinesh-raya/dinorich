"""E2E tests for infrastructure scenarios 16-18.

Scenario 16: Mobile Responsiveness
Scenario 17: LAN Multiplayer (two tabs, room create + join)
Scenario 18: Reconnection after page refresh
"""
import pytest
from playwright.sync_api import Page, BrowserContext

FRONTEND_URL = "http://localhost:3100"


# ---------------------------------------------------------------------------
# Scenario 16 — Mobile Responsiveness
# ---------------------------------------------------------------------------
class TestMobileResponsiveness:
    """Verify the game renders correctly on a mobile viewport (375x667)."""

    def test_mobile_page_loads(self, browser_context: BrowserContext):
        """Page loads successfully at mobile viewport size."""
        page = browser_context.new_page(viewport={"width": 375, "height": 667})
        try:
            page.goto(FRONTEND_URL)
            page.wait_for_load_state("networkidle")
            title = page.title()
            assert title, f"Page title is empty on mobile viewport"
            page.screenshot(path="e2e/screenshots/mobile-page-loaded.png")
        finally:
            page.close()

    def test_mobile_no_horizontal_overflow(self, browser_context: BrowserContext):
        """No horizontal scrollbar — content fits within 375px width."""
        page = browser_context.new_page(viewport={"width": 375, "height": 667})
        try:
            page.goto(FRONTEND_URL)
            page.wait_for_load_state("networkidle")

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
        page = browser_context.new_page(viewport={"width": 375, "height": 667})
        try:
            page.goto(FRONTEND_URL)
            page.wait_for_load_state("networkidle")

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
        host = browser_context.new_page()
        guest = browser_context.new_page()
        try:
            # --- Host creates room ---
            host.goto(FRONTEND_URL)
            host.wait_for_load_state("networkidle")

            # Fill in host name
            name_input = host.locator('input[type="text"], input[placeholder*="name" i], input[placeholder*="Name" i]').first
            name_input.wait_for(state="visible", timeout=10_000)
            name_input.fill("HostPlayer")

            # Click Create Room
            create_btn = host.locator('button:has-text("Create"), button:has-text("create")').first
            create_btn.wait_for(state="visible", timeout=5_000)
            create_btn.click()

            # Wait for lobby / room code to appear
            host.wait_for_timeout(2_000)
            host.screenshot(path="e2e/screenshots/lan-host-lobby.png")

            # Extract room code from the page
            room_code = host.evaluate("""() => {
                // Try common patterns: data attribute, text content with 4-6 char code
                const el = document.querySelector('[data-room-code]');
                if (el) return el.getAttribute('data-room-code') || el.textContent.trim();

                // Look for a short alphanumeric text that looks like a room code
                const allText = document.body.innerText;
                const match = allText.match(/\\b[A-Z0-9]{4,6}\\b/);
                return match ? match[0] : null;
            }""")
            assert room_code, "Could not extract room code from host lobby page"

            # --- Guest joins room ---
            guest.goto(FRONTEND_URL)
            guest.wait_for_load_state("networkidle")

            guest_name = guest.locator('input[type="text"], input[placeholder*="name" i], input[placeholder*="Name" i]').first
            guest_name.wait_for(state="visible", timeout=10_000)
            guest_name.fill("GuestPlayer")

            # Click Join Room
            join_btn = guest.locator('button:has-text("Join"), button:has-text("join")').first
            join_btn.wait_for(state="visible", timeout=5_000)
            join_btn.click()

            # Enter room code if prompted
            code_input = guest.locator(
                'input[placeholder*="code" i], input[placeholder*="room" i], input[placeholder*="Code" i], input[placeholder*="Room" i]'
            ).first
            try:
                code_input.wait_for(state="visible", timeout=5_000)
                code_input.fill(room_code)
                confirm_btn = guest.locator('button:has-text("Join"), button:has-text("OK"), button:has-text("Confirm")').first
                confirm_btn.click()
            except Exception:
                # Room code may have been auto-filled or join flow is different
                pass

            guest.wait_for_timeout(2_000)
            guest.screenshot(path="e2e/screenshots/lan-guest-joined.png")

            # --- Verify both players visible on host ---
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
        """Create a room, refresh, verify the player reconnects to the same room."""
        page = browser_context.new_page()
        try:
            # --- Create room ---
            page.goto(FRONTEND_URL)
            page.wait_for_load_state("networkidle")

            name_input = page.locator('input[type="text"], input[placeholder*="name" i], input[placeholder*="Name" i]').first
            name_input.wait_for(state="visible", timeout=10_000)
            name_input.fill("ReconnectPlayer")

            create_btn = page.locator('button:has-text("Create"), button:has-text("create")').first
            create_btn.wait_for(state="visible", timeout=5_000)
            create_btn.click()

            page.wait_for_timeout(2_000)
            page.screenshot(path="e2e/screenshots/reconnect-before-refresh.png")

            # Capture the room code before refresh
            room_code_before = page.evaluate("""() => {
                const el = document.querySelector('[data-room-code]');
                if (el) return el.getAttribute('data-room-code') || el.textContent.trim();
                const allText = document.body.innerText;
                const match = allText.match(/\\b[A-Z0-9]{4,6}\\b/);
                return match ? match[0] : null;
            }""")
            assert room_code_before, "Could not capture room code before refresh"

            # --- Refresh the page ---
            page.reload()
            page.wait_for_load_state("networkidle")
            page.wait_for_timeout(3_000)
            page.screenshot(path="e2e/screenshots/reconnect-after-refresh.png")

            # --- Verify reconnection ---
            # The player should either be back in the same room or see the room code
            room_code_after = page.evaluate("""() => {
                const el = document.querySelector('[data-room-code]');
                if (el) return el.getAttribute('data-room-code') || el.textContent.trim();
                const allText = document.body.innerText;
                const match = allText.match(/\\b[A-Z0-9]{4,6}\\b/);
                return match ? match[0] : null;
            }""")

            # Check if the page still shows the player name (indicates session restored)
            page_text = page.inner_text("body")
            name_visible = "ReconnectPlayer" in page_text or "reconnectplayer" in page_text.lower()
            room_restored = room_code_after == room_code_before

            assert name_visible or room_restored, (
                f"Reconnection failed — room code before: {room_code_before}, "
                f"after: {room_code_after}, name visible: {name_visible}"
            )

        finally:
            page.close()
