"""Tests for engine.turn_manager."""
import pytest
from unittest.mock import patch

from conftest import make_player, make_test_game
from schemas.room import RoomState, RoomSettings, RoomStatus
from schemas.player import PlayerState
from schemas.game import GameState, PropertyState
from schemas.action import TurnState, DiceState, TurnPhase
from engine.turn_manager import TurnManager
from constants.game_rules import GameRules


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def start(game: GameState) -> TurnManager:
    """Start a game and return the TurnManager."""
    tm = TurnManager()
    tm.start_game("TEST01", game)
    return tm


# ---------------------------------------------------------------------------
# Tests: next_turn
# ---------------------------------------------------------------------------

class TestNextTurn:
    def test_advances_to_next_player(self):
        game = make_test_game()
        tm = start(game)
        # After start_game, current_turn_index is 0 (p1). next_turn -> p2.
        turn = tm.next_turn("TEST01")
        assert turn is not None
        assert turn.active_player_id == "p2"
        assert turn.phase == TurnPhase.ROLL
        assert turn.can_roll is True
        assert turn.can_end_turn is False

    def test_wraps_around_to_first_player(self):
        game = make_test_game()
        tm = start(game)
        tm.next_turn("TEST01")  # p1 -> p2
        turn = tm.next_turn("TEST01")  # p2 -> p1
        assert turn is not None
        assert turn.active_player_id == "p1"

    def test_skips_bankrupt_player(self):
        game = make_test_game()
        tm = start(game)
        game.room.players["p2"].is_bankrupt = True
        turn = tm.next_turn("TEST01")
        assert turn.active_player_id == "p1"  # Skipped bankrupt p2, wrapped to p1

    def test_returns_none_for_missing_game(self):
        tm = TurnManager()
        assert tm.next_turn("NOPE") is None


# ---------------------------------------------------------------------------
# Tests: tick_turn_timer
# ---------------------------------------------------------------------------

class TestTickTurnTimer:
    def test_decrements_timer(self):
        game = make_test_game()
        tm = start(game)
        initial = tm.get_turn_state("TEST01").time_remaining
        turn, _, _ = tm.tick_turn_timer("TEST01")
        assert turn.time_remaining == initial - 1

    def test_skips_during_buy_phase(self):
        game = make_test_game()
        tm = start(game)
        turn = tm.get_turn_state("TEST01")
        turn.phase = TurnPhase.BUY
        turn.time_remaining = 30
        result_turn, _, buy_prop = tm.tick_turn_timer("TEST01")
        assert result_turn.time_remaining == 30  # Main timer unchanged
        assert buy_prop is None  # Timer didn't expire

    def test_buy_phase_timeout_triggers_auction_when_cant_afford(self):
        game = make_test_game()
        tm = start(game)
        # Give player low money so they can't auto-buy (need 2x price)
        game.room.players["p1"].money = 500  # Guwahati costs 600, need 1200
        turn = tm.get_turn_state("TEST01")
        turn.phase = TurnPhase.BUY
        turn.time_remaining = 30
        # Initialize the buy timer with a known property ID (tile 1)
        tm._buy_timers["TEST01"] = (GameRules.BUY_TIMEOUT, 1)
        for _ in range(GameRules.BUY_TIMEOUT + 2):
            turn, _, _ = tm.tick_turn_timer("TEST01")
        assert turn.phase == TurnPhase.AUCTION

    def test_buy_phase_timeout_auto_buys_when_affordable(self):
        game = make_test_game()
        tm = start(game)
        # Player has 15,000, Guwahati costs 600 — 2x threshold = 1200, easily met
        initial_money = game.room.players["p1"].money
        turn = tm.get_turn_state("TEST01")
        turn.phase = TurnPhase.BUY
        turn.time_remaining = 30
        tm._buy_timers["TEST01"] = (GameRules.BUY_TIMEOUT, 1)
        for _ in range(GameRules.BUY_TIMEOUT + 2):
            turn, _, _ = tm.tick_turn_timer("TEST01")
        # Should have auto-bought
        assert turn.phase == TurnPhase.ACTION
        assert turn.can_end_turn is True
        assert 1 in game.room.players["p1"].properties_owned
        assert game.room.players["p1"].money == initial_money - 600

    def test_auto_build_on_monopoly(self):
        """When timer expires in ACTION phase with a monopoly, auto-build a house."""
        game = make_test_game()
        tm = start(game)
        p1 = game.room.players["p1"]
        # Give p1 monopoly on brown (tiles 1, 3)
        game.properties[1].owner_id = "p1"
        game.properties[3].owner_id = "p1"
        p1.properties_owned = [1, 3]
        turn = tm.get_turn_state("TEST01")
        turn.phase = TurnPhase.ACTION
        turn.can_roll = False
        turn.can_end_turn = True
        turn.time_remaining = 1  # Will expire on next tick
        initial_money = p1.money
        result_turn, _, _ = tm.tick_turn_timer("TEST01")
        # Should have auto-built a house on one of the brown properties
        total_houses = game.properties[1].houses + game.properties[3].houses
        assert total_houses == 1
        assert p1.money == initial_money - GameRules.HOUSE_PRICES["brown"]

    def test_no_auto_build_without_monopoly(self):
        """When timer expires in ACTION phase without monopoly, just end turn."""
        game = make_test_game()
        tm = start(game)
        p1 = game.room.players["p1"]
        # Only own one brown property (no monopoly)
        game.properties[1].owner_id = "p1"
        p1.properties_owned = [1]
        turn = tm.get_turn_state("TEST01")
        turn.phase = TurnPhase.ACTION
        turn.can_roll = False
        turn.can_end_turn = True
        turn.time_remaining = 1
        initial_money = p1.money
        result_turn, _, _ = tm.tick_turn_timer("TEST01")
        # No auto-build, turn ended
        assert game.properties[1].houses == 0
        assert p1.money == initial_money

    def test_skips_during_auction_phase(self):
        game = make_test_game()
        tm = start(game)
        turn = tm.get_turn_state("TEST01")
        turn.phase = TurnPhase.AUCTION
        turn.time_remaining = 15
        result_turn, _, _ = tm.tick_turn_timer("TEST01")
        assert result_turn.time_remaining == 15

    def test_skips_during_debt_phase(self):
        game = make_test_game()
        tm = start(game)
        turn = tm.get_turn_state("TEST01")
        turn.phase = TurnPhase.DEBT
        turn.time_remaining = 10
        result_turn, _, _ = tm.tick_turn_timer("TEST01")
        assert result_turn.time_remaining == 10

    def test_returns_none_for_missing_room(self):
        tm = TurnManager()
        turn, dice, _ = tm.tick_turn_timer("NOPE")
        assert turn is None
        assert dice is None


# ---------------------------------------------------------------------------
# Tests: process_roll
# ---------------------------------------------------------------------------

class TestProcessRoll:
    def _make_dice(self, d1=3, d2=4):
        return DiceState(die1=d1, die2=d2, total=d1 + d2, is_double=(d1 == d2), doubles_count=0)

    @patch("engine.turn_manager.roll_dice")
    def test_basic_roll(self, mock_roll):
        mock_roll.return_value = self._make_dice(3, 4)
        game = make_test_game()
        tm = start(game)
        result = tm.process_roll("TEST01", "p1")
        assert result is not None
        dice = result["dice"]
        assert dice["die1"] == 3
        assert dice["die2"] == 4
        assert dice["total"] == 7
        # Verify turn advanced (can_roll should be False after non-double roll)
        turn = result["turn"]
        assert turn.can_roll is False

    @patch("engine.turn_manager.roll_dice")
    def test_landing_on_property_sets_buy_phase(self, mock_roll):
        # Roll to land on an unowned property (tile 1 = Guwahati, roll total 1 is impossible)
        # Use tile 6 (Ahmedabad) = roll 6 with doubles to keep can_roll
        mock_roll.return_value = DiceState(die1=3, die2=3, total=6, is_double=True, doubles_count=0)
        game = make_test_game()
        tm = start(game)
        result = tm.process_roll("TEST01", "p1")
        turn = result["turn"]
        # After rolling doubles on an unowned property, phase should be BUY
        assert turn.phase == TurnPhase.BUY

    @patch("engine.turn_manager.roll_dice")
    def test_landing_on_tax_sets_pending_tax(self, mock_roll):
        # Tile 4 is Income Tax. Roll 4.
        mock_roll.return_value = DiceState(die1=2, die2=2, total=4, is_double=True, doubles_count=0)
        game = make_test_game()
        tm = start(game)
        result = tm.process_roll("TEST01", "p1")
        turn = result["turn"]
        assert turn.pending_tax is not None
        assert turn.pending_tax["amount"] == 2400

    @patch("engine.turn_manager.roll_dice")
    def test_returns_none_for_wrong_player(self, mock_roll):
        game = make_test_game()
        tm = start(game)
        result = tm.process_roll("TEST01", "p2")  # Not p1's turn
        assert result is None

    @patch("engine.turn_manager.roll_dice")
    def test_third_double_sends_to_jail(self, mock_roll):
        mock_roll.return_value = DiceState(die1=3, die2=3, total=6, is_double=True, doubles_count=0)
        game = make_test_game()
        tm = start(game)
        # Roll doubles twice, third should send to jail
        tm.process_roll("TEST01", "p1")  # 1st double
        # Need to reset can_roll for next roll (normally turn_manager handles this)
        turn = tm.get_turn_state("TEST01")
        turn.can_roll = True
        turn.phase = TurnPhase.ROLL
        tm.process_roll("TEST01", "p1")  # 2nd double
        turn = tm.get_turn_state("TEST01")
        turn.can_roll = True
        turn.phase = TurnPhase.ROLL
        result = tm.process_roll("TEST01", "p1")  # 3rd double -> jail
        assert game.room.players["p1"].is_in_jail is True

    @patch("engine.turn_manager.roll_dice")
    def test_debt_creditors_tracked_on_rent(self, mock_roll):
        """When a player goes negative from rent, debt_creditors tracks the creditor and amount."""
        # Tile 11 = Jaipur (rent base 100). Roll 11 from position 0.
        mock_roll.return_value = DiceState(die1=5, die2=6, total=11, is_double=False, doubles_count=0)
        game = make_test_game(3)
        tm = start(game)
        # p2 owns tile 11
        game.properties[11].owner_id = "p2"
        game.room.players["p2"].properties_owned = [11]
        # Give p1 very low money so rent pushes them negative
        game.room.players["p1"].money = 50
        result = tm.process_roll("TEST01", "p1")
        turn = result["turn"]
        assert turn.in_debt is True
        assert len(turn.debt_creditors) == 1
        assert turn.debt_creditors[0][0] == "p2"
        assert turn.debt_creditors[0][1] > 0  # amount owed
        assert turn.debt_creditor_id == "p2"

    @patch("engine.turn_manager.roll_dice")
    def test_debt_creditors_cleared_on_resolution(self, mock_roll):
        """debt_creditors is cleared when debt is resolved."""
        mock_roll.return_value = DiceState(die1=5, die2=6, total=11, is_double=False, doubles_count=0)
        game = make_test_game(3)
        tm = start(game)
        game.properties[11].owner_id = "p2"
        game.room.players["p2"].properties_owned = [11]
        game.room.players["p1"].money = 50
        tm.process_roll("TEST01", "p1")
        turn = tm.get_turn_state("TEST01")
        assert turn.in_debt is True
        assert len(turn.debt_creditors) == 1
        # Resolve debt by giving player money
        game.room.players["p1"].money = 5000
        resolved = tm.check_debt_resolved("TEST01", "p1")
        assert resolved.in_debt is False
        assert resolved.debt_creditors == []
        assert resolved.debt_creditor_id is None


# ---------------------------------------------------------------------------
# Tests: pay_tax
# ---------------------------------------------------------------------------

class TestPayTax:
    def test_deducts_money(self):
        game = make_test_game()
        tm = start(game)
        turn = tm.get_turn_state("TEST01")
        turn.pending_tax = {"amount": 2400, "name": "Income Tax", "tile_id": 4}
        p1_money = game.room.players["p1"].money
        result = tm.pay_tax("TEST01", "p1")
        assert result is not None
        assert game.room.players["p1"].money == p1_money - 2400
        assert turn.pending_tax is None

    def test_detects_negative_balance_debt(self):
        game = make_test_game()
        tm = start(game)
        game.room.players["p1"].money = 1000  # Not enough for 2400 tax
        turn = tm.get_turn_state("TEST01")
        turn.pending_tax = {"amount": 2400, "name": "Income Tax", "tile_id": 4}
        result = tm.pay_tax("TEST01", "p1")
        assert result is not None
        assert game.room.players["p1"].money < 0
        assert turn.in_debt is True
        assert turn.phase == TurnPhase.DEBT

    def test_returns_none_when_no_pending_tax(self):
        game = make_test_game()
        tm = start(game)
        assert tm.pay_tax("TEST01", "p1") is None


# ---------------------------------------------------------------------------
# Tests: declare_voluntary_bankruptcy
# ---------------------------------------------------------------------------

class TestDeclareVoluntaryBankruptcy:
    def test_declares_bankruptcy_when_in_debt(self):
        game = make_test_game()
        tm = start(game)
        turn = tm.get_turn_state("TEST01")
        turn.in_debt = True
        turn.debt_creditor_id = "p2"
        game.room.players["p1"].money = -50000
        result = tm.declare_voluntary_bankruptcy("TEST01", "p1")
        assert result is not None
        assert game.room.players["p1"].is_bankrupt is True

    def test_returns_none_when_not_in_debt(self):
        game = make_test_game()
        tm = start(game)
        # turn.in_debt is False by default
        assert tm.declare_voluntary_bankruptcy("TEST01", "p1") is None

    def test_returns_none_for_wrong_player(self):
        game = make_test_game()
        tm = start(game)
        turn = tm.get_turn_state("TEST01")
        turn.in_debt = True
        assert tm.declare_voluntary_bankruptcy("TEST01", "p2") is None  # Not active player


class TestPayJailFine:
    def test_pay_jail_fine_releases_player(self):
        game = make_test_game()
        tm = start(game)
        player = game.room.players["p1"]
        player.is_in_jail = True
        player.jail_turns = 1
        initial_money = player.money
        result = tm.pay_jail_fine("TEST01", "p1")
        assert result is not None
        assert player.is_in_jail is False
        assert player.jail_turns == 0
        assert player.money == initial_money - GameRules.JAIL_FINE

    def test_pay_jail_fine_fails_if_not_enough_money(self):
        game = make_test_game()
        tm = start(game)
        player = game.room.players["p1"]
        player.is_in_jail = True
        player.money = 100  # Less than JAIL_FINE (500)
        assert tm.pay_jail_fine("TEST01", "p1") is None

    def test_pay_jail_fine_fails_if_not_in_jail(self):
        game = make_test_game()
        tm = start(game)
        assert tm.pay_jail_fine("TEST01", "p1") is None

    def test_pay_jail_fine_sets_can_roll(self):
        game = make_test_game()
        tm = start(game)
        player = game.room.players["p1"]
        player.is_in_jail = True
        result = tm.pay_jail_fine("TEST01", "p1")
        turn = result["turn"]
        assert turn.can_roll is True
        assert turn.phase == TurnPhase.ROLL


class TestUseJailCard:
    def test_use_jail_card_releases_and_returns_card(self):
        game = make_test_game()
        # Need a card in the deck
        from engine.cards import card_engine
        game.treasury_deck.append({"text": "Get Out of Jail Free card", "action": "get_out_of_jail_free", "_source": "treasury"})
        tm = start(game)
        player = game.room.players["p1"]
        player.is_in_jail = True
        # Give them a GOOJF card (simulate having drawn one)
        player.get_out_of_jail_cards = 1
        player.goojf_sources = ["treasury"]
        initial_deck_size = len(game.treasury_deck)
        result = tm.use_jail_card("TEST01", "p1")
        assert result is not None
        assert player.is_in_jail is False
        assert player.get_out_of_jail_cards == 0
        # Card was returned to deck
        assert len(game.treasury_deck) == initial_deck_size + 1

    def test_use_jail_card_fails_without_card(self):
        game = make_test_game()
        tm = start(game)
        player = game.room.players["p1"]
        player.is_in_jail = True
        player.get_out_of_jail_cards = 0
        assert tm.use_jail_card("TEST01", "p1") is None

    def test_use_jail_card_sets_can_roll(self):
        game = make_test_game()
        tm = start(game)
        player = game.room.players["p1"]
        player.is_in_jail = True
        player.get_out_of_jail_cards = 1
        player.goojf_sources = ["treasury"]
        result = tm.use_jail_card("TEST01", "p1")
        turn = result["turn"]
        assert turn.can_roll is True
        assert turn.phase == TurnPhase.ROLL


class TestCheckDebtResolved:
    def test_debt_cleared_when_money_positive(self):
        game = make_test_game()
        tm = start(game)
        turn = tm.get_turn_state("TEST01")
        turn.in_debt = True
        turn.debt_creditor_id = "p2"
        game.room.players["p1"].money = 50000  # Was negative, now positive
        result = tm.check_debt_resolved("TEST01", "p1")
        assert result is not None
        assert result.in_debt is False
        assert result.debt_creditor_id is None

    def test_still_in_debt_when_still_negative(self):
        game = make_test_game()
        tm = start(game)
        turn = tm.get_turn_state("TEST01")
        turn.in_debt = True
        game.room.players["p1"].money = -10000
        result = tm.check_debt_resolved("TEST01", "p1")
        assert result.in_debt is True


class TestPayTaxPercentage:
    def test_pay_tax_10_percent_includes_building_values(self):
        game = make_test_game()
        # Add a property with a house to verify building value calculation
        game.properties[1] = PropertyState(tile_id=1, owner_id="p1", houses=2)
        game.room.players["p1"].properties_owned = [1]
        # Also add tile 3 to complete brown group
        game.properties[3] = PropertyState(tile_id=3, owner_id="p1")
        game.room.players["p1"].properties_owned = [1, 3]
        tm = start(game)
        turn = tm.get_turn_state("TEST01")
        turn.pending_tax = {"amount": 2400, "name": "Income Tax", "tile_id": 4}
        p1 = game.room.players["p1"]
        initial_money = p1.money
        result = tm.pay_tax("TEST01", "p1", use_percentage=True)
        assert result is not None
        # 10% of (15k cash + 600 tile1 + 600 tile3 + 2*500 houses) = 10% of 17200 = 1720
        expected_tax = int((initial_money + 600 + 600 + 2 * 500) * 0.1)
        assert p1.money == initial_money - expected_tax
        assert turn.pending_tax is None

    def test_pay_tax_10_percent_excludes_mortgaged_properties(self):
        game = make_test_game()
        # Add an unmortgaged property and a mortgaged property
        game.properties[1] = PropertyState(tile_id=1, owner_id="p1", is_mortgaged=True)
        game.properties[3] = PropertyState(tile_id=3, owner_id="p1", is_mortgaged=False)
        game.room.players["p1"].properties_owned = [1, 3]
        
        tm = start(game)
        turn = tm.get_turn_state("TEST01")
        turn.pending_tax = {"amount": 2400, "name": "Income Tax", "tile_id": 4}
        p1 = game.room.players["p1"]
        initial_money = p1.money # 15000
        result = tm.pay_tax("TEST01", "p1", use_percentage=True)
        assert result is not None
        
        # 10% of (15k cash + 0 for mortgaged tile1 + 600 tile3) = 10% of 15600 = 1560
        expected_tax = int((initial_money + 600) * 0.1)
        assert p1.money == initial_money - expected_tax
        assert turn.pending_tax is None

    def test_pay_tax_10_percent_with_debt(self):
        game = make_test_game()
        # Force negative money (debt)
        game.room.players["p1"].money = -5000
        # Add unmortgaged property
        game.properties[1] = PropertyState(tile_id=1, owner_id="p1", is_mortgaged=False)
        game.room.players["p1"].properties_owned = [1]
        
        tm = start(game)
        turn = tm.get_turn_state("TEST01")
        turn.pending_tax = {"amount": 2400, "name": "Income Tax", "tile_id": 4}
        p1 = game.room.players["p1"]
        result = tm.pay_tax("TEST01", "p1", use_percentage=True)
        assert result is not None
        
        # 10% of (-5k cash + 600 tile1) = -440 -> <= 0 worth.
        # Enforces flat tax amount (2400)
        assert p1.money == -5000 - 2400
        assert turn.pending_tax is None
