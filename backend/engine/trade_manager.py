from typing import Dict, Optional, List
from schemas.game import GameState
from schemas.player import PlayerState
import uuid

class TradeOffer:
    def __init__(self, trade_id: str, from_player_id: str, to_player_id: str,
                 offering_money: int = 0, requesting_money: int = 0,
                 offering_properties: List[int] = None, requesting_properties: List[int] = None,
                 offering_get_out_of_jail_cards: int = 0, requesting_get_out_of_jail_cards: int = 0):
        self.trade_id = trade_id
        self.from_player_id = from_player_id
        self.to_player_id = to_player_id
        self.offering_money = offering_money
        self.requesting_money = requesting_money
        self.offering_properties = offering_properties or []
        self.requesting_properties = requesting_properties or []
        self.offering_get_out_of_jail_cards = offering_get_out_of_jail_cards
        self.requesting_get_out_of_jail_cards = requesting_get_out_of_jail_cards
        self.status = "pending"  # pending, accepted, rejected, cancelled

class TradeManager:
    def __init__(self):
        self.active_trades: Dict[str, TradeOffer] = {}  # trade_id -> TradeOffer
        self.player_trades: Dict[str, List[str]] = {}  # player_id -> [trade_ids]

    def create_trade(self, game: GameState, from_player_id: str, to_player_id: str,
                     offering_money: int = 0, requesting_money: int = 0,
                     offering_properties: List[int] = None, requesting_properties: List[int] = None,
                     offering_get_out_of_jail_cards: int = 0,
                     requesting_get_out_of_jail_cards: int = 0) -> Optional[TradeOffer]:
        """Create a new trade offer."""
        # Validate players
        if from_player_id not in game.room.players or to_player_id not in game.room.players:
            return None

        from_player = game.room.players[from_player_id]
        to_player = game.room.players[to_player_id]

        # Check if either player is bankrupt
        if from_player.is_bankrupt or to_player.is_bankrupt:
            return None

        # Validate money (must be non-negative and player must have enough)
        if offering_money < 0 or requesting_money < 0:
            return None
        if from_player.money < offering_money:
            return None
        if to_player.money < requesting_money:
            return None

        # Validate properties
        for prop_id in offering_properties or []:
            if prop_id not in from_player.properties_owned:
                return None
            prop_state = game.properties.get(prop_id)
            if prop_state and (prop_state.houses > 0 or prop_state.hotels > 0):
                return None  # Cannot trade properties with buildings

        for prop_id in requesting_properties or []:
            if prop_id not in to_player.properties_owned:
                return None
            prop_state = game.properties.get(prop_id)
            if prop_state and (prop_state.houses > 0 or prop_state.hotels > 0):
                return None  # Cannot trade properties with buildings

        # Validate Get Out of Jail Free cards
        if offering_get_out_of_jail_cards > 0 and from_player.get_out_of_jail_cards < offering_get_out_of_jail_cards:
            return None
        if requesting_get_out_of_jail_cards > 0 and to_player.get_out_of_jail_cards < requesting_get_out_of_jail_cards:
            return None

        # Create trade
        trade_id = str(uuid.uuid4())[:8]
        trade = TradeOffer(
            trade_id=trade_id,
            from_player_id=from_player_id,
            to_player_id=to_player_id,
            offering_money=offering_money,
            requesting_money=requesting_money,
            offering_properties=offering_properties or [],
            requesting_properties=requesting_properties or [],
            offering_get_out_of_jail_cards=offering_get_out_of_jail_cards,
            requesting_get_out_of_jail_cards=requesting_get_out_of_jail_cards
        )

        self.active_trades[trade_id] = trade

        # Track trades per player
        if from_player_id not in self.player_trades:
            self.player_trades[from_player_id] = []
        if to_player_id not in self.player_trades:
            self.player_trades[to_player_id] = []

        self.player_trades[from_player_id].append(trade_id)
        self.player_trades[to_player_id].append(trade_id)

        return trade

    def accept_trade(self, game: GameState, trade_id: str, player_id: str) -> bool:
        """Accept a trade offer."""
        trade = self.active_trades.get(trade_id)
        if not trade or trade.status != "pending":
            return False

        # Only the recipient can accept
        if trade.to_player_id != player_id:
            return False

        from_player = game.room.players[trade.from_player_id]
        to_player = game.room.players[trade.to_player_id]

        # Final validation
        if from_player.money < trade.offering_money:
            return False
        if to_player.money < trade.requesting_money:
            return False

        # Check properties still owned
        for prop_id in trade.offering_properties:
            if prop_id not in from_player.properties_owned:
                return False

        for prop_id in trade.requesting_properties:
            if prop_id not in to_player.properties_owned:
                return False

        # Validate Get Out of Jail Free cards still available
        if trade.offering_get_out_of_jail_cards > 0 and from_player.get_out_of_jail_cards < trade.offering_get_out_of_jail_cards:
            return False
        if trade.requesting_get_out_of_jail_cards > 0 and to_player.get_out_of_jail_cards < trade.requesting_get_out_of_jail_cards:
            return False

        # Execute trade
        # Transfer money
        from_player.money -= trade.offering_money
        to_player.money += trade.offering_money
        to_player.money -= trade.requesting_money
        from_player.money += trade.requesting_money

        # Transfer properties
        for prop_id in trade.offering_properties:
            from_player.properties_owned.remove(prop_id)
            to_player.properties_owned.append(prop_id)
            game.properties[prop_id].owner_id = trade.to_player_id

        for prop_id in trade.requesting_properties:
            to_player.properties_owned.remove(prop_id)
            from_player.properties_owned.append(prop_id)
            game.properties[prop_id].owner_id = trade.from_player_id

        # Transfer get out of jail cards (with source tracking)
        for _ in range(trade.offering_get_out_of_jail_cards):
            from_player.get_out_of_jail_cards -= 1
            to_player.get_out_of_jail_cards += 1
            source = from_player.goojf_sources.pop() if from_player.goojf_sources else "treasury"
            to_player.goojf_sources.append(source)
        for _ in range(trade.requesting_get_out_of_jail_cards):
            to_player.get_out_of_jail_cards -= 1
            from_player.get_out_of_jail_cards += 1
            source = to_player.goojf_sources.pop() if to_player.goojf_sources else "treasury"
            from_player.goojf_sources.append(source)

        trade.status = "accepted"
        game.add_log(f"{from_player.name} and {to_player.name} completed a trade")

        # Cleanup
        self._cleanup_trade(trade_id)

        return True

    def reject_trade(self, trade_id: str, player_id: str) -> bool:
        """Reject a trade offer."""
        trade = self.active_trades.get(trade_id)
        if not trade or trade.status != "pending":
            return False

        # Only the recipient can reject
        if trade.to_player_id != player_id:
            return False

        trade.status = "rejected"
        self._cleanup_trade(trade_id)

        return True

    def cancel_trade(self, trade_id: str, player_id: str) -> bool:
        """Cancel a trade offer (by the initiator)."""
        trade = self.active_trades.get(trade_id)
        if not trade or trade.status != "pending":
            return False

        # Only the initiator can cancel
        if trade.from_player_id != player_id:
            return False

        trade.status = "cancelled"
        self._cleanup_trade(trade_id)

        return True

    def _cleanup_trade(self, trade_id: str):
        """Remove trade from tracking."""
        trade = self.active_trades.get(trade_id)
        if trade:
            if trade.from_player_id in self.player_trades:
                self.player_trades[trade.from_player_id] = [
                    tid for tid in self.player_trades[trade.from_player_id] if tid != trade_id
                ]
            if trade.to_player_id in self.player_trades:
                self.player_trades[trade.to_player_id] = [
                    tid for tid in self.player_trades[trade.to_player_id] if tid != trade_id
                ]
            del self.active_trades[trade_id]

    def get_player_trades(self, player_id: str) -> List[TradeOffer]:
        """Get all active trades for a player."""
        trade_ids = self.player_trades.get(player_id, [])
        return [self.active_trades[tid] for tid in trade_ids if tid in self.active_trades]

    def get_trade(self, trade_id: str) -> Optional[TradeOffer]:
        """Get a specific trade."""
        return self.active_trades.get(trade_id)

# Global trade manager instance
trade_manager = TradeManager()
