import logging
from typing import Dict, Optional
from schemas.game import GameState
from schemas.action import TurnState, DiceState, TurnPhase
from schemas.room import RoomStatus
from engine.dice import roll_dice, handle_jail_roll
from engine.movement import move_player, send_to_jail
from engine.property import get_board_config, buy_property, can_build_house, build_house
from engine.cards import card_engine
from engine.bankruptcy import declare_bankruptcy
from engine.jail import pay_jail_fine as _pay_jail_fine, use_jail_card as _use_jail_card
from engine.tax import pay_tax as _pay_tax
from engine.timer_manager import TimerManager
from constants.game_rules import GameRules

class TurnManager:
    def __init__(self):
        self.games: Dict[str, GameState] = {}
        self.turn_states: Dict[str, TurnState] = {}
        self.active_doubles_count: Dict[str, int] = {}
        self._timers = TimerManager()

    def clear_buy_timer(self, room_code: str):
        self._timers.clear_buy_timer(room_code)

    def cleanup_room(self, room_code: str):
        self.games.pop(room_code, None)
        self.turn_states.pop(room_code, None)
        self.active_doubles_count.pop(room_code, None)
        self._timers.cleanup_room(room_code)

    def start_game(self, room_code: str, game_state: GameState):
        if not game_state.turn_order:
            return
        self.games[room_code] = game_state
        first_player_id = game_state.turn_order[0]

        # QA timer override
        initial_timer = game_state.room.settings.turn_timer_seconds
        if game_state.qa_mode and game_state.room.settings.qa_mode.turn_timer_seconds > 0:
            initial_timer = game_state.room.settings.qa_mode.turn_timer_seconds

        self.turn_states[room_code] = TurnState(
            active_player_id=first_player_id,
            phase=TurnPhase.ROLL,
            can_roll=True,
            can_end_turn=False,
            time_remaining=initial_timer
        )
        self.active_doubles_count[room_code] = 0

    def get_game(self, room_code: str) -> Optional[GameState]:
        return self.games.get(room_code)

    def get_turn_state(self, room_code: str) -> Optional[TurnState]:
        return self.turn_states.get(room_code)

    def next_turn(self, room_code: str) -> Optional[TurnState]:
        game = self.games.get(room_code)
        if not game or not game.turn_order:
            return None

        # Skip bankrupt players
        start_idx = game.current_turn_index
        checked_count = 0
        next_idx = (start_idx + 1) % len(game.turn_order)

        while checked_count < len(game.turn_order):
            next_player_id = game.turn_order[next_idx]
            player = game.room.players.get(next_player_id)
            if player and not player.is_bankrupt:
                break  # Found a valid non-bankrupt player
            next_idx = (next_idx + 1) % len(game.turn_order)
            checked_count += 1
        else:
            # All players are bankrupt — game is over
            game.room.status = RoomStatus.FINISHED
            game.add_log("Game Over! All players are bankrupt.")
            self._timers.cleanup_room(room_code)
            return None

        game.current_turn_index = next_idx
        next_player_id = game.turn_order[next_idx]

        # Reset turn state
        self.active_doubles_count[room_code] = 0
        new_turn = TurnState(
            active_player_id=next_player_id,
            phase=TurnPhase.ROLL,
            can_roll=True,
            can_end_turn=False,
            time_remaining=game.room.settings.turn_timer_seconds
        )

        # QA timer override for subsequent turns
        if game.qa_mode and game.room.settings.qa_mode.turn_timer_seconds > 0:
            new_turn.time_remaining = game.room.settings.qa_mode.turn_timer_seconds

        self.turn_states[room_code] = new_turn
        return new_turn

    def process_roll(self, room_code: str, player_id: str) -> Optional[Dict]:
        """Returns a dict with dice state and updated game state."""
        game = self.games.get(room_code)
        turn = self.turn_states.get(room_code)

        if not game or not turn:
            return None

        if turn.active_player_id != player_id or not turn.can_roll:
            return None

        player = game.room.players[player_id]
        dice = roll_dice(game)

        jail_escape = False
        if player.is_in_jail:
            # Save jail_turns before the call — handle_jail_roll resets it to 0
            was_last_jail_turn = player.jail_turns >= GameRules.MAX_JAIL_TURNS - 1
            escaped = handle_jail_roll(player, dice)
            if escaped:
                jail_escape = True
                # Official rules: 3rd turn forces fine regardless of doubles;
                # turns 1-2 doubles escape is free
                if was_last_jail_turn or not dice.is_double:
                    fine = GameRules.JAIL_FINE
                    player.money -= fine
                    if game.room.settings.free_parking_jackpot:
                        game.free_parking_pool += fine
                    game.add_log(f"{player.name} served maximum jail time, paid ₹{fine:,} fine and is released")
                    # Fall through to normal movement + tile evaluation
            else:
                # Turn ends if they fail to roll doubles
                turn.can_roll = False
                turn.can_end_turn = True
                turn.phase = TurnPhase.END
                return {"dice": dice.model_dump(), "game": game, "turn": turn}

        # Not in jail or just escaped
        # Don't count jail escape doubles toward the 3-doubles rule
        if dice.is_double and not jail_escape:
            self.active_doubles_count[room_code] += 1
            dice.doubles_count = self.active_doubles_count[room_code]

            if dice.doubles_count >= GameRules.MAX_DOUBLES:
                send_to_jail(game, player_id)
                turn.can_roll = False
                turn.can_end_turn = True
                turn.phase = TurnPhase.END
                return {"dice": dice.model_dump(), "game": game, "turn": turn}
            else:
                # Can roll again
                turn.can_roll = True
        else:
            turn.can_roll = False

        # Move player
        spaces = dice.total
        move_player(game, player_id, spaces)

        # Check Go To Jail tile
        if player.position == GameRules.GO_TO_JAIL_TILE:
            send_to_jail(game, player_id)
            turn.can_roll = False
            turn.can_end_turn = True
            turn.phase = TurnPhase.END
            return {"dice": dice.model_dump(), "game": game, "turn": turn}

        # Track creditors for bankruptcy — list of (creditor_id, amount) tuples
        creditor_debts: list[tuple[str, int]] = []

        # Collect card draws for chained cards (e.g. card moves to another card tile)
        card_draws: list[dict] = []

        # Helper to evaluate tile effects at current position
        def evaluate_tile(tile_pos, _depth=0):
            if _depth > 3:
                game.add_log(f"[WARN] Tile evaluation depth exceeded at position {tile_pos}")
                turn.phase = TurnPhase.ACTION
                return
            nonlocal creditor_debts, card_draws
            config = get_board_config().get(tile_pos)
            if config and config["type"] in ["property", "airport", "utility"]:
                prop_state = game.properties.get(tile_pos)
                if not prop_state:
                    turn.phase = TurnPhase.ACTION
                elif prop_state.owner_id is None:
                    turn.phase = TurnPhase.BUY
                    self._timers.set_buy_timer(room_code, GameRules.get_buy_timeout(game.room.settings.turn_timer_seconds), tile_pos)
                elif prop_state.owner_id != player_id and not prop_state.is_mortgaged:
                    rent_creditor_id = prop_state.owner_id
                    creditor = game.room.players[rent_creditor_id]
                    from engine.property import calculate_rent
                    rent_amount = calculate_rent(game, tile_pos, dice.total)
                    player.money -= rent_amount
                    creditor.money += rent_amount
                    # Track debt if player is now in negative balance
                    if player.money < 0:
                        creditor_debts.append((rent_creditor_id, rent_amount))
                    turn.phase = TurnPhase.ACTION
                    game.add_log(f"{player.name} paid ₹{rent_amount} rent to {creditor.name} for {config['name']}")
                else:
                    turn.phase = TurnPhase.ACTION
            elif config and config["type"] == "tax":
                tax = config.get("amount", 0)
                turn.pending_tax = {"amount": tax, "name": config["name"], "tile_id": tile_pos}
                turn.phase = TurnPhase.ACTION
                turn.can_end_turn = False
                game.add_log(f"{player.name} landed on {config['name']} (₹{tax})")
            elif config and config["type"] == "treasury":
                card = card_engine.draw_treasury(game, player_id)
                turn.phase = TurnPhase.ACTION
                card_draws.append({"card_drawn": card, "card_type": "treasury"})
                # If card sent player to jail, end the turn
                if player.is_in_jail:
                    turn.can_roll = False
                    turn.can_end_turn = True
                    turn.phase = TurnPhase.END
                # Re-evaluate if card moved player (e.g. "Advance to" cards)
                elif player.position != tile_pos:
                    evaluate_tile(player.position, _depth + 1)
            elif config and config["type"] == "surprise":
                card = card_engine.draw_surprise(game, player_id)
                turn.phase = TurnPhase.ACTION
                card_draws.append({"card_drawn": card, "card_type": "surprise"})
                # If card sent player to jail, end the turn
                if player.is_in_jail:
                    turn.can_roll = False
                    turn.can_end_turn = True
                    turn.phase = TurnPhase.END
                # Re-evaluate if card moved player (e.g. "Go back 3 spaces")
                elif player.position != tile_pos:
                    evaluate_tile(player.position, _depth + 1)
            elif config and config["type"] == "corner" and tile_pos == 20:
                if game.room.settings.free_parking_jackpot and game.free_parking_pool > 0:
                    player.money += game.free_parking_pool
                    game.add_log(f"{player.name} collected Free Parking jackpot of ₹{game.free_parking_pool}!")
                    game.free_parking_pool = 0
                turn.phase = TurnPhase.ACTION
            else:
                turn.phase = TurnPhase.ACTION

        evaluate_tile(player.position)

        # Check if player is in debt (negative balance)
        if player.money < 0:
            turn.in_debt = True
            turn.debt_creditors = creditor_debts
            # Primary creditor: first one who pushed the player into debt
            turn.debt_creditor_id = creditor_debts[0][0] if creditor_debts else None
            turn.can_roll = False
            turn.can_end_turn = False
            turn.phase = TurnPhase.DEBT
            game.add_log(f"{player.name} is in debt (₹{player.money}). Must trade, mortgage, or declare bankruptcy.")
        else:
            turn.in_debt = False
            turn.debt_creditor_id = None
            turn.debt_creditors = []

        # Only allow end turn if not in debt, not in BUY phase, and no pending tax
        if not turn.in_debt and turn.phase != TurnPhase.BUY and not turn.pending_tax:
            turn.can_end_turn = not turn.can_roll
        elif turn.phase == TurnPhase.BUY:
            turn.can_end_turn = False
        elif turn.phase == TurnPhase.DEBT:
            turn.can_end_turn = False

        # Build return result (may include card info if cards were drawn)
        result: dict = {"dice": dice.model_dump(), "game": game, "turn": turn}
        if card_draws:
            result["card_draws"] = card_draws
            result["card_drawn"] = card_draws[0]["card_drawn"]
            result["card_type"] = card_draws[0]["card_type"]
        return result

    def check_debt_resolved(self, room_code: str, player_id: str) -> Optional[TurnState]:
        """Check if a player's debt has been resolved (money >= 0). Called after trade/mortgage/sell."""
        turn = self.turn_states.get(room_code)
        game = self.games.get(room_code)
        if not turn or not game or turn.active_player_id != player_id or not turn.in_debt:
            return turn

        player = game.room.players.get(player_id)
        if not player:
            return turn

        if player.money >= 0:
            turn.in_debt = False
            turn.debt_creditor_id = None
            turn.debt_creditors = []
            turn.can_end_turn = True
            turn.phase = TurnPhase.ACTION
            game.add_log(f"{player.name} resolved their debt. Balance: ₹{player.money}")

        return turn

    def pay_jail_fine(self, room_code: str, player_id: str) -> Optional[dict]:
        turn = self.turn_states.get(room_code)
        game = self.games.get(room_code)
        if not turn or not game:
            return None
        return _pay_jail_fine(game, turn, player_id)

    def use_jail_card(self, room_code: str, player_id: str) -> Optional[dict]:
        turn = self.turn_states.get(room_code)
        game = self.games.get(room_code)
        if not turn or not game:
            return None
        return _use_jail_card(game, turn, player_id)

    def pay_tax(self, room_code: str, player_id: str, use_percentage: bool = False) -> Optional[dict]:
        turn = self.turn_states.get(room_code)
        game = self.games.get(room_code)
        if not turn or not game:
            return None
        return _pay_tax(game, turn, player_id, use_percentage)

    def declare_voluntary_bankruptcy(self, room_code: str, player_id: str) -> Optional[dict]:
        """Player voluntarily declares bankruptcy when they can't resolve debt."""
        turn = self.turn_states.get(room_code)
        game = self.games.get(room_code)
        if not turn or not game or turn.active_player_id != player_id or not turn.in_debt:
            return None

        declare_bankruptcy(game, player_id, turn.debt_creditor_id, turn.debt_creditors)
        turn.can_end_turn = True
        turn.can_roll = False
        turn.phase = TurnPhase.END

        return {"game": game, "turn": turn}

    def tick_turn_timer(self, room_code: str) -> tuple[Optional[TurnState], Optional[dict], Optional[int]]:
        return self._timers.tick_turn_timer(self, room_code)

    def _auto_build(self, game: GameState, player_id: str):
        self._timers._auto_build(game, player_id)

turn_manager = TurnManager()
