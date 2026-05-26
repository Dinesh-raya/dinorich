from pydantic import BaseModel, Field, field_validator

from schemas.room import RoomSettings


class RoomCreatePayload(BaseModel):
    name: str = Field(default="Player", min_length=1, max_length=30)
    color: str | None = None  # Deprecated - color is auto-assigned
    is_private: bool = Field(default=False)


class RoomJoinPayload(BaseModel):
    room_code: str = Field(min_length=4, max_length=8)
    name: str = Field(default="Player", min_length=1, max_length=30)
    color: str | None = None  # Deprecated - color is auto-assigned
    reconnect_token: str | None = None


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

