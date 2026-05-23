import { StateCreator } from 'zustand';
import { socket } from '../../services/socket';
import type { StoreState } from '../gameStore';

export interface ConnectionSlice {
  connected: boolean;
  myId: string | null;
  connect: () => void;
}

export const createConnectionSlice: StateCreator<StoreState, [], [], ConnectionSlice> = () => ({
  connected: false,
  myId: null,

  connect: () => {
    const playerName = localStorage.getItem('dino_player_name') || '';
    const sessionToken = localStorage.getItem('dino_session_token') || '';
    socket.auth = { name: playerName, sessionToken };
    if (!socket.connected) socket.connect();
  },
});
