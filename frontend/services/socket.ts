import { io } from 'socket.io-client';

// Determine the backend URL:
// - If VITE_API_URL is set, use it
// - If accessed via localhost, use empty string (Vite proxy handles it)
// - If accessed via IP (LAN/remote), connect directly to backend on port 8000
function getServerUrl(): string {
  if (import.meta.env.VITE_API_URL) return import.meta.env.VITE_API_URL;
  const host = window.location.hostname;
  if (host === 'localhost' || host === '127.0.0.1') return '';
  // LAN/remote access: connect directly to backend
  return `http://${host}:8000`;
}

const SERVER_URL = getServerUrl();

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
