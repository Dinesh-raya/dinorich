from sockets.server import sio
from rooms.manager import room_manager
import asyncio
import logging
from typing import Dict
from services.session_manager import session_manager
from services.rate_limiter import rate_limiter

logger = logging.getLogger(__name__)
from constants.game_rules import GameRules
from sockets.events import CONNECTION_EVENTS, ROOM_EVENTS
from sockets.helpers import emit_game_state, persist_room, persist_game
from schemas.room import RoomStatus
from utils.name_generator import get_random_name

# Track disconnect timeout tasks so they can be cancelled on reconnect
_disconnect_tasks: Dict[str, asyncio.Task] = {}

@sio.event
async def connect(sid, environ, auth):
    # Rate limit by client IP to prevent connection flooding
    client_ip = environ.get("REMOTE_ADDR", "unknown")
    if not rate_limiter.allow(f"connect:{client_ip}"):
        logger.warning(f"Connection rate limited for IP {client_ip}")
        raise ConnectionRefusedError("Too many connection attempts")

    logger.info(f"Client connected: {sid}")
    auth = auth or {}
    requested_name = auth.get("name") or get_random_name()
    signed_session_token = auth.get("sessionToken", "")
    session, signed_token = session_manager.resolve_session(signed_session_token, requested_name)
    session.player_socket_id = sid
    session_id = session.session_id
    
    await sio.save_session(
        sid,
        {
            "session_id": session_id,
            "player_name": session.player_name,
            "session_token": signed_token,
        },
    )

    # Register the socket with RoomManager
    room_manager.register_socket(sid, session_id)
    # Join a private room for this session to allow direct messaging
    await sio.enter_room(sid, session_id)

    # Cancel any disconnect timeout for reconnecting players
    # Check if this session was previously in a room
    room_code = session.room_code
    if room_code:
        room = room_manager.get_room(room_code)
        if room:
            # Cancel disconnect task if exists (by session_id)
            if session_id in _disconnect_tasks:
                _disconnect_tasks[session_id].cancel()
                del _disconnect_tasks[session_id]
                logger.info(f"Disconnect timeout cancelled for session {session_id} in room {room_code}")

            # Auto-reconnect player if in an active game
            if room.status == RoomStatus.PLAYING and session_id in room.players:
                player = room.players[session_id]
                if not player.connected:
                    player.connected = True
                    player.socket_id = sid
                    player.reconnect_token = session_manager.rotate_reconnect_token(session_id)
                    room_manager.register_socket(sid, session_id)
                    await sio.enter_room(sid, room_code)

                    from engine.turn_manager import turn_manager
                    game = turn_manager.get_game(room_code)
                    if game:
                        game.add_log(f"✅ {player.name} reconnected!")
                        turn = turn_manager.get_turn_state(room_code)
                        from sockets.helpers import emit_game_state
                        await emit_game_state(room_code, game, turn)

                    await sio.emit(
                        ROOM_EVENTS["STATE_UPDATE"],
                        room.model_dump(),
                        room=room_code
                    )
                    await persist_room(room_code)
                    await persist_game(room_code)
                    logger.info(f"Auto-reconnected session {session_id} to room {room_code}")

    # Emit session:init to the connected socket
    await sio.emit("session:init", {"session_token": signed_token, "session_id": session_id}, to=sid)

@sio.event
async def disconnect(sid):
    logger.info(f"Client disconnected: {sid}")

    # Get session_id for consistent task keying
    try:
        client_session = await sio.get_session(sid)
        session_id = client_session.get("session_id", sid)
    except Exception:
        session_id = sid

    # Cancel any existing disconnect task for this session
    if session_id in _disconnect_tasks:
        _disconnect_tasks[session_id].cancel()
        del _disconnect_tasks[session_id]

    # Check if player is in a room and remove them (using session_id)
    room_code = room_manager.get_player_room_code(session_id)
    if room_code:
        room = room_manager.get_room(room_code)
        if room:
            if room.status == RoomStatus.WAITING:
                # If waiting, just remove them
                updated_room = room_manager.leave_room(session_id)
                # Clean up session room mapping
                session_manager.set_room_code(session_id, None)
                if updated_room:
                    # Notify remaining players
                    await sio.emit(
                        ROOM_EVENTS["STATE_UPDATE"],
                        updated_room.model_dump(),
                        room=room_code
                    )
                await persist_room(room_code)
            else:
                # If playing, mark as disconnected and skip turn if active
                if session_id in room.players:
                    player = room.players[session_id]
                    player.connected = False
                    # Remove disconnected socket from room to stop broadcasts
                    await sio.leave_room(sid, room_code)
                    # Track session → room for reconnection
                    session_manager.set_room_code(session_id, room_code)
                    await sio.emit(
                        ROOM_EVENTS["STATE_UPDATE"],
                        room.model_dump(),
                        room=room_code
                    )

                    from engine.turn_manager import turn_manager
                    game = turn_manager.get_game(room_code)
                    if game:
                        game.add_log(f"⚠️ {player.name} disconnected. Waiting for reconnection ({room.settings.disconnect_timeout_seconds}s)...")
                        turn = turn_manager.get_turn_state(room_code)
                        # Don't skip turn immediately — let turn timer auto-play handle it
                        # Player can reconnect within the timeout and resume their turn
                        await emit_game_state(room_code, game, turn)
                    await persist_room(room_code)
                    await persist_game(room_code)

                    # Start disconnect timeout task keyed by session_id
                    task = asyncio.create_task(handle_disconnect_timeout(sid, session_id, room_code))
                    _disconnect_tasks[session_id] = task

    # Clean up mappings
    room_manager.deregister_socket(sid)

async def handle_disconnect_timeout(sid: str, session_id: str, room_code: str):
    """Handle prolonged disconnect: skip turns, then declare bankruptcy after grace period."""
    try:
        room = room_manager.get_room(room_code)
        timeout_seconds = room.settings.disconnect_timeout_seconds if room else GameRules.DISCONNECT_TIMEOUT
        await asyncio.sleep(timeout_seconds)

        # Check if room still exists (may have been cleaned up)
        room = room_manager.get_room(room_code)
        if not room:
            session_manager.set_room_code(session_id, None)
            return

        # Check if player still in room
        if session_id not in room.players:
            session_manager.set_room_code(session_id, None)
            return

        # Check if still disconnected or already bankrupt
        if room.players[session_id].connected or room.players[session_id].is_bankrupt:
            session_manager.set_room_code(session_id, None)
            return

        from engine.turn_manager import turn_manager
        from engine.bankruptcy import declare_bankruptcy

        game = turn_manager.get_game(room_code)
        if not game:
            return

        # Check if the disconnected player was the active player (needed for turn fixup after bankruptcy)
        turn = turn_manager.get_turn_state(room_code)
        was_active_player = turn and turn.active_player_id == session_id

        # Declare bankruptcy for the disconnected player
        player_name = room.players[session_id].name
        declare_bankruptcy(game, session_id, None)
        game.add_log(f"{player_name} declared bankrupt (disconnected too long)")

        # Check if game is over (only 1 player remaining)
        if game.room.status == RoomStatus.FINISHED:
            active_players = [p for p in game.room.players.values() if not p.is_bankrupt]
            winner = active_players[0] if active_players else None
            await sio.emit(
                "game:over",
                {"winner_id": winner.id if winner else None, "winner_name": winner.name if winner else "Unknown"},
                room=room_code
            )

        # Only advance the turn if the bankrupt player was the active player.
        # declare_bankruptcy already adjusts current_turn_index to (idx-1)%len
        # so one next_turn() call lands on the correct next player.
        if was_active_player:
            new_turn = turn_manager.next_turn(room_code)
            if game and new_turn:
                await emit_game_state(room_code, game, new_turn)
        await persist_room(room_code)
        await persist_game(room_code)

        # Clean up abandoned games: if all players are disconnected or bankrupt, remove from memory
        all_gone = all(
            p.is_bankrupt or not p.connected
            for p in room.players.values()
        )
        if all_gone:
            room_manager.leave_room(session_id)
            turn_manager.cleanup_room(room_code)
            from engine.auction import auction_manager
            auction_manager.auctions.pop(room_code, None)
            from engine.trade_manager import trade_manager
            trade_manager.cleanup_room(room_code)
            from persistence import repository
            repository.delete_room(room_code)
            repository.delete_game(room_code)
            logger.info(f"Cleaned up abandoned room {room_code}")

        # Clean up session mapping
        session_manager.set_room_code(session_id, None)
    except asyncio.CancelledError:
        raise  # Allow task cancellation (on reconnect) to propagate
    except Exception:
        logger.exception(f"Unhandled error in disconnect timeout for session {session_id} in room {room_code}")
    finally:
        _disconnect_tasks.pop(session_id, None)
