import sqlite3
import os
import threading

DB_PATH = os.path.join(os.path.dirname(__file__), 'game_data.sqlite')

# Lock to prevent concurrent write errors (SQLITE_BUSY)
_db_lock = threading.Lock()

def init_db():
    conn = sqlite3.connect(DB_PATH)
    conn.execute('PRAGMA journal_mode=WAL')
    cursor = conn.cursor()

    cursor.execute('''
    CREATE TABLE IF NOT EXISTS rooms (
        room_code TEXT PRIMARY KEY,
        state_json TEXT NOT NULL
    )
    ''')

    cursor.execute('''
    CREATE TABLE IF NOT EXISTS games (
        room_code TEXT PRIMARY KEY,
        state_json TEXT NOT NULL,
        turn_json TEXT NOT NULL,
        runtime_json TEXT NOT NULL DEFAULT '{}',
        FOREIGN KEY(room_code) REFERENCES rooms(room_code)
    )
    ''')

    cursor.execute('''
    CREATE TABLE IF NOT EXISTS sessions (
        session_id TEXT PRIMARY KEY,
        player_name TEXT NOT NULL,
        reconnect_token TEXT NOT NULL,
        reconnect_expires_at INTEGER NOT NULL,
        created_at INTEGER NOT NULL,
        room_code TEXT
    )
    ''')

    cursor.execute('''
    CREATE INDEX IF NOT EXISTS idx_sessions_reconnect
    ON sessions(reconnect_token)
    ''')

    # Handle existing databases that lack the runtime_json column
    try:
        cursor.execute('ALTER TABLE games ADD COLUMN runtime_json TEXT NOT NULL DEFAULT \'{}\'')
    except Exception:
        pass

    conn.commit()
    conn.close()

def get_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def with_db_lock(fn):
    """Execute a function with the DB write lock held."""
    with _db_lock:
        return fn()
