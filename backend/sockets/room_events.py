from pydantic import ValidationError
from sockets.server import sio
from rooms.manager import room_manager
from schemas.contracts import RoomCreatePayload, RoomJoinPayload, RoomUpdateSettingsPayload, KickPlayerPayload
from schemas.room import RoomStatus
from services.session_manager import session_manager
from services.rate_limiter import rate_limiter
from sockets.events import ROOM_EVENTS
from sockets.helpers import get_room_code_or_error, persist_room, persist_game

@sio.on('room:create')
async def room_create(sid, data):
    if not rate_limiter.allow(f"{sid}:room_create"):
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
    session_id = client_session.get("session_id")
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

    persist_room(room_code)
    return {"status": "success", "room": room.model_dump(), "reconnectToken": reconnect_token}

@sio.on('room:join')
async def room_join(sid, data):
    if not rate_limiter.allow(f"{sid}:room_join"):
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
        
    # Reconnect logic
    if room.status == RoomStatus.PLAYING:
        for pid, player in list(room.players.items()):
            reconnect_record = session_manager.consume_reconnect_token(payload.reconnect_token or "")
            if reconnect_record and player.session_id == reconnect_record.session_id and not player.connected:
                # Reconnect player
                player.connected = True
                player.id = sid
                player.reconnect_token = session_manager.rotate_reconnect_token(reconnect_record.session_id)
                
                # Update keys mapping
                room.players[sid] = room.players.pop(pid)
                room_manager.player_rooms[sid] = room_code
                if pid in room_manager.player_rooms:
                    del room_manager.player_rooms[pid]
                    
                await sio.enter_room(sid, room_code)
                
                # If game exists, update turn orders
                from engine.turn_manager import turn_manager
                game = turn_manager.get_game(room_code)
                if game:
                    if pid in game.turn_order:
                        game.turn_order = [sid if p == pid else p for p in game.turn_order]
                    turn = turn_manager.get_turn_state(room_code)
                    if turn:
                        if turn.active_player_id == pid:
                            turn.active_player_id = sid
                        # Update stale references to old socket ID
                        if turn.debt_creditor_id == pid:
                            turn.debt_creditor_id = sid
                        if turn.pending_rent:
                            if turn.pending_rent.get("owner_id") == pid:
                                turn.pending_rent["owner_id"] = sid
                            if turn.pending_rent.get("payer_id") == pid:
                                turn.pending_rent["payer_id"] = sid
                        
                    from sockets.events import GAME_EVENTS
                    await sio.emit(
                        GAME_EVENTS["STATE_UPDATE"],
                        {"game": game.model_dump(), "turn": turn.model_dump()},
                        room=room_code
                    )
                
                persist_room(room_code)
                persist_game(room_code)
                return {"status": "success", "room": room.model_dump(), "reconnectToken": player.reconnect_token}
        return {"status": "error", "message": "Cannot join a game already in progress"}
    
    # Normal join
    client_session = await sio.get_session(sid)
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
    
    # Broadcast updated room state to all in room
    await sio.emit(
        ROOM_EVENTS["STATE_UPDATE"],
        room.model_dump(),
        room=room_code
    )

    persist_room(room_code)
    return {"status": "success", "room": room.model_dump(), "reconnectToken": reconnect_token}

@sio.on('room:leave')
async def room_leave(sid):
    if not rate_limiter.allow(f"{sid}:room_leave"):
        return {"status": "error", "message": "Too many requests"}

    room_code = room_manager.get_player_room_code(sid)
    if not room_code:
        return {"status": "error", "message": "Not in a room"}

    room = room_manager.get_room(room_code)
    if not room:
        return {"status": "error", "message": "Room not found"}

    if room.status == RoomStatus.WAITING:
        # Waiting room: remove player entirely
        await sio.leave_room(sid, room_code)
        updated_room = room_manager.leave_room(sid)
        if updated_room:
            await sio.emit(
                ROOM_EVENTS["STATE_UPDATE"],
                updated_room.model_dump(),
                room=room_code
            )
        persist_room(room_code)
    else:
        # Active game: treat as disconnect (don't remove from room.players)
        if sid in room.players:
            room.players[sid].connected = False
            await sio.emit(
                ROOM_EVENTS["STATE_UPDATE"],
                room.model_dump(),
                room=room_code
            )

            # Skip turn if it's the leaving player's turn
            from engine.turn_manager import turn_manager
            turn = turn_manager.get_turn_state(room_code)
            if turn and turn.active_player_id == sid:
                new_turn = turn_manager.next_turn(room_code)
                if new_turn:
                    game = turn_manager.get_game(room_code)
                    if game:
                        game.add_log(f"{room.players[sid].name} left the game, turn skipped")
                        from sockets.helpers import emit_game_state
                        await emit_game_state(room_code, game, new_turn)

            # Start disconnect timeout (player can rejoin)
            import asyncio
            from sockets.connection import handle_disconnect_timeout, _disconnect_tasks, session_rooms
            try:
                client_session = await sio.get_session(sid)
                session_id = client_session.get("session_id", sid)
            except Exception:
                session_id = sid
            session_rooms[session_id] = room_code
            task = asyncio.create_task(handle_disconnect_timeout(sid, session_id, room_code))
            _disconnect_tasks[session_id] = task

    return {"status": "success"}

@sio.on('room:update_settings')
async def room_update_settings(sid, data):
    if not rate_limiter.allow(f"{sid}:room_update_settings"):
        return {"status": "error", "message": "Too many requests"}
    """
    Expects data: {"settings": {"max_players": 4, "auction_enabled": false}}
    """
    room_code = room_manager.get_player_room_code(sid)
    if not room_code:
        return {"status": "error", "message": "Not in a room"}
        
    try:
        payload = RoomUpdateSettingsPayload.model_validate(data or {})
    except ValidationError as exc:
        return {"status": "error", "message": exc.errors()[0]["msg"]}
    updated_room = room_manager.update_settings(room_code, sid, payload.settings.model_dump())
    
    if not updated_room:
        return {"status": "error", "message": "Failed to update settings. Must be host and room must be waiting."}
        
    await sio.emit(
        ROOM_EVENTS["STATE_UPDATE"],
        updated_room.model_dump(),
        room=room_code
    )

    persist_room(room_code)
    return {"status": "success"}

@sio.on('room:kick_player')
async def room_kick_player(sid, data):
    if not rate_limiter.allow(f"{sid}:room_kick_player"):
        return {"status": "error", "message": "Too many requests"}

    room_code = room_manager.get_player_room_code(sid)
    if not room_code:
        return {"status": "error", "message": "Not in a room"}

    try:
        payload = KickPlayerPayload.model_validate(data or {})
    except ValidationError as exc:
        return {"status": "error", "message": exc.errors()[0]["msg"]}

    target_id = payload.target_player_id
    updated_room = room_manager.kick_player(room_code, sid, target_id)

    if not updated_room:
        return {"status": "error", "message": "Cannot kick player. Must be host and room must be waiting."}

    # Remove kicked player from socket room
    try:
        await sio.leave_room(target_id, room_code)
    except Exception:
        pass  # Player may already be disconnected

    # Notify kicked player
    await sio.emit("room:kicked", {"message": "You have been kicked by the host"}, room=target_id)

    # Broadcast updated room state
    await sio.emit(
        ROOM_EVENTS["STATE_UPDATE"],
        updated_room.model_dump(),
        room=room_code
    )

    persist_room(room_code)
    return {"status": "success"}
