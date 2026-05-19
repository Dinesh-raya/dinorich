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
    In non-strict mode: after MAX_JAIL_TURNS failed attempts, player is forced out.
    In strict mode: player must roll doubles, pay fine, or use card - no auto-release.
    """
    if dice.is_double:
        player.is_in_jail = False
        player.jail_turns = 0
        return True

    player.jail_turns += 1

    # In non-strict mode, force release after MAX_JAIL_TURNS failed attempts
    if not strict_mode and player.jail_turns >= GameRules.MAX_JAIL_TURNS:
        player.is_in_jail = False
        player.jail_turns = 0
        return True

    return False
