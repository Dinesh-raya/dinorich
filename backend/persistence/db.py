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
    
    # Run migrations
    run_migrations(conn)
    conn.close()

def migration_1(conn):
    cursor = conn.cursor()
    import json
    # 1. Update rooms starting_cash
    cursor.execute('SELECT room_code, state_json FROM rooms')
    rooms = cursor.fetchall()
    for room in rooms:
        room_code = room[0]
        try:
            data = json.loads(room[1])
            if 'settings' in data and 'starting_cash' in data['settings']:
                cash = data['settings']['starting_cash']
                if cash > 100000:
                    data['settings']['starting_cash'] = 100000
                    cursor.execute('UPDATE rooms SET state_json = ? WHERE room_code = ?', (json.dumps(data), room_code))
        except Exception as e:
            print(f"Migration 1 error in room {room_code}: {e}")

    # 2. Update games room settings starting_cash
    cursor.execute('SELECT room_code, state_json FROM games')
    games = cursor.fetchall()
    for game in games:
        room_code = game[0]
        try:
            data = json.loads(game[1])
            if 'room' in data and 'settings' in data['room'] and 'starting_cash' in data['room']['settings']:
                cash = data['room']['settings']['starting_cash']
                if cash > 100000:
                    data['room']['settings']['starting_cash'] = 100000
                    cursor.execute('UPDATE games SET state_json = ? WHERE room_code = ?', (json.dumps(data), room_code))
        except Exception as e:
            print(f"Migration 1 error in game {room_code}: {e}")

def run_migrations(conn):
    cursor = conn.cursor()
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS schema_version (
        version INTEGER PRIMARY KEY
    )
    ''')
    cursor.execute('SELECT version FROM schema_version')
    row = cursor.fetchone()
    if row is None:
        cursor.execute('INSERT INTO schema_version (version) VALUES (0)')
        conn.commit()
        current_version = 0
    else:
        current_version = row[0]

    migrations = {
        1: migration_1,
    }

    for version, migration_fn in sorted(migrations.items()):
        if version > current_version:
            print(f"Running database migration {version}...")
            try:
                migration_fn(conn)
                cursor.execute('UPDATE schema_version SET version = ?', (version,))
                conn.commit()
                current_version = version
                print(f"Database migration {version} completed successfully.")
            except Exception as e:
                conn.rollback()
                print(f"Database migration {version} failed: {e}")
                raise e

def get_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def with_db_lock(fn):
    """Execute a function with the DB write lock held."""
    with _db_lock:
        return fn()
