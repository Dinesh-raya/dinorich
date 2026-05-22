from typing import Optional
from schemas.game import GameState
from schemas.room import RoomStatus
from engine.property import get_board_config
from constants.game_rules import GameRules

def declare_bankruptcy(game_state: GameState, debtor_id: str, creditor_id: Optional[str] = None):
    """
    Handles a player going bankrupt.
    If creditor_id is None, they owe the bank.
    """
    debtor = game_state.room.players[debtor_id]
    debtor.is_bankrupt = True
    debtor.money = 0

    if creditor_id:
        creditor = game_state.room.players[creditor_id]
        total_interest = 0

        # Transfer properties (avoid duplicates)
        for prop_id in debtor.properties_owned:
            if prop_id not in creditor.properties_owned:
                prop_state = game_state.properties[prop_id]
                prop_state.owner_id = creditor_id
                creditor.properties_owned.append(prop_id)

                # Calculate 10% interest on mortgaged properties
                if prop_state.is_mortgaged:
                    config = get_board_config().get(prop_id)
                    if config:
                        mortgage_value = config.get("mortgage", 0)
                        interest = int(mortgage_value * 0.1)
                        total_interest += interest

        # Auto-deduct interest from creditor
        if total_interest > 0:
            creditor.money -= total_interest
            game_state.add_log(f"{creditor.name} paid ₹{total_interest} interest on mortgaged properties")

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
                    house_price = GameRules.HOUSE_PRICES.get(color, 50000)
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
        if game_state.current_turn_index >= len(game_state.turn_order):
            game_state.current_turn_index = 0
        elif game_state.current_turn_index > idx:
            game_state.current_turn_index -= 1
            
    # Check if game over
    active_players = [p for p in game_state.room.players.values() if not p.is_bankrupt]
    if len(active_players) == 1:
        game_state.room.status = RoomStatus.FINISHED
        game_state.add_log(f"Game Over! {active_players[0].name} wins!")
