from sockets.server import sio
from rooms.manager import room_manager
import asyncio
from typing import Dict
from services.session_manager import session_manager
from constants.game_rules import GameRules
from sockets.events import CONNECTION_EVENTS, ROOM_EVENTS
from sockets.helpers import emit_game_state, persist_room, persist_game
from schemas.room import RoomStatus
from utils.name_generator import get_random_name

# Track disconnect timeout tasks so they can be cancelled on reconnect
_disconnect_tasks: Dict[str, asyncio.Task] = {}
# Track session_id → room_code for reconnection lookups
session_rooms: Dict[str, str] = {}

@sio.event
async def connect(sid, environ, auth):
    print(f"Client connected: {sid}")
    auth = auth or {}
    requested_name = auth.get("name") or get_random_name()
    signed_session_token = auth.get("sessionToken", "")
    session = session_manager.resolve_session(signed_session_token, requested_name)
    session.player_socket_id = sid
    await sio.save_session(
        sid,
        {
            "session_id": session.session_id,
            "player_name": session.player_name,
        },
    )

    # Cancel any disconnect timeout for reconnecting players
    # Check if this session was previously in a room
    # NOTE: Do NOT set player.connected = True here — let room:join handle the full reconnect
    # (sid remap, socket room join, connected flag). Premature setting breaks the reconnect gate.
    session_id = session.session_id
    room_code = session_rooms.get(session_id)
    if room_code:
        room = room_manager.get_room(room_code)
        if room:
            # Cancel disconnect task if exists (by session_id)
            if session_id in _disconnect_tasks:
                _disconnect_tasks[session_id].cancel()
                del _disconnect_tasks[session_id]
                print(f"Disconnect timeout cancelled for session {session_id} in room {room_code}")

@sio.event
async def disconnect(sid):
    print(f"Client disconnected: {sid}")

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

    # Check if player is in a room and remove them
    room_code = room_manager.get_player_room_code(sid)
    if room_code:
        room = room_manager.get_room(room_code)
        if room:
            if room.status == RoomStatus.WAITING:
                # If waiting, just remove them
                updated_room = room_manager.leave_room(sid)
                # Clean up session room mapping
                session_rooms.pop(session_id, None)
                if updated_room:
                    # Notify remaining players
                    await sio.emit(
                        ROOM_EVENTS["STATE_UPDATE"],
                        updated_room.model_dump(),
                        room=room_code
                    )
                persist_room(room_code)
            else:
                # If playing, mark as disconnected and skip turn if active
                if sid in room.players:
                    room.players[sid].connected = False
                    # Track session → room for reconnection
                    session_rooms[session_id] = room_code
                    await sio.emit(
                        ROOM_EVENTS["STATE_UPDATE"],
                        room.model_dump(),
                        room=room_code
                    )

                    # Skip turn if it's the disconnected player's turn
                    from engine.turn_manager import turn_manager
                    turn = turn_manager.get_turn_state(room_code)
                    if turn and turn.active_player_id == sid:
                        new_turn = turn_manager.next_turn(room_code)
                        if new_turn:
                            game = turn_manager.get_game(room_code)
                            if game:
                                game.add_log(f"{room.players[sid].name} disconnected, turn skipped")
                                await emit_game_state(room_code, game, new_turn)
                    persist_room(room_code)
                    persist_game(room_code)

                    # Start disconnect timeout task keyed by session_id
                    task = asyncio.create_task(handle_disconnect_timeout(sid, session_id, room_code))
                    _disconnect_tasks[session_id] = task

async def handle_disconnect_timeout(sid: str, session_id: str, room_code: str):
    """Handle prolonged disconnect: skip turns, then declare bankruptcy after grace period."""
    await asyncio.sleep(GameRules.DISCONNECT_TIMEOUT)

    # Clean up task reference
    _disconnect_tasks.pop(session_id, None)

    # Check if room still exists (may have been cleaned up)
    room = room_manager.get_room(room_code)
    if not room:
        session_rooms.pop(session_id, None)
        return

    # Check if player still in room
    if sid not in room.players:
        session_rooms.pop(session_id, None)
        return

    # Check if still disconnected or already bankrupt
    if room.players[sid].connected or room.players[sid].is_bankrupt:
        session_rooms.pop(session_id, None)
        return

    from engine.turn_manager import turn_manager
    from engine.bankruptcy import declare_bankruptcy

    game = turn_manager.get_game(room_code)
    if not game:
        return

    # Skip turn if it's the disconnected player's turn
    turn = turn_manager.get_turn_state(room_code)
    if turn and turn.active_player_id == sid:
        new_turn = turn_manager.next_turn(room_code)
        if new_turn:
            game.add_log(f"{room.players[sid].name} disconnected too long, turn skipped")
            await emit_game_state(room_code, game, new_turn)

    # Declare bankruptcy for the disconnected player (use direct API, not voluntary — player isn't active or in debt)
    player_name = room.players[sid].name
    declare_bankruptcy(game, sid, None)
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

    new_turn = turn_manager.next_turn(room_code)
    if game and new_turn:
        await emit_game_state(room_code, game, new_turn)
    persist_room(room_code)
    persist_game(room_code)

    # Clean up abandoned games: if all players are disconnected or bankrupt, remove from memory
    all_gone = all(
        p.is_bankrupt or not p.connected
        for p in room.players.values()
    )
    if all_gone:
        room_manager.leave_room(sid)
        turn_manager.cleanup_room(room_code)
        from persistence import repository
        repository.delete_room(room_code)
        repository.delete_game(room_code)
        logger.info(f"Cleaned up abandoned room {room_code}")

    # Clean up session mapping
    session_rooms.pop(session_id, None)
