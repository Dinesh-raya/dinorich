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

        game.add_log(f"{player.name} rolled {dice.die1} and {dice.die2}")

        jail_escape = False
        if player.is_in_jail:
            escaped = handle_jail_roll(player, dice)
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
        spaces = dice.die1 + dice.die2
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
                pay_rent(game, player_id, pos, dice.die1 + dice.die2)
                turn.phase = TurnPhase.ACTION
            else:
                turn.phase = TurnPhase.ACTION
        elif config and config["type"] == "tax":
            tax = config.get("amount", 0)
            player.money -= tax
            game.add_log(f"{player.name} paid ₹{tax} for {config['name']}")
            turn.phase = TurnPhase.ACTION
        elif config and config["type"] == "treasury":
            card_engine.draw_treasury(game, player_id)
            turn.phase = TurnPhase.ACTION
        elif config and config["type"] == "surprise":
            card_engine.draw_surprise(game, player_id)
            turn.phase = TurnPhase.ACTION
        else:
            turn.phase = TurnPhase.ACTION

        # Check bankruptcy
        if player.money < 0:
            declare_bankruptcy(game, player_id, creditor_id)
            turn.can_end_turn = True
            turn.can_roll = False
            turn.phase = TurnPhase.END
            
        turn.can_end_turn = not turn.can_roll
        
        return {"dice": dice.model_dump(), "game": game, "turn": turn}

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
