import traceback
from sockets.server import sio
from rooms.manager import room_manager
from engine.game_initializer import init_game_state
from engine.turn_manager import turn_manager
from engine.bot import is_bot, get_bot_name, get_bot_color
from schemas.player import PlayerState
from services.rate_limiter import rate_limiter
from sockets.events import GAME_EVENTS, ROOM_EVENTS
from sockets.helpers import get_room_code_or_error, emit_game_state, persist_room, persist_game
from schemas.room import RoomStatus

MIN_HUMAN_PLAYERS = 2
BOT_FILL_TARGET = 4

@sio.on("game:start")
async def game_start(sid, data):
    try:
        if not rate_limiter.allow(f"{sid}:game_start"):
            return {"status": "error", "message": "Too many requests"}
        session_id = room_manager.get_session_id(sid)
        room_code = room_manager.get_player_room_code(session_id)
        if not room_code:
            return {"status": "error", "message": "Not in a room"}
            
        room = room_manager.get_room(room_code)
        if not room or room.host_id != session_id:
            return {"status": "error", "message": "Only host can start game"}
            
        if room.status != "waiting":
            return {"status": "error", "message": "Game already started"}
            
        human_count = sum(1 for p in room.players.values() if not is_bot(p.id) and p.connected)
        if human_count < MIN_HUMAN_PLAYERS and not room.settings.bot_enabled:
            return {"status": "error", "message": f"Need at least {MIN_HUMAN_PLAYERS} human players to start"}

        # Fill empty slots with bots if enabled
        if room.settings.bot_enabled:
            bot_count = 0
            while len(room.players) < BOT_FILL_TARGET:
                bot_id = f"bot_{bot_count}"
                if bot_id not in room.players:
                    bot = PlayerState(
                        id=bot_id,
                        name=get_bot_name(bot_count),
                        color=get_bot_color(bot_count),
                        money=room.settings.starting_cash,
                    )
                    room.players[bot_id] = bot
                    room_manager.player_rooms[bot_id] = room_code
                bot_count += 1

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
        persist_room(room_code)
        persist_game(room_code)
        return {"status": "success"}
    except Exception as exc:
        return {"status": "error", "message": f"Game start failed: {exc}"}

@sio.on("game:dice_roll")
async def game_dice_roll(sid, data):
    try:
        if not rate_limiter.allow(f"{sid}:game_dice_roll"):
            return {"status": "error", "message": "Too many requests"}
        room_code, err = get_room_code_or_error(sid)
        if err:
            return err

        session_id = room_manager.get_session_id(sid)
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
        persist_game(room_code)
        return {"status": "success"}
    except Exception as exc:
        return {"status": "error", "message": f"Dice roll failed: {exc}"}

@sio.on("game:end_turn")
async def game_end_turn(sid, data):
    try:
        if not rate_limiter.allow(f"{sid}:game_end_turn"):
            return {"status": "error", "message": "Too many requests"}
        room_code, err = get_room_code_or_error(sid)
        if err:
            return err

        session_id = room_manager.get_session_id(sid)
        turn = turn_manager.get_turn_state(room_code)
        if not turn or turn.active_player_id != session_id or not turn.can_end_turn:
            return {"status": "error", "message": "Cannot end turn right now"}

        new_turn = turn_manager.next_turn(room_code)
        game = turn_manager.get_game(room_code)
        if game and new_turn:
            await emit_game_state(room_code, game, new_turn)
            persist_game(room_code)
        return {"status": "success"}
    except Exception as exc:
        return {"status": "error", "message": f"End turn failed: {exc}"}

@sio.on("game:declare_bankruptcy")
async def game_declare_bankruptcy(sid, data):
    try:
        if not rate_limiter.allow(f"{sid}:game_declare_bankruptcy"):
            return {"status": "error", "message": "Too many requests"}
        room_code, err = get_room_code_or_error(sid)
        if err:
            return err

        session_id = room_manager.get_session_id(sid)
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

        new_turn = turn_manager.next_turn(room_code)
        if game and new_turn:
            await emit_game_state(room_code, game, new_turn)
        persist_game(room_code)
        return {"status": "success"}
    except Exception as exc:
        return {"status": "error", "message": f"Bankruptcy failed: {exc}"}

@sio.on("game:pay_jail_fine")
async def game_pay_jail_fine(sid, data):
    try:
        if not rate_limiter.allow(f"{sid}:game_pay_jail_fine"):
            return {"status": "error", "message": "Too many requests"}
        room_code, err = get_room_code_or_error(sid)
        if err:
            return err

        session_id = room_manager.get_session_id(sid)
        result = turn_manager.pay_jail_fine(room_code, session_id)
        if not result:
            return {"status": "error", "message": "Cannot pay jail fine right now"}

        await emit_game_state(room_code, result["game"], result["turn"])
        persist_game(room_code)
        return {"status": "success"}
    except Exception as exc:
        return {"status": "error", "message": f"Jail fine failed: {exc}"}

@sio.on("game:use_jail_card")
async def game_use_jail_card(sid, data):
    try:
        if not rate_limiter.allow(f"{sid}:game_use_jail_card"):
            return {"status": "error", "message": "Too many requests"}
        room_code, err = get_room_code_or_error(sid)
        if err:
            return err

        session_id = room_manager.get_session_id(sid)
        result = turn_manager.use_jail_card(room_code, session_id)
        if not result:
            return {"status": "error", "message": "Cannot use jail card right now"}

        await emit_game_state(room_code, result["game"], result["turn"])
        persist_game(room_code)
        return {"status": "success"}
    except Exception as exc:
        return {"status": "error", "message": f"Jail card failed: {exc}"}

@sio.on("game:pay_tax")
async def game_pay_tax(sid, data):
    try:
        if not rate_limiter.allow(f"{sid}:game_pay_tax"):
            return {"status": "error", "message": "Too many requests"}
        room_code, err = get_room_code_or_error(sid)
        if err:
            return err

        use_percentage = data.get("use_percentage", False) if data else False
        session_id = room_manager.get_session_id(sid)
        result = turn_manager.pay_tax(room_code, session_id, use_percentage)
        if not result:
            return {"status": "error", "message": "No pending tax to pay"}

        await emit_game_state(room_code, result["game"], result["turn"])
        persist_game(room_code)
        return {"status": "success"}
    except Exception as exc:
        return {"status": "error", "message": f"Tax payment failed: {exc}"}

@sio.on("game:rematch")
async def game_rematch(sid, data):
    try:
        if not rate_limiter.allow(f"{sid}:game_rematch"):
            return {"status": "error", "message": "Too many requests"}
        room_code, err = get_room_code_or_error(sid)
        if err:
            return err

        room = room_manager.get_room(room_code)
        session_id = room_manager.get_session_id(sid)
        if not room or room.host_id != session_id:
            return {"status": "error", "message": "Only host can restart game"}

        # Reset room status
        room.status = RoomStatus.WAITING

        # Clear active games in engine managers
        from engine.trade_manager import trade_manager
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

        # Broadcast state update to all players
        await sio.emit(
            ROOM_EVENTS["STATE_UPDATE"],
            room.model_dump(),
            room=room_code
        )
        persist_room(room_code)
        repository.delete_game(room_code)  # Delete game snapshot from DB
        return {"status": "success"}
    except Exception as exc:
        return {"status": "error", "message": f"Rematch failed: {exc}"}
