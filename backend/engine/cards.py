import secrets
from typing import Dict, Any, List
from schemas.game import GameState
from engine.movement import move_player, send_to_jail
from constants.game_rules import GameRules

# Card definitions (template)
TREASURY_CARDS_TEMPLATE = [
    {"text": "Advance to GO. Collect ₹1,500", "action": "move_to", "target": 0},
    {"text": "Bank error in your favor. Collect ₹200", "action": "add_money", "amount": 200},
    {"text": "Doctor's fees. Pay ₹50", "action": "pay_money", "amount": 50},
    {"text": "Get Out of Jail Free card", "action": "get_out_of_jail_free"},
    {"text": "Go directly to Jail. Do not pass GO.", "action": "go_to_jail"},
    {"text": "Income tax refund. Collect ₹20", "action": "add_money", "amount": 20},
    {"text": "Pay hospital fees of ₹100", "action": "pay_money", "amount": 100},
    {"text": "Advance to Bengaluru. If you pass GO, collect ₹1,500", "action": "move_to", "target": 29},
    {"text": "Life insurance matures. Collect ₹150", "action": "add_money", "amount": 150},
    {"text": "Pay school fees of ₹50", "action": "pay_money", "amount": 50},
    {"text": "Received dividend on shares. Collect ₹80", "action": "add_money", "amount": 80},
    {"text": "Advance to Mumbai Airport. If you pass GO, collect ₹1,500", "action": "move_to", "target": 15},
    {"text": "Pay your insurance premium of ₹50", "action": "pay_money", "amount": 50},
    {"text": "You have won second prize in a beauty contest. Collect ₹100", "action": "add_money", "amount": 100},
    {"text": "Pay electricity bill of ₹75", "action": "pay_money", "amount": 75},
    {"text": "Consultancy fee. Collect ₹50", "action": "add_money", "amount": 50},
    {"text": "It's your birthday. Collect ₹20 from each player", "action": "collect_from_each_player", "per_player": 20},
    {"text": "Property tax due. Pay ₹150", "action": "pay_money", "amount": 150},
    {"text": "Advance to Jaipur. If you pass GO, collect ₹1,500", "action": "move_to", "target": 11},
    {"text": "Toothpaste advertisement royalty. Collect ₹30", "action": "add_money", "amount": 30},
]

SURPRISE_CARDS_TEMPLATE = [
    {"text": "Advance to GO. Collect ₹1,500", "action": "move_to", "target": 0},
    {"text": "Advance to Delhi. If you pass GO, collect ₹1,500", "action": "move_to", "target": 39},
    {"text": "Bank pays you dividend of ₹50", "action": "add_money", "amount": 50},
    {"text": "Get Out of Jail Free card", "action": "get_out_of_jail_free"},
    {"text": "Go back 3 spaces", "action": "move_relative", "spaces": -3},
    {"text": "Go directly to Jail. Do not pass GO.", "action": "go_to_jail"},
    {"text": "Speeding fine. Pay ₹15", "action": "pay_money", "amount": 15},
    {"text": "Advance to Chennai. If you pass GO, collect ₹1,500", "action": "move_to", "target": 19},
    {"text": "Bank gives you a loan repayment. Collect ₹120", "action": "add_money", "amount": 120},
    {"text": "Go to Kolkata. If you pass GO, collect ₹1,500", "action": "move_to", "target": 26},
    {"text": "Pay road tax of ₹40", "action": "pay_money", "amount": 40},
    {"text": "Advance to the nearest Utility. If unowned, you may buy it", "action": "move_to_nearest_utility"},
    {"text": "You are assessed for street repairs. ₹40 per house, ₹200 per hotel", "action": "pay_per_building", "per_house": 40, "per_hotel": 200},
    {"text": "Your building loan matures. Collect ₹150", "action": "add_money", "amount": 150},
    {"text": "Go back to Goa", "action": "move_to", "target": 3, "passes_go": False},
    {"text": "Pay lawyer fees of ₹30", "action": "pay_money", "amount": 30},
    {"text": "Advance to Free Parking", "action": "move_to", "target": 20},
    {"text": "Collect ₹50 consultancy fee", "action": "add_money", "amount": 50},
    {"text": "Holiday bonus. Collect ₹30", "action": "add_money", "amount": 30},
    {"text": "Pay entertainment tax of ₹20", "action": "pay_money", "amount": 20},
]


def create_shuffled_deck(template: List[Dict]) -> List[Dict]:
    """Create a fresh shuffled copy of a card deck template."""
    deck = [card.copy() for card in template]
    # Use cryptographically secure shuffle
    for i in range(len(deck) - 1, 0, -1):
        j = secrets.randbelow(i + 1)
        deck[i], deck[j] = deck[j], deck[i]
    return deck


class CardEngine:
    """Stateless card engine - operates on decks stored in GameState."""

    def draw_treasury(self, game_state: GameState, player_id: str) -> Dict[str, Any]:
        deck = game_state.treasury_deck
        if not deck:
            game_state.add_log("Treasury deck is empty, reshuffling...")
            game_state.treasury_deck = create_shuffled_deck(TREASURY_CARDS_TEMPLATE)
            deck = game_state.treasury_deck
            # Remove GOOJF if any player already holds one from this deck
            goojf_held = any(
                "treasury" in (p.goojf_sources or [])
                for p in game_state.room.players.values()
                if not p.is_bankrupt
            )
            if goojf_held:
                deck[:] = [c for c in deck if c["action"] != "get_out_of_jail_free"]
        card = deck.pop(0)
        # GOOJF cards are removed from deck when drawn (returned when used)
        if card["action"] != "get_out_of_jail_free":
            deck.append(card)
        else:
            card["_source"] = "treasury"
        self.execute_card(game_state, player_id, card)
        return card

    def draw_surprise(self, game_state: GameState, player_id: str) -> Dict[str, Any]:
        deck = game_state.surprise_deck
        if not deck:
            game_state.add_log("Surprise deck is empty, reshuffling...")
            game_state.surprise_deck = create_shuffled_deck(SURPRISE_CARDS_TEMPLATE)
            deck = game_state.surprise_deck
            # Remove GOOJF if any player already holds one from this deck
            goojf_held = any(
                "surprise" in (p.goojf_sources or [])
                for p in game_state.room.players.values()
                if not p.is_bankrupt
            )
            if goojf_held:
                deck[:] = [c for c in deck if c["action"] != "get_out_of_jail_free"]
        card = deck.pop(0)
        # GOOJF cards are removed from deck when drawn (returned when used)
        if card["action"] != "get_out_of_jail_free":
            deck.append(card)
        else:
            card["_source"] = "surprise"
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
            if target < current and target != GameRules.JAIL_TILE and card.get("passes_go", True):
                player.money += GameRules.GO_REWARD
                game_state.add_log(f"{player.name} passed GO and collected ₹{GameRules.GO_REWARD}")
            player.position = target
        elif action == "move_relative":
            new_pos = (player.position + card["spaces"]) % GameRules.BOARD_SIZE
            player.position = new_pos
        elif action == "move_to_nearest_utility":
            from engine.property import get_board_config
            utilities = [12, 28]
            current = player.position
            forward_distances = [(u, (u - current) % GameRules.BOARD_SIZE) for u in utilities]
            nearest = min(forward_distances, key=lambda x: x[1])
            if nearest[0] < current and nearest[0] != GameRules.JAIL_TILE:
                player.money += GameRules.GO_REWARD
                game_state.add_log(f"{player.name} passed GO and collected ₹{GameRules.GO_REWARD}")
            player.position = nearest[0]
            config = get_board_config().get(nearest[0])
            if config:
                game_state.add_log(f"{player.name} moved to {config['name']}")
        elif action == "pay_per_building":
            house_cost = card.get("per_house", 0)
            hotel_cost = card.get("per_hotel", 0)
            houses = 0
            hotels = 0
            for pid in player.properties_owned:
                ps = game_state.properties.get(pid)
                if ps:
                    houses += ps.houses
                    hotels += ps.hotels
            total = (houses * house_cost) + (hotels * hotel_cost)
            player.money -= total
            if game_state.room.settings.free_parking_jackpot:
                game_state.free_parking_pool += total
            game_state.add_log(f"{player.name} paid ₹{total} (₹{house_cost} per house x {houses}, ₹{hotel_cost} per hotel x {hotels})")
        elif action == "collect_from_each_player":
            amount = card.get("per_player", 0)
            collected = 0
            for pid, other in game_state.room.players.items():
                if pid != player_id and not other.is_bankrupt:
                    actual = min(amount, max(0, other.money))
                    other.money -= actual
                    player.money += actual
                    collected += actual
            game_state.add_log(f"{player.name} collected ₹{collected} from other players")
        elif action == "go_to_jail":
            send_to_jail(game_state, player_id)
        elif action == "get_out_of_jail_free":
            player.get_out_of_jail_cards += 1
            source = card.get("_source", "treasury")
            player.goojf_sources.append(source)

card_engine = CardEngine()
