import random
from typing import Dict, Any, List
from schemas.game import GameState
from engine.movement import move_player, send_to_jail
from constants.game_rules import GameRules

# Card definitions (template)
TREASURY_CARDS_TEMPLATE = [
    {"text": "Advance to GO. Collect ₹20,000", "action": "move_to", "target": 0},
    {"text": "Bank error in your favor. Collect ₹20,000", "action": "add_money", "amount": 20000},
    {"text": "Doctor's fees. Pay ₹5,000", "action": "pay_money", "amount": 5000},
    {"text": "Get Out of Jail Free card", "action": "get_out_of_jail_free"},
    {"text": "Go directly to Jail. Do not pass GO.", "action": "go_to_jail"},
    {"text": "Income tax refund. Collect ₹2,000", "action": "add_money", "amount": 2000},
    {"text": "Pay hospital fees of ₹10,000", "action": "pay_money", "amount": 10000},
]

SURPRISE_CARDS_TEMPLATE = [
    {"text": "Advance to GO. Collect ₹20,000", "action": "move_to", "target": 0},
    {"text": "Advance to Delhi. If you pass GO, collect ₹20,000", "action": "move_to", "target": 39},
    {"text": "Bank pays you dividend of ₹5,000", "action": "add_money", "amount": 5000},
    {"text": "Get Out of Jail Free card", "action": "get_out_of_jail_free"},
    {"text": "Go back 3 spaces", "action": "move_relative", "spaces": -3},
    {"text": "Go directly to Jail. Do not pass GO.", "action": "go_to_jail"},
    {"text": "Speeding fine. Pay ₹1,500", "action": "pay_money", "amount": 1500},
]


def create_shuffled_deck(template: List[Dict]) -> List[Dict]:
    """Create a fresh shuffled copy of a card deck template."""
    deck = [card.copy() for card in template]
    random.shuffle(deck)
    return deck


class CardEngine:
    """Stateless card engine - operates on decks stored in GameState."""

    def draw_treasury(self, game_state: GameState, player_id: str) -> Dict[str, Any]:
        deck = game_state.treasury_deck
        card = deck.pop(0)
        # GOOJF cards are removed from deck when drawn (returned when used)
        if card["action"] != "get_out_of_jail_free":
            deck.append(card)
        self.execute_card(game_state, player_id, card)
        return card

    def draw_surprise(self, game_state: GameState, player_id: str) -> Dict[str, Any]:
        deck = game_state.surprise_deck
        card = deck.pop(0)
        # GOOJF cards are removed from deck when drawn (returned when used)
        if card["action"] != "get_out_of_jail_free":
            deck.append(card)
        self.execute_card(game_state, player_id, card)
        return card

    def return_goojf_card(self, game_state: GameState, deck_type: str = "treasury"):
        """Return a GOOJF card to the deck when a player uses one."""
        goojf_card = {"text": "Get Out of Jail Free card", "action": "get_out_of_jail_free"}
        if deck_type == "treasury":
            game_state.treasury_deck.append(goojf_card)
        else:
            game_state.surprise_deck.append(goojf_card)

    def execute_card(self, game_state: GameState, player_id: str, card: Dict[str, Any]):
        player = game_state.room.players[player_id]
        action = card["action"]

        game_state.add_log(f"{player.name} drew a card: {card['text']}")

        if action == "add_money":
            player.money += card["amount"]
        elif action == "pay_money":
            player.money -= card["amount"]
            if game_state.room.settings.free_parking_jackpot:
                game_state.free_parking_pool += card["amount"]
        elif action == "move_to":
            target = card["target"]
            current = player.position
            # Determine if passes GO
            if target < current and target != GameRules.JAIL_TILE:
                player.money += GameRules.GO_REWARD
                game_state.add_log(f"{player.name} passed GO and collected ₹{GameRules.GO_REWARD}")
            player.position = target
        elif action == "move_relative":
            new_pos = (player.position + card["spaces"]) % GameRules.BOARD_SIZE
            player.position = new_pos
        elif action == "go_to_jail":
            send_to_jail(game_state, player_id)
        elif action == "get_out_of_jail_free":
            player.get_out_of_jail_cards += 1

card_engine = CardEngine()
