"""Smoke test: verify the frontend loads and renders correctly."""
import pytest
from playwright.sync_api import Page


def test_frontend_loads(host_page: Page):
    """The frontend page should load and display the game title."""
    host_page.wait_for_load_state("networkidle")
    title = host_page.title()
    assert "DINO" in title.upper(), f"Expected 'DINO' in page title, got: {title}"
    host_page.screenshot(path="e2e/screenshots/smoke-frontend-loaded.png")


def test_health_endpoint_reachable(host_page: Page):
    """The backend health endpoint should be reachable from the frontend."""
    import urllib.request
    import json

    resp = urllib.request.urlopen("http://127.0.0.1:8100/health", timeout=5)
    data = json.loads(resp.read())
    assert data.get("status") in ("ok", "degraded"), f"Unexpected health status: {data}"
