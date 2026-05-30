import type { TileColor } from '../types/board';
import type { Player, GameState, PropertyState } from '../stores/slices/types';
import boardData from '../../shared/configs/board_config.json';

interface BoardTile {
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
      // Mortgaged properties: skip (mortgage cash is already in player.money)
      if (prop.is_mortgaged) return sum;
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
