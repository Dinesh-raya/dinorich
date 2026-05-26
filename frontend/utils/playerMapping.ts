import type { RoomState, GameState } from '../stores/slices/types';

// Helper to map players for sidebar
export function mapPlayersForSidebar(room: RoomState, game: GameState, activePlayerId?: string) {
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
