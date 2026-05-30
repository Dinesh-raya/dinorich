import { socket } from '../../services/socket';
import { showToast } from '../../components/Toast';
import { soundManager } from '../../utils/audio';
import type { Player, GameState, TurnState, RoomState } from './types';
import type { StoreState } from './storeTypes';
import boardData from '../../../shared/configs/board_config.json';

interface SocketResponse {
  status: 'success' | 'error';
  message?: string;
  sessionId?: string;
  sessionToken?: string;
  room?: RoomState;
  game?: GameState;
  turn?: TurnState;
  reconnectToken?: string;
}

interface GameStateUpdate {
  game: GameState;
  turn: TurnState;
}

const HOUSE_PRICES: Record<string, number> = {
  brown: 50, light_blue: 60, pink: 100, orange: 100,
  red: 150, yellow: 150, green: 200, dark_blue: 200,
};

let prevPlayerPositions: Record<string, number> = {};
let prevPlayerMoney: Record<string, number> = {};
let prevPlayerBankrupt: Record<string, boolean> = {};
let prevPlayerInJail: Record<string, boolean> = {};
let prevHotelCounts: Record<string, number> = {};
let moneyChangeTimer: ReturnType<typeof setTimeout> | null = null;
let _listenersSetup = false;
let _registeredListeners: Array<{ event: string; handler: (...args: any[]) => void; target: 'socket' | 'manager' }> = [];

const CREDENTIALS_TS_KEY = 'dino_credentials_ts';
const CREDENTIALS_MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24 hours

function saveCredentialsWithExpiry(keys: Record<string, string>) {
  for (const [key, value] of Object.entries(keys)) {
    localStorage.setItem(key, value);
  }
  localStorage.setItem(CREDENTIALS_TS_KEY, Date.now().toString());
}

function areCredentialsExpired(): boolean {
  const ts = localStorage.getItem(CREDENTIALS_TS_KEY);
  if (!ts) return true;
  return Date.now() - parseInt(ts) > CREDENTIALS_MAX_AGE_MS;
}

function clearAllCredentials() {
  localStorage.removeItem('dino_room_code');
  localStorage.removeItem('dino_reconnect_token');
  localStorage.removeItem('dino_session_token');
  localStorage.removeItem('dino_player_name');
  localStorage.removeItem(CREDENTIALS_TS_KEY);
}

function removeRegisteredListeners() {
  for (const { event, handler, target } of _registeredListeners) {
    if (target === 'socket') {
      socket.off(event, handler);
    } else {
      (socket.io as any).off(event, handler);
    }
  }
  _registeredListeners = [];
}

function calculateTotalWorth(game: GameState, playerId: string): number {
  const player = game.room.players[playerId];
  if (!player) return 0;
  let total = player.money || 0;
  for (const propId of player.properties_owned || []) {
    const propState = game.properties?.[propId];
    if (propState?.is_mortgaged) continue;
    const config = (boardData as any).tiles?.[propId];
    if (config?.price) total += config.price;
    const color = config?.color;
    if (color) {
      const hp = HOUSE_PRICES[color] || 50;
      total += (propState?.houses || 0) * hp;
      total += (propState?.hotels || 0) * hp * 5;
    }
  }
  return total;
}

function countAllHotels(game: GameState): number {
  let count = 0;
  if (game.properties) {
    for (const prop of Object.values(game.properties)) {
      count += (prop as any).hotels || 0;
    }
  }
  return count;
}

export function setupSocketListeners(get: () => StoreState, set: (partial: Partial<StoreState>) => void) {
  if (_listenersSetup) {
    removeRegisteredListeners();
  }
  _listenersSetup = true;

  function listen(event: string, handler: (...args: any[]) => void, target: 'socket' | 'manager' = 'socket') {
    _registeredListeners.push({ event, handler, target });
    if (target === 'socket') {
      socket.on(event, handler);
    } else {
      (socket.io as any).on(event, handler);
    }
  }

  listen('connect', () => {
    set({ connected: true, error: null });

    if (areCredentialsExpired()) {
      clearAllCredentials();
      return;
    }

    const roomCode = localStorage.getItem('dino_room_code');
    const reconnectToken = localStorage.getItem('dino_reconnect_token');
    const playerName = localStorage.getItem('dino_player_name');
    if (roomCode && reconnectToken && playerName) {
      socket.emit('room:join', {
        room_code: roomCode,
        name: playerName,
        reconnect_token: reconnectToken
      }, (response: SocketResponse) => {
        if (response.status === 'success') {
          const refreshedCredentials: Record<string, string> = {};
          if (response.sessionToken) {
            refreshedCredentials['dino_session_token'] = response.sessionToken;
          }
          if (response.sessionId) {
            set({ myId: response.sessionId });
          }
          set({ room: response.room, error: null });
          if (response.game) {
            set({ game: response.game, turn: response.turn });
          }
          if (response.reconnectToken) {
            refreshedCredentials['dino_reconnect_token'] = response.reconnectToken;
          }
          if (Object.keys(refreshedCredentials).length > 0) {
            saveCredentialsWithExpiry(refreshedCredentials);
          }
        } else {
          if (response.message === 'Room not found') {
            localStorage.removeItem('dino_room_code');
            localStorage.removeItem('dino_reconnect_token');
          }
        }
      });
    }
  });

  listen('session:init', (data: { session_token: string; session_id: string }) => {
    saveCredentialsWithExpiry({ 'dino_session_token': data.session_token });
    set({ myId: data.session_id });
  });

  listen('connect_error', (error) => {
    set({ connected: false, pendingAction: null, error: `Connection failed: ${error.message || 'Unknown error'}` });
  });

  listen('reconnect_attempt', () => {
    socket.auth = {
      name: localStorage.getItem('dino_player_name') || '',
      sessionToken: localStorage.getItem('dino_session_token') || '',
    };
  }, 'manager');

  listen('room:state_update', (room: any) => {
    const prevStatus = get().room?.status;
    set({ room });
    if (room && room.status === 'waiting' && prevStatus === 'playing') {
      set({ game: null, turn: null, gameOver: null, auction: null, diceResult: null, lastCardDraw: null, incomingTrade: null, outgoingTradeId: null, moneyChange: null });
    }
  });

  listen('game:start', (data: { game: any; turn: any }) => {
    set({ game: data.game, turn: data.turn, room: data.game.room, gameOver: null, pendingAction: null });
    showToast('Game started! Roll the dice to begin.', 'success');
  });

  listen('disconnect', () => {
    set({ connected: false, pendingAction: null });
  });

  listen('game:state_update', (data: GameStateUpdate) => {
    const prevGame = get().game;
    set({ game: data.game, turn: data.turn, room: data.game.room });

    if (prevGame && data.game) {
      const players = data.game.room.players;

      for (const pid of Object.keys(prevPlayerPositions)) {
        if (!players[pid]) {
          delete prevPlayerPositions[pid];
          delete prevPlayerMoney[pid];
          delete prevPlayerBankrupt[pid];
          delete prevPlayerInJail[pid];
          delete prevHotelCounts[pid];
        }
      }

      

      for (const [pid, raw] of Object.entries(players)) {
        const player = raw as Player & { passed_go?: boolean };
        // prevPos tracked for position changes
        const prevMoney = prevPlayerMoney[pid];
        const prevBankrupt = prevPlayerBankrupt[pid];

        // Detect debt (negative money) — play for ALL players
        if (prevMoney !== undefined && player.money < 0 && prevMoney >= 0) {
          soundManager.play('player_debt');
        }

        // Detect big rent (>50% of total worth paid) — play for ALL players
        if (prevMoney !== undefined && player.money < prevMoney) {
          const diff = prevMoney - player.money;
          const worth = calculateTotalWorth(data.game, pid);
          if (worth > 0 && diff > worth * 0.5) {
            soundManager.play('big_rent');
          }
        }

        // Detect bankruptcy — play for ALL players
        if (prevBankrupt !== undefined && !prevBankrupt && player.is_bankrupt) {
          soundManager.play('player_debt');
        }

        // Money change display (for the local player only)
        if (prevMoney !== undefined && player.money !== prevMoney && pid === get().myId) {
          const diff = player.money - prevMoney;
          const ts = Date.now();
          set({ moneyChange: { amount: diff, playerId: pid, timestamp: ts } });
          if (moneyChangeTimer) clearTimeout(moneyChangeTimer);
          moneyChangeTimer = setTimeout(() => {
            moneyChangeTimer = null;
            const state = get();
            if (state.moneyChange?.timestamp === ts) set({ moneyChange: null });
          }, 2000);
        }

        prevPlayerPositions[pid] = player.position;
        prevPlayerMoney[pid] = player.money;
        prevPlayerBankrupt[pid] = player.is_bankrupt;
        prevPlayerInJail[pid] = player.is_in_jail;
      }

      // Detect hotel built — play for ALL players
      const currentHotels = countAllHotels(data.game);
      const prevHotels = Object.values(prevHotelCounts).reduce((a, b) => a + b, 0);
      if (currentHotels > prevHotels) {
        soundManager.play('build_hotel');
      }
      // Update hotel counts
      for (const [pid, raw] of Object.entries(players)) {
        const player = raw as Player;
        let hCount = 0;
        for (const propId of player.properties_owned || []) {
          hCount += (data.game.properties?.[propId] as any)?.hotels || 0;
        }
        prevHotelCounts[pid] = hCount;
      }

    }
  });

  listen('auction:start', (data: { auction: any }) => {
    set({ auction: data.auction, error: null });
    showToast('Auction started! Place your bids.', 'info');
  });

  listen('auction:state_update', (data: { auction: any }) => {
    set({ auction: data.auction, error: null });
  });

  listen('auction:end', () => {
    set({ auction: null });
    showToast('Auction ended!', 'info');
  });

  listen('game:dice_result', (data: any) => {
    set({ diceResult: data });
    // Play dice roll sound for ALL players
    soundManager.play('dice_roll');
  });

  listen('game:paused', (data: { game: GameState }) => {
    const currentGame = get().game;
    if (currentGame && data.game) {
      set({ game: data.game });
    }
    showToast('Game paused', 'info');
  });

  listen('game:resumed', (data: { game: GameState }) => {
    const currentGame = get().game;
    if (currentGame && data.game) {
      set({ game: data.game });
    }
    showToast('Game resumed', 'success');
  });

  listen('game:saved', () => {
    set({ hasSave: true });
    showToast('Game saved!', 'success');
  });

  listen('game:over', (data: { winner_id: string | null; winner_name: string }) => {
    set({ gameOver: data });
  });

  listen('card:result', (data: any) => {
    set({ lastCardDraw: data });
    const playerName = data.player_id === get().myId ? 'You' : 'A player';
    showToast(`${playerName} drew: ${data.card.text}`, 'info', 5000);
  });

  listen('trade:offer', (data: any) => {
    const myId = get().myId;
    if (myId && data.to_player_id === myId) {
      set({ incomingTrade: data });
      showToast('Incoming trade offer!', 'info');
    } else if (myId && data.from_player_id === myId) {
      set({ outgoingTradeId: data.trade_id });
    }
  });

  listen('trade:completed', () => {
    set({ incomingTrade: null, outgoingTradeId: null });
    showToast('Trade completed!', 'success');
    soundManager.play('trade_accepted');
  });

  listen('trade:rejected', () => {
    set({ incomingTrade: null, outgoingTradeId: null });
    showToast('Trade was rejected.', 'warning');
  });

  listen('trade:cancelled', () => {
    set({ incomingTrade: null, outgoingTradeId: null });
    showToast('Trade was cancelled.', 'info');
  });

  listen('room:kicked', (data: { message: string }) => {
    set({ room: null, game: null, turn: null, auction: null, diceResult: null, lastCardDraw: null, incomingTrade: null, outgoingTradeId: null, gameOver: null, pendingAction: null, moneyChange: null });
    localStorage.removeItem('dino_room_code');
    localStorage.removeItem('dino_reconnect_token');
    showToast(data.message || 'You have been kicked from the room.', 'error');
  });
}

export function resetSocketTracking() {
  if (moneyChangeTimer) clearTimeout(moneyChangeTimer);
  moneyChangeTimer = null;
  prevPlayerPositions = {};
  prevPlayerMoney = {};
  prevPlayerBankrupt = {};
  prevPlayerInJail = {};
  prevHotelCounts = {};
}
