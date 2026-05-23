"""Tests for engine.property."""
import pytest

from schemas.room import RoomState, RoomSettings, RoomStatus
from schemas.player import PlayerState
from schemas.game import GameState, PropertyState
from engine.property import (
    buy_property,
    calculate_rent,
    can_build_house,
    build_house,
    can_build_hotel,
    build_hotel,
    sell_house,
    sell_hotel,
    mortgage_property,
    unmortgage_property,
)
from constants.game_rules import GameRules

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def make_player(pid: str, name: str, money: int = 15000, color: str = "#ff0000") -> PlayerState:
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
        add_property(game, 1)  # Guwahati, brown, price 600
        p1 = game.room.players["p1"]
        initial_money = p1.money
        success, msg = buy_property(game, "p1", 1)
        assert success is True
        assert p1.money == initial_money - 600
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
        game.room.players["p1"].money = 500  # Not enough for 600
        success, msg = buy_property(game, "p1", 1)
        assert success is False
        assert "not enough" in msg.lower()


# ---------------------------------------------------------------------------
# Tests: calculate_rent
# ---------------------------------------------------------------------------

class TestCalculateRent:
    def test_base_rent_no_monopoly(self):
        game = make_test_game()
        # Guwahati (tile 1, brown). Base rent = 20
        add_property(game, 1, owner_id="p1")
        # Only own one of two brown properties - no monopoly
        rent = calculate_rent(game, 1)
        assert rent == 20

    def test_monopoly_doubles_rent(self):
        game = make_test_game()
        # Own both brown properties (1 and 3) - monopoly
        add_property(game, 1, owner_id="p1")
        add_property(game, 3, owner_id="p1")
        rent = calculate_rent(game, 1)
        # With double_rent_enabled (default), monopoly doubles base rent
        assert rent == 40  # 20 * 2

    def test_rent_with_houses(self):
        game = make_test_game()
        add_property(game, 1, owner_id="p1", houses=3)
        add_property(game, 3, owner_id="p1")
        rent = calculate_rent(game, 1)
        # rent[3] for Guwahati = 900
        assert rent == 900

    def test_rent_with_hotel(self):
        game = make_test_game()
        add_property(game, 1, owner_id="p1", hotels=1)
        add_property(game, 3, owner_id="p1")
        rent = calculate_rent(game, 1)
        # rent[5] for Guwahati = 2500
        assert rent == 2500

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
        game.room.players["p1"].money = 5000
        ok, msg = can_build_house(game, "p1", 1)
        assert ok is True

    def test_enforces_even_building_rule(self):
        game = make_test_game()
        # light_blue group: tiles 6, 8, 9
        add_property(game, 6, owner_id="p1", houses=3)
        add_property(game, 8, owner_id="p1", houses=0)
        add_property(game, 9, owner_id="p1", houses=0)
        game.room.players["p1"].money = 5000
        # Building on tile 6 (3 houses) would make diff=3 vs tile 8 (0) > MAX_HOUSE_DIFFERENCE(1)
        ok, msg = can_build_house(game, "p1", 6)
        assert ok is False
        assert "even" in msg.lower()

    def test_fails_when_max_houses_reached(self):
        game = make_test_game()
        add_property(game, 1, owner_id="p1", houses=4)
        add_property(game, 3, owner_id="p1", houses=4)
        game.room.players["p1"].money = 5000
        ok, msg = can_build_house(game, "p1", 1)
        assert ok is False
        assert "maximum" in msg.lower()

    def test_fails_when_not_owner(self):
        game = make_test_game()
        add_property(game, 1, owner_id="p2")
        ok, msg = can_build_house(game, "p1", 1)
        assert ok is False

    def test_allows_building_when_other_property_has_hotel(self):
        game = make_test_game()
        # Brown group: Guwahati (1) and Goa (3)
        add_property(game, 1, owner_id="p1", houses=3)
        add_property(game, 3, owner_id="p1", houses=0, hotels=1) # Goa has a hotel (effective 5)
        game.room.players["p1"].money = 5000
        # Building a house on Guwahati (going from 3 to 4 houses, effective 4) is allowed
        # because the difference with Goa (5) is 1.
        ok, msg = can_build_house(game, "p1", 1)
        assert ok is True


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
        # Brown house price = 500, sell at half = 250
        assert p1.money == initial_money + 250

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

    def test_fails_selling_house_when_other_property_has_hotel(self):
        game = make_test_game()
        # Brown group: Guwahati (1) and Goa (3)
        add_property(game, 1, owner_id="p1", houses=4)
        add_property(game, 3, owner_id="p1", houses=0, hotels=1) # Goa has a hotel (effective 5)
        # Selling a house on Guwahati (going from 4 to 3 houses, effective 3) is NOT allowed
        # because the difference with Goa (5) would be 2.
        ok, msg = sell_house(game, "p1", 1)
        assert ok is False
        assert "uneven" in msg.lower()


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
        # Brown house_price=500, hotel_price=500*5=2500, sell_price=1250
        assert game.room.players["p1"].money == initial_money + 1250

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


class TestMortgageProperty:
    def test_mortgage_grants_money(self):
        game = make_test_game()
        add_property(game, 1, owner_id="p1")
        initial_money = game.room.players["p1"].money
        ok, msg = mortgage_property(game, "p1", 1)
        assert ok is True
        assert game.properties[1].is_mortgaged is True
        # mortgage value for tile 1 is 300 (50% of 600)
        assert game.room.players["p1"].money == initial_money + 300

    def test_unmortgage_charges_interest(self):
        game = make_test_game()
        add_property(game, 1, owner_id="p1", mortgaged=True)
        initial_money = game.room.players["p1"].money
        ok, msg = unmortgage_property(game, "p1", 1)
        assert ok is True
        assert game.properties[1].is_mortgaged is False
        # unmortgage cost = 300 * 1.1 = 330
        assert game.room.players["p1"].money == initial_money - 330

    def test_cannot_mortgage_other_players_property(self):
        game = make_test_game()
        add_property(game, 1, owner_id="p2")
        ok, msg = mortgage_property(game, "p1", 1)
        assert ok is False

    def test_cannot_mortgage_already_mortgaged(self):
        game = make_test_game()
        add_property(game, 1, owner_id="p1", mortgaged=True)
        ok, msg = mortgage_property(game, "p1", 1)
        assert ok is False

    def test_requires_buildings_sold_before_mortgage(self):
        game = make_test_game()
        # Tile 1 (brown) has a house — must sell first
        add_property(game, 1, owner_id="p1", houses=1)
        add_property(game, 3, owner_id="p1", houses=1)
        ok, msg = mortgage_property(game, "p1", 1)
        assert ok is False
        assert "must sell all buildings" in msg.lower()


class TestBuildHouse:
    def test_build_house_deducts_money(self):
        game = make_test_game()
        add_property(game, 1, owner_id="p1")
        add_property(game, 3, owner_id="p1")
        initial_money = game.room.players["p1"].money
        ok, msg = build_house(game, "p1", 1)
        assert ok is True
        assert game.properties[1].houses == 1
        assert game.room.players["p1"].money == initial_money - 500  # brown house price

    def test_fails_without_monopoly(self):
        game = make_test_game()
        add_property(game, 1, owner_id="p1")
        # Do not own tile 3 (brown group), so no monopoly
        ok, msg = can_build_house(game, "p1", 1)
        assert ok is False
        assert "monopoly" in msg.lower()

    def test_fails_when_max_houses_reached(self):
        game = make_test_game()
        add_property(game, 1, owner_id="p1")
        add_property(game, 3, owner_id="p1")
        game.properties[1].houses = 4  # Already at max
        ok, msg = can_build_house(game, "p1", 1)
        assert ok is False
        assert "maximum" in msg.lower()

    def test_fails_when_no_houses_in_bank(self):
        game = make_test_game()
        add_property(game, 1, owner_id="p1")
        add_property(game, 3, owner_id="p1")
        game.houses_remaining = 0
        ok, msg = can_build_house(game, "p1", 1)
        assert ok is False
        assert "no houses" in msg.lower()


class TestBuildHotel:
    def test_build_hotel_replaces_four_houses(self):
        game = make_test_game()
        add_property(game, 1, owner_id="p1")
        add_property(game, 3, owner_id="p1")
        game.properties[1].houses = 4  # Ready for hotel
        game.properties[3].houses = 4  # Both brown properties need 4 houses
        game.room.players["p1"].money = 5000  # Enough for hotel (2500)
        initial_money = game.room.players["p1"].money
        initial_houses_in_bank = game.houses_remaining
        ok, msg = build_hotel(game, "p1", 1)
        assert ok is True
        assert game.properties[1].hotels == 1
        assert game.properties[1].houses == 0
        assert game.houses_remaining == initial_houses_in_bank + 4  # 4 houses returned
        assert game.room.players["p1"].money == initial_money - 2500  # 500 * 5

    def test_fails_without_four_houses(self):
        game = make_test_game()
        add_property(game, 1, owner_id="p1")
        add_property(game, 3, owner_id="p1")
        game.properties[1].houses = 3  # Not enough
        ok, msg = can_build_hotel(game, "p1", 1)
        assert ok is False
        assert "4 houses" in msg.lower()

    def test_fails_when_all_properties_not_at_four(self):
        game = make_test_game()
        add_property(game, 1, owner_id="p1")
        add_property(game, 3, owner_id="p1")
        game.properties[1].houses = 4
        game.properties[3].houses = 3  # Other property not at 4
        ok, msg = can_build_hotel(game, "p1", 1)
        assert ok is False
        assert "all properties" in msg.lower()
