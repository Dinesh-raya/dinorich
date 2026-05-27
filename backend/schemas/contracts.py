from pydantic import BaseModel, Field, field_validator

from schemas.room import RoomSettings
from utils.input_validation import validate_player_name, validate_room_code, sanitize_player_name


class RoomCreatePayload(BaseModel):
    name: str = Field(default="Player", min_length=1, max_length=20)
    color: str | None = None  # Deprecated - color is auto-assigned
    is_private: bool = Field(default=False)

    @field_validator("name", mode="before")
    @classmethod
    def validate_and_sanitize_name(cls, v: str) -> str:
        if not isinstance(v, str):
            raise ValueError("Name must be a string")
        cleaned = sanitize_player_name(v)
        err = validate_player_name(cleaned)
        if err:
            raise ValueError(err)
        return cleaned


class RoomJoinPayload(BaseModel):
    room_code: str = Field(min_length=5, max_length=5)
    name: str = Field(default="Player", min_length=1, max_length=20)
    color: str | None = None  # Deprecated - color is auto-assigned
    reconnect_token: str | None = None

    @field_validator("room_code", mode="before")
    @classmethod
    def validate_room_code_field(cls, v: str) -> str:
        if not isinstance(v, str):
            raise ValueError("Room code must be a string")
        err = validate_room_code(v)
        if err:
            raise ValueError(err)
        return v.upper().strip()

    @field_validator("name", mode="before")
    @classmethod
    def validate_and_sanitize_name(cls, v: str) -> str:
        if not isinstance(v, str):
            raise ValueError("Name must be a string")
        cleaned = sanitize_player_name(v)
        err = validate_player_name(cleaned)
        if err:
            raise ValueError(err)
        return cleaned


class RoomUpdateSettingsPayload(BaseModel):
    settings: RoomSettings


class PropertyActionPayload(BaseModel):
    property_id: int = Field(ge=0, le=39)


class AuctionBidPayload(BaseModel):
    amount: int = Field(ge=1, le=10_000_000)


class TradeCreatePayload(BaseModel):
    to_player_id: str = Field(min_length=1)
    offering_money: int = Field(default=0, ge=0)
    requesting_money: int = Field(default=0, ge=0)
    offering_properties: list[int] = Field(default_factory=list)
    requesting_properties: list[int] = Field(default_factory=list)
    offering_get_out_of_jail_cards: int = Field(default=0, ge=0)
    requesting_get_out_of_jail_cards: int = Field(default=0, ge=0)

    @field_validator("offering_properties", "requesting_properties", mode="before")
    @classmethod
    def validate_property_ids(cls, v: list[int]) -> list[int]:
        for pid in v:
            if not (0 <= pid <= 39):
                raise ValueError(f"Property ID must be between 0 and 39, got {pid}")
        return v


class TradeActionPayload(BaseModel):
    trade_id: str = Field(min_length=1)


class TradeCounterPayload(BaseModel):
    trade_id: str = Field(min_length=1)
    offering_money: int = Field(default=0, ge=0)
    requesting_money: int = Field(default=0, ge=0)
    offering_properties: list[int] = Field(default_factory=list)
    requesting_properties: list[int] = Field(default_factory=list)
    offering_get_out_of_jail_cards: int = Field(default=0, ge=0)
    requesting_get_out_of_jail_cards: int = Field(default=0, ge=0)

    @field_validator("offering_properties", "requesting_properties", mode="before")
    @classmethod
    def validate_property_ids(cls, v: list[int]) -> list[int]:
        for pid in v:
            if not (0 <= pid <= 39):
                raise ValueError(f"Property ID must be between 0 and 39, got {pid}")
        return v


class KickPlayerPayload(BaseModel):
    target_player_id: str = Field(min_length=1)

