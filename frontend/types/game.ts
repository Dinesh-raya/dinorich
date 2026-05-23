export interface PlayerState {
  id: string;
  session_id: string;
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
  bot_support_placeholder: boolean;
  board_theme: string;
}

export interface RoomState {
  room_id: string;
  host_id: string;
  is_private: boolean;
  settings: RoomSettings;
  players: Record<string, PlayerState>;
  status: string;
}

export interface PropertyState {
  tile_id: number;
  owner_id: string | null;
  is_mortgaged: boolean;
  houses: number;
  hotels: number;
}

export interface GameState {
  room: RoomState;
  properties: Record<number, PropertyState>;
  turn_order: string[];
  current_turn_index: number;
  free_parking_pool: number;
  history_log: string[];
  treasury_deck: any[];
  surprise_deck: any[];
  houses_remaining: number;
  hotels_remaining: number;
}

export interface TurnState {
  active_player_id: string;
  phase: string;
  can_roll: boolean;
  can_end_turn: boolean;
  time_remaining: number;
  in_debt: boolean;
  debt_creditor_id: string | null;
  pending_tax: any;
  pending_rent: any;
}

export interface DiceState {
  die1: number;
  die2: number;
  total: number;
  is_double: boolean;
  doubles_count: number;
}

export interface AuctionState {
  property_id: number;
  highest_bidder_id: string | null;
  current_bid: number;
  time_remaining: number;
  active: boolean;
  participants: string[];
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
  status: string;
}

export interface BoardTile {
  id: number;
  name: string;
  type: string;
  color?: string;
  price?: number;
  rent?: number[];
  mortgage?: number;
  icon?: string;
}
