"""Tests for engine.auction."""
import pytest

from schemas.room import RoomState, RoomSettings, RoomStatus
from schemas.player import PlayerState
from schemas.game import GameState, PropertyState
from engine.auction import AuctionManager
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
    # Register property being auctioned (Guwahati, tile 1, price 60000)
    game.properties[1] = PropertyState(tile_id=1)
    return game


# ---------------------------------------------------------------------------
# Tests: start_auction
# ---------------------------------------------------------------------------

class TestStartAuction:
    def test_creates_auction_with_correct_state(self):
        am = AuctionManager()
        auction = am.start_auction("TEST01", 1, ["p1", "p2"])
        assert auction is not None
        assert auction.property_id == 1
        assert auction.active is True
        assert auction.highest_bidder_id is None
        assert auction.participants == ["p1", "p2"]
        # Initial bid = 10% of price (60000 * 0.1 = 6000)
        assert auction.current_bid == 6000

    def test_returns_none_for_invalid_property(self):
        am = AuctionManager()
        auction = am.start_auction("TEST01", 999, ["p1", "p2"])
        assert auction is None


# ---------------------------------------------------------------------------
# Tests: place_bid
# ---------------------------------------------------------------------------

class TestPlaceBid:
    def test_updates_bid_and_bidder(self):
        am = AuctionManager()
        am.start_auction("TEST01", 1, ["p1", "p2"])
        ok, msg = am.place_bid("TEST01", "p1", 10000, 150000)
        assert ok is True
        auction = am.get_auction("TEST01")
        assert auction.current_bid == 10000
        assert auction.highest_bidder_id == "p1"

    def test_fails_bid_too_low(self):
        am = AuctionManager()
        am.start_auction("TEST01", 1, ["p1", "p2"])
        am.place_bid("TEST01", "p1", 10000, 150000)
        ok, msg = am.place_bid("TEST01", "p2", 5000, 150000)
        assert ok is False

    def test_fails_not_enough_money(self):
        am = AuctionManager()
        am.start_auction("TEST01", 1, ["p1", "p2"])
        ok, msg = am.place_bid("TEST01", "p1", 10000, 5000)
        assert ok is False
        assert "money" in msg.lower()

    def test_fails_not_participant(self):
        am = AuctionManager()
        am.start_auction("TEST01", 1, ["p1"])
        ok, msg = am.place_bid("TEST01", "p2", 10000, 150000)
        assert ok is False
        assert "not participating" in msg.lower()


# ---------------------------------------------------------------------------
# Tests: end_auction
# ---------------------------------------------------------------------------

class TestEndAuction:
    def test_winner_pays_and_gets_property(self):
        am = AuctionManager()
        game = make_test_game()
        am.start_auction("TEST01", 1, ["p1", "p2"])
        am.place_bid("TEST01", "p1", 10000, 150000)
        p1_money = game.room.players["p1"].money
        ok, msg = am.end_auction("TEST01", game)
        assert ok is True
        assert game.room.players["p1"].money == p1_money - 10000
        assert game.properties[1].owner_id == "p1"
        assert 1 in game.room.players["p1"].properties_owned

    def test_no_bidders_property_stays_unowned(self):
        am = AuctionManager()
        game = make_test_game()
        am.start_auction("TEST01", 1, ["p1", "p2"])
        # No bids placed
        ok, msg = am.end_auction("TEST01", game)
        assert ok is True
        assert game.properties[1].owner_id is None
        assert "no bids" in msg.lower()
