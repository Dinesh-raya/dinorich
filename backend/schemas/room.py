from pydantic import BaseModel, Field
from typing import Dict, List, Optional, Tuple
from enum import Enum

from schemas.player import PlayerState

class RoomStatus(str, Enum):
    WAITING = "waiting"
    PLAYING = "playing"
    FINISHED = "finished"

class GameMode(str, Enum):
    CLASSIC = "classic"
    CASUAL = "casual"
    COMPETITIVE = "competitive"
    TURBO = "turbo"
    CHAOS = "chaos"

class QAMode(BaseModel):
    enabled: bool = Field(False, description="Whether QA mode is active for this room")
    dice_mode: str = Field("random", description="Dice mode: random, sequence, or fixed")
    dice_sequence: List[Tuple[int, int]] = Field(default_factory=list, description="Pre-set dice rolls for sequence mode")
    fixed_dice: Tuple[int, int] = Field((3, 4), description="Fixed dice values for fixed mode")
    card_mode: str = Field("random", description="Card mode: random, top, or index")
    card_index: int = Field(0, description="Card index for index mode")
    turn_timer_seconds: int = Field(0, ge=0, le=600, description="QA timer override (0 = use room default)")
    auto_buy_disabled: bool = Field(False, description="Disable auto-buy on timeout")

class RoomSettings(BaseModel):
    max_players: int = Field(6, ge=2, le=6, description="Maximum players allowed (2-6)")
    starting_cash: int = Field(15000, ge=5000, le=100000, description="Initial money for each player")
    auction_enabled: bool = Field(True, description="Whether auctions are enabled")
    double_rent_enabled: bool = Field(True, description="Whether double rent applies to monopolies")
    mortgage_enabled: bool = Field(True, description="Whether properties can be mortgaged")
    free_parking_jackpot: bool = Field(False, description="Whether free parking accumulates taxes")
    turn_timer_seconds: int = Field(60, ge=15, le=180, description="Seconds per turn before timeout")
    random_turn_order: bool = Field(True, description="Whether turn order is shuffled")
    jail_strict_mode: bool = Field(True, description="Apply strict jail handling rules")
    board_theme: str = Field("pan_india", description="Board theme placeholder")
    mode: GameMode = Field(GameMode.CLASSIC, description="Game mode preset (descriptive only — does not auto-override settings)")
    disconnect_timeout_seconds: int = Field(120, ge=30, le=300, description="Seconds before disconnected player is bankrupted")
    game_paused: bool = Field(False, description="Whether the game is currently paused")
    qa_mode: QAMode = Field(default_factory=QAMode, description="QA testing mode settings")

    @staticmethod
    def get_mode_preset(mode: GameMode) -> dict:
        return {
            GameMode.CLASSIC: {},
            GameMode.CASUAL: dict(
                double_rent_enabled=False,
                free_parking_jackpot=True,
                jail_strict_mode=False,
                turn_timer_seconds=90,
            ),
            GameMode.COMPETITIVE: dict(
                double_rent_enabled=True,
                turn_timer_seconds=45,
            ),
            GameMode.TURBO: dict(
                starting_cash=10000,
                turn_timer_seconds=30,
            ),
            GameMode.CHAOS: dict(
                starting_cash=50000,
                free_parking_jackpot=True,
                double_rent_enabled=False,
                turn_timer_seconds=120,
                auction_enabled=False,
                jail_strict_mode=False,
            ),
        }.get(mode, {})

class RoomState(BaseModel):
    room_id: str = Field(..., description="Unique 4-6 character invite code")
    host_id: str = Field(..., description="Session ID of the room host")
    is_private: bool = Field(False, description="If true, room should not be listed publicly")
    settings: RoomSettings = Field(default_factory=RoomSettings)
    players: Dict[str, PlayerState] = Field(default_factory=dict, description="Map of session IDs to PlayerState")
    status: RoomStatus = Field(RoomStatus.WAITING, description="Room status")
