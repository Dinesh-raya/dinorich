import { io } from 'socket.io-client';

// Use environment variable or relative path (Vite proxy handles it in dev)
const SERVER_URL = import.meta.env.VITE_API_URL || '';

export const socket = io(SERVER_URL, {
  autoConnect: false,
  transports: ['websocket', 'polling'], // WebSocket first, then polling fallback
  reconnection: true,
  reconnectionAttempts: Infinity,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 10000,
  randomizationFactor: 0.5,
  timeout: 30000,
  withCredentials: true,
});
