"""Tests for engine.movement."""
import pytest

from schemas.room import RoomState, RoomSettings, RoomStatus
from schemas.player import PlayerState
from schemas.game import GameState
from engine.movement import move_player, send_to_jail
from constants.game_rules import GameRules


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
    return game


# ---------------------------------------------------------------------------
# Tests: move_player
# ---------------------------------------------------------------------------

class TestMovePlayer:
    def test_normal_move_forward(self):
        game = make_test_game()
        game.room.players["p1"].position = 0
        passed_go = move_player(game, "p1", 7)
        assert game.room.players["p1"].position == 7
        assert passed_go is False

    def test_passing_go_collects_reward(self):
        game = make_test_game()
        game.room.players["p1"].position = 38
        initial_money = game.room.players["p1"].money
        passed_go = move_player(game, "p1", 5)
        # 38 + 5 = 43 % 40 = 3, passed GO
        assert game.room.players["p1"].position == 3
        assert passed_go is True
        assert game.room.players["p1"].money == initial_money + GameRules.GO_REWARD

    def test_not_passing_go_no_reward(self):
        game = make_test_game()
        game.room.players["p1"].position = 5
        initial_money = game.room.players["p1"].money
        passed_go = move_player(game, "p1", 10)
        assert game.room.players["p1"].position == 15
        assert passed_go is False
        assert game.room.players["p1"].money == initial_money

    def test_landing_exactly_on_go_collects_reward(self):
        game = make_test_game()
        game.room.players["p1"].position = 36
        initial_money = game.room.players["p1"].money
        passed_go = move_player(game, "p1", 4)
        # 36 + 4 = 40 % 40 = 0, and 0 < 36 so passed_go = True
        assert game.room.players["p1"].position == 0
        assert passed_go is True
        assert game.room.players["p1"].money == initial_money + GameRules.GO_REWARD

    def test_jail_prevents_movement(self):
        game = make_test_game()
        game.room.players["p1"].is_in_jail = True
        game.room.players["p1"].position = GameRules.JAIL_TILE
        passed_go = move_player(game, "p1", 7)
        assert game.room.players["p1"].position == GameRules.JAIL_TILE
        assert passed_go is False


# ---------------------------------------------------------------------------
# Tests: send_to_jail
# ---------------------------------------------------------------------------

class TestSendToJail:
    def test_sets_position_to_jail_tile(self):
        game = make_test_game()
        game.room.players["p1"].position = 20
        send_to_jail(game, "p1")
        assert game.room.players["p1"].position == GameRules.JAIL_TILE

    def test_sets_is_in_jail_true(self):
        game = make_test_game()
        send_to_jail(game, "p1")
        assert game.room.players["p1"].is_in_jail is True

    def test_resets_jail_turns(self):
        game = make_test_game()
        game.room.players["p1"].jail_turns = 2
        send_to_jail(game, "p1")
        assert game.room.players["p1"].jail_turns == 0

    def test_adds_log_message(self):
        game = make_test_game()
        send_to_jail(game, "p1")
        jail_logs = [log for log in game.history_log if "JAIL" in log]
        assert len(jail_logs) == 1
        assert "Player 1" in jail_logs[0]
