export interface Player {
  id: string;
  session_id?: string;
  reconnect_token?: string;
  socket_id?: string;
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
  goojf_sources?: string[];
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
  board_theme: string;
  mode: string;
  disconnect_timeout_seconds?: number;
  game_paused?: boolean;
}

export interface RoomState {
  room_id: string;
  host_id: string;
  players: Record<string, Player>;
  status: 'waiting' | 'playing' | 'finished';
  settings: RoomSettings;
  is_private?: boolean;
}

export interface PropertyState {
  tile_id: number;
  owner_id: string | null;
  houses: number;
  hotels: number;
  is_mortgaged: boolean;
}

export interface CardTemplate {
  action: string;
  text: string;
  amount?: number;
  spaces?: number;
  target?: number;
  passes_go?: boolean;
  collect_from_each?: boolean;
  per_building?: boolean;
  per_house?: number;
  per_hotel?: number;
  per_player?: number;
}

export interface GameState {
  room: RoomState;
  properties: Record<string, PropertyState>;
  turn_order: string[];
  current_turn_index: number;
  history_log: string[];
  board_config?: Record<string, unknown>;
  houses_remaining?: number;
  hotels_remaining?: number;
  free_parking_pool?: number;
}

export interface TurnState {
  active_player_id: string;
  phase: 'roll' | 'buy' | 'auction' | 'debt' | 'action' | 'tax';
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
  card: CardTemplate;
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
