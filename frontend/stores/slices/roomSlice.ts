import { StateCreator } from 'zustand';
import { socket } from '../../services/socket';
import { showToast } from '../../components/Toast';
import type { RoomState, RoomSettings } from './types';
import type { StoreState } from './storeTypes';

export interface RoomSlice {
  room: RoomState | null;
  joinRoom: (code: string, name: string) => void;
  createRoom: (name: string) => void;
  updateRoomSettings: (settings: Partial<RoomSettings>) => Promise<boolean>;
  kickPlayer: (targetPlayerId: string) => void;
  leaveGame: () => void;
}

const CREDENTIALS_TS_KEY = 'dino_credentials_ts';

function saveCredentialsWithExpiry(keys: Record<string, string>) {
  for (const [key, value] of Object.entries(keys)) {
    localStorage.setItem(key, value);
  }
  localStorage.setItem(CREDENTIALS_TS_KEY, Date.now().toString());
}

const saveCredentials = (response: any, set: any) => {
  const credentialsToSave: Record<string, string> = {};
  if (response.reconnectToken) {
    credentialsToSave['dino_reconnect_token'] = response.reconnectToken;
  }
  if (response.room && response.room.room_id) {
    credentialsToSave['dino_room_code'] = response.room.room_id;
  }
  if (response.sessionToken) {
    credentialsToSave['dino_session_token'] = response.sessionToken;
  }
  if (Object.keys(credentialsToSave).length > 0) {
    saveCredentialsWithExpiry(credentialsToSave);
  }
  if (response.sessionId) {
    set({ myId: response.sessionId });
  }
  set({ room: response.room, error: null });
};

export const createRoomSlice: StateCreator<StoreState, [], [], RoomSlice> = (set, get) => ({
  room: null,

  joinRoom: (code, name) => {
    if (get().pendingAction) return;
    set({ pendingAction: 'joinRoom' });
    saveCredentialsWithExpiry({ 'dino_player_name': name });
    const reconnectToken = localStorage.getItem('dino_reconnect_token') || undefined;
    socket.emit('room:join', { room_code: code, name, reconnect_token: reconnectToken }, (response: any) => {
      set({ pendingAction: null });
      if (response.status === 'error') {
        set({ error: response.message });
      } else {
        saveCredentials(response, set);
      }
    });
  },

  createRoom: (name) => {
    if (get().pendingAction) return;
    set({ pendingAction: 'createRoom' });
    saveCredentialsWithExpiry({ 'dino_player_name': name });
    socket.emit('room:create', { name }, (response: any) => {
      set({ pendingAction: null });
      if (response.status === 'error') {
        set({ error: response.message });
      } else {
        saveCredentials(response, set);
      }
    });
  },

  updateRoomSettings: (settings) => {
    return new Promise<boolean>((resolve) => {
      if (get().pendingAction) {
        resolve(false);
        return;
      }
      set({ pendingAction: 'updateRoomSettings' });
      socket.emit('room:update_settings', { settings }, (response: any) => {
        set({ pendingAction: null });
        if (response.status === 'error') {
          set({ error: response.message });
          showToast(response.message, 'error');
          resolve(false);
        } else {
          // Update local room settings so UI reflects changes immediately
          const currentRoom = get().room;
          if (currentRoom) {
            set({ room: { ...currentRoom, settings: { ...currentRoom.settings, ...settings } } });
          }
          showToast('Room settings updated!', 'success');
          resolve(true);
        }
      });
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
    localStorage.removeItem('dino_room_code');
    localStorage.removeItem(CREDENTIALS_TS_KEY);

    const clearState = () => {
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
        pendingAction: null,
      });
    };

    // If socket is disconnected, skip the emit — the disconnect handler
    // will clean up server-side state. Just clear local state.
    if (!socket.connected) {
      clearState();
      return;
    }

    socket.emit('room:leave', (response: any) => {
      if (response?.status === 'error') {
        showToast(response.message || 'Failed to leave room', 'error');
      }
      // Always clear local state so user can join another game
      clearState();
    });
  },
});
