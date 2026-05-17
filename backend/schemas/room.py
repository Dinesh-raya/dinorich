from pydantic import BaseModel, Field
from typing import Dict, Optional
from enum import Enum

from schemas.player import PlayerState

class RoomStatus(str, Enum):
    WAITING = "waiting"
    PLAYING = "playing"
    FINISHED = "finished"

class RoomSettings(BaseModel):
    max_players: int = Field(6, ge=1, le=6, description="Maximum players allowed (1-6)")
    starting_cash: int = Field(150000, ge=50000, le=1000000, description="Initial money for each player")
    auction_enabled: bool = Field(True, description="Whether auctions are enabled")
    double_rent_enabled: bool = Field(True, description="Whether double rent applies to monopolies")
    mortgage_enabled: bool = Field(True, description="Whether properties can be mortgaged")
    free_parking_jackpot: bool = Field(False, description="Whether free parking accumulates taxes")
    turn_timer_seconds: int = Field(60, ge=15, le=180, description="Seconds per turn before timeout")
    random_turn_order: bool = Field(True, description="Whether turn order is shuffled")
    jail_strict_mode: bool = Field(True, description="Apply strict jail handling rules")
    bot_support_placeholder: bool = Field(False, description="Reserved config for future bots")
    board_theme: str = Field("pan_india", description="Board theme placeholder")

class RoomState(BaseModel):
    room_id: str = Field(..., description="Unique 4-6 character invite code")
    host_id: str = Field(..., description="Socket ID of the room host")
    is_private: bool = Field(False, description="If true, room should not be listed publicly")
    settings: RoomSettings = Field(default_factory=RoomSettings)
    players: Dict[str, PlayerState] = Field(default_factory=dict, description="Map of socket IDs to PlayerState")
    status: RoomStatus = Field(RoomStatus.WAITING, description="Room status")
