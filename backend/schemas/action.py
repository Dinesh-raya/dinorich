from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Tuple
from enum import Enum

class TurnPhase(str, Enum):
    ROLL = "roll"
    ACTION = "action"
    BUY = "buy"
    AUCTION = "auction"
    DEBT = "debt"
    END = "end"

class DiceState(BaseModel):
    die1: int = Field(1, description="Value of first die (1-6)")
    die2: int = Field(1, description="Value of second die (1-6)")
    total: int = Field(2, description="Sum of both dice")
    is_double: bool = Field(False, description="Whether the dice rolled a double")
    doubles_count: int = Field(0, description="Consecutive doubles rolled by active player")

class TurnState(BaseModel):
    active_player_id: str = Field(..., description="Socket ID of the player whose turn it is")
    phase: TurnPhase = Field(TurnPhase.ROLL, description="Phase of turn")
    can_roll: bool = Field(True, description="Whether the active player can roll the dice")
    can_end_turn: bool = Field(False, description="Whether the active player can end their turn")
    time_remaining: int = Field(60, description="Seconds remaining in turn")
    in_debt: bool = Field(False, description="Whether the active player is in negative balance")
    debt_creditor_id: Optional[str] = Field(None, description="Player ID to whom debt is owed (None if bank)")
    debt_creditors: List[Tuple[str, int]] = Field(default_factory=list, description="List of (creditor_id, amount) tuples tracking all creditors in order")
    pending_tax: Optional[Dict] = Field(None, description="Pending tax info: {amount, name, tile_id}")

class AuctionState(BaseModel):
    property_id: int = Field(..., description="ID of the tile being auctioned")
    highest_bidder_id: Optional[str] = Field(None, description="Socket ID of highest bidder")
    current_bid: int = Field(0, description="Current highest bid amount")
    time_remaining: int = Field(9, description="Seconds remaining in auction")
    active: bool = Field(False, description="Whether an auction is currently running")
    participants: List[str] = Field(default_factory=list, description="IDs of players eligible to bid")
