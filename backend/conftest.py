"""Shared test helpers for backend tests."""
import copy

from schemas.room import RoomState, RoomSettings, RoomStatus
from schemas.player import PlayerState
from schemas.game import GameState, PropertyState


def make_player(pid: str, name: str, money: int = 1500, color: str = "#ff0000", **kwargs) -> PlayerState:
    """Create a PlayerState with sensible defaults."""
    return PlayerState(id=pid, name=name, color=color, money=money, **kwargs)


def make_test_game(num_players: int = 2) -> GameState:
    """Create a minimal GameState with all board properties and card decks registered."""
    settings = RoomSettings()
    preset_colors = ["#ff0000", "#0000ff", "#00ff00", "#ffff00", "#ff00ff", "#00ffff"]
    players = {}
    for i in range(num_players):
        pid = f"p{i + 1}"
        players[pid] = make_player(pid, f"Player {i + 1}", color=preset_colors[i % len(preset_colors)])
    room = RoomState(
        room_id="TEST01",
        host_id="p1",
        status=RoomStatus.PLAYING,
        players=players,
        settings=settings,
    )
    game = GameState(room=room)
    game.turn_order = [f"p{i + 1}" for i in range(num_players)]
    # Register all board properties so color group lookups work
    from engine.property import get_board_config
    for tile_id, config in get_board_config().items():
        if config.get("type") in ("property", "airport", "utility"):
            game.properties[tile_id] = PropertyState(tile_id=tile_id)
    # Populate card decks so tests don't fail on empty decks
    from engine.cards import TREASURY_CARDS_TEMPLATE, SURPRISE_CARDS_TEMPLATE
    game.treasury_deck = copy.deepcopy(TREASURY_CARDS_TEMPLATE)
    game.surprise_deck = copy.deepcopy(SURPRISE_CARDS_TEMPLATE)
    return game
