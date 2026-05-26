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
from constants.game_rules import GameRules

class TurnManager:
    def __init__(self):
        self.games: Dict[str, GameState] = {}
        self.turn_states: Dict[str, TurnState] = {}
        self.active_doubles_count: Dict[str, int] = {}
        self._buy_timers: Dict[str, tuple[int, int]] = {}  # room_code -> (time_remaining, property_id)
        self._tax_timers: Dict[str, int] = {}  # room_code -> time_remaining

    def clear_buy_timer(self, room_code: str):
        """Remove the buy-phase timer for a room after a manual purchase."""
        self._buy_timers.pop(room_code, None)

    def cleanup_room(self, room_code: str):
        """Remove all game state for a room from memory."""
        self.games.pop(room_code, None)
        self.turn_states.pop(room_code, None)
        self.active_doubles_count.pop(room_code, None)
        self._buy_timers.pop(room_code, None)
        self._tax_timers.pop(room_code, None)

    def start_game(self, room_code: str, game_state: GameState):
        if not game_state.turn_order:
            return
        self.games[room_code] = game_state
        first_player_id = game_state.turn_order[0]
        
        self.turn_states[room_code] = TurnState(
            active_player_id=first_player_id,
            phase="roll",
            can_roll=True,
            can_end_turn=False,
            time_remaining=game_state.room.settings.turn_timer_seconds
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
            # Clean up timers (TM-09)
            self._buy_timers.pop(room_code, None)
            self._tax_timers.pop(room_code, None)
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
        dice = roll_dice()

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
                    self._buy_timers[room_code] = (GameRules.get_buy_timeout(game.room.settings.turn_timer_seconds), tile_pos)
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
        """Player pays fine to get out of jail."""
        turn = self.turn_states.get(room_code)
        game = self.games.get(room_code)
        if not turn or not game:
            return None
        if turn.active_player_id != player_id:
            return None
        if turn.phase != TurnPhase.ROLL:
            return None

        player = game.room.players.get(player_id)
        if not player or not player.is_in_jail:
            return None

        if player.money < GameRules.JAIL_FINE:
            return None

        player.money -= GameRules.JAIL_FINE
        player.is_in_jail = False
        player.jail_turns = 0

        # Add fine to free parking pool if enabled
        if game.room.settings.free_parking_jackpot:
            game.free_parking_pool += GameRules.JAIL_FINE

        game.add_log(f"{player.name} paid ₹{GameRules.JAIL_FINE} fine and got out of jail")

        # After paying fine, player can roll
        turn.can_roll = True
        turn.can_end_turn = False
        turn.phase = TurnPhase.ROLL

        return {"game": game, "turn": turn}

    def use_jail_card(self, room_code: str, player_id: str) -> Optional[dict]:
        """Player uses Get Out of Jail Free card."""
        turn = self.turn_states.get(room_code)
        game = self.games.get(room_code)
        if not turn or not game:
            return None
        if turn.active_player_id != player_id:
            return None
        if turn.phase != TurnPhase.ROLL:
            return None

        player = game.room.players.get(player_id)
        if not player or not player.is_in_jail:
            return None

        if player.get_out_of_jail_cards <= 0:
            return None

        player.get_out_of_jail_cards -= 1
        player.is_in_jail = False
        player.jail_turns = 0

        # Return GOOJF card to the correct deck (standard Monopoly rule)
        source = player.goojf_sources.pop() if player.goojf_sources else "treasury"
        card_engine.return_goojf_card(game, source)

        game.add_log(f"{player.name} used a Get Out of Jail Free card")

        # After using card, player can roll
        turn.can_roll = True
        turn.can_end_turn = False
        turn.phase = TurnPhase.ROLL

        return {"game": game, "turn": turn}

    def pay_tax(self, room_code: str, player_id: str, use_percentage: bool = False) -> Optional[dict]:
        """Player pays tax - either flat amount or 10% of total worth.
        
        Rules:
        - Luxury Tax (tile 38): flat amount only, no percentage option.
        - Income Tax (tile 4): flat amount or 10% of total worth.
        - If 10% would be ≤ 0, flat amount is enforced.
        """
        turn = self.turn_states.get(room_code)
        game = self.games.get(room_code)
        if not turn or not game:
            return None
        if turn.active_player_id != player_id:
            return None
        if not turn.pending_tax:
            return None

        player = game.room.players.get(player_id)
        if not player:
            return None

        tile_id = turn.pending_tax.get("tile_id")
        flat_amount = turn.pending_tax["amount"]

        # Luxury Tax is flat only
        if tile_id == 38:
            use_percentage = False

        if use_percentage:
            total_worth = player.money
            property_worth = 0
            building_worth = 0
            for prop_id in player.properties_owned:
                prop_state = game.properties.get(prop_id)
                if prop_state:
                    if prop_state.is_mortgaged:
                        continue
                    config = get_board_config().get(prop_id)
                    if config:
                        prop_price = config.get("price", 0)
                        property_worth += prop_price
                        total_worth += prop_price
                        color = config.get("color")
                        if color:
                            house_price = GameRules.HOUSE_PRICES.get(color, 0)
                            b_worth = prop_state.houses * house_price + prop_state.hotels * house_price * GameRules.HOTEL_PRICE_MULTIPLIER
                            building_worth += b_worth
                            total_worth += b_worth
            tax_amount = int(total_worth * 0.1)
            logger = logging.getLogger(__name__)
            logger.info(f"TAX CALC for {player.name}: cash={player.money}, "
                        f"property_worth={property_worth}, building_worth={building_worth}, "
                        f"total_worth={total_worth}, tax_10pct={tax_amount}")
            if tax_amount <= 0:
                tax_amount = flat_amount
                game.add_log(f"{player.name} has negligible worth — paying flat amount ₹{tax_amount:,}")
            else:
                game.add_log(f"{player.name} chose to pay 10% of worth (worth ₹{total_worth:,} → tax ₹{tax_amount:,})")
        else:
            tax_amount = flat_amount
            game.add_log(f"{player.name} paid ₹{tax_amount:,} for {turn.pending_tax['name']}")

        player.money -= tax_amount

        if game.room.settings.free_parking_jackpot:
            game.free_parking_pool += tax_amount

        turn.pending_tax = None

        if player.money < 0:
            turn.in_debt = True
            turn.debt_creditor_id = None
            turn.debt_creditors = []
            turn.can_roll = False
            turn.can_end_turn = False
            turn.phase = TurnPhase.DEBT
            game.add_log(f"{player.name} is in debt (₹{player.money}). Must trade, mortgage, or declare bankruptcy.")
        else:
            turn.can_end_turn = True

        return {"game": game, "turn": turn}

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
        """Returns (turn_state, auto_roll_dice, buy_timeout_property_id). 
        buy_timeout_property_id is the property to auto-auction if BUY phase timed out."""
        turn = self.turn_states.get(room_code)
        game = self.games.get(room_code)
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
                result = self.process_roll(room_code, turn.active_player_id)
                if result:
                    auto_roll_dice = result.get("dice")
                turn = self.turn_states.get(room_code)
            # Auto-play: try to build a house before ending turn
            if turn and turn.phase == TurnPhase.ACTION and turn.can_end_turn:
                self._auto_build(game, turn.active_player_id)
                turn = self.turn_states.get(room_code)
            if turn and not turn.can_roll and turn.phase not in (
                TurnPhase.BUY, TurnPhase.AUCTION, TurnPhase.DEBT
            ) and not turn.pending_tax:
                if active:
                    game.add_log(f"{active.name}'s turn ended (timeout)")
                self.next_turn(room_code)
                turn = self.turn_states.get(room_code)
        return turn, auto_roll_dice, None

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

turn_manager = TurnManager()
