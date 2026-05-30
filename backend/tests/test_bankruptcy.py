"""Tests for engine.bankruptcy."""
import pytest

from conftest import make_player, make_test_game
from schemas.room import RoomState, RoomSettings, RoomStatus
from schemas.player import PlayerState
from schemas.game import GameState, PropertyState
from engine.bankruptcy import declare_bankruptcy
from constants.game_rules import GameRules


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


# ---------------------------------------------------------------------------
# Tests: declare_bankruptcy with creditor
# ---------------------------------------------------------------------------

class TestBankruptcyWithCreditor:
    def test_properties_transfer_to_creditor(self):
        game = make_test_game()
        game.room.players["p1"].properties_owned = [1, 3, 6]
        for pid in [1, 3, 6]:
            game.properties[pid].owner_id = "p1"
        declare_bankruptcy(game, "p1", "p2")
        assert game.room.players["p1"].is_bankrupt is True
        assert game.room.players["p1"].money == 0
        assert game.room.players["p1"].properties_owned == []
        for pid in [1, 3, 6]:
            assert pid in game.room.players["p2"].properties_owned
            assert game.properties[pid].owner_id == "p2"

    def test_mortgaged_property_interest_deducted(self):
        game = make_test_game()
        # Tile 1 (Guwahati) mortgage value = 30, 10% interest = 3
        game.properties[1].owner_id = "p1"
        game.properties[1].is_mortgaged = True
        game.room.players["p1"].properties_owned = [1]
        creditor_money_before = game.room.players["p2"].money
        declare_bankruptcy(game, "p1", "p2")
        # Creditor pays 10% interest on mortgaged property
        from engine.property import get_board_config
        config = get_board_config().get(1)
        mortgage_value = config.get("mortgage", 0)
        expected_interest = int(mortgage_value * 0.1)
        assert game.room.players["p2"].money == creditor_money_before - expected_interest

    def test_no_duplicate_properties_on_transfer(self):
        game = make_test_game()
        # p2 already owns tile 1
        game.room.players["p1"].properties_owned = [1]
        game.room.players["p2"].properties_owned = [1]
        game.properties[1].owner_id = "p2"
        declare_bankruptcy(game, "p1", "p2")
        # tile 1 should appear only once in p2's properties
        assert game.room.players["p2"].properties_owned.count(1) == 1


# ---------------------------------------------------------------------------
# Tests: declare_bankruptcy without creditor (bank)
# ---------------------------------------------------------------------------

class TestBankruptcyToBank:
    def test_properties_reset_to_unowned(self):
        game = make_test_game()
        game.room.players["p1"].properties_owned = [1, 3]
        game.properties[1].owner_id = "p1"
        game.properties[3].owner_id = "p1"
        declare_bankruptcy(game, "p1")
        assert game.room.players["p1"].is_bankrupt is True
        assert game.room.players["p1"].properties_owned == []
        assert game.properties[1].owner_id is None
        assert game.properties[3].owner_id is None

    def test_buildings_returned_at_half_price(self):
        game = make_test_game()
        # Guwahati (tile 1, brown) house price = 50
        game.room.players["p1"].properties_owned = [1]
        game.properties[1].owner_id = "p1"
        game.properties[1].houses = 3
        initial_houses_remaining = game.houses_remaining
        declare_bankruptcy(game, "p1")
        assert game.properties[1].houses == 0
        assert game.houses_remaining == initial_houses_remaining + 3

    def test_hotels_returned_to_bank_supply(self):
        game = make_test_game()
        game.room.players["p1"].properties_owned = [1]
        game.properties[1].owner_id = "p1"
        game.properties[1].hotels = 1
        initial_hotels_remaining = game.hotels_remaining
        declare_bankruptcy(game, "p1")
        assert game.properties[1].hotels == 0
        assert game.hotels_remaining == initial_hotels_remaining + 1

    def test_mortgage_cleared_on_bank_return(self):
        game = make_test_game()
        game.room.players["p1"].properties_owned = [1]
        game.properties[1].owner_id = "p1"
        game.properties[1].is_mortgaged = True
        declare_bankruptcy(game, "p1")
        assert game.properties[1].is_mortgaged is False

    def test_debtor_money_set_to_zero(self):
        game = make_test_game()
        game.room.players["p1"].money = -2000
        declare_bankruptcy(game, "p1")
        assert game.room.players["p1"].money == 0


# ---------------------------------------------------------------------------
# Tests: turn order adjustment
# ---------------------------------------------------------------------------

class TestTurnOrderAdjustment:
    def test_bankrupt_player_removed_from_turn_order(self):
        game = make_test_game()
        assert "p2" in game.turn_order
        declare_bankruptcy(game, "p2")
        assert "p2" not in game.turn_order

    def test_current_turn_index_decrements_when_removed_before_current(self):
        game = make_test_game()
        game.current_turn_index = 2  # Points to p3
        declare_bankruptcy(game, "p1")  # p1 is at index 0, before p3
        # After removing p1 (index 0 < 2), current decrements to 1 → p3 stays current
        assert game.current_turn_index == 1

    def test_current_turn_index_decrements_when_after_bankrupt(self):
        game = make_test_game(num_players=4)
        game.current_turn_index = 2  # Points to p3
        declare_bankruptcy(game, "p2")  # p2 is at index 1, before p3
        # After removing p2 (index 1), index 2 > 1 so it decrements to 1
        assert game.current_turn_index == 1

    def test_current_turn_index_backs_up_when_current_goes_bankrupt(self):
        game = make_test_game(num_players=3)
        game.turn_order = ["p1", "p2", "p3"]
        game.current_turn_index = 2  # p3
        declare_bankruptcy(game, "p3")  # Remove current player (last)
        # Backs up by 1 so next_turn() increment lands on correct next player
        assert game.current_turn_index == 1


# ---------------------------------------------------------------------------
# Tests: game over detection
# ---------------------------------------------------------------------------

class TestGameOverDetection:
    def test_game_over_when_one_player_remains(self):
        game = make_test_game(num_players=2)
        declare_bankruptcy(game, "p1")
        assert game.room.status == RoomStatus.FINISHED
        # Check the winner log
        winner_logs = [log for log in game.history_log if "wins" in log]
        assert len(winner_logs) == 1
        assert "Player 2" in winner_logs[0]

    def test_game_not_over_with_multiple_players(self):
        game = make_test_game(num_players=3)
        declare_bankruptcy(game, "p3")
        assert game.room.status == RoomStatus.PLAYING
