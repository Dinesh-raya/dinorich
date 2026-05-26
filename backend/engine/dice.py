import secrets
from schemas.action import DiceState
from schemas.game import GameState
from schemas.player import PlayerState
from constants.game_rules import GameRules

def roll_dice() -> DiceState:
    """Roll two six-sided dice using cryptographically secure random."""
    die1 = secrets.randbelow(6) + 1
    die2 = secrets.randbelow(6) + 1
    return DiceState(
        die1=die1,
        die2=die2,
        total=die1 + die2,
        is_double=(die1 == die2),
        doubles_count=0  # Handled by TurnManager
    )

def handle_jail_roll(player: PlayerState, dice: DiceState) -> bool:
    """
    Returns True if player escaped jail via doubles or was forced out on 3rd turn.
    Official rules: on 3rd turn, player MUST pay fine and move (no doubles attempt).

    Turn numbering: jail_turns starts at 0 when sent to jail.
    - jail_turns == 0 → 1st turn in jail  (try doubles)
    - jail_turns == 1 → 2nd turn in jail  (try doubles)
    - jail_turns == 2 → 3rd turn in jail  (forced pay + move)
    """
    # Official rules: 3rd turn in jail forces release — no doubles attempt
    if player.jail_turns >= GameRules.MAX_JAIL_TURNS - 1:
        player.is_in_jail = False
        player.jail_turns = 0
        return True

    # Turns 1-2: escape via doubles
    if dice.is_double:
        player.is_in_jail = False
        player.jail_turns = 0
        return True

    player.jail_turns += 1
    return False
