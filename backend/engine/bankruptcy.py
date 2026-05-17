from typing import Optional
from schemas.game import GameState
from schemas.room import RoomStatus

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
        # Transfer properties (avoid duplicates)
        for prop_id in debtor.properties_owned:
            if prop_id not in creditor.properties_owned:
                prop_state = game_state.properties[prop_id]
                prop_state.owner_id = creditor_id
                creditor.properties_owned.append(prop_id)
            
        game_state.add_log(f"{debtor.name} went bankrupt and transferred assets to {creditor.name}")
    else:
        # Return to bank
        for prop_id in debtor.properties_owned:
            prop_state = game_state.properties[prop_id]
            prop_state.owner_id = None
            prop_state.is_mortgaged = False
            prop_state.houses = 0
            prop_state.hotels = 0
            
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
