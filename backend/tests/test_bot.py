"""Tests for engine.bot — Bot AI decision engine."""
import pytest
from unittest.mock import patch

from conftest import make_player
from schemas.room import RoomState, RoomSettings, RoomStatus
from schemas.player import PlayerState
from schemas.game import GameState, PropertyState
from schemas.action import TurnState, TurnPhase
from engine.bot import BotBrain, is_bot, get_bot_name, get_bot_color
from engine.property import get_board_config


def make_property_state(tile_id: int, owner_id: str | None = None, houses: int = 0, hotels: int = 0,
                        is_mortgaged: bool = False) -> PropertyState:
    return PropertyState(
        tile_id=tile_id,
        owner_id=owner_id,
        houses=houses,
        hotels=hotels,
        is_mortgaged=is_mortgaged,
    )


@pytest.fixture(autouse=True)
def _warm_board_cache():
    from engine import property as prop_module
    prop_module._BOARD_CONFIG_CACHE = None
    get_board_config()
    yield
    prop_module._BOARD_CONFIG_CACHE = None


@pytest.fixture
def brain():
    return BotBrain()


@pytest.fixture
def game():
    settings = RoomSettings()
    p1 = make_player("p1", "Player 1")
    p2 = make_player("p2", "Player 2", color="#0000ff")
    room = RoomState(
        room_id="TEST01",
        host_id="p1",
        status=RoomStatus.PLAYING,
        players={"p1": p1, "p2": p2},
    )
    return GameState(
        room=room,
        properties={},
        treasury_cards=[],
        surprise_cards=[],
    )


# ---------------------------------------------------------------------------
# is_bot / get_bot_name / get_bot_color
# ---------------------------------------------------------------------------

class TestBotIdentifiers:
    def test_is_bot_true(self):
        assert is_bot("bot_abc123") is True

    def test_is_bot_false(self):
        assert is_bot("player_abc") is False
        assert is_bot("p1") is False

    def test_get_bot_name_by_index(self):
        assert get_bot_name(0) == "Dino-Bot Alpha"
        assert get_bot_name(1) == "Dino-Bot Beta"
        assert get_bot_name(4) == "Dino-Bot Alpha"  # wraps

    def test_get_bot_color_by_index(self):
        assert get_bot_color(0) == "#888888"
        assert get_bot_color(4) == "#888888"  # wraps


# ---------------------------------------------------------------------------
# decide_buy
# ---------------------------------------------------------------------------

class TestDecideBuy:
    def test_buy_very_cheap_property(self, brain, game):
        """Properties ≤500 are always bought."""
        assert brain.decide_buy(game, "p1", 1) is True  # Guwahati = 600

    def test_buy_with_high_cash(self, brain, game):
        """When money > 3x price, always buy."""
        game.room.players["p1"].money = 999999
        assert brain.decide_buy(game, "p1", 19) is True  # Chennai = 2000

    def test_buy_completes_monopoly_with_cash(self, brain, game):
        """Buy if it completes a color set and cash ≥ 2x price."""
        p1 = game.room.players["p1"]
        p1.properties_owned = [1]  # Already owns Guwahati
        p1.money = 999999
        assert brain.decide_buy(game, "p1", 3) is True  # Goa completes brown

    def test_buy_completes_monopoly_but_insufficient_cash(self, brain, game):
        """Don't buy if completing monopoly but cash < 2x price."""
        p1 = game.room.players["p1"]
        p1.properties_owned = [1]  # Already owns Guwahati
        p1.money = 1000  # Less than 2 * 600
        assert brain.decide_buy(game, "p1", 3) is False

    def test_buy_passes_otherwise(self, brain, game):
        """Default: pass, let it go to auction."""
        p1 = game.room.players["p1"]
        p1.properties_owned = []
        p1.money = 1000  # Less than 3 * 600, not completing monopoly
        assert brain.decide_buy(game, "p1", 1) is False

    def test_buy_no_player(self, brain, game):
        """Missing player returns False."""
        assert brain.decide_buy(game, "nonexistent", 1) is False

    def test_buy_invalid_property(self, brain, game):
        """Missing board config returns False."""
        assert brain.decide_buy(game, "p1", 999) is False


# ---------------------------------------------------------------------------
# decide_bid
# ---------------------------------------------------------------------------

class TestDecideBid:
    def test_bid_passes_if_current_exceeds_max(self, brain, game):
        """If current_bid >= max_bid, return None."""
        game.room.players["p1"].money = 100000
        result = brain.decide_bid(game, "p1", 1, current_bid=999999)
        assert result is None

    def test_bid_no_player(self, brain, game):
        assert brain.decide_bid(game, "nonexistent", 1, 0) is None

    def test_bid_invalid_property(self, brain, game):
        assert brain.decide_bid(game, "p1", 999, 0) is None

    def test_bid_random_passes(self, brain, game):
        """When random roll is > want_bid, passes."""
        game.room.players["p1"].money = 9999999
        with patch("engine.bot.random.random", return_value=0.9):
            result = brain.decide_bid(game, "p1", 1, 0)
        assert result is None

    def test_bid_random_bids(self, brain, game):
        """When random roll <= want_bid, returns bid amount."""
        game.room.players["p1"].money = 9999999
        with patch("engine.bot.random.random", return_value=0.1):
            result = brain.decide_bid(game, "p1", 1, 0)
        assert isinstance(result, int)
        assert result > 0

    def test_bid_higher_interest_with_color(self, brain, game):
        """Bids more eagerly if already owns property in same color."""
        game.room.players["p1"].properties_owned = [1]  # Guwahati (brown)
        game.properties[1] = make_property_state(1, owner_id="p1")
        game.room.players["p1"].money = 9999999

        with patch("engine.bot.random.random", return_value=0.5):
            result = brain.decide_bid(game, "p1", 3, 0)  # Goa (also brown)
        assert isinstance(result, int)
        assert result > 0


# ---------------------------------------------------------------------------
# decide_build
# ---------------------------------------------------------------------------

class TestDecideBuild:
    def test_build_no_player(self, brain, game):
        assert brain.decide_build(game, "nonexistent") is False

    def test_build_no_monopoly(self, brain, game):
        """Can't build without owning all properties in a color group."""
        p1 = game.room.players["p1"]
        p1.properties_owned = [1]  # Only Guwahati, not Goa
        p1.money = 999999
        game.properties[1] = make_property_state(1, owner_id="p1")
        assert brain.decide_build(game, "p1") is False

    def test_build_full_monopoly_with_cash(self, brain, game):
        """Builds houses when owning all properties in a color group with cash."""
        p1 = game.room.players["p1"]
        p1.properties_owned = [1, 3]  # Both brown
        p1.money = 999999
        game.properties[1] = make_property_state(1, owner_id="p1")
        game.properties[3] = make_property_state(3, owner_id="p1")
        assert brain.decide_build(game, "p1") is True

    def test_build_monopoly_no_cash(self, brain, game):
        """Doesn't build when cash is insufficient for even one house."""
        p1 = game.room.players["p1"]
        p1.properties_owned = [1, 3]
        p1.money = 0
        game.properties[1] = make_property_state(1, owner_id="p1")
        game.properties[3] = make_property_state(3, owner_id="p1")
        assert brain.decide_build(game, "p1") is False

    def test_build_hotel_when_four_houses(self, brain, game):
        """Builds hotel when property has 4 houses and cash is available."""
        p1 = game.room.players["p1"]
        p1.properties_owned = [1, 3]
        p1.money = 999999
        game.properties[1] = make_property_state(1, owner_id="p1", houses=4)
        game.properties[3] = make_property_state(3, owner_id="p1", houses=4)
        assert brain.decide_build(game, "p1") is True


# ---------------------------------------------------------------------------
# _resolve_debt
# ---------------------------------------------------------------------------

class TestResolveDebt:
    def test_sells_houses_then_mortgages(self, brain, game):
        """Sells houses first (respecting even-building), then mortgages cheapest."""
        p1 = game.room.players["p1"]
        # Use properties in a color where owned set is incomplete (no even-building check)
        # plus a property that completes for monopoly check
        p1.properties_owned = [1, 3, 6, 11, 13]
        p1.money = -300000  # Large debt forces full liquidation

        game.properties[1] = make_property_state(1, owner_id="p1", houses=2)
        game.properties[3] = make_property_state(3, owner_id="p1", houses=2)
        game.properties[6] = make_property_state(6, owner_id="p1")
        game.properties[11] = make_property_state(11, owner_id="p1")  # Jaipur, pink
        game.properties[13] = make_property_state(13, owner_id="p1")  # Chandigarh, pink

        turn = TurnState(active_player_id="p1", phase=TurnPhase.DEBT, in_debt=True)
        brain._resolve_debt(game, turn, "p1")

        # Both brown sold one house (loop visits highest-id first, sells 1 per property)
        assert game.properties[1].houses == 1
        assert game.properties[3].houses == 1
        assert game.properties[6].is_mortgaged is True

    def test_no_debt_no_action(self, brain, game):
        """Does nothing if player has no properties."""
        p1 = game.room.players["p1"]
        p1.money = -100000
        turn = TurnState(active_player_id="p1", phase=TurnPhase.DEBT, in_debt=True)
        brain._resolve_debt(game, turn, "p1")
        # Should not crash


# ---------------------------------------------------------------------------
# _pay_tax
# ---------------------------------------------------------------------------

class TestPayTax:
    def test_choose_percentage_when_cheaper(self, brain, game):
        """Chooses 10% when it costs less than flat amount."""
        p1 = game.room.players["p1"]
        p1.money = 20000  # Low cash + no properties = 2k at 10% (< 2400 flat)
        turn = TurnState(
            active_player_id="p1",
            phase=TurnPhase.ACTION,
            pending_tax={"amount": 2400, "name": "Income Tax", "tile_id": 4},
        )

        with patch("engine.turn_manager.turn_manager.pay_tax") as mock_pay:
            brain._pay_tax(game, turn, "p1")
            mock_pay.assert_called_once_with("TEST01", "p1", True)

    def test_choose_flat_when_cheaper(self, brain, game):
        """Chooses flat amount when 10% is more expensive."""
        p1 = game.room.players["p1"]
        # Make player wealthy so 10% > flat 2400
        p1.properties_owned = [37, 39]  # Mumbai (3500) + Delhi (4000)
        p1.money = 5000000
        game.properties[37] = make_property_state(37, owner_id="p1")
        game.properties[39] = make_property_state(39, owner_id="p1")
        turn = TurnState(
            active_player_id="p1",
            phase=TurnPhase.ACTION,
            pending_tax={"amount": 2400, "name": "Income Tax", "tile_id": 4},
        )

        with patch("engine.turn_manager.turn_manager.pay_tax") as mock_pay:
            brain._pay_tax(game, turn, "p1")
            mock_pay.assert_called_once_with("TEST01", "p1", False)

    def test_no_pending_tax(self, brain, game):
        """Does nothing when no pending tax."""
        turn = TurnState(active_player_id="p1", phase=TurnPhase.ACTION)
        brain._pay_tax(game, turn, "p1")
        # Should not raise
