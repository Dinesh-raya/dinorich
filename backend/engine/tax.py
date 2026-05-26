import logging
from typing import Optional
from schemas.action import TurnPhase
from engine.property import get_board_config
from constants.game_rules import GameRules


def pay_tax(game, turn, player_id: str, use_percentage: bool = False) -> Optional[dict]:
    """Player pays tax - either flat amount or 10% of total worth.

    Rules:
    - Luxury Tax (tile 38): flat amount only, no percentage option.
    - Income Tax (tile 4): flat amount or 10% of total worth.
    - If 10% would be <= 0, flat amount is enforced.
    """
    if turn.active_player_id != player_id:
        return None
    if not turn.pending_tax:
        return None

    player = game.room.players.get(player_id)
    if not player:
        return None

    tile_id = turn.pending_tax.get("tile_id")
    flat_amount = turn.pending_tax["amount"]

    # Luxury Tax is flat only
    if tile_id == 38:
        use_percentage = False

    if use_percentage:
        total_worth = player.money
        property_worth = 0
        building_worth = 0
        for prop_id in player.properties_owned:
            prop_state = game.properties.get(prop_id)
            if prop_state:
                if prop_state.is_mortgaged:
                    continue
                config = get_board_config().get(prop_id)
                if config:
                    prop_price = config.get("price", 0)
                    property_worth += prop_price
                    total_worth += prop_price
                    color = config.get("color")
                    if color:
                        house_price = GameRules.HOUSE_PRICES.get(color, 0)
                        b_worth = prop_state.houses * house_price + prop_state.hotels * house_price * GameRules.HOTEL_PRICE_MULTIPLIER
                        building_worth += b_worth
                        total_worth += b_worth
        tax_amount = int(total_worth * 0.1)
        logger = logging.getLogger(__name__)
        logger.info(f"TAX CALC for {player.name}: cash={player.money}, "
                    f"property_worth={property_worth}, building_worth={building_worth}, "
                    f"total_worth={total_worth}, tax_10pct={tax_amount}")
        if tax_amount <= 0:
            tax_amount = flat_amount
            game.add_log(f"{player.name} has negligible worth — paying flat amount ₹{tax_amount:,}")
        else:
            game.add_log(f"{player.name} chose to pay 10% of worth (worth ₹{total_worth:,} → tax ₹{tax_amount:,})")
    else:
        tax_amount = flat_amount
        game.add_log(f"{player.name} paid ₹{tax_amount:,} for {turn.pending_tax['name']}")

    player.money -= tax_amount

    if game.room.settings.free_parking_jackpot:
        game.free_parking_pool += tax_amount

    turn.pending_tax = None

    if player.money < 0:
        turn.in_debt = True
        turn.debt_creditor_id = None
        turn.debt_creditors = []
        turn.can_roll = False
        turn.can_end_turn = False
        turn.phase = TurnPhase.DEBT
        game.add_log(f"{player.name} is in debt (₹{player.money}). Must trade, mortgage, or declare bankruptcy.")
    else:
        turn.can_end_turn = True

    return {"game": game, "turn": turn}
