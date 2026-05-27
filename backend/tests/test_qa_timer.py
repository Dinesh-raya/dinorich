"""Tests for QA timer override."""
import pytest
from conftest import make_test_game
from engine.turn_manager import TurnManager
from schemas.room import QAMode
from schemas.action import TurnPhase


class TestQATimerOverride:
    def test_qa_timer_override_in_start_game(self):
        """QA timer should override room turn timer when configured."""
        game = make_test_game()
        game.qa_mode = True
        game.room.settings.qa_mode = QAMode(enabled=True, turn_timer_seconds=300)
        game.room.settings.turn_timer_seconds = 60
        tm = TurnManager()
        tm.start_game("TEST01", game)
        turn = tm.get_turn_state("TEST01")
        assert turn.time_remaining == 300

    def test_qa_timer_zero_uses_room_default(self):
        """QA timer of 0 should fall back to room default."""
        game = make_test_game()
        game.qa_mode = True
        game.room.settings.qa_mode = QAMode(enabled=True, turn_timer_seconds=0)
        game.room.settings.turn_timer_seconds = 60
        tm = TurnManager()
        tm.start_game("TEST01", game)
        turn = tm.get_turn_state("TEST01")
        assert turn.time_remaining == 60

    def test_qa_timer_override_in_next_turn(self):
        """QA timer should apply on subsequent turns too."""
        game = make_test_game()
        game.qa_mode = True
        game.room.settings.qa_mode = QAMode(enabled=True, turn_timer_seconds=300)
        game.room.settings.turn_timer_seconds = 60
        tm = TurnManager()
        tm.start_game("TEST01", game)
        new_turn = tm.next_turn("TEST01")
        assert new_turn is not None
        assert new_turn.time_remaining == 300

    def test_no_qa_uses_room_default(self):
        """Without QA mode, room default timer is used."""
        game = make_test_game()
        game.qa_mode = False
        game.room.settings.turn_timer_seconds = 60
        tm = TurnManager()
        tm.start_game("TEST01", game)
        turn = tm.get_turn_state("TEST01")
        assert turn.time_remaining == 60

    def test_auto_buy_disabled_skips_buy_timeout(self):
        """Auto-buy should be skipped when qa auto_buy_disabled is True."""
        game = make_test_game()
        game.qa_mode = True
        game.room.settings.qa_mode = QAMode(enabled=True, auto_buy_disabled=True)
        tm = TurnManager()
        tm.start_game("TEST01", game)
        turn = tm.get_turn_state("TEST01")
        turn.phase = TurnPhase.BUY
        turn.time_remaining = 0
        # Set a buy timer with a cheap property that would normally auto-buy
        player = game.room.players["p1"]
        initial_money = player.money
        tm._timers.set_buy_timer("TEST01", 0, 1)
        result_turn, auto_roll, buy_prop = tm.tick_turn_timer("TEST01")
        assert buy_prop is None
        assert player.money == initial_money

    def test_auto_buy_disabled_no_phase_change(self):
        """Auto-buy disabled should keep turn in BUY phase."""
        game = make_test_game()
        game.qa_mode = True
        game.room.settings.qa_mode = QAMode(enabled=True, auto_buy_disabled=True)
        tm = TurnManager()
        tm.start_game("TEST01", game)
        turn = tm.get_turn_state("TEST01")
        turn.phase = TurnPhase.BUY
        turn.time_remaining = 0
        result_turn, _, _ = tm.tick_turn_timer("TEST01")
        assert result_turn.phase == TurnPhase.BUY
