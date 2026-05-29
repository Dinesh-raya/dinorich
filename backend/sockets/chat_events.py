import logging
from sockets.server import sio
from rooms.manager import room_manager
from services.rate_limiter import rate_limiter
from sockets.helpers import require_session

logger = logging.getLogger(__name__)

ALLOWED_MESSAGES = {
    "Nice!": "👍",
    "Ouch!": "😣",
    "GG": "🏆",
    "Hurry up!": "⏰",
    "Good game!": "🎉",
}


@sio.on('chat:quick')
async def chat_quick(sid, data):
    """Broadcast a quick chat message to all players in the room."""
    try:
        session = await require_session(sid, "chat_quick")
        if not session:
            return {"status": "error", "message": "Not authenticated"}
        session_id = session["session_id"]
        if not rate_limiter.allow(f"{session_id}:chat_quick"):
            return {"status": "error", "message": "Too many requests"}

        room_code = room_manager.get_player_room_code(session_id)
        if not room_code:
            return {"status": "error", "message": "Not in a room"}

        room = room_manager.get_room(room_code)
        if not room:
            return {"status": "error", "message": "Room not found"}

        # Validate message
        message = (data or {}).get("message", "")
        if message not in ALLOWED_MESSAGES:
            return {"status": "error", "message": "Invalid quick message"}

        player = room.players.get(session_id)
        if not player:
            return {"status": "error", "message": "Player not found"}

        emoji = ALLOWED_MESSAGES[message]

        # Broadcast to all players in the room
        await sio.emit(
            "chat:quick_message",
            {
                "player_id": session_id,
                "player_name": player.name,
                "message": message,
                "emoji": emoji,
                "color": player.color,
            },
            room=room_code,
        )
        return {"status": "success"}
    except Exception as exc:
        logger.error(f"Quick chat error: {exc}", exc_info=True)
        return {"status": "error", "message": "Failed to send message"}
