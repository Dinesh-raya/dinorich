from pydantic import BaseModel, Field
from typing import Dict, List, Optional, Tuple
from schemas.room import RoomState

class PropertyState(BaseModel):
    tile_id: int = Field(..., description="The ID of the tile")
    owner_id: Optional[str] = Field(None, description="Socket ID of the owner")
    is_mortgaged: bool = Field(False, description="Whether the property is currently mortgaged")
    houses: int = Field(0, description="Number of houses built (future-proofing)")
    hotels: int = Field(0, description="Number of hotels built (future-proofing)")

MAX_HISTORY_LOG_SIZE = 100

class GameState(BaseModel):
    room: RoomState
    properties: Dict[int, PropertyState] = Field(default_factory=dict, description="State of all buyable properties")
    turn_order: List[str] = Field(default_factory=list, description="Ordered list of player IDs")
    current_turn_index: int = Field(0, description="Index in turn_order of the active player")
    free_parking_pool: int = Field(0, description="Accumulated taxes for free parking jackpot")
    history_log: List[str] = Field(default_factory=list, description="Chronological log of game events")
    state_version: int = Field(0, exclude=True, description="Incremented on every state mutation")
    treasury_deck: List[Dict] = Field(default_factory=list, description="Treasury card deck for this game")
    surprise_deck: List[Dict] = Field(default_factory=list, description="Surprise card deck for this game")
    houses_remaining: int = Field(32, description="Houses remaining in the bank supply")
    hotels_remaining: int = Field(12, description="Hotels remaining in the bank supply")
    qa_dice_queue: List[Tuple[int, int]] = Field(default_factory=list, description="Queued dice rolls for QA mode", exclude=True)
    qa_dice_index: int = Field(0, description="Current index in QA dice sequence", exclude=True)
    qa_mode: bool = Field(False, description="Whether this game has QA mode enabled")

    def add_log(self, message: str):
        """Add a history log entry and cap the log size."""
        self.history_log.append(message)
        if len(self.history_log) > MAX_HISTORY_LOG_SIZE:
            self.history_log = self.history_log[-MAX_HISTORY_LOG_SIZE:]
        self.state_version += 1

    def bump_version(self):
        """Increment state version to signal a state change."""
        self.state_version += 1
