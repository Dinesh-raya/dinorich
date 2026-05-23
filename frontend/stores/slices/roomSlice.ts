import { StateCreator } from 'zustand';
import { socket } from '../../services/socket';
import { showToast } from '../../components/Toast';
import type { RoomState, RoomSettings } from './types';
import type { StoreState } from './storeTypes';

export interface RoomSlice {
  room: RoomState | null;
  joinRoom: (code: string, name: string) => void;
  createRoom: (name: string) => void;
  updateRoomSettings: (settings: Partial<RoomSettings>) => void;
  kickPlayer: (targetPlayerId: string) => void;
  leaveGame: () => void;
}

export const createRoomSlice: StateCreator<StoreState, [], [], RoomSlice> = (set, get) => ({
  room: null,

  joinRoom: (code, name) => {
    if (get().pendingAction) return;
    set({ pendingAction: 'joinRoom' });
    localStorage.setItem('dino_player_name', name);
    const reconnectToken = localStorage.getItem('dino_reconnect_token') || undefined;
    socket.emit('room:join', { room_code: code, name, reconnect_token: reconnectToken }, (response: any) => {
      set({ pendingAction: null });
      if (response.status === 'error') {
        set({ error: response.message });
      } else {
        if (response.reconnectToken) {
          localStorage.setItem('dino_reconnect_token', response.reconnectToken);
        }
        set({ room: response.room, error: null });
      }
    });
  },

  createRoom: (name) => {
    if (get().pendingAction) return;
    set({ pendingAction: 'createRoom' });
    localStorage.setItem('dino_player_name', name);
    socket.emit('room:create', { name }, (response: any) => {
      set({ pendingAction: null });
      if (response.status === 'error') {
        set({ error: response.message });
      } else {
        if (response.reconnectToken) {
          localStorage.setItem('dino_reconnect_token', response.reconnectToken);
        }
        set({ room: response.room, error: null });
      }
    });
  },

  updateRoomSettings: (settings) => {
    if (get().pendingAction) return;
    set({ pendingAction: 'updateRoomSettings' });
    socket.emit('room:update_settings', { settings }, (response: any) => {
      set({ pendingAction: null });
      if (response.status === 'error') {
        set({ error: response.message });
        showToast(response.message, 'error');
      } else {
        showToast('Room settings updated!', 'success');
      }
    });
  },

  kickPlayer: (targetPlayerId) => {
    if (get().pendingAction) return;
    set({ pendingAction: 'kickPlayer' });
    socket.emit('room:kick_player', { target_player_id: targetPlayerId }, (response: any) => {
      set({ pendingAction: null });
      if (response.status === 'error') {
        set({ error: response.message });
        showToast(response.message, 'error');
      } else {
        showToast('Player kicked.', 'info');
      }
    });
  },

  leaveGame: () => {
    localStorage.removeItem('dino_reconnect_token');
    socket.emit('room:leave');
    set({
      room: null,
      game: null,
      turn: null,
      auction: null,
      diceResult: null,
      lastCardDraw: null,
      incomingTrade: null,
      outgoingTradeId: null,
      gameOver: null,
      error: null,
    });
  },
});
