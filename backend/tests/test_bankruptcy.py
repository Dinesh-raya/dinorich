"""Tests for engine.bankruptcy."""
import pytest

from schemas.room import RoomState, RoomSettings, RoomStatus
from schemas.player import PlayerState
from schemas.game import GameState, PropertyState
from engine.bankruptcy import declare_bankruptcy
from constants.game_rules import GameRules


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def make_player(pid: str, name: str, money: int = 15000, color: str = "#ff0000", **kwargs) -> PlayerState:
    return PlayerState(id=pid, name=name, color=color, money=money, **kwargs)


def make_test_game(num_players: int = 3) -> GameState:
    settings = RoomSettings()
    players = {}
    for i in range(num_players):
        pid = f"p{i + 1}"
        players[pid] = make_player(pid, f"Player {i + 1}", color=f"#{i * 10:06x}")
    room = RoomState(
        room_id="TEST01",
        host_id="p1",
        status=RoomStatus.PLAYING,
        players=players,
        settings=settings,
    )
    game = GameState(room=room)
    game.turn_order = [f"p{i + 1}" for i in range(num_players)]
    # Register all board properties
    from engine.property import get_board_config
    for tile_id, config in get_board_config().items():
        if config.get("type") in ("property", "airport", "utility"):
            game.properties[tile_id] = PropertyState(tile_id=tile_id)
    return game


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
        # Tile 1 (Guwahati) mortgage value = 30000, 10% interest = 3000
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
        # Guwahati (tile 1, brown) house price = 500
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
        game.room.players["p1"].money = -20000
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

    def test_current_turn_index_wraps_when_exceeds_remaining(self):
        game = make_test_game()
        game.current_turn_index = 2  # Points to p3
        declare_bankruptcy(game, "p1")  # p1 is at index 0, before p3
        # After removing p1, turn_order has 2 elements, index 2 >= 2 -> wraps to 0
        assert game.current_turn_index == 0

    def test_current_turn_index_decrements_when_after_bankrupt(self):
        game = make_test_game(num_players=4)
        game.current_turn_index = 2  # Points to p3
        declare_bankruptcy(game, "p2")  # p2 is at index 1, before p3
        # After removing p2 (index 1), index 2 > 1 so it decrements to 1
        assert game.current_turn_index == 1

    def test_current_turn_index_wraps_if_at_end(self):
        game = make_test_game()
        game.turn_order = ["p1", "p2", "p3"]
        game.current_turn_index = 2  # p3
        declare_bankruptcy(game, "p3")  # Remove last player
        assert game.current_turn_index == 0


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
