from typing import Dict, Optional
from schemas.game import GameState
from schemas.action import TurnState, DiceState, TurnPhase
from engine.dice import roll_dice, handle_jail_roll
from engine.movement import move_player, send_to_jail
from engine.property import pay_rent, get_board_config
from engine.cards import card_engine
from engine.bankruptcy import declare_bankruptcy
from constants.game_rules import GameRules

class TurnManager:
    def __init__(self):
        self.games: Dict[str, GameState] = {}
        self.turn_states: Dict[str, TurnState] = {}
        self.active_doubles_count: Dict[str, int] = {}

    def start_game(self, room_code: str, game_state: GameState):
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
            # All players are bankrupt, stay on current
            next_idx = start_idx

        game.current_turn_index = next_idx
        next_player_id = game.turn_order[next_idx]

        # Waive any uncollected rent from previous turn
        self.waive_rent(room_code)

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
            strict_mode = game.room.settings.jail_strict_mode
            escaped = handle_jail_roll(player, dice, strict_mode)
            if escaped:
                jail_escape = True
                if not dice.is_double:
                    game.add_log(f"{player.name} served maximum jail time and is released")
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

        # Track creditor for bankruptcy
        creditor_id = None

        # Initialize result (will be overridden if card is drawn)
        result = None

        # Rent logic
        pos = player.position
        config = get_board_config().get(pos)
        if config and config["type"] in ["property", "airport", "utility"]:
            prop_state = game.properties.get(pos)
            if not prop_state:
                turn.phase = TurnPhase.ACTION
            elif prop_state.owner_id is None:
                turn.phase = TurnPhase.BUY # Wait for buy action or auction
            elif prop_state.owner_id != player_id and not prop_state.is_mortgaged:
                creditor_id = prop_state.owner_id
                # Calculate rent amount but don't auto-pay
                from engine.property import calculate_rent
                rent_amount = calculate_rent(game, pos)
                if config["type"] == "utility":
                    rent_amount = dice.total * (10000 if sum(1 for p in game.properties.values() if p.owner_id == creditor_id and get_board_config().get(p.tile_id, {}).get("type") == "utility") >= 2 else 4000)
                turn.pending_rent = {
                    "payer_id": player_id,
                    "owner_id": creditor_id,
                    "amount": rent_amount,
                    "property_id": pos,
                    "property_name": config["name"]
                }
                turn.phase = TurnPhase.ACTION
                game.add_log(f"{player.name} landed on {config['name']} (owned by {game.room.players[creditor_id].name})")
            else:
                turn.phase = TurnPhase.ACTION
        elif config and config["type"] == "tax":
            tax = config.get("amount", 0)
            # Don't auto-deduct - let player choose flat or 10%
            turn.pending_tax = {"amount": tax, "name": config["name"], "tile_id": pos}
            turn.phase = TurnPhase.ACTION
            turn.can_end_turn = False  # Must pay tax before ending turn
            game.add_log(f"{player.name} landed on {config['name']} (₹{tax})")
        elif config and config["type"] == "treasury":
            card = card_engine.draw_treasury(game, player_id)
            turn.phase = TurnPhase.ACTION
            result = {"dice": dice.model_dump(), "game": game, "turn": turn, "card_drawn": card, "card_type": "treasury"}
        elif config and config["type"] == "surprise":
            card = card_engine.draw_surprise(game, player_id)
            turn.phase = TurnPhase.ACTION
            result = {"dice": dice.model_dump(), "game": game, "turn": turn, "card_drawn": card, "card_type": "surprise"}
        elif config and config["type"] == "corner" and pos == 20:
            # Free Parking
            if game.room.settings.free_parking_jackpot and game.free_parking_pool > 0:
                player.money += game.free_parking_pool
                game.add_log(f"{player.name} collected Free Parking jackpot of ₹{game.free_parking_pool}!")
                game.free_parking_pool = 0
            turn.phase = TurnPhase.ACTION
        else:
            turn.phase = TurnPhase.ACTION

        # Check if player is in debt (negative balance)
        if player.money < 0:
            turn.in_debt = True
            turn.debt_creditor_id = creditor_id
            turn.can_roll = False
            turn.can_end_turn = False  # Cannot end turn until debt is resolved
            turn.phase = TurnPhase.DEBT
            game.add_log(f"{player.name} is in debt (₹{player.money}). Must trade, mortgage, or declare bankruptcy.")
        else:
            turn.in_debt = False
            turn.debt_creditor_id = None

        # Only allow end turn if not in debt and can't roll
        # During BUY phase, player must buy or auction - cannot end turn
        if not turn.in_debt and turn.phase != TurnPhase.BUY:
            turn.can_end_turn = not turn.can_roll
        elif turn.phase == TurnPhase.BUY:
            turn.can_end_turn = False

        # Return result (may include card info if card was drawn)
        if result is None:
            result = {"dice": dice.model_dump(), "game": game, "turn": turn}
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
            turn.can_end_turn = True
            turn.phase = TurnPhase.ACTION
            game.add_log(f"{player.name} resolved their debt. Balance: ₹{player.money}")

        return turn

    def collect_rent(self, room_code: str, owner_id: str) -> Optional[dict]:
        """Property owner collects pending rent."""
        turn = self.turn_states.get(room_code)
        game = self.games.get(room_code)
        if not turn or not game:
            return None
        if not turn.pending_rent:
            return None
        if turn.pending_rent["owner_id"] != owner_id:
            return None

        payer = game.room.players.get(turn.pending_rent["payer_id"])
        owner = game.room.players.get(owner_id)
        if not payer or not owner:
            return None

        amount = turn.pending_rent["amount"]
        if payer.money >= amount:
            payer.money -= amount
            owner.money += amount
            game.add_log(f"{owner.name} collected ₹{amount} rent from {payer.name}")
        else:
            # Payer can't afford - will go into debt
            payer.money -= amount
            owner.money += amount
            game.add_log(f"{owner.name} collected ₹{amount} rent from {payer.name} (debt)")
            turn.in_debt = True
            turn.debt_creditor_id = owner_id

        turn.pending_rent = None
        return {"game": game, "turn": turn}

    def waive_rent(self, room_code: str) -> Optional[dict]:
        """Waive uncollected rent (owner didn't collect before next turn)."""
        turn = self.turn_states.get(room_code)
        game = self.games.get(room_code)
        if not turn or not game:
            return None
        if not turn.pending_rent:
            return None

        owner = game.room.players.get(turn.pending_rent["owner_id"])
        payer = game.room.players.get(turn.pending_rent["payer_id"])
        if owner and payer:
            game.add_log(f"{owner.name} forgot to collect rent from {payer.name} - rent waived!")

        turn.pending_rent = None
        return {"game": game, "turn": turn}

    def pay_jail_fine(self, room_code: str, player_id: str) -> Optional[dict]:
        """Player pays fine to get out of jail."""
        turn = self.turn_states.get(room_code)
        game = self.games.get(room_code)
        if not turn or not game:
            return None
        if turn.active_player_id != player_id:
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

        player = game.room.players.get(player_id)
        if not player or not player.is_in_jail:
            return None

        if player.get_out_of_jail_cards <= 0:
            return None

        player.get_out_of_jail_cards -= 1
        player.is_in_jail = False
        player.jail_turns = 0

        game.add_log(f"{player.name} used a Get Out of Jail Free card")

        # After using card, player can roll
        turn.can_roll = True
        turn.can_end_turn = False
        turn.phase = TurnPhase.ROLL

        return {"game": game, "turn": turn}

    def pay_tax(self, room_code: str, player_id: str, use_percentage: bool = False) -> Optional[dict]:
        """Player pays tax - either flat amount or 10% of total worth."""
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

        if use_percentage:
            # Calculate 10% of total worth (cash + property values + building costs)
            total_worth = player.money
            for prop_id in player.properties_owned:
                prop_state = game.properties.get(prop_id)
                if prop_state:
                    config = get_board_config().get(prop_id)
                    if config:
                        total_worth += config.get("price", 0)
                        # Add building values
                        house_price = config.get("house_price", 0)
                        total_worth += prop_state.houses * house_price
                        total_worth += prop_state.hotels * house_price * 5
            tax_amount = int(total_worth * 0.1)
            game.add_log(f"{player.name} chose to pay 10% of worth (₹{tax_amount})")
        else:
            tax_amount = turn.pending_tax["amount"]
            game.add_log(f"{player.name} paid ₹{tax_amount} for {turn.pending_tax['name']}")

        player.money -= tax_amount

        # Add to free parking pool if enabled
        if game.room.settings.free_parking_jackpot:
            game.free_parking_pool += tax_amount

        turn.pending_tax = None
        turn.can_end_turn = True

        return {"game": game, "turn": turn}

    def declare_voluntary_bankruptcy(self, room_code: str, player_id: str) -> Optional[dict]:
        """Player voluntarily declares bankruptcy when they can't resolve debt."""
        turn = self.turn_states.get(room_code)
        game = self.games.get(room_code)
        if not turn or not game or turn.active_player_id != player_id or not turn.in_debt:
            return None

        declare_bankruptcy(game, player_id, turn.debt_creditor_id)
        turn.can_end_turn = True
        turn.can_roll = False
        turn.phase = TurnPhase.END

        return {"game": game, "turn": turn}

    def tick_turn_timer(self, room_code: str) -> tuple[Optional[TurnState], Optional[dict]]:
        """Returns (turn_state, auto_roll_dice) tuple. auto_roll_dice is None if no auto-roll happened."""
        turn = self.turn_states.get(room_code)
        game = self.games.get(room_code)
        if not turn or not game:
            return None, None
        turn.time_remaining = max(0, turn.time_remaining - 1)
        auto_roll_dice = None
        if turn.time_remaining == 0:
            active = game.room.players.get(turn.active_player_id)
            if active and turn.can_roll:
                result = self.process_roll(room_code, turn.active_player_id)
                if result:
                    auto_roll_dice = result.get("dice")
                turn = self.turn_states.get(room_code)
            if turn and not turn.can_roll:
                self.next_turn(room_code)
                turn = self.turn_states.get(room_code)
        return turn, auto_roll_dice

turn_manager = TurnManager()
