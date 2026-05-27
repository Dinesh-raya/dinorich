from typing import Dict, Optional, Tuple
from schemas.game import GameState
from schemas.action import TurnPhase
from schemas.room import RoomStatus
from engine.property import get_board_config, buy_property, can_build_house, build_house
from constants.game_rules import GameRules


class TimerManager:
    def __init__(self):
        self._buy_timers: Dict[str, Tuple[int, int]] = {}  # room_code -> (time_remaining, property_id)
        self._tax_timers: Dict[str, int] = {}  # room_code -> time_remaining

    def clear_buy_timer(self, room_code: str):
        """Remove the buy-phase timer for a room after a manual purchase."""
        self._buy_timers.pop(room_code, None)

    def cleanup_room(self, room_code: str):
        """Remove timer state for a room."""
        self._buy_timers.pop(room_code, None)
        self._tax_timers.pop(room_code, None)

    def tick_turn_timer(self, turn_manager, room_code: str) -> Tuple[Optional[dict], Optional[dict], Optional[int]]:
        """Returns (turn_state, auto_roll_dice, buy_timeout_property_id).
        buy_timeout_property_id is the property to auto-auction if BUY phase timed out."""
        turn = turn_manager.turn_states.get(room_code)
        game = turn_manager.games.get(room_code)
        if not turn or not game:
            return None, None, None

        # Skip timer tick if game is paused
        if game.room.settings.game_paused:
            return turn, None, None

        # Clean up timers if game is already over (TM-09)
        if game.room.status == RoomStatus.FINISHED:
            self._buy_timers.pop(room_code, None)
            self._tax_timers.pop(room_code, None)
            return turn, None, None

        # Handle BUY phase with its own timeout to prevent deadlock
        if turn.phase == TurnPhase.BUY:
            # QA: skip auto-buy if disabled
            if game.qa_mode and game.room.settings.qa_mode.auto_buy_disabled:
                return turn, None, None

            timer, prop_id = self._buy_timers.get(room_code, (GameRules.get_buy_timeout(game.room.settings.turn_timer_seconds), None))
            timer -= 1
            if timer <= 0:
                # Auto-play: buy if property costs less than 30% of player's money
                self._buy_timers.pop(room_code, None)
                player = game.room.players.get(turn.active_player_id)
                auto_bought = False
                if prop_id is not None:
                    config = get_board_config().get(prop_id)
                    price = config.get("price", 0) if config else 0
                    name = config["name"] if config else f"Property {prop_id}"
                    if player and price > 0 and price < player.money * 0.3:
                        success, _ = buy_property(game, turn.active_player_id, prop_id)
                        if success:
                            auto_bought = True
                            turn.phase = TurnPhase.ACTION
                            turn.can_end_turn = True
                            turn.time_remaining = 5
                            game.add_log(f"{player.name} auto-bought {name} (timeout)")
                    else:
                        if player:
                            game.add_log(f"{player.name} declined to buy {name} (timeout)")
                        else:
                            game.add_log(f"Buy timer expired — {name} goes to auction")
                        if game.room.settings.auction_enabled:
                            turn.phase = TurnPhase.AUCTION
                        else:
                            turn.phase = TurnPhase.ACTION
                return turn, None, None if auto_bought else prop_id
            else:
                self._buy_timers[room_code] = (timer, prop_id)
            return turn, None, None

        # Don't tick turn timer during AUCTION or DEBT phase
        if turn.phase in (TurnPhase.AUCTION, TurnPhase.DEBT):
            return turn, None, None

        # Handle pending tax with its own timeout
        if turn.pending_tax:
            timer = self._tax_timers.get(room_code, GameRules.TAX_TIMEOUT)
            timer -= 1
            if timer <= 0:
                # Auto-pay flat tax
                self._tax_timers.pop(room_code, None)
                player = game.room.players.get(turn.active_player_id)
                if player:
                    tax_amount = turn.pending_tax["amount"]
                    player.money -= tax_amount
                    if game.room.settings.free_parking_jackpot:
                        game.free_parking_pool += tax_amount
                    game.add_log(f"{player.name} tax auto-paid ₹{tax_amount}")
                    turn.pending_tax = None
                    if player.money < 0:
                        turn.in_debt = True
                        turn.debt_creditor_id = None
                        turn.debt_creditors = []
                        turn.can_roll = False
                        turn.can_end_turn = False
                        turn.phase = TurnPhase.DEBT
                    else:
                        turn.can_end_turn = True
                        turn.phase = TurnPhase.ACTION
                return turn, None, None
            else:
                self._tax_timers[room_code] = timer
            return turn, None, None

        turn.time_remaining = max(0, turn.time_remaining - 1)
        auto_roll_dice = None
        if turn.time_remaining == 0:
            active = game.room.players.get(turn.active_player_id)
            if active and turn.can_roll:
                result = turn_manager.process_roll(room_code, turn.active_player_id)
                if result:
                    auto_roll_dice = result.get("dice")
                turn = turn_manager.turn_states.get(room_code)
            # Auto-play: try to build a house before ending turn
            if turn and turn.phase == TurnPhase.ACTION and turn.can_end_turn:
                self._auto_build(game, turn.active_player_id)
                turn = turn_manager.turn_states.get(room_code)
            if turn and not turn.can_roll and turn.phase not in (
                TurnPhase.BUY, TurnPhase.AUCTION, TurnPhase.DEBT
            ) and not turn.pending_tax:
                if active:
                    game.add_log(f"{active.name}'s turn ended (timeout)")
                turn_manager.next_turn(room_code)
                turn = turn_manager.turn_states.get(room_code)
        return turn, auto_roll_dice, None

    def set_buy_timer(self, room_code: str, timeout: int, property_id: int):
        """Set the buy-phase timer for a room."""
        self._buy_timers[room_code] = (timeout, property_id)

    def _auto_build(self, game: GameState, player_id: str):
        """Auto-build one house on the cheapest available monopoly property.
        Called when the turn timer expires in ACTION phase."""
        player = game.room.players.get(player_id)
        if not player:
            return

        board = get_board_config()
        # Group owned properties by color
        color_groups: dict[str, list[int]] = {}
        for tid in player.properties_owned:
            config = board.get(tid)
            if config and config.get("type") == "property":
                color = config.get("color", "")
                if color not in color_groups:
                    color_groups[color] = []
                color_groups[color].append(tid)

        # Find buildable properties across all monopoly groups
        candidates: list[tuple[int, int, str]] = []  # (property_id, house_price, color)
        for color, tids in color_groups.items():
            house_price = GameRules.HOUSE_PRICES.get(color, 0)
            if house_price == 0:
                continue
            # Check monopoly
            all_color_tids = [tid for tid, cfg in board.items()
                              if cfg.get("color") == color and cfg.get("type") == "property"]
            if set(tids) != set(all_color_tids):
                continue
            # Check each property for buildability
            for tid in tids:
                can, _ = can_build_house(game, player_id, tid)
                if can and player.money >= house_price:
                    candidates.append((tid, house_price, color))

        if not candidates:
            return

        # Pick the cheapest property to build on (lowest house price, then lowest tile id)
        candidates.sort(key=lambda x: (x[1], x[0]))
        best_tid, _, _ = candidates[0]
        config = board.get(best_tid)
        name = config["name"] if config else f"Property {best_tid}"
        success, _ = build_house(game, player_id, best_tid)
        if success:
            game.add_log(f"{player.name} auto-built on {name}")
