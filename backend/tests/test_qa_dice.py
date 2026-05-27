"""Tests for QA dice override."""
import pytest
from conftest import make_test_game
from engine.dice import roll_dice
from schemas.room import QAMode


class TestQADiceOverride:
    def test_random_mode_returns_random(self):
        game = make_test_game()
        dice = roll_dice(game)
        assert 1 <= dice.die1 <= 6
        assert 1 <= dice.die2 <= 6

    def test_fixed_mode_returns_fixed_values(self):
        game = make_test_game()
        game.qa_mode = True
        game.room.settings.qa_mode = QAMode(enabled=True, dice_mode="fixed", fixed_dice=(2, 5))
        dice = roll_dice(game)
        assert dice.die1 == 2
        assert dice.die2 == 5
        assert dice.total == 7
        assert dice.is_double is False

    def test_fixed_mode_double_detection(self):
        game = make_test_game()
        game.qa_mode = True
        game.room.settings.qa_mode = QAMode(enabled=True, dice_mode="fixed", fixed_dice=(3, 3))
        dice = roll_dice(game)
        assert dice.is_double is True

    def test_sequence_mode_cycles_through(self):
        game = make_test_game()
        game.qa_mode = True
        game.room.settings.qa_mode = QAMode(
            enabled=True, dice_mode="sequence",
            dice_sequence=[(1, 2), (3, 4), (5, 6)]
        )
        d1 = roll_dice(game)
        assert (d1.die1, d1.die2) == (1, 2)
        d2 = roll_dice(game)
        assert (d2.die1, d2.die2) == (3, 4)
        d3 = roll_dice(game)
        assert (d3.die1, d3.die2) == (5, 6)
        # Wraps around
        d4 = roll_dice(game)
        assert (d4.die1, d4.die2) == (1, 2)

    def test_queue_takes_priority_over_mode(self):
        game = make_test_game()
        game.qa_mode = True
        game.room.settings.qa_mode = QAMode(enabled=True, dice_mode="fixed", fixed_dice=(2, 2))
        game.qa_dice_queue = [(6, 1)]
        dice = roll_dice(game)
        assert (dice.die1, dice.die2) == (6, 1)
        # Queue consumed, falls back to fixed
        dice2 = roll_dice(game)
        assert (dice2.die1, dice2.die2) == (2, 2)

    def test_none_game_state_returns_random(self):
        dice = roll_dice(None)
        assert 1 <= dice.die1 <= 6
        assert 1 <= dice.die2 <= 6
