"""Input validation utilities for player-facing data."""
import re

PLAYER_NAME_MAX_LENGTH = 20
ROOM_CODE_LENGTH = 5
ROOM_CODE_PATTERN = re.compile(r'^[A-Z0-9]{5}$')
PLAYER_NAME_PATTERN = re.compile(r'^[a-zA-Z0-9_ -]+$')
_HTML_TAG_RE = re.compile(r'<[^>]+>')


def sanitize_player_name(raw_name: str) -> str:
    """Strip HTML tags and whitespace from a player name."""
    cleaned = _HTML_TAG_RE.sub('', raw_name)
    return cleaned.strip()


def validate_player_name(name: str) -> str | None:
    """
    Validate a player name. Returns an error message string if invalid, or None if valid.
    Rules:
      - Not empty after stripping
      - Max 20 characters
      - Only alphanumeric, underscore, space, hyphen
      - HTML tags stripped before validation
    """
    cleaned = sanitize_player_name(name)
    if not cleaned:
        return "Player name cannot be empty"
    if len(cleaned) > PLAYER_NAME_MAX_LENGTH:
        return f"Player name must be {PLAYER_NAME_MAX_LENGTH} characters or fewer"
    if not PLAYER_NAME_PATTERN.match(cleaned):
        return "Player name can only contain letters, numbers, spaces, underscores, and hyphens"
    return None


def validate_room_code(code: str) -> str | None:
    """
    Validate a room code. Returns an error message string if invalid, or None if valid.
    Must be exactly 5 uppercase alphanumeric characters.
    """
    if not code:
        return "Room code cannot be empty"
    normalized = code.upper().strip()
    if not ROOM_CODE_PATTERN.match(normalized):
        return "Room code must be exactly 5 alphanumeric characters"
    return None
