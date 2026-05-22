import time
import uuid
from dataclasses import dataclass
from typing import Dict, Optional

from utils.security import sign_value, verify_signed_value


SESSION_TTL_SECONDS = 60 * 60 * 24
RECONNECT_TTL_SECONDS = 120


@dataclass
class SessionRecord:
    session_id: str
    player_name: str
    reconnect_token: str
    reconnect_expires_at: int
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
        self.sessions[session_id] = SessionRecord(
            session_id=session_id,
            player_name=player_name,
            reconnect_token=reconnect_token,
            reconnect_expires_at=int(time.time()) + RECONNECT_TTL_SECONDS,
        )
        self.reconnect_index[reconnect_token] = session_id
        return signed

    def resolve_session(self, signed_session_token: str, fallback_name: str) -> SessionRecord:
        session_id = verify_signed_value(signed_session_token) if signed_session_token else None
        if session_id and session_id in self.sessions:
            return self.sessions[session_id]

        new_signed = self.create_session(fallback_name)
        new_session_id = verify_signed_value(new_signed)
        return self.sessions[new_session_id]

    def rotate_reconnect_token(self, session_id: str) -> str:
        record = self.sessions[session_id]
        old = record.reconnect_token
        if old in self.reconnect_index:
            del self.reconnect_index[old]
        token = sign_value(session_id, RECONNECT_TTL_SECONDS)
        record.reconnect_token = token
        record.reconnect_expires_at = int(time.time()) + RECONNECT_TTL_SECONDS
        self.reconnect_index[token] = session_id
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


session_manager = SessionManager()
