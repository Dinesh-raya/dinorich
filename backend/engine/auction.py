from typing import Dict, Optional
from schemas.action import AuctionState
from schemas.game import GameState
from engine.property import get_board_config, buy_property
from constants.game_rules import GameRules

class AuctionManager:
    def __init__(self):
        self.auctions: Dict[str, AuctionState] = {}
        
    def start_auction(self, room_code: str, property_id: int, participants: list[str]) -> Optional[AuctionState]:
        config = get_board_config().get(property_id)
        if not config:
            return None
            
        initial_bid = int(config.get("price", 0) * 0.1) # Minimum 10% of price
        if initial_bid == 0:
            initial_bid = 10
            
        auction = AuctionState(
            property_id=property_id,
            highest_bidder_id=None,
            current_bid=initial_bid,
            time_remaining=GameRules.AUCTION_TIMER,
            active=True,
            participants=participants
        )
        self.auctions[room_code] = auction
        return auction
        
    def get_auction(self, room_code: str) -> Optional[AuctionState]:
        return self.auctions.get(room_code)
        
    def place_bid(self, room_code: str, player_id: str, bid_amount: int, player_money: int, is_bankrupt: bool = False) -> tuple[bool, str]:
        auction = self.auctions.get(room_code)
        if not auction or not auction.active:
            return False, "No active auction"

        if is_bankrupt:
            return False, "Bankrupt players cannot bid"

        if player_id not in auction.participants:
            return False, "You are not participating in this auction"

        if player_money < bid_amount:
            return False, "Not enough money to bid"
            
        if bid_amount <= auction.current_bid and auction.highest_bidder_id is not None:
            return False, "Bid must be higher than current bid"
            
        if bid_amount < auction.current_bid:
            return False, "Bid must be at least the starting bid"
            
        auction.highest_bidder_id = player_id
        auction.current_bid = bid_amount
        # Reset timer on new bid to prevent sniping
        auction.time_remaining = max(auction.time_remaining, GameRules.AUCTION_TIMER)
        
        return True, "Bid placed successfully"
        
    def end_auction(self, room_code: str, game_state: GameState) -> tuple[bool, str]:
        auction = self.auctions.get(room_code)
        if not auction or not auction.active:
            return False, "No active auction"

        auction.active = False

        if auction.highest_bidder_id:
            player = game_state.room.players[auction.highest_bidder_id]

            # Re-check bidder still connected
            if not player.connected:
                config = get_board_config().get(auction.property_id)
                name = config['name'] if config else f"Property {auction.property_id}"
                game_state.add_log(f"{player.name} disconnected during auction for {name} - no sale")
                return True, "Auction ended - winner disconnected"

            # Re-check bidder still valid
            if player.is_bankrupt:
                config = get_board_config().get(auction.property_id)
                name = config['name'] if config else f"Property {auction.property_id}"
                game_state.add_log(f"{player.name} went bankrupt during auction for {name} - no sale")
                return True, "Auction ended - winner went bankrupt"

            if player.money < auction.current_bid:
                config = get_board_config().get(auction.property_id)
                name = config['name'] if config else f"Property {auction.property_id}"
                game_state.add_log(f"{player.name} cannot afford auction bid of ₹{auction.current_bid} for {name} - no sale")
                return True, "Auction ended - bidder cannot afford"

            player.money -= auction.current_bid
            prop_state = game_state.properties[auction.property_id]
            prop_state.owner_id = auction.highest_bidder_id
            player.properties_owned.append(auction.property_id)

            config = get_board_config().get(auction.property_id)
            game_state.add_log(
                f"{player.name} won the auction for {config['name']} for ₹{auction.current_bid}"
            )
            return True, f"Auction won by {player.name}"
        else:
            config = get_board_config().get(auction.property_id)
            name = config['name'] if config else f"Property {auction.property_id}"
            game_state.add_log(f"No one bid on {name}")
            return True, "Auction ended with no bids"

    def tick(self, room_code: str) -> Optional[AuctionState]:
        auction = self.auctions.get(room_code)
        if not auction or not auction.active:
            return None
        auction.time_remaining = max(0, auction.time_remaining - 1)
        return auction

    def cleanup_room(self, room_code: str):
        """Remove all auction state for a room from memory."""
        self.auctions.pop(room_code, None)

auction_manager = AuctionManager()
