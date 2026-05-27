from pydantic import ValidationError
from sockets.server import sio
from rooms.manager import room_manager
from schemas.contracts import RoomCreatePayload, RoomJoinPayload, RoomUpdateSettingsPayload, KickPlayerPayload
from schemas.room import RoomStatus
from services.session_manager import session_manager
from services.rate_limiter import rate_limiter
from sockets.events import ROOM_EVENTS, GAME_EVENTS
from sockets.helpers import get_room_code_or_error, persist_room, persist_game, require_session

@sio.on('room:create')
async def room_create(sid, data):
    session = await require_session(sid, "room_create")
    if not session:
        return {"status": "error", "message": "Not authenticated"}
    session_id = session["session_id"]
    if not rate_limiter.allow(f"{session_id}:room_create"):
        return {"status": "error", "message": "Too many requests"}
    """
    Expects data: {"name": "PlayerName"}
    Color is auto-assigned uniquely.
    """
    try:
        payload = RoomCreatePayload.model_validate(data or {})
    except ValidationError as exc:
        return {"status": "error", "message": exc.errors()[0]["msg"]}
    player_name = payload.name
    client_session = await sio.get_session(sid)

    # Prevent creating a room if already in one
    existing_room = room_manager.get_player_room_code(session_id)
    if existing_room:
        return {"status": "error", "message": "Already in a room. Leave first."}

    session_token = client_session.get("session_token")
    reconnect_token = session_manager.rotate_reconnect_token(session_id)

    room_code = room_manager.create_room(
        host_id=sid,
        host_name=player_name,
        session_id=session_id,
        reconnect_token=reconnect_token,
        is_private=payload.is_private,
    )

    await sio.enter_room(sid, room_code)
    room = room_manager.get_room(room_code)
    session_manager.set_room_code(session_id, room_code)

    await persist_room(room_code)
    return {
        "status": "success",
        "room": room.model_dump(),
        "reconnectToken": reconnect_token,
        "sessionId": session_id,
        "sessionToken": session_token
    }

@sio.on('room:join')
async def room_join(sid, data):
    session = await require_session(sid, "room_join")
    if not session:
        return {"status": "error", "message": "Not authenticated"}
    session_id = session["session_id"]
    if not rate_limiter.allow(f"{session_id}:room_join"):
        return {"status": "error", "message": "Too many requests"}
    """
    Expects data: {"room_code": "ABCD", "name": "PlayerName"}
    Color is auto-assigned uniquely.
    """
    try:
        payload = RoomJoinPayload.model_validate(data or {})
    except ValidationError as exc:
        return {"status": "error", "message": exc.errors()[0]["msg"]}
    room_code = payload.room_code.upper()
    player_name = payload.name
    
    room = room_manager.get_room(room_code)
    if not room:
        return {"status": "error", "message": "Room not found"}
        
    async with room_manager.get_lock(room_code):
        client_session = await sio.get_session(sid)
        session_token = client_session.get("session_token")
        
        # Reconnect logic
        if room.status == RoomStatus.PLAYING:
            reconnect_record = session_manager.consume_reconnect_token(payload.reconnect_token or "")
            session_id = None
            if reconnect_record:
                session_id = reconnect_record.session_id
            else:
                # Fallback: if current session is a player in this room, allow reconnection
                # This handles expired reconnect tokens (token TTL is only 120s)
                current_session_id = client_session.get("session_id")
                if current_session_id and current_session_id in room.players:
                    session_id = current_session_id

            if session_id:
                player = room.players.get(session_id)
                if player:
                    # If already reconnected (e.g., by connect() auto-reconnect), return current state
                    if player.connected:
                        from engine.turn_manager import turn_manager
                        game = turn_manager.get_game(room_code)
                        response_payload = {
                            "status": "success",
                            "room": room.model_dump(),
                            "reconnectToken": player.reconnect_token,
                            "sessionId": session_id,
                            "sessionToken": session_token
                        }
                        if game:
                            response_payload["game"] = game.model_dump()
                            turn = turn_manager.get_turn_state(room_code)
                            if turn:
                                response_payload["turn"] = turn.model_dump()
                        return response_payload

                    # Reconnect player
                    player.connected = True
                    player.socket_id = sid
                    player.reconnect_token = session_manager.rotate_reconnect_token(session_id)

                    # Register the new socket mapping
                    room_manager.register_socket(sid, session_id)
                    await sio.enter_room(sid, room_code)

                    # If game exists, update turn logs
                    from engine.turn_manager import turn_manager
                    game = turn_manager.get_game(room_code)
                    if game:
                        game.add_log(f"✅ {player.name} reconnected!")
                        turn = turn_manager.get_turn_state(room_code)
                        from sockets.events import GAME_EVENTS
                        await sio.emit(
                            GAME_EVENTS["STATE_UPDATE"],
                            {"game": game.model_dump(), "turn": turn.model_dump() if turn else None},
                            room=room_code
                        )

                    await persist_room(room_code)
                    await persist_game(room_code)

                    response_payload = {
                        "status": "success",
                        "room": room.model_dump(),
                        "reconnectToken": player.reconnect_token,
                        "sessionId": session_id,
                        "sessionToken": session_token
                    }
                    if game:
                        response_payload["game"] = game.model_dump()
                        if turn:
                            response_payload["turn"] = turn.model_dump()
                    return response_payload
            return {"status": "error", "message": "Cannot join a game already in progress"}
        
        # Normal join
        session_id = client_session.get("session_id")
        reconnect_token = session_manager.rotate_reconnect_token(session_id)
        room = room_manager.join_room(
            room_code=room_code,
            player_id=sid,
            player_name=player_name,
            session_id=session_id,
            reconnect_token=reconnect_token,
        )
        
        if not room:
            return {"status": "error", "message": "Failed to join room. Room may be full."}
            
        await sio.enter_room(sid, room_code)
        session_manager.set_room_code(session_id, room_code)
        
        # Broadcast updated room state to all in room
        await sio.emit(
            ROOM_EVENTS["STATE_UPDATE"],
            room.model_dump(),
            room=room_code
        )

        await persist_room(room_code)
        return {
            "status": "success",
            "room": room.model_dump(),
            "reconnectToken": reconnect_token,
            "sessionId": session_id,
            "sessionToken": session_token
        }

@sio.on('room:leave')
async def room_leave(sid):
    session = await require_session(sid, "room_leave")
    if not session:
        return {"status": "error", "message": "Not authenticated"}
    session_id = session["session_id"]
    if not rate_limiter.allow(f"{session_id}:room_leave"):
        return {"status": "error", "message": "Too many requests"}
    room_code = room_manager.get_player_room_code(session_id)
    if not room_code:
        return {"status": "error", "message": "Not in a room"}

    room = room_manager.get_room(room_code)
    if not room:
        return {"status": "error", "message": "Room not found"}

    async with room_manager.get_lock(room_code):
        if room.status == RoomStatus.WAITING:
            # Waiting room: remove player entirely
            await sio.leave_room(sid, room_code)
            updated_room = room_manager.leave_room(session_id)
            if updated_room:
                await sio.emit(
                    ROOM_EVENTS["STATE_UPDATE"],
                    updated_room.model_dump(),
                    room=room_code
                )
            await persist_room(room_code)
        else:
            # Active game: treat as disconnect (don't remove from room.players)
            if session_id in room.players:
                room.players[session_id].connected = False
                await sio.emit(
                    ROOM_EVENTS["STATE_UPDATE"],
                    room.model_dump(),
                    room=room_code
                )

                # Skip turn if it's the leaving player's turn
                from engine.turn_manager import turn_manager
                turn = turn_manager.get_turn_state(room_code)
                if turn and turn.active_player_id == session_id:
                    new_turn = turn_manager.next_turn(room_code)
                    if new_turn:
                        game = turn_manager.get_game(room_code)
                        if game:
                            game.add_log(f"{room.players[session_id].name} left the game, turn skipped")
                            from sockets.helpers import emit_game_state
                            await emit_game_state(room_code, game, new_turn)
                            await persist_game(room_code)

                # Start disconnect timeout (player can rejoin)
                import asyncio
                from sockets.connection import handle_disconnect_timeout, _disconnect_tasks
                session_manager.set_room_code(session_id, room_code)
                # Cancel any existing disconnect task for this session to prevent duplicates
                existing_task = _disconnect_tasks.get(session_id)
                if existing_task and not existing_task.done():
                    existing_task.cancel()
                task = asyncio.create_task(handle_disconnect_timeout(sid, session_id, room_code))
                _disconnect_tasks[session_id] = task

        return {"status": "success"}

@sio.on('room:update_settings')
async def room_update_settings(sid, data):
    session = await require_session(sid, "room_update_settings")
    if not session:
        return {"status": "error", "message": "Not authenticated"}
    session_id = session["session_id"]
    if not rate_limiter.allow(f"{session_id}:room_update_settings"):
        return {"status": "error", "message": "Too many requests"}
    """
    Expects data: {"settings": {"max_players": 4, "auction_enabled": false}}
    """
    room_code = room_manager.get_player_room_code(session_id)
    if not room_code:
        return {"status": "error", "message": "Not in a room"}

    try:
        payload = RoomUpdateSettingsPayload.model_validate(data or {})
    except ValidationError as exc:
        return {"status": "error", "message": exc.errors()[0]["msg"]}

    async with room_manager.get_lock(room_code):
        updated_room = room_manager.update_settings(room_code, sid, payload.settings.model_dump())
        
        if not updated_room:
            return {"status": "error", "message": "Failed to update settings. Must be host and room must be waiting."}
            
        await sio.emit(
            ROOM_EVENTS["STATE_UPDATE"],
            updated_room.model_dump(),
            room=room_code
        )

        await persist_room(room_code)
        return {"status": "success"}

@sio.on('room:kick_player')
async def room_kick_player(sid, data):
    session = await require_session(sid, "room_kick_player")
    if not session:
        return {"status": "error", "message": "Not authenticated"}
    session_id = session["session_id"]
    if not rate_limiter.allow(f"{session_id}:room_kick_player"):
        return {"status": "error", "message": "Too many requests"}

    room_code = room_manager.get_player_room_code(session_id)
    if not room_code:
        return {"status": "error", "message": "Not in a room"}

    try:
        payload = KickPlayerPayload.model_validate(data or {})
    except ValidationError as exc:
        return {"status": "error", "message": exc.errors()[0]["msg"]}

    target_id = payload.target_player_id
    async with room_manager.get_lock(room_code):
        updated_room = room_manager.kick_player(room_code, sid, target_id)

        if not updated_room:
            return {"status": "error", "message": "Cannot kick player. Must be host and room must be waiting."}

        target_sess_id = room_manager.get_session_id(target_id)
        target_socket_id = room_manager.get_socket_id(target_sess_id)

        # Remove kicked player from socket room
        try:
            await sio.leave_room(target_socket_id, room_code)
        except Exception:
            pass  # Player may already be disconnected

        # Notify kicked player via their socket
        await sio.emit("room:kicked", {"message": "You have been kicked by the host"}, to=target_socket_id)

        # Broadcast updated room state
        await sio.emit(
            ROOM_EVENTS["STATE_UPDATE"],
            updated_room.model_dump(),
            room=room_code
        )

        await persist_room(room_code)
        return {"status": "success"}

@sio.on('room:rematch')
async def room_rematch(sid):
    """Reset game state and return to waiting room. Only host can trigger."""
    session = await require_session(sid, "room_rematch")
    if not session:
        return {"status": "error", "message": "Not authenticated"}
    session_id = session["session_id"]
    if not rate_limiter.allow(f"{session_id}:room_rematch"):
        return {"status": "error", "message": "Too many requests"}

    room_code = room_manager.get_player_room_code(session_id)
    if not room_code:
        return {"status": "error", "message": "Not in a room"}

    async with room_manager.get_lock(room_code):
        room = room_manager.get_room(room_code)
        if not room:
            return {"status": "error", "message": "Room not found"}
        if room.host_id != session_id:
            return {"status": "error", "message": "Only host can trigger rematch"}

        # Reset room status back to waiting
        room.status = RoomStatus.WAITING

        # Clear game engine state
        from engine.turn_manager import turn_manager
        from engine.trade_manager import trade_manager
        from engine.auction import auction_manager
        from persistence import repository

        turn_manager.games.pop(room_code, None)
        turn_manager.turn_states.pop(room_code, None)
        auction_manager.auctions.pop(room_code, None)
        trade_manager.cleanup_room(room_code)

        # Reset all player state while keeping them in the room
        for player in list(room.players.values()):
            player.properties_owned = []
            player.money = room.settings.starting_cash
            player.position = 0
            player.is_bankrupt = False
            player.is_in_jail = False
            player.jail_turns = 0
            player.get_out_of_jail_cards = 0
            player.goojf_sources = []
            player.connected = True

        # Broadcast the reset room state to all players
        await sio.emit(
            ROOM_EVENTS["STATE_UPDATE"],
            room.model_dump(),
            room=room_code
        )
        await persist_room(room_code)
        repository.delete_game(room_code)
        return {"status": "success"}
