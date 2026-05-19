from sockets.server import sio
from rooms.manager import room_manager
import asyncio
from typing import Dict
from services.session_manager import session_manager
from constants.game_rules import GameRules
from sockets.events import CONNECTION_EVENTS, ROOM_EVENTS
from sockets.helpers import emit_game_state
from schemas.room import RoomStatus
from utils.name_generator import get_random_name

# Track disconnect timeout tasks so they can be cancelled on reconnect
_disconnect_tasks: Dict[str, asyncio.Task] = {}

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
    room_code = room_manager.get_player_room_code(session.session_id)
    if room_code:
        room = room_manager.get_room(room_code)
        if room and session.session_id in room.players:
            player = room.players[session.session_id]
            if not player.connected:
                player.connected = True
                # Cancel disconnect task if exists
                old_sid = session.session_id
                if old_sid in _disconnect_tasks:
                    _disconnect_tasks[old_sid].cancel()
                    del _disconnect_tasks[old_sid]
                print(f"Player {player.name} reconnected to room {room_code}")

@sio.event
async def disconnect(sid):
    print(f"Client disconnected: {sid}")

    # Cancel any existing disconnect task for this player
    if sid in _disconnect_tasks:
        _disconnect_tasks[sid].cancel()
        del _disconnect_tasks[sid]

    # Check if player is in a room and remove them
    room_code = room_manager.get_player_room_code(sid)
    if room_code:
        room = room_manager.get_room(room_code)
        if room:
            if room.status == RoomStatus.WAITING:
                # If waiting, just remove them
                updated_room = room_manager.leave_room(sid)
                if updated_room:
                    # Notify remaining players
                    await sio.emit(
                        ROOM_EVENTS["STATE_UPDATE"],
                        updated_room.model_dump(),
                        room=room_code
                    )
            else:
                # If playing, mark as disconnected and skip turn if active
                if sid in room.players:
                    room.players[sid].connected = False
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

                    # Start disconnect timeout task (stores reference for cancellation)
                    task = asyncio.create_task(handle_disconnect_timeout(sid, room_code))
                    _disconnect_tasks[sid] = task

async def handle_disconnect_timeout(sid: str, room_code: str):
    """Handle prolonged disconnect: skip turns, then declare bankruptcy after grace period."""
    await asyncio.sleep(GameRules.DISCONNECT_TIMEOUT)

    # Clean up task reference
    _disconnect_tasks.pop(sid, None)

    # Check if room still exists (may have been cleaned up)
    room = room_manager.get_room(room_code)
    if not room:
        return

    # Check if player still in room
    if sid not in room.players:
        return

    # Check if still disconnected
    if room.players[sid].connected:
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

    # Only declare bankruptcy if player has been disconnected for extended period
    # and it's been at least one full round since disconnect
    # For now, just keep skipping turns - bankruptcy only on explicit leave or game end
    # Players can reconnect and resume
