from pydantic import BaseModel, Field
from typing import Optional, List

class PlayerState(BaseModel):
    id: str = Field(..., description="Unique socket ID or session ID for the player")
    session_id: Optional[str] = Field(None, description="Stable session identity for reconnect")
    reconnect_token: Optional[str] = Field(None, exclude=True, description="Rotating token used for secure reconnect")
    name: str = Field(..., min_length=1, max_length=30, description="Display name of the player")
    position: int = Field(0, ge=0, le=39, description="Current tile index 0-39")
    money: int = Field(500000, ge=-10_000_000, le=100_000_000, description="Current balance in ₹")
    is_in_jail: bool = Field(False, description="Whether the player is currently in jail")
    jail_turns: int = Field(0, ge=0, le=100, description="Number of turns spent in jail")
    get_out_of_jail_cards: int = Field(0, description="Number of Get Out of Jail Free cards owned")
    goojf_sources: List[str] = Field(default_factory=list, description="Source deck for each GOOJF card ('treasury' or 'surprise')")
    is_bankrupt: bool = Field(False, description="Whether the player is bankrupt and eliminated")
    properties_owned: List[int] = Field(default_factory=list, description="List of tile IDs owned by the player")
    connected: bool = Field(True, description="Whether the player is currently connected")
    color: str = Field(..., min_length=2, max_length=30, description="Hex color or color name for the player's token")
