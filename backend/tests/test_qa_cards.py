"""Tests for QA card override."""
import pytest
from conftest import make_test_game
from engine.cards import card_engine
from schemas.room import QAMode


class TestQACardOverride:
    def test_random_mode_draws_normally(self):
        game = make_test_game()
        card = card_engine.draw_treasury(game, "p1")
        assert card is not None
        assert "action" in card

    def test_top_mode_draws_first_card(self):
        game = make_test_game()
        game.qa_mode = True
        game.room.settings.qa_mode = QAMode(enabled=True, card_mode="top")
        first_card = game.treasury_deck[0]
        card = card_engine.draw_treasury(game, "p1")
        assert card["action"] == first_card["action"]

    def test_index_mode_draws_specific_card(self):
        game = make_test_game()
        game.qa_mode = True
        game.room.settings.qa_mode = QAMode(enabled=True, card_mode="index", card_index=2)
        target_card = game.treasury_deck[2]
        card = card_engine.draw_treasury(game, "p1")
        assert card["action"] == target_card["action"]

    def test_surprise_top_mode(self):
        game = make_test_game()
        game.qa_mode = True
        game.room.settings.qa_mode = QAMode(enabled=True, card_mode="top")
        first_card = game.surprise_deck[0]
        card = card_engine.draw_surprise(game, "p1")
        assert card["action"] == first_card["action"]

    def test_surprise_index_mode(self):
        game = make_test_game()
        game.qa_mode = True
        game.room.settings.qa_mode = QAMode(enabled=True, card_mode="index", card_index=3)
        target_card = game.surprise_deck[3]
        card = card_engine.draw_surprise(game, "p1")
        assert card["action"] == target_card["action"]

    def test_index_wraps_around_deck(self):
        game = make_test_game()
        game.qa_mode = True
        deck_len = len(game.treasury_deck)
        game.room.settings.qa_mode = QAMode(enabled=True, card_mode="index", card_index=deck_len + 5)
        expected_idx = (deck_len + 5) % deck_len
        expected_card = game.treasury_deck[expected_idx]
        card = card_engine.draw_treasury(game, "p1")
        assert card["action"] == expected_card["action"]
