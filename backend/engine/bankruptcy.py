from typing import Optional, List, Tuple
from schemas.game import GameState
from schemas.room import RoomStatus
from engine.property import get_board_config
from constants.game_rules import GameRules

def declare_bankruptcy(
    game_state: GameState,
    debtor_id: str,
    creditor_id: Optional[str] = None,
    debt_creditors: Optional[List[Tuple[str, int]]] = None,
):
    """
    Handles a player going bankrupt.
    If creditor_id is None, they owe the bank.
    debt_creditors is a list of (creditor_id, amount) tuples for multi-creditor scenarios.
    The first creditor in the list (who first pushed the player into debt) receives assets.
    """
    debtor = game_state.room.players[debtor_id]
    debtor.is_bankrupt = True
    debtor.money = 0

    # Resolve the actual creditor: prefer the first from debt_creditors list,
    # falling back to creditor_id. Skip creditors who left/disconnected.
    actual_creditor_id = creditor_id
    if debt_creditors:
        for cid, _ in debt_creditors:
            c = game_state.room.players.get(cid)
            if c and not c.is_bankrupt and c.connected:
                actual_creditor_id = cid
                break

    if actual_creditor_id:
        creditor = game_state.room.players[actual_creditor_id]
        total_interest = 0
        building_refund = 0
        board_config = get_board_config()

        # Transfer properties (avoid duplicates)
        for prop_id in debtor.properties_owned:
            if prop_id not in creditor.properties_owned:
                prop_state = game_state.properties[prop_id]
                config = board_config.get(prop_id)

                # Refund half of building costs and return to bank supply
                if config and config.get("type") == "property":
                    color = config.get("color")
                    if color:
                        house_price = GameRules.HOUSE_PRICES.get(color, 500)
                        building_refund += prop_state.houses * (house_price // 2)
                        building_refund += prop_state.hotels * (house_price * 5 // 2)

                if prop_state.houses > 0:
                    game_state.houses_remaining += prop_state.houses
                if prop_state.hotels > 0:
                    game_state.hotels_remaining += prop_state.hotels

                prop_state.houses = 0
                prop_state.hotels = 0

                prop_state.owner_id = actual_creditor_id
                creditor.properties_owned.append(prop_id)

                # Calculate 10% interest on mortgaged properties
                if prop_state.is_mortgaged:
                    if config:
                        mortgage_value = config.get("mortgage", 0)
                        interest = int(mortgage_value * 0.1)
                        total_interest += interest

        # Building refund goes to creditor (debtor's money is already 0)
        if building_refund > 0:
            creditor.money += building_refund
            game_state.add_log(f"{creditor.name} received ₹{building_refund} for returned buildings")

        # Auto-deduct interest from creditor (cap at available money to prevent negative balance)
        if total_interest > 0:
            actual_interest = min(total_interest, max(0, creditor.money))
            creditor.money -= actual_interest
            if actual_interest > 0:
                game_state.add_log(f"{creditor.name} paid ₹{actual_interest} interest on mortgaged properties")

        game_state.add_log(f"{debtor.name} went bankrupt and transferred assets to {creditor.name}")
    else:
        # Return to bank - also collect buildings at half price
        building_refund = 0
        board_config = get_board_config()

        for prop_id in debtor.properties_owned:
            prop_state = game_state.properties[prop_id]
            config = board_config.get(prop_id)

            # Refund half of building costs
            if config and config.get("type") == "property":
                color = config.get("color")
                if color:
                    house_price = GameRules.HOUSE_PRICES.get(color, 500)
                    building_refund += prop_state.houses * (house_price // 2)
                    building_refund += prop_state.hotels * (house_price * 5 // 2)

            # Return buildings to bank supply
            if prop_state.houses > 0:
                game_state.houses_remaining += prop_state.houses
            if prop_state.hotels > 0:
                game_state.hotels_remaining += prop_state.hotels

            prop_state.owner_id = None
            prop_state.is_mortgaged = False
            prop_state.houses = 0
            prop_state.hotels = 0

        # Bank gets the building refund (this money goes to the creditor if any, otherwise lost)
        if building_refund > 0:
            game_state.add_log(f"Bank collected ₹{building_refund} from returned buildings")

        game_state.add_log(f"{debtor.name} went bankrupt. Assets returned to the bank.")
        
    debtor.properties_owned = []
    
    # Remove from turn order
    if debtor_id in game_state.turn_order:
        idx = game_state.turn_order.index(debtor_id)
        game_state.turn_order.pop(idx)

        # Adjust current_turn_index if necessary
        if not game_state.turn_order:
            game_state.current_turn_index = 0
        elif idx == game_state.current_turn_index:
            # Bankrupt player WAS the current player — back up by 1 so that
            # the next_turn() increment lands on the correct next player.
            game_state.current_turn_index = (idx - 1) % len(game_state.turn_order)
        elif idx < game_state.current_turn_index:
            game_state.current_turn_index -= 1
            
    # Check if game over (B-05: also filter out disconnected players)
    active_players = [p for p in game_state.room.players.values() if not p.is_bankrupt and p.connected]
    if len(active_players) == 1:
        game_state.room.status = RoomStatus.FINISHED
        game_state.add_log(f"Game Over! {active_players[0].name} wins!")
