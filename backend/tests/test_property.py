"""Tests for engine.property."""
import pytest

from schemas.room import RoomState, RoomSettings, RoomStatus
from schemas.player import PlayerState
from schemas.game import GameState, PropertyState
from engine.property import (
    buy_property,
    calculate_rent,
    can_build_house,
    sell_house,
    sell_hotel,
)
from constants.game_rules import GameRules


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def make_player(pid: str, name: str, money: int = 150000, color: str = "#ff0000") -> PlayerState:
    return PlayerState(id=pid, name=name, color=color, money=money)


def make_test_game() -> GameState:
    settings = RoomSettings()
    p1 = make_player("p1", "Player 1")
    p2 = make_player("p2", "Player 2", color="#0000ff")
    room = RoomState(
        room_id="TEST01",
        host_id="p1",
        status=RoomStatus.PLAYING,
        players={"p1": p1, "p2": p2},
        settings=settings,
    )
    game = GameState(room=room)
    game.turn_order = ["p1", "p2"]
    # Register all board properties so color group lookups work
    from engine.property import get_board_config
    for tile_id, config in get_board_config().items():
        if config.get("type") in ("property", "airport", "utility"):
            game.properties[tile_id] = PropertyState(tile_id=tile_id)
    return game


def add_property(game: GameState, tile_id: int, owner_id: str | None = None,
                 houses: int = 0, hotels: int = 0, mortgaged: bool = False):
    """Register a property in game state."""
    game.properties[tile_id] = PropertyState(
        tile_id=tile_id,
        owner_id=owner_id,
        houses=houses,
        hotels=hotels,
        is_mortgaged=mortgaged,
    )


# ---------------------------------------------------------------------------
# Tests: buy_property
# ---------------------------------------------------------------------------

class TestBuyProperty:
    def test_deducts_money_sets_owner(self):
        game = make_test_game()
        add_property(game, 1)  # Guwahati, brown, price 60000
        p1 = game.room.players["p1"]
        initial_money = p1.money
        success, msg = buy_property(game, "p1", 1)
        assert success is True
        assert p1.money == initial_money - 60000
        assert game.properties[1].owner_id == "p1"
        assert 1 in p1.properties_owned

    def test_fails_when_already_owned(self):
        game = make_test_game()
        add_property(game, 1, owner_id="p2")
        success, msg = buy_property(game, "p1", 1)
        assert success is False
        assert "already owned" in msg.lower()

    def test_fails_when_not_enough_money(self):
        game = make_test_game()
        add_property(game, 1)
        game.room.players["p1"].money = 10000  # Not enough for 60k
        success, msg = buy_property(game, "p1", 1)
        assert success is False
        assert "not enough" in msg.lower()


# ---------------------------------------------------------------------------
# Tests: calculate_rent
# ---------------------------------------------------------------------------

class TestCalculateRent:
    def test_base_rent_no_monopoly(self):
        game = make_test_game()
        # Guwahati (tile 1, brown). Base rent = 2000
        add_property(game, 1, owner_id="p1")
        # Only own one of two brown properties - no monopoly
        rent = calculate_rent(game, 1)
        assert rent == 2000

    def test_monopoly_doubles_rent(self):
        game = make_test_game()
        # Own both brown properties (1 and 3) - monopoly
        add_property(game, 1, owner_id="p1")
        add_property(game, 3, owner_id="p1")
        rent = calculate_rent(game, 1)
        # With double_rent_enabled (default), monopoly doubles base rent
        assert rent == 4000  # 2000 * 2

    def test_rent_with_houses(self):
        game = make_test_game()
        add_property(game, 1, owner_id="p1", houses=3)
        add_property(game, 3, owner_id="p1")
        rent = calculate_rent(game, 1)
        # rent[3] for Guwahati = 90000
        assert rent == 90000

    def test_rent_with_hotel(self):
        game = make_test_game()
        add_property(game, 1, owner_id="p1", hotels=1)
        add_property(game, 3, owner_id="p1")
        rent = calculate_rent(game, 1)
        # rent[5] for Guwahati = 250000
        assert rent == 250000

    def test_mortgaged_property_returns_zero(self):
        game = make_test_game()
        add_property(game, 1, owner_id="p1", mortgaged=True)
        rent = calculate_rent(game, 1)
        assert rent == 0

    def test_unowned_property_returns_zero(self):
        game = make_test_game()
        add_property(game, 1)  # No owner
        rent = calculate_rent(game, 1)
        assert rent == 0


# ---------------------------------------------------------------------------
# Tests: can_build_house
# ---------------------------------------------------------------------------

class TestCanBuildHouse:
    def test_requires_monopoly(self):
        game = make_test_game()
        add_property(game, 1, owner_id="p1")
        # Only own one brown - no monopoly
        ok, msg = can_build_house(game, "p1", 1)
        assert ok is False
        assert "monopoly" in msg.lower()

    def test_allows_building_with_monopoly(self):
        game = make_test_game()
        add_property(game, 1, owner_id="p1")
        add_property(game, 3, owner_id="p1")
        game.room.players["p1"].money = 500000
        ok, msg = can_build_house(game, "p1", 1)
        assert ok is True

    def test_enforces_even_building_rule(self):
        game = make_test_game()
        # light_blue group: tiles 6, 8, 9
        add_property(game, 6, owner_id="p1", houses=3)
        add_property(game, 8, owner_id="p1", houses=0)
        add_property(game, 9, owner_id="p1", houses=0)
        game.room.players["p1"].money = 500000
        # Building on tile 6 (3 houses) would make diff=3 vs tile 8 (0) > MAX_HOUSE_DIFFERENCE(1)
        ok, msg = can_build_house(game, "p1", 6)
        assert ok is False
        assert "even" in msg.lower()

    def test_fails_when_max_houses_reached(self):
        game = make_test_game()
        add_property(game, 1, owner_id="p1", houses=4)
        add_property(game, 3, owner_id="p1", houses=4)
        game.room.players["p1"].money = 500000
        ok, msg = can_build_house(game, "p1", 1)
        assert ok is False
        assert "maximum" in msg.lower()

    def test_fails_when_not_owner(self):
        game = make_test_game()
        add_property(game, 1, owner_id="p2")
        ok, msg = can_build_house(game, "p1", 1)
        assert ok is False


# ---------------------------------------------------------------------------
# Tests: sell_house
# ---------------------------------------------------------------------------

class TestSellHouse:
    def test_returns_money_and_decrements_houses(self):
        game = make_test_game()
        add_property(game, 1, owner_id="p1", houses=2)
        add_property(game, 3, owner_id="p1", houses=2)
        p1 = game.room.players["p1"]
        initial_money = p1.money
        ok, msg = sell_house(game, "p1", 1)
        assert ok is True
        assert game.properties[1].houses == 1
        # Brown house price = 50000, sell at half = 25000
        assert p1.money == initial_money + 25000

    def test_fails_when_no_houses(self):
        game = make_test_game()
        add_property(game, 1, owner_id="p1", houses=0)
        ok, msg = sell_house(game, "p1", 1)
        assert ok is False
        assert "no houses" in msg.lower()

    def test_fails_when_hotel_exists(self):
        game = make_test_game()
        add_property(game, 1, owner_id="p1", hotels=1)
        ok, msg = sell_house(game, "p1", 1)
        assert ok is False
        assert "hotel" in msg.lower()


# ---------------------------------------------------------------------------
# Tests: sell_hotel
# ---------------------------------------------------------------------------

class TestSellHotel:
    def test_converts_to_4_houses(self):
        game = make_test_game()
        add_property(game, 1, owner_id="p1", hotels=1, houses=0)
        add_property(game, 3, owner_id="p1", houses=3)
        game.room.players["p1"].money = 100000
        game.houses_remaining = 10
        initial_money = game.room.players["p1"].money
        ok, msg = sell_hotel(game, "p1", 1)
        assert ok is True
        assert game.properties[1].hotels == 0
        assert game.properties[1].houses == 4
        # Brown house_price=50000, hotel_price=50000*5=250000, sell_price=125000
        assert game.room.players["p1"].money == initial_money + 125000

    def test_fails_when_no_hotel(self):
        game = make_test_game()
        add_property(game, 1, owner_id="p1", hotels=0)
        ok, msg = sell_hotel(game, "p1", 1)
        assert ok is False
        assert "no hotel" in msg.lower()

    def test_fails_when_not_enough_houses_in_bank(self):
        game = make_test_game()
        add_property(game, 1, owner_id="p1", hotels=1)
        add_property(game, 3, owner_id="p1", houses=3)
        game.houses_remaining = 2  # Need 4 to replace hotel
        ok, msg = sell_hotel(game, "p1", 1)
        assert ok is False
        assert "not enough houses" in msg.lower()
