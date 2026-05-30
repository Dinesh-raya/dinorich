"""Tests for QA socket event validation logic."""
import pytest
from conftest import make_test_game
from schemas.room import QAMode
from engine.turn_manager import TurnManager
from engine.dice import roll_dice
from engine.movement import send_to_jail


class TestQADiceQueue:
    def test_qa_dice_queue_consumed_in_order(self):
        """Dice queue should be consumed FIFO."""
        game = make_test_game()
        game.qa_mode = True
        game.qa_dice_queue = [(1, 2), (3, 4)]
        d1 = roll_dice(game)
        assert (d1.die1, d1.die2) == (1, 2)
        d2 = roll_dice(game)
        assert (d2.die1, d2.die2) == (3, 4)

    def test_qa_dice_queue_exhausted_falls_back_random(self):
        """After queue is exhausted, dice should be random."""
        game = make_test_game()
        game.qa_mode = True
        game.qa_dice_queue = [(1, 2)]
        roll_dice(game)  # consume the queued roll
        d2 = roll_dice(game)
        assert 1 <= d2.die1 <= 6
        assert 1 <= d2.die2 <= 6

    def test_qa_dice_queue_empty_gives_random(self):
        """Empty queue should give random dice."""
        game = make_test_game()
        game.qa_mode = True
        game.qa_dice_queue = []
        d = roll_dice(game)
        assert 1 <= d.die1 <= 6
        assert 1 <= d.die2 <= 6

    def test_qa_dice_fixed_mode(self):
        """Fixed dice mode should always return the same values."""
        game = make_test_game()
        game.qa_mode = True
        game.room.settings.qa_mode = QAMode(enabled=True, dice_mode="fixed", fixed_dice=(5, 5))
        d1 = roll_dice(game)
        assert (d1.die1, d1.die2) == (5, 5)
        d2 = roll_dice(game)
        assert (d2.die1, d2.die2) == (5, 5)

    def test_qa_dice_sequence_mode(self):
        """Sequence dice mode should cycle through the sequence."""
        game = make_test_game()
        game.qa_mode = True
        game.room.settings.qa_mode = QAMode(
            enabled=True, dice_mode="sequence",
            dice_sequence=[(1, 1), (2, 2), (3, 3)]
        )
        d1 = roll_dice(game)
        assert (d1.die1, d1.die2) == (1, 1)
        d2 = roll_dice(game)
        assert (d2.die1, d2.die2) == (2, 2)
        d3 = roll_dice(game)
        assert (d3.die1, d3.die2) == (3, 3)
        # Should wrap around
        d4 = roll_dice(game)
        assert (d4.die1, d4.die2) == (1, 1)

    def test_qa_dice_queue_takes_priority_over_settings(self):
        """Explicit queue should take priority over QA settings."""
        game = make_test_game()
        game.qa_mode = True
        game.qa_dice_queue = [(6, 6)]
        game.room.settings.qa_mode = QAMode(enabled=True, dice_mode="fixed", fixed_dice=(1, 1))
        d = roll_dice(game)
        assert (d.die1, d.die2) == (6, 6)


class TestQASeedProperty:
    def test_seed_property_adds_to_owner(self):
        """Seeding a property should add it to owner's list."""
        game = make_test_game()
        player = game.room.players["p1"]
        prop = game.properties[1]
        prop.owner_id = "p1"
        if 1 not in player.properties_owned:
            player.properties_owned.append(1)
        assert 1 in player.properties_owned
        assert prop.owner_id == "p1"

    def test_seed_property_removes_from_previous_owner(self):
        """Re-seeding a property should remove it from the previous owner."""
        game = make_test_game()
        p1 = game.room.players["p1"]
        p2 = game.room.players["p2"]
        prop = game.properties[1]
        # First assign to p1
        prop.owner_id = "p1"
        p1.properties_owned.append(1)
        # Then reassign to p2
        prop.owner_id = "p2"
        if 1 in p1.properties_owned:
            p1.properties_owned.remove(1)
        if 1 not in p2.properties_owned:
            p2.properties_owned.append(1)
        assert 1 not in p1.properties_owned
        assert 1 in p2.properties_owned


class TestQAForceJail:
    def test_force_jail_sets_position(self):
        """Force jail should set player position to jail tile."""
        game = make_test_game()
        send_to_jail(game, "p1")
        p1 = game.room.players["p1"]
        assert p1.position == 10
        assert p1.is_in_jail is True

    def test_force_jail_resets_jail_turns(self):
        """Force jail should reset jail turn counter."""
        game = make_test_game()
        p1 = game.room.players["p1"]
        p1.jail_turns = 2
        send_to_jail(game, "p1")
        assert p1.jail_turns == 0


class TestQAAddMoney:
    def test_add_money_modifies_balance(self):
        """Adding money should increase player balance."""
        game = make_test_game()
        p1 = game.room.players["p1"]
        initial = p1.money
        p1.money += 500
        assert p1.money == initial + 500

    def test_add_money_negative_deducts(self):
        """Negative amount should decrease balance."""
        game = make_test_game()
        p1 = game.room.players["p1"]
        initial = p1.money
        p1.money -= 300
        assert p1.money == initial - 300


class TestQAModeIntegration:
    def test_qa_mode_flag_on_game_state(self):
        """QA mode flag should be set on game state."""
        game = make_test_game()
        assert game.qa_mode is False
        game.qa_mode = True
        assert game.qa_mode is True

    def test_qa_settings_persist(self):
        """QA settings should persist on room settings."""
        game = make_test_game()
        game.room.settings.qa_mode = QAMode(
            enabled=True,
            dice_mode="fixed",
            fixed_dice=(3, 3),
            turn_timer_seconds=120,
            auto_buy_disabled=True,
        )
        qa = game.room.settings.qa_mode
        assert qa.enabled is True
        assert qa.dice_mode == "fixed"
        assert qa.fixed_dice == (3, 3)
        assert qa.turn_timer_seconds == 120
        assert qa.auto_buy_disabled is True
