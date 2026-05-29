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

# Ensure e2e/ is on sys.path so qa_helpers can be imported when running from project root
_e2e_dir = os.path.dirname(__file__)
if _e2e_dir not in sys.path:
    sys.path.insert(0, _e2e_dir)

# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------
PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
BACKEND_DIR = os.path.join(PROJECT_ROOT, "backend")
FRONTEND_DIR = os.path.join(PROJECT_ROOT, "frontend")

BACKEND_PORT = 8100
FRONTEND_PORT = 3100
BACKEND_URL = f"http://127.0.0.1:{BACKEND_PORT}"
FRONTEND_URL = f"http://127.0.0.1:{FRONTEND_PORT}"

HEALTH_TIMEOUT = 30  # seconds to wait for servers


def _kill_port_processes(port: int):
    """Kill any process listening on the given port (Windows)."""
    try:
        result = subprocess.run(
            ["netstat", "-ano"], capture_output=True, text=True, timeout=5
        )
        for line in result.stdout.splitlines():
            if f":{port}" in line and "LISTENING" in line:
                pid = line.strip().split()[-1]
                if pid.isdigit() and int(pid) != os.getpid():
                    try:
                        os.kill(int(pid), signal.SIGTERM)
                    except (OSError, ProcessLookupError):
                        pass
    except Exception:
        pass


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
    _kill_port_processes(BACKEND_PORT)
    env = os.environ.copy()
    env["DINO_CORS_ORIGINS"] = "*"
    env["E2E_TESTING"] = "1"
    proc = subprocess.Popen(
        [sys.executable, "-m", "uvicorn", "main:socket_app",
         "--host", "127.0.0.1", "--port", str(BACKEND_PORT)],
        cwd=BACKEND_DIR,
        env=env,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
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
    _kill_port_processes(FRONTEND_PORT)
    # Write .env.e2e so Vite picks up the backend URL
    env_file = os.path.join(FRONTEND_DIR, ".env.e2e")
    with open(env_file, "w") as f:
        f.write(f"VITE_API_URL={BACKEND_URL}\n")
    env = os.environ.copy()
    env["VITE_API_URL"] = BACKEND_URL
    proc = subprocess.Popen(
        ["npm", "run", "dev", "--", "--port", str(FRONTEND_PORT), "--mode", "e2e"],
        cwd=FRONTEND_DIR,
        env=env,
        shell=True,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
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
        # Clean up .env.e2e
        try:
            os.remove(env_file)
        except OSError:
            pass


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
    page.add_init_script("localStorage.clear(); localStorage.setItem('dino_tutorial_done', 'true')")
    page.goto(FRONTEND_URL)
    page.wait_for_load_state("domcontentloaded")
    page.wait_for_selector('[placeholder="Enter your name"]', timeout=15000)
    yield page
    page.close()


@pytest.fixture()
def player2_page(browser_context):
    """A fresh browser page for a second player."""
    page = browser_context.new_page()
    page.add_init_script("localStorage.clear(); localStorage.setItem('dino_tutorial_done', 'true')")
    page.goto(FRONTEND_URL)
    page.wait_for_load_state("domcontentloaded")
    page.wait_for_selector('[placeholder="Enter your name"]', timeout=15000)
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


@pytest.fixture(autouse=False)
def _reset_backend_state(backend_server):
    """Reset all backend rooms/games between tests for isolation. Disabled by default."""
    import urllib.request
    import time as _time
    try:
        req = urllib.request.Request(
            f"{BACKEND_URL}/qa/reset",
            method="POST",
            headers={"Content-Type": "application/json"},
            data=b"{}",
        )
        urllib.request.urlopen(req, timeout=5)
        _time.sleep(0.3)
    except Exception:
        pass
    yield
