import secrets
from schemas.action import DiceState
from schemas.game import GameState
from schemas.player import PlayerState
from constants.game_rules import GameRules

def roll_dice() -> DiceState:
    """Cryptographically secure dice roll."""
    die1 = secrets.choice(range(1, 7))
    die2 = secrets.choice(range(1, 7))
    return DiceState(
        die1=die1,
        die2=die2,
        total=die1 + die2,
        is_double=(die1 == die2),
        doubles_count=0  # Handled by TurnManager
    )

def handle_jail_roll(player: PlayerState, dice: DiceState, strict_mode: bool = False) -> bool:
    """
    Returns True if player escaped jail via doubles.
    Official rules: on 3rd turn, if no doubles, MUST pay fine and move.
    """
    if dice.is_double:
        player.is_in_jail = False
        player.jail_turns = 0
        return True

    player.jail_turns += 1

    # Official rules: forced release on 3rd turn (pay fine + move)
    if player.jail_turns >= GameRules.MAX_JAIL_TURNS:
        player.is_in_jail = False
        player.jail_turns = 0
        return True

    return False
