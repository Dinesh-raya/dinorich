import secrets
import string

def generate_room_code(length: int = 5) -> str:
    """Generate a random uppercase alphanumeric string for room invites."""
    chars = string.ascii_uppercase + string.digits
    return ''.join(secrets.choice(chars) for _ in range(length))
