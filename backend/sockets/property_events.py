from typing import Callable, Tuple
from pydantic import ValidationError
from sockets.server import sio
from rooms.manager import room_manager
from engine.turn_manager import turn_manager
from engine.property import buy_property, mortgage_property, unmortgage_property, build_house, build_hotel, sell_house, sell_hotel
from schemas.contracts import PropertyActionPayload
from schemas.action import TurnPhase
from services.rate_limiter import rate_limiter
from sockets.events import GAME_EVENTS
from sockets.helpers import get_room_code_or_error, emit_game_state


def _make_property_handler(action_fn: Callable, event_name: str, require_buy_phase: bool = False):
    """Factory that creates a property socket handler with shared boilerplate."""
    async def handler(sid, data):
        if not rate_limiter.allow(f"{sid}:{event_name}"):
            return {"status": "error", "message": "Too many requests"}

        room_code, err = get_room_code_or_error(sid)
        if err:
            return err

        turn = turn_manager.get_turn_state(room_code)
        if require_buy_phase:
            if not turn or turn.active_player_id != sid or turn.phase != TurnPhase.BUY:
                return {"status": "error", "message": "Not the time to buy"}
        else:
            # Non-buy actions (mortgage, build, sell) require it to be your turn and in ACTION or DEBT phase
            if turn and turn.active_player_id != sid:
                return {"status": "error", "message": "Not your turn"}
            if turn and turn.phase not in (TurnPhase.ACTION, TurnPhase.DEBT):
                return {"status": "error", "message": "Cannot do property actions in this phase"}

        try:
            payload = PropertyActionPayload.model_validate(data or {})
        except ValidationError as exc:
            return {"status": "error", "message": exc.errors()[0]["msg"]}

        property_id = payload.property_id
        game = turn_manager.get_game(room_code)
        if not game:
            return {"status": "error", "message": "No active game"}

        success, msg = action_fn(game, sid, property_id)
        if not success:
            return {"status": "error", "message": msg}

        # Check if debt was resolved by this action (mortgage/sell gives money)
        turn_manager.check_debt_resolved(room_code, sid)

        turn = turn_manager.get_turn_state(room_code)
        if turn:
            if require_buy_phase:
                turn.phase = TurnPhase.ACTION
                turn.can_end_turn = True
            await emit_game_state(room_code, game, turn)
        return {"status": "success"}

    return handler


# Register all property handlers
property_buy = _make_property_handler(buy_property, "property_buy", require_buy_phase=True)
property_mortgage = _make_property_handler(mortgage_property, "property_mortgage")
property_unmortgage = _make_property_handler(unmortgage_property, "property_unmortgage")
property_build_house = _make_property_handler(build_house, "property_build_house")
property_build_hotel = _make_property_handler(build_hotel, "property_build_hotel")
property_sell_house = _make_property_handler(sell_house, "property_sell_house")
property_sell_hotel = _make_property_handler(sell_hotel, "property_sell_hotel")

sio.on("property:buy")(property_buy)
sio.on("property:mortgage")(property_mortgage)
sio.on("property:unmortgage")(property_unmortgage)
sio.on("property:build_house")(property_build_house)
sio.on("property:build_hotel")(property_build_hotel)
sio.on("property:sell_house")(property_sell_house)
sio.on("property:sell_hotel")(property_sell_hotel)
