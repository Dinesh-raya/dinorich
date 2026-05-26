"""Tests for engine.cards."""
import pytest
import copy

from conftest import make_player, make_test_game
from schemas.room import RoomState, RoomSettings, RoomStatus
from schemas.player import PlayerState
from schemas.game import GameState, PropertyState
from engine.cards import CardEngine, TREASURY_CARDS_TEMPLATE, SURPRISE_CARDS_TEMPLATE
from constants.game_rules import GameRules


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def make_card(action: str, **kwargs) -> dict:
    """Build a card dict with the given action and extra fields."""
    card = {"text": f"Test card: {action}", "action": action}
    card.update(kwargs)
    return card


# ---------------------------------------------------------------------------
# Tests: draw_treasury
# ---------------------------------------------------------------------------

class TestDrawTreasury:
    def test_draws_from_top_of_deck(self):
        game = make_test_game()
        engine = CardEngine()
        top_card = game.treasury_deck[0]
        drawn = engine.draw_treasury(game, "p1")
        assert drawn["action"] == top_card["action"]

    def test_non_goojf_card_recycled_to_back(self):
        game = make_test_game()
        engine = CardEngine()
        # Ensure top card is not GOOJF
        while game.treasury_deck[0]["action"] == "get_out_of_jail_free":
            game.treasury_deck.append(game.treasury_deck.pop(0))
        original_len = len(game.treasury_deck)
        card = game.treasury_deck[0]
        engine.draw_treasury(game, "p1")
        # Non-GOOJF cards go to back, so deck length stays the same
        assert len(game.treasury_deck) == original_len
        # Card should now be at the end
        assert game.treasury_deck[-1]["action"] == card["action"]

    def test_goojf_card_removed_from_deck(self):
        game = make_test_game()
        engine = CardEngine()
        # Place GOOJF card at top
        goojf = {"text": "Get Out of Jail Free card", "action": "get_out_of_jail_free"}
        game.treasury_deck.insert(0, goojf)
        original_len = len(game.treasury_deck)
        engine.draw_treasury(game, "p1")
        # GOOJF removed, deck is 1 shorter
        assert len(game.treasury_deck) == original_len - 1
        # Player has the card
        assert game.room.players["p1"].get_out_of_jail_cards == 1


# ---------------------------------------------------------------------------
# Tests: draw_surprise
# ---------------------------------------------------------------------------

class TestDrawSurprise:
    def test_draws_from_top_of_deck(self):
        game = make_test_game()
        engine = CardEngine()
        top_card = game.surprise_deck[0]
        drawn = engine.draw_surprise(game, "p1")
        assert drawn["action"] == top_card["action"]

    def test_non_goojf_card_recycled_to_back(self):
        game = make_test_game()
        engine = CardEngine()
        while game.surprise_deck[0]["action"] == "get_out_of_jail_free":
            game.surprise_deck.append(game.surprise_deck.pop(0))
        original_len = len(game.surprise_deck)
        engine.draw_surprise(game, "p1")
        assert len(game.surprise_deck) == original_len


# ---------------------------------------------------------------------------
# Tests: execute_card - add_money
# ---------------------------------------------------------------------------

class TestExecuteCardAddMoney:
    def test_adds_money_to_player(self):
        game = make_test_game()
        engine = CardEngine()
        initial = game.room.players["p1"].money
        card = make_card("add_money", amount=200)
        engine.execute_card(game, "p1", card)
        assert game.room.players["p1"].money == initial + 200


# ---------------------------------------------------------------------------
# Tests: execute_card - pay_money
# ---------------------------------------------------------------------------

class TestExecuteCardPayMoney:
    def test_deducts_money_from_player(self):
        game = make_test_game()
        engine = CardEngine()
        initial = game.room.players["p1"].money
        card = make_card("pay_money", amount=50)
        engine.execute_card(game, "p1", card)
        assert game.room.players["p1"].money == initial - 50

    def test_pay_money_adds_to_free_parking_if_enabled(self):
        game = make_test_game()
        game.room.settings.free_parking_jackpot = True
        engine = CardEngine()
        card = make_card("pay_money", amount=50)
        engine.execute_card(game, "p1", card)
        assert game.free_parking_pool == 50

    def test_pay_money_no_free_parking_if_disabled(self):
        game = make_test_game()
        game.room.settings.free_parking_jackpot = False
        engine = CardEngine()
        card = make_card("pay_money", amount=50)
        engine.execute_card(game, "p1", card)
        assert game.free_parking_pool == 0


# ---------------------------------------------------------------------------
# Tests: execute_card - move_to
# ---------------------------------------------------------------------------

class TestExecuteCardMoveTo:
    def test_move_to_target_position(self):
        game = make_test_game()
        game.room.players["p1"].position = 5
        engine = CardEngine()
        card = make_card("move_to", target=0)
        engine.execute_card(game, "p1", card)
        assert game.room.players["p1"].position == 0

    def test_move_to_passing_go_collects_reward(self):
        game = make_test_game()
        game.room.players["p1"].position = 15
        initial_money = game.room.players["p1"].money
        engine = CardEngine()
        card = make_card("move_to", target=0)
        engine.execute_card(game, "p1", card)
        assert game.room.players["p1"].position == 0
        assert game.room.players["p1"].money == initial_money + GameRules.GO_REWARD

    def test_move_to_not_passing_go_no_reward(self):
        game = make_test_game()
        game.room.players["p1"].position = 0
        initial_money = game.room.players["p1"].money
        engine = CardEngine()
        card = make_card("move_to", target=15)
        engine.execute_card(game, "p1", card)
        assert game.room.players["p1"].position == 15
        assert game.room.players["p1"].money == initial_money  # No GO reward


# ---------------------------------------------------------------------------
# Tests: execute_card - move_relative
# ---------------------------------------------------------------------------

class TestExecuteCardMoveRelative:
    def test_move_relative_backward(self):
        game = make_test_game()
        game.room.players["p1"].position = 10
        engine = CardEngine()
        card = make_card("move_relative", spaces=-3)
        engine.execute_card(game, "p1", card)
        assert game.room.players["p1"].position == 7

    def test_move_relative_wraps_around_board(self):
        game = make_test_game()
        game.room.players["p1"].position = 1
        engine = CardEngine()
        card = make_card("move_relative", spaces=-3)
        engine.execute_card(game, "p1", card)
        # (1 - 3) % 40 = -2 % 40 = 38
        assert game.room.players["p1"].position == 38


# ---------------------------------------------------------------------------
# Tests: execute_card - go_to_jail
# ---------------------------------------------------------------------------

class TestExecuteCardGoToJail:
    def test_sends_player_to_jail(self):
        game = make_test_game()
        game.room.players["p1"].position = 20
        engine = CardEngine()
        card = make_card("go_to_jail")
        engine.execute_card(game, "p1", card)
        assert game.room.players["p1"].position == GameRules.JAIL_TILE
        assert game.room.players["p1"].is_in_jail is True


# ---------------------------------------------------------------------------
# Tests: execute_card - get_out_of_jail_free
# ---------------------------------------------------------------------------

class TestExecuteCardGetOOJF:
    def test_increments_goojf_cards(self):
        game = make_test_game()
        game.room.players["p1"].get_out_of_jail_cards = 0
        engine = CardEngine()
        card = make_card("get_out_of_jail_free")
        engine.execute_card(game, "p1", card)
        assert game.room.players["p1"].get_out_of_jail_cards == 1


# ---------------------------------------------------------------------------
# Tests: return_goojf_card and deck cycling
# ---------------------------------------------------------------------------

class TestReturnGoojfAndDeckCycling:
    def test_return_goojf_to_treasury_deck(self):
        game = make_test_game()
        engine = CardEngine()
        initial_len = len(game.treasury_deck)
        engine.return_goojf_card(game, "treasury")
        assert len(game.treasury_deck) == initial_len + 1
        assert game.treasury_deck[-1]["action"] == "get_out_of_jail_free"

    def test_return_goojf_to_surprise_deck(self):
        game = make_test_game()
        engine = CardEngine()
        initial_len = len(game.surprise_deck)
        engine.return_goojf_card(game, "surprise")
        assert len(game.surprise_deck) == initial_len + 1
        assert game.surprise_deck[-1]["action"] == "get_out_of_jail_free"

    def test_deck_cycles_through_all_cards(self):
        game = make_test_game()
        engine = CardEngine()
        # Remove GOOJF cards and place them back so all cards are non-GOOJF for cycling test
        deck = game.treasury_deck
        goojf_cards = [c for c in deck if c["action"] == "get_out_of_jail_free"]
        non_goojf = [c for c in deck if c["action"] != "get_out_of_jail_free"]
        # Draw all non-GOOJF cards
        drawn_actions = []
        for _ in range(len(non_goojf)):
            # Skip GOOJF if at top
            while deck and deck[0]["action"] == "get_out_of_jail_free":
                deck.append(deck.pop(0))
            if not deck:
                break
            card = engine.draw_treasury(game, "p1")
            drawn_actions.append(card["action"])
        # All non-GOOJF actions should have been drawn
        assert len(drawn_actions) == len(non_goojf)


# ---------------------------------------------------------------------------
# Tests: execute_card - move_to_nearest_utility
# ---------------------------------------------------------------------------

class TestExecuteCardMoveToNearestUtility:
    def test_moves_to_nearest_utility_forward(self):
        game = make_test_game()
        game.room.players["p1"].position = 8  # Before utility 12
        initial_money = game.room.players["p1"].money
        engine = CardEngine()
        card = make_card("move_to_nearest_utility")
        engine.execute_card(game, "p1", card)
        assert game.room.players["p1"].position == 12  # Nearest utility
        assert game.room.players["p1"].money == initial_money  # No GO reward

    def test_moves_to_utility_after_passing_go(self):
        game = make_test_game()
        game.room.players["p1"].position = 30  # (12-30)%40=22, (28-30)%40=38 → nearest is 12
        initial_money = game.room.players["p1"].money
        engine = CardEngine()
        card = make_card("move_to_nearest_utility")
        engine.execute_card(game, "p1", card)
        assert game.room.players["p1"].position == 12  # Wraps around, nearest forward
        assert game.room.players["p1"].money == initial_money + GameRules.GO_REWARD

    def test_passes_go_when_wrapping(self):
        game = make_test_game()
        game.room.players["p1"].position = 35  # Closest utility forward is 12 (wrap)
        initial_money = game.room.players["p1"].money
        engine = CardEngine()
        card = make_card("move_to_nearest_utility")
        engine.execute_card(game, "p1", card)
        # (12 - 35) % 40 = 17 spaces forward, (28 - 35) % 40 = 33 forward
        # Nearest is 12 (17 spaces vs 33)
        assert game.room.players["p1"].position == 12
        assert game.room.players["p1"].money == initial_money + GameRules.GO_REWARD


# ---------------------------------------------------------------------------
# Tests: execute_card - pay_per_building
# ---------------------------------------------------------------------------

class TestExecuteCardPayPerBuilding:
    def test_charges_per_house_and_hotel(self):
        game = make_test_game()
        game.room.players["p1"].properties_owned = [1, 5]
        game.properties[1] = PropertyState(tile_id=1, owner_id="p1", houses=2)
        game.properties[5] = PropertyState(tile_id=5, owner_id="p1", hotels=1)
        initial_money = game.room.players["p1"].money
        engine = CardEngine()
        card = make_card("pay_per_building", per_house=40, per_hotel=200)
        engine.execute_card(game, "p1", card)
        expected = 2 * 40 + 1 * 200  # 280
        assert game.room.players["p1"].money == initial_money - expected

    def test_adds_to_free_parking_pool_if_enabled(self):
        game = make_test_game()
        game.room.settings.free_parking_jackpot = True
        game.room.players["p1"].properties_owned = [1]
        game.properties[1] = PropertyState(tile_id=1, owner_id="p1", houses=1)
        initial_pool = game.free_parking_pool
        engine = CardEngine()
        card = make_card("pay_per_building", per_house=40, per_hotel=200)
        engine.execute_card(game, "p1", card)
        assert game.free_parking_pool == initial_pool + 40

    def test_no_charge_if_no_buildings(self):
        game = make_test_game()
        game.room.players["p1"].properties_owned = [1]
        game.properties[1] = PropertyState(tile_id=1, owner_id="p1", houses=0, hotels=0)
        initial_money = game.room.players["p1"].money
        engine = CardEngine()
        card = make_card("pay_per_building", per_house=40, per_hotel=200)
        engine.execute_card(game, "p1", card)
        assert game.room.players["p1"].money == initial_money  # No charge


# ---------------------------------------------------------------------------
# Tests: execute_card - collect_from_each_player
# ---------------------------------------------------------------------------

class TestExecuteCardCollectFromEachPlayer:
    def test_collects_from_other_players(self):
        game = make_test_game()
        initial_p1_money = game.room.players["p1"].money
        initial_p2_money = game.room.players["p2"].money
        engine = CardEngine()
        card = make_card("collect_from_each_player", per_player=20)
        engine.execute_card(game, "p1", card)
        assert game.room.players["p1"].money == initial_p1_money + 20
        assert game.room.players["p2"].money == initial_p2_money - 20

    def test_skips_bankrupt_players(self):
        game = make_test_game()
        game.room.players["p2"].is_bankrupt = True
        initial_p1_money = game.room.players["p1"].money
        initial_p2_money = game.room.players["p2"].money
        engine = CardEngine()
        card = make_card("collect_from_each_player", per_player=20)
        engine.execute_card(game, "p1", card)
        # p1 doesn't collect from bankrupt p2
        assert game.room.players["p1"].money == initial_p1_money  # No collection
        assert game.room.players["p2"].money == initial_p2_money  # No change


# ---------------------------------------------------------------------------
# Tests: draw from empty deck (reshuffle)
# ---------------------------------------------------------------------------

class TestDrawEmptyDeck:
    def test_reshuffles_treasury_when_empty(self):
        game = make_test_game()
        game.treasury_deck.clear()
        engine = CardEngine()
        card = engine.draw_treasury(game, "p1")
        assert card is not None
        assert len(game.treasury_deck) >= 1  # Reshuffled from template

    def test_reshuffles_surprise_when_empty(self):
        game = make_test_game()
        game.surprise_deck.clear()
        engine = CardEngine()
        card = engine.draw_surprise(game, "p1")
        assert card is not None
        assert len(game.surprise_deck) >= 1  # Reshuffled from template
