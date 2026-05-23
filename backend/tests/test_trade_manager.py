"""Tests for engine.trade_manager."""
import pytest

from schemas.room import RoomState, RoomSettings, RoomStatus
from schemas.player import PlayerState
from schemas.game import GameState, PropertyState
from engine.trade_manager import TradeManager


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def make_player(pid: str, name: str, money: int = 15000, color: str = "#ff0000", **kwargs) -> PlayerState:
    return PlayerState(id=pid, name=name, color=color, money=money, **kwargs)


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
    # Register all board properties
    from engine.property import get_board_config
    for tile_id, config in get_board_config().items():
        if config.get("type") in ("property", "airport", "utility"):
            game.properties[tile_id] = PropertyState(tile_id=tile_id)
    return game


# ---------------------------------------------------------------------------
# Tests: create_trade
# ---------------------------------------------------------------------------

class TestCreateTrade:
    def test_valid_money_trade(self):
        game = make_test_game()
        tm = TradeManager()
        trade = tm.create_trade(game, "p1", "p2", offering_money=10000)
        assert trade is not None
        assert trade.from_player_id == "p1"
        assert trade.to_player_id == "p2"
        assert trade.offering_money == 10000
        assert trade.status == "pending"

    def test_valid_property_trade(self):
        game = make_test_game()
        game.room.players["p1"].properties_owned = [1]
        tm = TradeManager()
        trade = tm.create_trade(game, "p1", "p2",
                                offering_properties=[1], requesting_money=5000)
        assert trade is not None
        assert trade.offering_properties == [1]

    def test_valid_goojf_trade(self):
        game = make_test_game()
        game.room.players["p1"].get_out_of_jail_cards = 2
        tm = TradeManager()
        trade = tm.create_trade(game, "p1", "p2",
                                offering_get_out_of_jail_cards=1)
        assert trade is not None
        assert trade.offering_get_out_of_jail_cards == 1

    def test_invalid_from_player(self):
        game = make_test_game()
        tm = TradeManager()
        trade = tm.create_trade(game, "NOPE", "p2", offering_money=10000)
        assert trade is None

    def test_invalid_to_player(self):
        game = make_test_game()
        tm = TradeManager()
        trade = tm.create_trade(game, "p1", "NOPE", offering_money=10000)
        assert trade is None

    def test_from_player_bankrupt(self):
        game = make_test_game()
        game.room.players["p1"].is_bankrupt = True
        tm = TradeManager()
        trade = tm.create_trade(game, "p1", "p2", offering_money=10000)
        assert trade is None

    def test_to_player_bankrupt(self):
        game = make_test_game()
        game.room.players["p2"].is_bankrupt = True
        tm = TradeManager()
        trade = tm.create_trade(game, "p1", "p2", offering_money=10000)
        assert trade is None

    def test_insufficient_money_from_player(self):
        game = make_test_game()
        game.room.players["p1"].money = 5000
        tm = TradeManager()
        trade = tm.create_trade(game, "p1", "p2", offering_money=10000)
        assert trade is None

    def test_insufficient_money_to_player(self):
        game = make_test_game()
        game.room.players["p2"].money = 1000
        tm = TradeManager()
        trade = tm.create_trade(game, "p1", "p2", requesting_money=5000)
        assert trade is None

    def test_property_not_owned_by_from(self):
        game = make_test_game()
        # p1 does not own tile 1
        tm = TradeManager()
        trade = tm.create_trade(game, "p1", "p2", offering_properties=[1])
        assert trade is None

    def test_property_not_owned_by_to(self):
        game = make_test_game()
        tm = TradeManager()
        trade = tm.create_trade(game, "p1", "p2", requesting_properties=[1])
        assert trade is None

    def test_insufficient_goojf_from_player(self):
        game = make_test_game()
        game.room.players["p1"].get_out_of_jail_cards = 0
        tm = TradeManager()
        trade = tm.create_trade(game, "p1", "p2",
                                offering_get_out_of_jail_cards=1)
        assert trade is None

    def test_insufficient_goojf_to_player(self):
        game = make_test_game()
        game.room.players["p2"].get_out_of_jail_cards = 0
        tm = TradeManager()
        trade = tm.create_trade(game, "p1", "p2",
                                requesting_get_out_of_jail_cards=1)
        assert trade is None

    def test_trade_tracked_for_both_players(self):
        game = make_test_game()
        tm = TradeManager()
        trade = tm.create_trade(game, "p1", "p2", offering_money=5000)
        assert trade.trade_id in tm.player_trades["p1"]
        assert trade.trade_id in tm.player_trades["p2"]


# ---------------------------------------------------------------------------
# Tests: accept_trade
# ---------------------------------------------------------------------------

class TestAcceptTrade:
    def test_accept_money_trade(self):
        game = make_test_game()
        tm = TradeManager()
        p1 = game.room.players["p1"]
        p2 = game.room.players["p2"]
        p1_initial = p1.money
        p2_initial = p2.money
        trade = tm.create_trade(game, "p1", "p2",
                                offering_money=10000, requesting_money=3000)
        result = tm.accept_trade(game, trade.trade_id, "p2")
        assert result is True
        assert p1.money == p1_initial - 10000 + 3000
        assert p2.money == p2_initial + 10000 - 3000
        assert trade.status == "accepted"

    def test_accept_property_trade(self):
        game = make_test_game()
        game.room.players["p1"].properties_owned = [1]
        game.properties[1].owner_id = "p1"
        tm = TradeManager()
        trade = tm.create_trade(game, "p1", "p2", offering_properties=[1])
        result = tm.accept_trade(game, trade.trade_id, "p2")
        assert result is True
        assert 1 in game.room.players["p2"].properties_owned
        assert 1 not in game.room.players["p1"].properties_owned
        assert game.properties[1].owner_id == "p2"

    def test_accept_goojf_trade(self):
        game = make_test_game()
        game.room.players["p1"].get_out_of_jail_cards = 2
        game.room.players["p2"].get_out_of_jail_cards = 0
        tm = TradeManager()
        trade = tm.create_trade(game, "p1", "p2",
                                offering_get_out_of_jail_cards=1)
        result = tm.accept_trade(game, trade.trade_id, "p2")
        assert result is True
        assert game.room.players["p1"].get_out_of_jail_cards == 1
        assert game.room.players["p2"].get_out_of_jail_cards == 1

    def test_wrong_player_cannot_accept(self):
        game = make_test_game()
        tm = TradeManager()
        trade = tm.create_trade(game, "p1", "p2", offering_money=5000)
        result = tm.accept_trade(game, trade.trade_id, "p1")
        assert result is False

    def test_nonexistent_trade_returns_false(self):
        game = make_test_game()
        tm = TradeManager()
        result = tm.accept_trade(game, "NOPE", "p2")
        assert result is False

    def test_already_accepted_trade_returns_false(self):
        game = make_test_game()
        tm = TradeManager()
        trade = tm.create_trade(game, "p1", "p2", offering_money=5000)
        tm.accept_trade(game, trade.trade_id, "p2")
        result = tm.accept_trade(game, trade.trade_id, "p2")
        assert result is False

    def test_revalidate_on_accept_insufficient_money(self):
        game = make_test_game()
        tm = TradeManager()
        trade = tm.create_trade(game, "p1", "p2",
                                offering_money=10000, requesting_money=5000)
        # Reduce p1 money after creating trade (simulates spending)
        game.room.players["p1"].money = 5000
        result = tm.accept_trade(game, trade.trade_id, "p2")
        assert result is False

    def test_revalidate_on_accept_property_no_longer_owned(self):
        game = make_test_game()
        game.room.players["p1"].properties_owned = [1]
        game.properties[1].owner_id = "p1"
        tm = TradeManager()
        trade = tm.create_trade(game, "p1", "p2", offering_properties=[1])
        # Simulate losing property
        game.room.players["p1"].properties_owned = []
        result = tm.accept_trade(game, trade.trade_id, "p2")
        assert result is False

    def test_trade_cleaned_up_after_accept(self):
        game = make_test_game()
        tm = TradeManager()
        trade = tm.create_trade(game, "p1", "p2", offering_money=5000)
        tid = trade.trade_id
        tm.accept_trade(game, tid, "p2")
        assert tid not in tm.active_trades
        assert tid not in tm.player_trades.get("p1", [])
        assert tid not in tm.player_trades.get("p2", [])


# ---------------------------------------------------------------------------
# Tests: reject_trade
# ---------------------------------------------------------------------------

class TestRejectTrade:
    def test_recipient_can_reject(self):
        game = make_test_game()
        tm = TradeManager()
        trade = tm.create_trade(game, "p1", "p2", offering_money=5000)
        result = tm.reject_trade(trade.trade_id, "p2")
        assert result is True
        assert trade.status == "rejected"

    def test_initiator_cannot_reject(self):
        game = make_test_game()
        tm = TradeManager()
        trade = tm.create_trade(game, "p1", "p2", offering_money=5000)
        result = tm.reject_trade(trade.trade_id, "p1")
        assert result is False

    def test_nonexistent_trade_returns_false(self):
        tm = TradeManager()
        result = tm.reject_trade("NOPE", "p2")
        assert result is False

    def test_already_rejected_trade_returns_false(self):
        game = make_test_game()
        tm = TradeManager()
        trade = tm.create_trade(game, "p1", "p2", offering_money=5000)
        tm.reject_trade(trade.trade_id, "p2")
        result = tm.reject_trade(trade.trade_id, "p2")
        assert result is False

    def test_trade_cleaned_up_after_reject(self):
        game = make_test_game()
        tm = TradeManager()
        trade = tm.create_trade(game, "p1", "p2", offering_money=5000)
        tid = trade.trade_id
        tm.reject_trade(tid, "p2")
        assert tid not in tm.active_trades


# ---------------------------------------------------------------------------
# Tests: cancel_trade
# ---------------------------------------------------------------------------

class TestCancelTrade:
    def test_initiator_can_cancel(self):
        game = make_test_game()
        tm = TradeManager()
        trade = tm.create_trade(game, "p1", "p2", offering_money=5000)
        result = tm.cancel_trade(trade.trade_id, "p1")
        assert result is True
        assert trade.status == "cancelled"

    def test_recipient_cannot_cancel(self):
        game = make_test_game()
        tm = TradeManager()
        trade = tm.create_trade(game, "p1", "p2", offering_money=5000)
        result = tm.cancel_trade(trade.trade_id, "p2")
        assert result is False

    def test_nonexistent_trade_returns_false(self):
        tm = TradeManager()
        result = tm.cancel_trade("NOPE", "p1")
        assert result is False

    def test_trade_cleaned_up_after_cancel(self):
        game = make_test_game()
        tm = TradeManager()
        trade = tm.create_trade(game, "p1", "p2", offering_money=5000)
        tid = trade.trade_id
        tm.cancel_trade(tid, "p1")
        assert tid not in tm.active_trades


# ---------------------------------------------------------------------------
# Tests: get_player_trades and get_trade
# ---------------------------------------------------------------------------

class TestGetTrades:
    def test_get_trade_returns_trade(self):
        game = make_test_game()
        tm = TradeManager()
        trade = tm.create_trade(game, "p1", "p2", offering_money=5000)
        found = tm.get_trade(trade.trade_id)
        assert found is trade

    def test_get_trade_returns_none_for_missing(self):
        tm = TradeManager()
        assert tm.get_trade("NOPE") is None

    def test_get_player_trades_returns_active_trades(self):
        game = make_test_game()
        tm = TradeManager()
        t1 = tm.create_trade(game, "p1", "p2", offering_money=1000)
        t2 = tm.create_trade(game, "p1", "p2", offering_money=2000)
        trades = tm.get_player_trades("p1")
        assert len(trades) == 2
        trade_ids = [t.trade_id for t in trades]
        assert t1.trade_id in trade_ids
        assert t2.trade_id in trade_ids

    def test_get_player_trades_empty_for_unknown_player(self):
        tm = TradeManager()
        trades = tm.get_player_trades("NOPE")
        assert trades == []

    def test_get_player_trades_excludes_completed(self):
        game = make_test_game()
        tm = TradeManager()
        t1 = tm.create_trade(game, "p1", "p2", offering_money=1000)
        t2 = tm.create_trade(game, "p1", "p2", offering_money=2000)
        tm.accept_trade(game, t1.trade_id, "p2")
        trades = tm.get_player_trades("p1")
        assert len(trades) == 1
        assert trades[0].trade_id == t2.trade_id


# ---------------------------------------------------------------------------
# Tests: counter_trade
# ---------------------------------------------------------------------------

class TestCounterTrade:
    def test_valid_counter_trade(self):
        """Counter-offer rejects original and creates a new reversed trade."""
        game = make_test_game()
        game.room.players["p1"].properties_owned = [1]
        game.properties[1].owner_id = "p1"
        tm = TradeManager()
        original = tm.create_trade(game, "p1", "p2",
                                   offering_properties=[1], requesting_money=5000)
        assert original is not None
        original_id = original.trade_id

        # p2 counters: offers less money, keeps asking for property 1
        counter = tm.counter_trade(
            game, original_id, "p2",
            counter_money_offer=3000, counter_money_request=0,
            counter_properties_offer=[], counter_properties_request=[1],
        )
        assert counter is not None
        assert counter.from_player_id == "p2"      # countering player initiates
        assert counter.to_player_id == "p1"         # original initiator receives
        assert counter.offering_money == 3000
        assert counter.requesting_properties == [1]
        assert counter.status == "pending"

        # Original should be rejected
        assert original.status == "rejected"
        assert original_id not in tm.active_trades

    def test_counter_with_jail_cards(self):
        """Counter-offer can include get-out-of-jail cards."""
        game = make_test_game()
        game.room.players["p2"].get_out_of_jail_cards = 2
        tm = TradeManager()
        original = tm.create_trade(game, "p1", "p2", offering_money=5000)
        counter = tm.counter_trade(
            game, original.trade_id, "p2",
            counter_money_offer=2000, counter_money_request=0,
            counter_properties_offer=[], counter_properties_request=[],
            counter_jail_cards_offer=1, counter_jail_cards_request=0,
        )
        assert counter is not None
        assert counter.offering_get_out_of_jail_cards == 1

    def test_wrong_player_cannot_counter(self):
        """Only the trade recipient (to_player) can counter."""
        game = make_test_game()
        tm = TradeManager()
        original = tm.create_trade(game, "p1", "p2", offering_money=5000)
        counter = tm.counter_trade(
            game, original.trade_id, "p1",  # p1 is initiator, NOT recipient
            counter_money_offer=3000, counter_money_request=0,
            counter_properties_offer=[], counter_properties_request=[],
        )
        assert counter is None

    def test_nonexistent_trade_returns_none(self):
        game = make_test_game()
        tm = TradeManager()
        counter = tm.counter_trade(
            game, "NOPE", "p2",
            counter_money_offer=0, counter_money_request=0,
            counter_properties_offer=[], counter_properties_request=[],
        )
        assert counter is None

    def test_already_rejected_trade_returns_none(self):
        game = make_test_game()
        tm = TradeManager()
        original = tm.create_trade(game, "p1", "p2", offering_money=5000)
        tm.reject_trade(original.trade_id, "p2")
        counter = tm.counter_trade(
            game, original.trade_id, "p2",
            counter_money_offer=3000, counter_money_request=0,
            counter_properties_offer=[], counter_properties_request=[],
        )
        assert counter is None

    def test_counter_trade_is_tracked(self):
        """The new counter trade should appear in active_trades and player_trades."""
        game = make_test_game()
        tm = TradeManager()
        original = tm.create_trade(game, "p1", "p2", offering_money=5000)
        counter = tm.counter_trade(
            game, original.trade_id, "p2",
            counter_money_offer=3000, counter_money_request=0,
            counter_properties_offer=[], counter_properties_request=[],
        )
        assert counter.trade_id in tm.active_trades
        assert counter.trade_id in tm.player_trades["p1"]
        assert counter.trade_id in tm.player_trades["p2"]

    def test_counter_can_be_accepted(self):
        """After a counter, the original initiator can accept the new trade."""
        game = make_test_game()
        p1 = game.room.players["p1"]
        p2 = game.room.players["p2"]
        tm = TradeManager()
        original = tm.create_trade(game, "p1", "p2", offering_money=5000)
        counter = tm.counter_trade(
            game, original.trade_id, "p2",
            counter_money_offer=3000, counter_money_request=0,
            counter_properties_offer=[], counter_properties_request=[],
        )
        p1_before = p1.money
        p2_before = p2.money
        result = tm.accept_trade(game, counter.trade_id, "p1")
        assert result is True
        assert p1.money == p1_before + 3000
        assert p2.money == p2_before - 3000

    def test_counter_invalid_money_returns_none(self):
        """Counter-offer with more money than player has should fail."""
        game = make_test_game()
        game.room.players["p2"].money = 1000
        tm = TradeManager()
        original = tm.create_trade(game, "p1", "p2", offering_money=500)
        counter = tm.counter_trade(
            game, original.trade_id, "p2",
            counter_money_offer=50000, counter_money_request=0,
            counter_properties_offer=[], counter_properties_request=[],
        )
        assert counter is None


# ---------------------------------------------------------------------------
# Tests: cleanup_room
# ---------------------------------------------------------------------------

class TestCleanupRoom:
    def test_cleanup_room_removes_all_trades(self):
        game = make_test_game()
        tm = TradeManager()
        tm.create_trade(game, "p1", "p2", offering_money=1000)
        tm.create_trade(game, "p1", "p2", offering_money=2000)
        assert len(tm.active_trades) == 2

        tm.cleanup_room("TEST01")
        # All trades for players in that room should be gone
        assert tm.get_player_trades("p1") == []
        assert tm.get_player_trades("p2") == []

