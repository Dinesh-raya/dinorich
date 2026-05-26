"""Tests for engine.dice."""
import pytest

from schemas.action import DiceState
from schemas.player import PlayerState
from engine.dice import roll_dice, handle_jail_roll
from constants.game_rules import GameRules


# ---------------------------------------------------------------------------
# Tests: roll_dice
# ---------------------------------------------------------------------------

class TestRollDice:
    def test_returns_values_in_range(self):
        dice = roll_dice()
        assert 1 <= dice.die1 <= 6
        assert 1 <= dice.die2 <= 6

    def test_total_is_sum(self):
        dice = roll_dice()
        assert dice.total == dice.die1 + dice.die2

    def test_is_double_when_equal(self):
        # Roll many times; at least some should be doubles
        doubles_found = False
        for _ in range(100):
            d = roll_dice()
            if d.die1 == d.die2:
                assert d.is_double is True
                doubles_found = True
            else:
                assert d.is_double is False
        assert doubles_found, "Expected at least one double in 100 rolls"

    def test_doubles_count_defaults_to_zero(self):
        dice = roll_dice()
        assert dice.doubles_count == 0


# ---------------------------------------------------------------------------
# Tests: handle_jail_roll
# ---------------------------------------------------------------------------

class TestHandleJailRoll:
    def _make_player(self, jail_turns: int = 0) -> PlayerState:
        return PlayerState(
            id="p1", name="Test", color="#ff0000",
            money=15000, is_in_jail=True, jail_turns=jail_turns,
        )

    def _make_dice(self, d1: int, d2: int) -> DiceState:
        return DiceState(
            die1=d1, die2=d2, total=d1 + d2,
            is_double=(d1 == d2), doubles_count=0,
        )

    def test_doubles_lets_player_out(self):
        player = self._make_player()
        dice = self._make_dice(3, 3)
        result = handle_jail_roll(player, dice)
        assert result is True
        assert player.is_in_jail is False
        assert player.jail_turns == 0

    def test_non_doubles_keeps_player_in_jail(self):
        player = self._make_player()
        dice = self._make_dice(3, 4)
        result = handle_jail_roll(player, dice)
        assert result is False
        assert player.is_in_jail is True
        assert player.jail_turns == 1

    def test_force_release_on_third_turn(self):
        """Official rules: on 3rd turn, player MUST pay fine and move."""
        player = self._make_player(jail_turns=GameRules.MAX_JAIL_TURNS - 1)
        dice = self._make_dice(3, 4)  # Non-doubles
        result = handle_jail_roll(player, dice)
        assert result is True  # Forced release on 3rd turn (always, not optional)
        assert player.is_in_jail is False
        assert player.jail_turns == 0
