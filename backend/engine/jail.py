from typing import Optional
from schemas.action import TurnState, TurnPhase
from constants.game_rules import GameRules
from engine.cards import card_engine


def pay_jail_fine(game, turn: TurnState, player_id: str) -> Optional[dict]:
    """Player pays fine to get out of jail."""
    if turn.active_player_id != player_id:
        return None
    if turn.phase != TurnPhase.ROLL:
        return None

    player = game.room.players.get(player_id)
    if not player or not player.is_in_jail:
        return None

    if player.money < GameRules.JAIL_FINE:
        return None

    player.money -= GameRules.JAIL_FINE
    player.is_in_jail = False
    player.jail_turns = 0

    # Add fine to free parking pool if enabled
    if game.room.settings.free_parking_jackpot:
        game.free_parking_pool += GameRules.JAIL_FINE

    game.add_log(f"{player.name} paid ₹{GameRules.JAIL_FINE} fine and got out of jail")

    # After paying fine, player can roll
    turn.can_roll = True
    turn.can_end_turn = False
    turn.phase = TurnPhase.ROLL

    return {"game": game, "turn": turn}


def use_jail_card(game, turn: TurnState, player_id: str) -> Optional[dict]:
    """Player uses Get Out of Jail Free card."""
    if turn.active_player_id != player_id:
        return None
    if turn.phase != TurnPhase.ROLL:
        return None

    player = game.room.players.get(player_id)
    if not player or not player.is_in_jail:
        return None

    if player.get_out_of_jail_cards <= 0:
        return None

    player.get_out_of_jail_cards -= 1
    player.is_in_jail = False
    player.jail_turns = 0

    # Return GOOJF card to the correct deck (standard Monopoly rule)
    source = player.goojf_sources.pop() if player.goojf_sources else "treasury"
    card_engine.return_goojf_card(game, source)

    game.add_log(f"{player.name} used a Get Out of Jail Free card")

    # After using card, player can roll
    turn.can_roll = True
    turn.can_end_turn = False
    turn.phase = TurnPhase.ROLL

    return {"game": game, "turn": turn}
