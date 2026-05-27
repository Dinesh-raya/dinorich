"""Playwright E2E test fixtures for DINO-RICHUP.

Starts backend (port 8100) and frontend (port 3100) for the test session,
provides browser contexts and pages for host/player2, and a QAController
socket connection for deterministic test setup.
"""
import os
import sys
import time
import signal
import subprocess
import pytest
import socketio as sio_lib

# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------
PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
BACKEND_DIR = os.path.join(PROJECT_ROOT, "backend")
FRONTEND_DIR = os.path.join(PROJECT_ROOT, "frontend")

BACKEND_PORT = 8100
FRONTEND_PORT = 3100
BACKEND_URL = f"http://127.0.0.1:{BACKEND_PORT}"
FRONTEND_URL = f"http://localhost:{FRONTEND_PORT}"

HEALTH_TIMEOUT = 30  # seconds to wait for servers


def _wait_for_url(url: str, timeout: int = HEALTH_TIMEOUT):
    """Block until a GET to url returns 200, or raise on timeout."""
    import urllib.request
    import urllib.error

    deadline = time.monotonic() + timeout
    while time.monotonic() < deadline:
        try:
            req = urllib.request.urlopen(url, timeout=2)
            if req.status == 200:
                return
        except (urllib.error.URLError, OSError, ConnectionError):
            pass
        time.sleep(0.5)
    raise RuntimeError(f"Server at {url} did not become healthy within {timeout}s")


# ---------------------------------------------------------------------------
# Server fixtures (session-scoped)
# ---------------------------------------------------------------------------
@pytest.fixture(scope="session")
def backend_server():
    """Start the backend uvicorn server on :8100."""
    env = os.environ.copy()
    env["DINO_CORS_ORIGINS"] = "*"
    proc = subprocess.Popen(
        [sys.executable, "-m", "uvicorn", "main:socket_app",
         "--host", "127.0.0.1", "--port", str(BACKEND_PORT)],
        cwd=BACKEND_DIR,
        env=env,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
    )
    try:
        _wait_for_url(f"{BACKEND_URL}/health")
        yield proc
    finally:
        proc.terminate()
        try:
            proc.wait(timeout=5)
        except subprocess.TimeoutExpired:
            proc.kill()
            proc.wait()


@pytest.fixture(scope="session")
def frontend_server():
    """Start the Vite dev server on :3100."""
    env = os.environ.copy()
    env["VITE_API_URL"] = BACKEND_URL
    proc = subprocess.Popen(
        ["npm", "run", "dev", "--", "--port", str(FRONTEND_PORT)],
        cwd=FRONTEND_DIR,
        env=env,
        shell=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
    )
    try:
        _wait_for_url(FRONTEND_URL)
        yield proc
    finally:
        proc.terminate()
        try:
            proc.wait(timeout=5)
        except subprocess.TimeoutExpired:
            proc.kill()
            proc.wait()


@pytest.fixture(scope="session")
def servers(backend_server, frontend_server):
    """Ensure both servers are up before tests run."""
    return backend_server, frontend_server


# ---------------------------------------------------------------------------
# Playwright browser fixtures
# ---------------------------------------------------------------------------
@pytest.fixture(scope="session")
def browser_context(servers):
    """Create a Playwright Chromium browser context (session-scoped)."""
    from playwright.sync_api import sync_playwright

    pw = sync_playwright().start()
    browser = pw.chromium.launch(headless=True)
    context = browser.new_context()
    context.set_default_timeout(10_000)
    yield context
    context.close()
    browser.close()
    pw.stop()


@pytest.fixture()
def host_page(browser_context):
    """A fresh browser page for the host player."""
    page = browser_context.new_page()
    page.goto(FRONTEND_URL)
    yield page
    page.close()


@pytest.fixture()
def player2_page(browser_context):
    """A fresh browser page for a second player."""
    page = browser_context.new_page()
    page.goto(FRONTEND_URL)
    yield page
    page.close()


# ---------------------------------------------------------------------------
# QA Controller fixture
# ---------------------------------------------------------------------------
@pytest.fixture()
def qa_controller(backend_server):
    """A connected QAController for deterministic game state manipulation."""
    from qa_helpers import QAController

    controller = QAController()
    yield controller
    controller.disconnect()
