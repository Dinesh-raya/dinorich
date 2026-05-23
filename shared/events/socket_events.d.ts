export interface SocketEvents {
  ROOM_CREATED: string;
  ROOM_STATE_UPDATE: string;
  ROOM_JOINED: string;
  GAME_START: string;
  GAME_STATE_UPDATE: string;
  GAME_DICE_RESULT: string;
  GAME_OVER: string;
  AUCTION_START: string;
  AUCTION_STATE_UPDATE: string;
  AUCTION_END: string;
  CARD_RESULT: string;
  TRADE_OFFER: string;
  TRADE_COMPLETED: string;
  TRADE_REJECTED: string;
  TRADE_CANCELLED: string;
  ROOM_KICKED: string;
}
