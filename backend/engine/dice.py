import secrets
from typing import Optional
from schemas.action import DiceState
from schemas.game import GameState
from schemas.player import PlayerState
from constants.game_rules import GameRules


def roll_dice(game_state: Optional[GameState] = None) -> DiceState:
    """Roll two six-sided dice. Supports QA mode overrides."""
    die1 = die2 = None

    # 1. Check explicit queue (qa:set_dice pushes here)
    if game_state and game_state.qa_dice_queue:
        die1, die2 = game_state.qa_dice_queue.pop(0)
    # 2. Check QA mode settings
    elif game_state and game_state.qa_mode:
        qa = game_state.room.settings.qa_mode
        if qa.dice_mode == "fixed":
            die1, die2 = qa.fixed_dice
        elif qa.dice_mode == "sequence" and qa.dice_sequence:
            idx = game_state.qa_dice_index % len(qa.dice_sequence)
            die1, die2 = qa.dice_sequence[idx]
            game_state.qa_dice_index += 1

    # 3. Random fallback
    if die1 is None:
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
