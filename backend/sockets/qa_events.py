"""QA mode socket event handlers for deterministic testing."""
import logging
from typing import Any, Dict, Optional

from sockets.server import sio
from sockets.events import QA_EVENTS
from sockets.helpers import (
    get_room_code_or_error,
    emit_game_state,
    persist_game,
    require_session,
)
from rooms.manager import room_manager
from engine.turn_manager import turn_manager
from engine.auction import auction_manager
from engine.movement import send_to_jail
from engine.property import get_board_config
from schemas.action import TurnPhase
from services.rate_limiter import rate_limiter

logger = logging.getLogger(__name__)


def _validate_qa(session_id: str, room_code: str) -> Optional[Dict[str, Any]]:
    """Validate QA access: room member, qa_mode enabled. Returns error dict or None."""
    room = room_manager.get_room(room_code)
    if not room:
        return {"status": "error", "message": "Room not found"}
    if not room.settings.qa_mode.enabled:
        return {"status": "error", "message": "QA mode is not enabled"}
    if room.host_id != session_id and session_id not in room.players:
        return {"status": "error", "message": "Not in room"}
    return None


@sio.on("qa:update_settings")
async def qa_update_settings(sid, data):
    """Update room settings from QA socket. Bypasses host check for E2E tests."""
    session = await require_session(sid, "qa_update_settings")
    if not session:
        return {"status": "error", "message": "Not authenticated"}
    session_id = session["session_id"]
    if not rate_limiter.allow(f"{session_id}:qa_update_settings"):
        return {"status": "error", "message": "Too many requests"}
    room_code, err = get_room_code_or_error(sid)
    if err:
        return err

    room = room_manager.get_room(room_code)
    if not room:
        return {"status": "error", "message": "Room not found"}

    settings = data.get("settings", {})
    if not settings:
        return {"status": "error", "message": "No settings provided"}

    # Update room settings directly (bypasses host check)
    from schemas.room import RoomSettings
    try:
        new_settings = room.settings.model_copy(update=settings)
        room.settings = new_settings
    except Exception as e:
        return {"status": "error", "message": f"Invalid settings: {e}"}

    return {"status": "success", "settings": room.settings.model_dump()}


@sio.on("qa:set_dice")
async def qa_set_dice(sid, data):
    session = await require_session(sid, "qa_set_dice")
    if not session:
        return {"status": "error", "message": "Not authenticated"}
    session_id = session["session_id"]
    if not rate_limiter.allow(f"{session_id}:qa_set_dice"):
        return {"status": "error", "message": "Too many requests"}
    room_code, err = get_room_code_or_error(sid)
    if err:
        return err

    async with room_manager.get_lock(room_code):
        err = _validate_qa(session_id, room_code)
        if err:
            return err

        game = turn_manager.get_game(room_code)
        if not game:
            return {"status": "error", "message": "No active game"}

        die1 = data.get("die1")
        die2 = data.get("die2")
        if not isinstance(die1, int) or not isinstance(die2, int):
            return {"status": "error", "message": "die1 and die2 must be integers"}
        if not (1 <= die1 <= 6) or not (1 <= die2 <= 6):
            return {"status": "error", "message": "Dice values must be 1-6"}

        game.qa_dice_queue.append((die1, die2))
        return {"status": "success", "queued": len(game.qa_dice_queue)}


@sio.on("qa:jump_to_tile")
async def qa_jump_to_tile(sid, data):
    session = await require_session(sid, "qa_jump_to_tile")
    if not session:
        return {"status": "error", "message": "Not authenticated"}
    session_id = session["session_id"]
    if not rate_limiter.allow(f"{session_id}:qa_jump_to_tile"):
        return {"status": "error", "message": "Too many requests"}
    room_code, err = get_room_code_or_error(sid)
    if err:
        return err

    async with room_manager.get_lock(room_code):
        err = _validate_qa(session_id, room_code)
        if err:
            return err

        game = turn_manager.get_game(room_code)
        turn = turn_manager.get_turn_state(room_code)
        if not game or not turn:
            return {"status": "error", "message": "No active game"}

        tile_id = data.get("tile_id")
        target_player_id = data.get("player_id", turn.active_player_id)
        if not isinstance(tile_id, int) or not (0 <= tile_id <= 39):
            return {"status": "error", "message": "tile_id must be 0-39"}

        player = game.room.players.get(target_player_id)
        if not player:
            return {"status": "error", "message": "Player not found"}

        player.position = tile_id
        game.add_log(f"[QA] {player.name} jumped to tile {tile_id}")
        await emit_game_state(room_code, game, turn)
        return {"status": "success"}


@sio.on("qa:force_card")
async def qa_force_card(sid, data):
    session = await require_session(sid, "qa_force_card")
    if not session:
        return {"status": "error", "message": "Not authenticated"}
    session_id = session["session_id"]
    if not rate_limiter.allow(f"{session_id}:qa_force_card"):
        return {"status": "error", "message": "Too many requests"}
    room_code, err = get_room_code_or_error(sid)
    if err:
        return err

    async with room_manager.get_lock(room_code):
        err = _validate_qa(session_id, room_code)
        if err:
            return err

        game = turn_manager.get_game(room_code)
        if not game:
            return {"status": "error", "message": "No active game"}

        card_type = data.get("card_type", "treasury")
        card_index = data.get("card_index", 0)

        if card_type == "treasury":
            deck = game.treasury_deck
        elif card_type == "surprise":
            deck = game.surprise_deck
        else:
            return {"status": "error", "message": "card_type must be 'treasury' or 'surprise'"}

        if not deck:
            return {"status": "error", "message": f"{card_type} deck is empty"}
        if not isinstance(card_index, int) or card_index < 0 or card_index >= len(deck):
            return {"status": "error", "message": f"card_index must be 0-{len(deck) - 1}"}

        card = deck[card_index]
        return {"status": "success", "card": card, "card_type": card_type}


@sio.on("qa:force_jail")
async def qa_force_jail(sid, data):
    session = await require_session(sid, "qa_force_jail")
    if not session:
        return {"status": "error", "message": "Not authenticated"}
    session_id = session["session_id"]
    if not rate_limiter.allow(f"{session_id}:qa_force_jail"):
        return {"status": "error", "message": "Too many requests"}
    room_code, err = get_room_code_or_error(sid)
    if err:
        return err

    async with room_manager.get_lock(room_code):
        err = _validate_qa(session_id, room_code)
        if err:
            return err

        game = turn_manager.get_game(room_code)
        turn = turn_manager.get_turn_state(room_code)
        if not game or not turn:
            return {"status": "error", "message": "No active game"}

        target_player_id = data.get("player_id", turn.active_player_id)
        player = game.room.players.get(target_player_id)
        if not player:
            return {"status": "error", "message": "Player not found"}

        send_to_jail(game, target_player_id)
        game.add_log(f"[QA] {player.name} was sent to jail")
        await emit_game_state(room_code, game, turn)
        return {"status": "success"}


@sio.on("qa:seed_property")
async def qa_seed_property(sid, data):
    session = await require_session(sid, "qa_seed_property")
    if not session:
        return {"status": "error", "message": "Not authenticated"}
    session_id = session["session_id"]
    if not rate_limiter.allow(f"{session_id}:qa_seed_property"):
        return {"status": "error", "message": "Too many requests"}
    room_code, err = get_room_code_or_error(sid)
    if err:
        return err

    async with room_manager.get_lock(room_code):
        err = _validate_qa(session_id, room_code)
        if err:
            return err

        game = turn_manager.get_game(room_code)
        turn = turn_manager.get_turn_state(room_code)
        if not game or not turn:
            return {"status": "error", "message": "No active game"}

        tile_id = data.get("tile_id", data.get("property_id"))
        player_id = data.get("player_id", data.get("owner_id"))

        if not isinstance(tile_id, int):
            return {"status": "error", "message": "tile_id must be an integer"}
        prop = game.properties.get(tile_id)
        if not prop:
            return {"status": "error", "message": "Property not found on board"}

        player = game.room.players.get(player_id)
        if not player:
            return {"status": "error", "message": "Player not found"}

        # Remove from previous owner if applicable
        if prop.owner_id and prop.owner_id != player_id:
            prev_owner = game.room.players.get(prop.owner_id)
            if prev_owner and tile_id in prev_owner.properties_owned:
                prev_owner.properties_owned.remove(tile_id)

        prop.owner_id = player_id
        if tile_id not in player.properties_owned:
            player.properties_owned.append(tile_id)

        config = get_board_config().get(tile_id, {})
        name = config.get("name", f"Property {tile_id}")
        game.add_log(f"[QA] {name} assigned to {player.name}")
        await emit_game_state(room_code, game, turn)
        return {"status": "success"}


@sio.on("qa:force_auction")
async def qa_force_auction(sid, data):
    session = await require_session(sid, "qa_force_auction")
    if not session:
        return {"status": "error", "message": "Not authenticated"}
    session_id = session["session_id"]
    if not rate_limiter.allow(f"{session_id}:qa_force_auction"):
        return {"status": "error", "message": "Too many requests"}
    room_code, err = get_room_code_or_error(sid)
    if err:
        return err

    async with room_manager.get_lock(room_code):
        err = _validate_qa(session_id, room_code)
        if err:
            return err

        game = turn_manager.get_game(room_code)
        turn = turn_manager.get_turn_state(room_code)
        if not game or not turn:
            return {"status": "error", "message": "No active game"}

        tile_id = data.get("tile_id", data.get("property_id"))
        if not isinstance(tile_id, int):
            return {"status": "error", "message": "tile_id must be an integer"}
        if tile_id not in game.properties:
            return {"status": "error", "message": "Property not found"}

        participants = [p for p in game.turn_order if not game.room.players[p].is_bankrupt]
        auction = auction_manager.start_auction(room_code, tile_id, participants)
        if not auction:
            return {"status": "error", "message": "Could not start auction"}

        turn.phase = TurnPhase.AUCTION
        turn.can_roll = False
        turn.can_end_turn = False
        game.add_log(f"[QA] Force auction started for property {tile_id}")
        await sio.emit("auction:start", {"auction": auction.model_dump()}, room=room_code)
        await emit_game_state(room_code, game, turn)
        return {"status": "success"}


@sio.on("qa:add_money")
async def qa_add_money(sid, data):
    session = await require_session(sid, "qa_add_money")
    if not session:
        return {"status": "error", "message": "Not authenticated"}
    session_id = session["session_id"]
    if not rate_limiter.allow(f"{session_id}:qa_add_money"):
        return {"status": "error", "message": "Too many requests"}
    room_code, err = get_room_code_or_error(sid)
    if err:
        return err

    async with room_manager.get_lock(room_code):
        err = _validate_qa(session_id, room_code)
        if err:
            return err

        game = turn_manager.get_game(room_code)
        turn = turn_manager.get_turn_state(room_code)
        if not game or not turn:
            return {"status": "error", "message": "No active game"}

        amount = data.get("amount", 0)
        target_player_id = data.get("player_id", turn.active_player_id)
        if not isinstance(amount, int):
            return {"status": "error", "message": "amount must be an integer"}

        player = game.room.players.get(target_player_id)
        if not player:
            return {"status": "error", "message": "Player not found"}

        player.money += amount
        game.add_log(f"[QA] {player.name} received +{amount} (balance: {player.money})")
        await emit_game_state(room_code, game, turn)
        return {"status": "success", "balance": player.money}


@sio.on("qa:get_state")
async def qa_get_state(sid, data):
    session = await require_session(sid, "qa_get_state")
    if not session:
        return {"status": "error", "message": "Not authenticated"}
    session_id = session["session_id"]
    if not rate_limiter.allow(f"{session_id}:qa_get_state"):
        return {"status": "error", "message": "Too many requests"}
    room_code, err = get_room_code_or_error(sid)
    if err:
        return err

    async with room_manager.get_lock(room_code):
        err = _validate_qa(session_id, room_code)
        if err:
            return err

        game = turn_manager.get_game(room_code)
        turn = turn_manager.get_turn_state(room_code)
        if not game or not turn:
            return {"status": "error", "message": "No active game"}

        players_info = {}
        for pid, player in game.room.players.items():
            players_info[pid] = {
                "name": player.name,
                "position": player.position,
                "money": player.money,
                "is_in_jail": player.is_in_jail,
                "is_bankrupt": player.is_bankrupt,
                "properties_owned": player.properties_owned,
            }

        return {
            "status": "success",
            "game": {
                "qa_mode": game.qa_mode,
                "qa_dice_queue": game.qa_dice_queue,
                "qa_dice_index": game.qa_dice_index,
                "turn_order": game.turn_order,
                "current_turn_index": game.current_turn_index,
                "free_parking_pool": game.free_parking_pool,
                "houses_remaining": game.houses_remaining,
                "hotels_remaining": game.hotels_remaining,
            },
            "turn": turn.model_dump(),
            "players": players_info,
        }


@sio.on("qa:set_current_player")
async def qa_set_current_player(sid, data):
    """Set the active player directly — for deterministic E2E turn control."""
    session = await require_session(sid, "qa_set_current_player")
    if not session:
        return {"status": "error", "message": "Not authenticated"}
    session_id = session["session_id"]
    if not rate_limiter.allow(f"{session_id}:qa_set_current_player"):
        return {"status": "error", "message": "Too many requests"}
    room_code, err = get_room_code_or_error(sid)
    if err:
        return err

    async with room_manager.get_lock(room_code):
        err = _validate_qa(session_id, room_code)
        if err:
            return err

        game = turn_manager.get_game(room_code)
        turn = turn_manager.get_turn_state(room_code)
        if not game or not turn:
            return {"status": "error", "message": "No active game"}

        target_player_id = data.get("player_id")
        if not target_player_id:
            return {"status": "error", "message": "player_id required"}

        if target_player_id not in game.turn_order:
            return {"status": "error", "message": "Player not in turn order"}

        game.current_turn_index = game.turn_order.index(target_player_id)
        turn.active_player_id = target_player_id
        turn.can_roll = True
        turn.can_end_turn = False
        turn.phase = TurnPhase.ACTION

        player = game.room.players.get(target_player_id)
        name = player.name if player else target_player_id
        game.add_log(f"[QA] Turn set to {name}")
        await emit_game_state(room_code, game, turn)
        return {"status": "success", "active_player": target_player_id}


@sio.on("qa:room_players")
async def qa_room_players(sid, data):
    """Return room players — works in waiting room (before game start)."""
    session = await require_session(sid, "qa_room_players")
    if not session:
        return {"status": "error", "message": "Not authenticated"}
    room_code, err = get_room_code_or_error(sid)
    if err:
        return err
    room = room_manager.get_room(room_code)
    if not room:
        return {"status": "error", "message": "Room not found"}
    players_info = {}
    for pid, player in room.players.items():
        players_info[pid] = {"name": player.name}
    return {"status": "success", "players": players_info, "count": len(players_info)}


@sio.on("qa:reset")
async def qa_reset(sid, data):
    """Reset all game state — for E2E test isolation."""
    session = await require_session(sid, "qa_reset")
    if not session:
        return {"status": "error", "message": "Not authenticated"}

    # Clean up all rooms from game engines
    for room_code in list(room_manager.rooms.keys()):
        turn_manager.cleanup_room(room_code)
        auction_manager.cleanup_room(room_code)

    # Reset room manager state (uses dict replacement, not .clear(), for async safety)
    room_manager.reset_all()

    return {"status": "success"}
