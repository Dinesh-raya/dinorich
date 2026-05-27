import logging
import traceback
from sockets.server import sio
from rooms.manager import room_manager
from engine.game_initializer import init_game_state
from engine.turn_manager import turn_manager
from services.rate_limiter import rate_limiter
from sockets.events import GAME_EVENTS, ROOM_EVENTS
from sockets.helpers import get_room_code_or_error, emit_game_state, persist_room, persist_game, require_session
from schemas.room import RoomStatus

logger = logging.getLogger(__name__)

MIN_HUMAN_PLAYERS = 2

@sio.on("game:start")
async def game_start(sid, data):
    try:
        session = await require_session(sid, "game_start")
        if not session:
            return {"status": "error", "message": "Not authenticated"}
        session_id = session["session_id"]
        if not rate_limiter.allow(f"{session_id}:game_start"):
            return {"status": "error", "message": "Too many requests"}
        room_code = room_manager.get_player_room_code(session_id)
        if not room_code:
            return {"status": "error", "message": "Not in a room"}

        async with room_manager.get_lock(room_code):
            room = room_manager.get_room(room_code)
            if not room or room.host_id != session_id:
                return {"status": "error", "message": "Only host can start game"}

            if room.status != "waiting":
                return {"status": "error", "message": "Game already started"}

            connected_count = sum(1 for p in room.players.values() if p.connected)
            if connected_count < MIN_HUMAN_PLAYERS:
                return {"status": "error", "message": f"Need at least {MIN_HUMAN_PLAYERS} players to start"}

            room.status = RoomStatus.PLAYING

            # Initialize Game State
            game_state = init_game_state(room)
            turn_manager.start_game(room_code, game_state)

            turn_state = turn_manager.get_turn_state(room_code)

            # Broadcast game start and initial state
            await sio.emit(
                GAME_EVENTS["START"],
                {"game": game_state.model_dump(), "turn": turn_state.model_dump()},
                room=room_code
            )
            await persist_room(room_code)
            await persist_game(room_code)
            return {"status": "success"}
    except Exception as exc:
        logger.error(f"Game start failed: {exc}", exc_info=True)
        return {"status": "error", "message": "Failed to start game. Please try again."}

@sio.on("game:dice_roll")
async def game_dice_roll(sid, data):
    try:
        session = await require_session(sid, "game_dice_roll")
        if not session:
            return {"status": "error", "message": "Not authenticated"}
        session_id = session["session_id"]
        if not rate_limiter.allow(f"{session_id}:game_dice_roll"):
            return {"status": "error", "message": "Too many requests"}
        room_code, err = get_room_code_or_error(sid)
        if err:
            return err

        async with room_manager.get_lock(room_code):
            result = turn_manager.process_roll(room_code, session_id)
            if not result:
                return {"status": "error", "message": "Not your turn or cannot roll"}

            await sio.emit(GAME_EVENTS["DICE_RESULT"], result["dice"], room=room_code)

            card_draws = result.get("card_draws") or ([result] if result.get("card_drawn") else [])
            for draw in card_draws:
                await sio.emit(
                    "card:result",
                    {
                        "card": draw["card_drawn"],
                        "card_type": draw.get("card_type", "unknown"),
                        "player_id": session_id
                    },
                    room=room_code
                )

            await emit_game_state(room_code, result["game"], result["turn"])
            await persist_game(room_code)
            return {"status": "success"}
    except Exception as exc:
        logger.exception(f"Dice roll error for {sid}")
        return {"status": "error", "message": "Dice roll failed. Please try again."}

@sio.on("game:end_turn")
async def game_end_turn(sid, data):
    try:
        session = await require_session(sid, "game_end_turn")
        if not session:
            return {"status": "error", "message": "Not authenticated"}
        session_id = session["session_id"]
        if not rate_limiter.allow(f"{session_id}:game_end_turn"):
            return {"status": "error", "message": "Too many requests"}
        room_code, err = get_room_code_or_error(sid)
        if err:
            return err

        async with room_manager.get_lock(room_code):
            turn = turn_manager.get_turn_state(room_code)
            if not turn or turn.active_player_id != session_id or not turn.can_end_turn:
                return {"status": "error", "message": "Cannot end turn right now"}

            new_turn = turn_manager.next_turn(room_code)
            game = turn_manager.get_game(room_code)
            if game and new_turn:
                await emit_game_state(room_code, game, new_turn)
                await persist_game(room_code)
            return {"status": "success"}
    except Exception as exc:
        return {"status": "error", "message": f"End turn failed: {exc}"}

@sio.on("game:declare_bankruptcy")
async def game_declare_bankruptcy(sid, data):
    try:
        session = await require_session(sid, "game_declare_bankruptcy")
        if not session:
            return {"status": "error", "message": "Not authenticated"}
        session_id = session["session_id"]
        if not rate_limiter.allow(f"{session_id}:game_declare_bankruptcy"):
            return {"status": "error", "message": "Too many requests"}
        room_code, err = get_room_code_or_error(sid)
        if err:
            return err

        async with room_manager.get_lock(room_code):
            result = turn_manager.declare_voluntary_bankruptcy(room_code, session_id)
            if not result:
                return {"status": "error", "message": "Cannot declare bankruptcy right now"}

            game = turn_manager.get_game(room_code)

            # Check if game is over (only 1 player remaining)
            if game and game.room.status == RoomStatus.FINISHED:
                # Find the winner
                active_players = [p for p in game.room.players.values() if not p.is_bankrupt]
                winner = active_players[0] if active_players else None
                await sio.emit(
                    GAME_EVENTS["GAME_OVER"],
                    {"winner_id": winner.id if winner else None, "winner_name": winner.name if winner else "Unknown"},
                    room=room_code
                )
            else:
                # Only advance turn if game is NOT over
                new_turn = turn_manager.next_turn(room_code)
                if game and new_turn:
                    await emit_game_state(room_code, game, new_turn)
            await persist_game(room_code)
            return {"status": "success"}
    except Exception as exc:
        logger.exception(f"Bankruptcy error for {sid}")
        return {"status": "error", "message": "Bankruptcy declaration failed. Please try again."}

@sio.on("game:pay_jail_fine")
async def game_pay_jail_fine(sid, data):
    try:
        session = await require_session(sid, "game_pay_jail_fine")
        if not session:
            return {"status": "error", "message": "Not authenticated"}
        session_id = session["session_id"]
        if not rate_limiter.allow(f"{session_id}:game_pay_jail_fine"):
            return {"status": "error", "message": "Too many requests"}
        room_code, err = get_room_code_or_error(sid)
        if err:
            return err

        async with room_manager.get_lock(room_code):
            result = turn_manager.pay_jail_fine(room_code, session_id)
            if not result:
                return {"status": "error", "message": "Cannot pay jail fine right now"}

            await emit_game_state(room_code, result["game"], result["turn"])
            await persist_game(room_code)
            return {"status": "success"}
    except Exception as exc:
        return {"status": "error", "message": f"Jail fine failed: {exc}"}

@sio.on("game:use_jail_card")
async def game_use_jail_card(sid, data):
    try:
        session = await require_session(sid, "game_use_jail_card")
        if not session:
            return {"status": "error", "message": "Not authenticated"}
        session_id = session["session_id"]
        if not rate_limiter.allow(f"{session_id}:game_use_jail_card"):
            return {"status": "error", "message": "Too many requests"}
        room_code, err = get_room_code_or_error(sid)
        if err:
            return err

        async with room_manager.get_lock(room_code):
            result = turn_manager.use_jail_card(room_code, session_id)
            if not result:
                return {"status": "error", "message": "Cannot use jail card right now"}

            await emit_game_state(room_code, result["game"], result["turn"])
            await persist_game(room_code)
            return {"status": "success"}
    except Exception as exc:
        return {"status": "error", "message": f"Jail card failed: {exc}"}

@sio.on("game:pay_tax")
async def game_pay_tax(sid, data):
    try:
        session = await require_session(sid, "game_pay_tax")
        if not session:
            return {"status": "error", "message": "Not authenticated"}
        session_id = session["session_id"]
        if not rate_limiter.allow(f"{session_id}:game_pay_tax"):
            return {"status": "error", "message": "Too many requests"}
        room_code, err = get_room_code_or_error(sid)
        if err:
            return err

        async with room_manager.get_lock(room_code):
            use_percentage = data.get("use_percentage", False) if data else False
            result = turn_manager.pay_tax(room_code, session_id, use_percentage)
            if not result:
                return {"status": "error", "message": "No pending tax to pay"}

            await emit_game_state(room_code, result["game"], result["turn"])
            await persist_game(room_code)
            return {"status": "success"}
    except Exception as exc:
        return {"status": "error", "message": f"Tax payment failed: {exc}"}

@sio.on("game:pause")
async def game_pause(sid, data):
    try:
        session = await require_session(sid, "game_pause")
        if not session:
            return {"status": "error", "message": "Not authenticated"}
        session_id = session["session_id"]
        if not rate_limiter.allow(f"{session_id}:game_pause"):
            return {"status": "error", "message": "Too many requests"}
        room_code, err = get_room_code_or_error(sid)
        if err:
            return err

        async with room_manager.get_lock(room_code):
            turn = turn_manager.get_turn_state(room_code)
            game = turn_manager.get_game(room_code)
            if not game or not turn:
                return {"status": "error", "message": "No active game"}

            if turn.active_player_id != session_id and game.room.host_id != session_id:
                return {"status": "error", "message": "Only the active player or host can pause"}

            if game.room.settings.game_paused:
                return {"status": "error", "message": "Game is already paused"}

            game.room.settings.game_paused = True
            game.add_log("Game paused")
            await sio.emit(GAME_EVENTS["PAUSED"], {"game": game.model_dump()}, room=room_code)
            await persist_game(room_code)
            return {"status": "success"}
    except Exception as exc:
        return {"status": "error", "message": f"Pause failed: {exc}"}


@sio.on("game:resume")
async def game_resume(sid, data):
    try:
        session = await require_session(sid, "game_resume")
        if not session:
            return {"status": "error", "message": "Not authenticated"}
        session_id = session["session_id"]
        if not rate_limiter.allow(f"{session_id}:game_resume"):
            return {"status": "error", "message": "Too many requests"}
        room_code, err = get_room_code_or_error(sid)
        if err:
            return err

        async with room_manager.get_lock(room_code):
            turn = turn_manager.get_turn_state(room_code)
            game = turn_manager.get_game(room_code)
            if not game or not turn:
                return {"status": "error", "message": "No active game"}

            if turn.active_player_id != session_id and game.room.host_id != session_id:
                return {"status": "error", "message": "Only the active player or host can resume"}

            if not game.room.settings.game_paused:
                return {"status": "error", "message": "Game is not paused"}

            game.room.settings.game_paused = False
            game.add_log("Game resumed")
            await sio.emit(GAME_EVENTS["RESUMED"], {"game": game.model_dump()}, room=room_code)
            await persist_game(room_code)
            return {"status": "success"}
    except Exception as exc:
        return {"status": "error", "message": f"Resume failed: {exc}"}


@sio.on("game:rematch")
async def game_rematch(sid, data):
    try:
        session = await require_session(sid, "game_rematch")
        if not session:
            return {"status": "error", "message": "Not authenticated"}
        session_id = session["session_id"]
        if not rate_limiter.allow(f"{session_id}:game_rematch"):
            return {"status": "error", "message": "Too many requests"}
        room_code, err = get_room_code_or_error(sid)
        if err:
            return err

        async with room_manager.get_lock(room_code):
            room = room_manager.get_room(room_code)
            if not room or room.host_id != session_id:
                return {"status": "error", "message": "Only host can restart game"}

            # Reset room status
            room.status = RoomStatus.WAITING

            # Clear active games in engine managers
            from engine.trade_manager import trade_manager
            from engine.auction import auction_manager
            from persistence import repository
            turn_manager.games.pop(room_code, None)
            turn_manager.turn_states.pop(room_code, None)
            auction_manager.auctions.pop(room_code, None)
            trade_manager.cleanup_room(room_code)

            # Reset player properties/money/state
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

            # Broadcast state update to all players
            await sio.emit(
                ROOM_EVENTS["STATE_UPDATE"],
                room.model_dump(),
                room=room_code
            )
            await persist_room(room_code)
            repository.delete_game(room_code)  # Delete game snapshot from DB
            return {"status": "success"}
    except Exception as exc:
        return {"status": "error", "message": f"Rematch failed: {exc}"}


@sio.on("game:save")
async def game_save(sid, data):
    """Manual save triggered by the host during an active game."""
    try:
        session = await require_session(sid, "game_save")
        if not session:
            return {"status": "error", "message": "Not authenticated"}
        session_id = session["session_id"]
        if not rate_limiter.allow(f"{session_id}:game_save"):
            return {"status": "error", "message": "Too many requests"}
        room_code, err = get_room_code_or_error(sid)
        if err:
            return err

        async with room_manager.get_lock(room_code):
            room = room_manager.get_room(room_code)
            if not room or room.host_id != session_id:
                return {"status": "error", "message": "Only host can save the game"}

            game = turn_manager.get_game(room_code)
            if not game:
                return {"status": "error", "message": "No active game to save"}

            await persist_room(room_code)
            await persist_game(room_code)

            await sio.emit("game:saved", {"room_code": room_code}, room=room_code)
            return {"status": "success"}
    except Exception as exc:
        return {"status": "error", "message": f"Save failed: {exc}"}


@sio.on("game:list_saves")
async def game_list_saves(sid, data):
    """Returns whether a saved game exists for the current room."""
    try:
        session = await require_session(sid, "game_list_saves")
        if not session:
            return {"status": "error", "message": "Not authenticated"}
        session_id = session["session_id"]
        if not rate_limiter.allow(f"{session_id}:game_list_saves"):
            return {"status": "error", "message": "Too many requests"}
        room_code, err = get_room_code_or_error(sid)
        if err:
            return err

        from persistence.repository import get_game_save_info
        save_info = get_game_save_info(room_code)
        saves = [save_info] if save_info else []
        return {"status": "success", "saves": saves}
    except Exception as exc:
        return {"status": "error", "message": f"List saves failed: {exc}"}


@sio.on("game:load")
async def game_load(sid, data):
    """Load a previously saved game. Host only, room must be in waiting status."""
    try:
        session = await require_session(sid, "game_load")
        if not session:
            return {"status": "error", "message": "Not authenticated"}
        session_id = session["session_id"]
        if not rate_limiter.allow(f"{session_id}:game_load"):
            return {"status": "error", "message": "Too many requests"}
        room_code, err = get_room_code_or_error(sid)
        if err:
            return err

        async with room_manager.get_lock(room_code):
            room = room_manager.get_room(room_code)
            if not room or room.host_id != session_id:
                return {"status": "error", "message": "Only host can load a saved game"}

            if room.status != RoomStatus.WAITING:
                return {"status": "error", "message": "Can only load a saved game from the waiting room"}

            from persistence.repository import load_game_save
            saved_game, saved_turn = load_game_save(room_code)
            if not saved_game or not saved_turn:
                return {"status": "error", "message": "No saved game found for this room"}

            # Restore game and turn state into the engine
            turn_manager.games[room_code] = saved_game
            turn_manager.turn_states[room_code] = saved_turn
            turn_manager.active_doubles_count[room_code] = 0

            # Update room status and merge player data from saved game
            room.status = RoomStatus.PLAYING
            for pid, saved_player in saved_game.room.players.items():
                if pid in room.players:
                    # Preserve current connection state but restore game data
                    current_player = room.players[pid]
                    current_player.position = saved_player.position
                    current_player.money = saved_player.money
                    current_player.is_in_jail = saved_player.is_in_jail
                    current_player.jail_turns = saved_player.jail_turns
                    current_player.get_out_of_jail_cards = saved_player.get_out_of_jail_cards
                    current_player.goojf_sources = saved_player.goojf_sources
                    current_player.is_bankrupt = saved_player.is_bankrupt
                    current_player.properties_owned = saved_player.properties_owned
                else:
                    # Player from saved game not in current room — add as disconnected
                    saved_player.connected = False
                    room.players[pid] = saved_player

            # Update the saved game's room reference to current room
            saved_game.room = room

            # Broadcast game start with loaded state
            await sio.emit(
                GAME_EVENTS["START"],
                {"game": saved_game.model_dump(), "turn": saved_turn.model_dump()},
                room=room_code
            )
            await persist_room(room_code)
            await persist_game(room_code)
            return {"status": "success"}
    except Exception as exc:
        return {"status": "error", "message": f"Load failed: {exc}"}
