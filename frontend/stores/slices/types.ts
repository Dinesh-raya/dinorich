export interface Player {
  id: string;
  session_id?: string;
  reconnect_token?: string;
  name: string;
  position: number;
  money: number;
  is_in_jail: boolean;
  jail_turns: number;
  get_out_of_jail_cards: number;
  is_bankrupt: boolean;
  properties_owned: number[];
  connected: boolean;
  color: string;
}

export interface RoomSettings {
  max_players: number;
  starting_cash: number;
  auction_enabled: boolean;
  double_rent_enabled: boolean;
  mortgage_enabled: boolean;
  free_parking_jackpot: boolean;
  turn_timer_seconds: number;
  random_turn_order: boolean;
  jail_strict_mode: boolean;
  bot_enabled: boolean;
  board_theme: string;
}

export interface RoomState {
  room_id: string;
  host_id: string;
  players: Record<string, Player>;
  status: string;
  settings: RoomSettings;
}

export interface GameState {
  room: RoomState;
  properties: Record<number, any>;
  turn_order: string[];
  current_turn_index: number;
  history_log: string[];
  board_config?: Record<number, any>;
  houses_remaining?: number;
  hotels_remaining?: number;
}

export interface TurnState {
  active_player_id: string;
  phase: string;
  can_roll: boolean;
  can_end_turn: boolean;
  in_debt: boolean;
  debt_creditor_id: string | null;
  time_remaining: number;
  pending_tax: { amount: number; name: string; tile_id: number } | null;
  pending_rent: { payer_id: string; owner_id: string; amount: number; property_id: number; property_name: string } | null;
}

export interface AuctionState {
  property_id: number;
  highest_bidder_id: string | null;
  current_bid: number;
  time_remaining: number;
  active: boolean;
  participants: string[];
}

export interface DiceResult {
  die1: number;
  die2: number;
  total: number;
  is_double: boolean;
}

export interface CardDraw {
  card: any;
  card_type: string;
  player_id: string;
}

export interface TradeOffer {
  trade_id: string;
  from_player_id: string;
  to_player_id: string;
  offering_money: number;
  requesting_money: number;
  offering_properties: number[];
  requesting_properties: number[];
  offering_get_out_of_jail_cards: number;
  requesting_get_out_of_jail_cards: number;
}

export interface MoneyChange {
  amount: number;
  playerId: string;
  timestamp: number;
}
