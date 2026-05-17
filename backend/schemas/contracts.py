from pydantic import BaseModel, Field

from schemas.room import RoomSettings


class RoomCreatePayload(BaseModel):
    name: str = Field(default="Player", min_length=1, max_length=30)
    color: str = Field(default="cyan-400", min_length=2, max_length=30)
    is_private: bool = Field(default=False)


class RoomJoinPayload(BaseModel):
    room_code: str = Field(min_length=4, max_length=8)
    name: str = Field(default="Player", min_length=1, max_length=30)
    color: str = Field(default="cyan-400", min_length=2, max_length=30)
    reconnect_token: str | None = None


class RoomUpdateSettingsPayload(BaseModel):
    settings: RoomSettings


class PropertyActionPayload(BaseModel):
    property_id: int = Field(ge=0, le=39)


class AuctionBidPayload(BaseModel):
    amount: int = Field(ge=1, le=10_000_000)

