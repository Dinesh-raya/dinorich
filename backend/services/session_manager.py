import time
import uuid
from dataclasses import dataclass
from typing import Dict, Optional, List

from utils.security import sign_value, verify_signed_value
from persistence.repository import save_session, delete_session, update_session_room, load_sessions


SESSION_TTL_SECONDS = 60 * 60 * 24
RECONNECT_TTL_SECONDS = 120


@dataclass
class SessionRecord:
    session_id: str
    player_name: str
    reconnect_token: str
    reconnect_expires_at: int
    created_at: int = 0
    room_code: Optional[str] = None
    player_socket_id: Optional[str] = None


class SessionManager:
    def __init__(self) -> None:
        self.sessions: Dict[str, SessionRecord] = {}
        self.reconnect_index: Dict[str, str] = {}

    def create_session(self, player_name: str) -> str:
        session_id = str(uuid.uuid4())
        signed = sign_value(session_id, SESSION_TTL_SECONDS)
        reconnect_token = sign_value(session_id, RECONNECT_TTL_SECONDS)
        now = int(time.time())
        record = SessionRecord(
            session_id=session_id,
            player_name=player_name,
            reconnect_token=reconnect_token,
            reconnect_expires_at=now + RECONNECT_TTL_SECONDS,
            created_at=now,
        )
        self.sessions[session_id] = record
        self.reconnect_index[reconnect_token] = session_id
        save_session(session_id, player_name, reconnect_token,
                     record.reconnect_expires_at, now)
        return signed

    def resolve_session(self, signed_session_token: str, fallback_name: str) -> tuple[SessionRecord, str]:
        session_id = verify_signed_value(signed_session_token) if signed_session_token else None
        if session_id and session_id in self.sessions:
            return self.sessions[session_id], signed_session_token

        new_signed = self.create_session(fallback_name)
        new_session_id = verify_signed_value(new_signed)
        return self.sessions[new_session_id], new_signed

    def set_room_code(self, session_id: str, room_code: str):
        record = self.sessions.get(session_id)
        if record:
            record.room_code = room_code
            update_session_room(session_id, room_code)

    def rotate_reconnect_token(self, session_id: str) -> str:
        record = self.sessions[session_id]
        old = record.reconnect_token
        if old in self.reconnect_index:
            del self.reconnect_index[old]
        token = sign_value(session_id, RECONNECT_TTL_SECONDS)
        record.reconnect_token = token
        record.reconnect_expires_at = int(time.time()) + RECONNECT_TTL_SECONDS
        self.reconnect_index[token] = session_id
        save_session(session_id, record.player_name, token,
                     record.reconnect_expires_at, record.created_at, record.room_code)
        return token

    def consume_reconnect_token(self, reconnect_token: str) -> Optional[SessionRecord]:
        session_id = verify_signed_value(reconnect_token)
        if not session_id:
            return None
        known = self.reconnect_index.get(reconnect_token)
        if not known or known != session_id:
            return None
        record = self.sessions.get(session_id)
        if not record:
            return None
        if record.reconnect_expires_at < int(time.time()):
            return None
        # Invalidate token immediately to prevent reuse
        del self.reconnect_index[reconnect_token]
        return record

    def cleanup_expired(self) -> int:
        now = int(time.time())
        expired_ids = [
            sid for sid, rec in self.sessions.items()
            if now - rec.created_at > SESSION_TTL_SECONDS
        ]
        for sid in expired_ids:
            rec = self.sessions.pop(sid, None)
            if rec and rec.reconnect_token in self.reconnect_index:
                del self.reconnect_index[rec.reconnect_token]
            delete_session(sid)
        return len(expired_ids)

    def load_from_db(self):
        """Restore sessions from database on server startup."""
        rows = load_sessions()
        for row in rows:
            record = SessionRecord(
                session_id=row["session_id"],
                player_name=row["player_name"],
                reconnect_token=row["reconnect_token"],
                reconnect_expires_at=row["reconnect_expires_at"],
                created_at=row["created_at"],
                room_code=row.get("room_code"),
            )
            self.sessions[record.session_id] = record
            self.reconnect_index[record.reconnect_token] = record.session_id
        return len(rows)


session_manager = SessionManager()
