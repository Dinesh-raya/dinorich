from schemas.player import PlayerState
from schemas.game import GameState
from constants.game_rules import GameRules

def move_player(game_state: GameState, player_id: str, spaces: int) -> bool:
    """
    Moves player forward by `spaces`.
    Returns True if player passed GO.
    """
    player = game_state.room.players[player_id]

    # Don't move if in jail
    if player.is_in_jail:
        return False

    old_position = player.position
    new_position = (old_position + spaces) % GameRules.BOARD_SIZE

    player.position = new_position

    passed_go = new_position < old_position
    if passed_go:
        if new_position == 0:
            # Landed exactly on GO — bonus reward
            player.money += GameRules.GO_LANDING_REWARD
            game_state.add_log(f"{player.name} landed on GO and collected ₹{GameRules.GO_LANDING_REWARD}")
        else:
            # Just passed GO
            player.money += GameRules.GO_REWARD
            game_state.add_log(f"{player.name} passed GO and collected ₹{GameRules.GO_REWARD}")

    game_state.add_log(f"{player.name} moved to tile {new_position}")

    return passed_go

def send_to_jail(game_state: GameState, player_id: str):
    """Sends a player directly to jail without passing GO."""
    player = game_state.room.players[player_id]
    player.position = GameRules.JAIL_TILE
    player.is_in_jail = True
    player.jail_turns = 0
    game_state.add_log(f"{player.name} was sent to JAIL!")
