import type { Player, GameState, PropertyState } from '../../stores/slices/types';
import boardData from '../../../shared/configs/board_config.json';

// Hindu mythology inspired default player names
const PLAYER_NAME_POOL = [
  'Shiva', 'Vishnu', 'Hanuman', 'Krishna', 'Rama', 'Ganesha',
  'Kartikeya', 'Narayana', 'Rudra', 'Mahadev', 'Parashurama',
  'Indra', 'Surya', 'Agni', 'Varuna', 'Vayu', 'Yama',
  'Lakshmi', 'Saraswati', 'Durga',
];

export const getRandomName = () => PLAYER_NAME_POOL[Math.floor(Math.random() * PLAYER_NAME_POOL.length)];

// Board tile color union (matches board_config.json)
export type TileColor = 'brown' | 'light_blue' | 'pink' | 'orange' | 'red' | 'yellow' | 'green' | 'dark_blue';

export interface BoardTile {
  id: number;
  name: string;
  type: string;
  color?: TileColor;
  price?: number;
  rent?: number[];
  mortgage?: number;
}

export interface Standing {
  id: string;
  name: string;
  color: string;
  money: number;
  properties: number;
  netWorth: number;
  isBankrupt: boolean;
  rank: number;
}

// Helper to calculate standings
export function calculateStandings(players: Record<string, Player>, game: GameState): Standing[] {
  const HOUSE_PRICES: Record<TileColor, number> = {
    brown: 50, light_blue: 60, pink: 100, orange: 100,
    red: 150, yellow: 150, green: 200, dark_blue: 200
  };
  const allPlayers = Object.values(players);
  return allPlayers.map((p) => {
    const props = (p.properties_owned || []).map((id) => game.properties?.[id] as PropertyState | undefined).filter((prop): prop is PropertyState => prop != null);
    const propValue = props.reduce((sum, prop) => {
      const config = (boardData.tiles as BoardTile[]).find((t) => t.id === prop.tile_id);
      const price = config?.price || 0;
      const color = config?.color;
      const housePrice = (color && color in HOUSE_PRICES) ? HOUSE_PRICES[color] : 500;
      return sum + price + (prop.houses || 0) * housePrice + (prop.hotels || 0) * housePrice * 5;
    }, 0);
    return {
      id: p.id,
      name: p.name,
      color: p.color,
      money: p.money,
      properties: props.length,
      netWorth: p.money + propValue,
      isBankrupt: p.is_bankrupt
    };
  }).sort((a, b) => {
    if (a.isBankrupt && !b.isBankrupt) return 1;
    if (!a.isBankrupt && b.isBankrupt) return -1;
    return b.netWorth - a.netWorth;
  }).map((p, i) => ({ ...p, rank: i + 1 }));
}

// Helper to map players for sidebar
export function mapPlayersForSidebar(room: { host_id: string; players: Record<string, { id: string; name: string; color: string; money: number; position: number; connected: boolean; is_in_jail: boolean; jail_turns: number }> }, game: GameState, activePlayerId?: string) {
  if (!room) return [];
  return Object.values(room.players).map((p) => ({
    id: p.id,
    name: p.name,
    color: p.color,
    money: p.money,
    position: p.position,
    connected: p.connected,
    isHost: p.id === room.host_id,
    isCurrentTurn: p.id === activePlayerId,
    is_in_jail: p.is_in_jail,
    jail_turns: p.jail_turns,
    properties: game?.properties ? Object.values(game.properties).filter((prop) => prop.owner_id === p.id).map((prop) => prop.tile_id) : []
  }));
}
