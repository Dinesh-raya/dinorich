import sqlite3
import os

DB_PATH = os.path.join(os.path.dirname(__file__), 'game_data.sqlite')

def init_db():
    conn = sqlite3.connect(DB_PATH)
    conn.execute('PRAGMA journal_mode=WAL')
    cursor = conn.cursor()
    
    # Create tables
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
        FOREIGN KEY(room_code) REFERENCES rooms(room_code)
    )
    ''')
    
    conn.commit()
    conn.close()

def get_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn
