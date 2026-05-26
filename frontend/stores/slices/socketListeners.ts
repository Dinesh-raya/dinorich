import { socket } from '../../services/socket';
import { showToast } from '../../components/Toast';
import { soundManager } from '../../utils/audio';
import type { Player, GameState, TurnState, RoomState } from './types';
import type { StoreState } from './storeTypes';

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

let prevPlayerPositions: Record<string, number> = {};
let prevPlayerMoney: Record<string, number> = {};
let prevPlayerBankrupt: Record<string, boolean> = {};
let prevPlayerInJail: Record<string, boolean> = {};
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

export function setupSocketListeners(get: () => StoreState, set: (partial: Partial<StoreState>) => void) {
  // Prevent duplicate listeners during HMR or re-registration.
  // Only remove application-level listeners; never touch socket.io engine
  // listeners (reconnection, ping/pong, transport upgrades).
  if (_listenersSetup) {
    removeRegisteredListeners();
  }
  _listenersSetup = true;

  // Helper to track a listener so it can be cleaned up on re-registration
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
    // myId is set by session:init — don't use ephemeral socket.id here

    // Auto-rejoin room if credentials are in localStorage
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
          // Only clear credentials if the room truly doesn't exist.
          // For transient errors (e.g., "Cannot join a game already in progress"),
          // keep credentials so the player can retry on next reconnect.
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
    // Only clear game state when transitioning FROM playing TO waiting (e.g., game reset).
    // Don't clear on every 'waiting' status update, as room:state_update can fire during
    // gameplay for reconnection corrections where the room status is briefly 'waiting'.
    if (room && room.status === 'waiting' && prevStatus === 'playing') {
      set({ game: null, turn: null, gameOver: null, auction: null, diceResult: null, lastCardDraw: null, incomingTrade: null, outgoingTradeId: null, moneyChange: null });
    }
  });

  listen('game:start', (data: { game: any; turn: any }) => {
    set({ game: data.game, turn: data.turn, room: data.game.room, gameOver: null, pendingAction: null });
    showToast('Game started! Roll the dice to begin.', 'success');
    soundManager.playGameStart();
  });

  // Clear pendingAction on any socket error/disconnect
  listen('disconnect', () => {
    set({ connected: false, pendingAction: null });
  });

  listen('game:state_update', (data: GameStateUpdate) => {
    const prevGame = get().game;
    set({ game: data.game, turn: data.turn, room: data.game.room });

    if (prevGame && data.game) {
      const players = data.game.room.players;
      const myId = get().myId;

      for (const pid of Object.keys(prevPlayerPositions)) {
        if (!players[pid]) {
          delete prevPlayerPositions[pid];
          delete prevPlayerMoney[pid];
          delete prevPlayerBankrupt[pid];
          delete prevPlayerInJail[pid];
        }
      }

      // Pass Go detection: board has 40 tiles (indices 0-39), so wrapping around
      // means position drops by more than half the board size (20).
      const BOARD_SIZE = 40;
      const HALF_BOARD = BOARD_SIZE / 2;

      for (const [pid, raw] of Object.entries(players)) {
        const player = raw as Player & { passed_go?: boolean };
        const prevPos = prevPlayerPositions[pid];
        const prevMoney = prevPlayerMoney[pid];
        const prevBankrupt = prevPlayerBankrupt[pid];
        const prevInJail = prevPlayerInJail[pid];

        // Pass Go detection: prefer backend flag if available, otherwise use
        // positional heuristic. Exclude jail entries (Go to Jail) which cause
        // a position drop that is NOT passing GO.
        const passedGo = player.passed_go ?? (
          prevPos !== undefined &&
          player.position < prevPos &&
          prevPos - player.position > HALF_BOARD &&
          !(prevInJail === false && player.is_in_jail === true)
        );
        if (passedGo) {
          if (pid === myId) soundManager.playPassGo();
        }

        if (prevPos !== undefined && player.position === 10 && prevPos !== 10) {
          if (pid === myId) soundManager.playJailEntry();
        }

        if (prevPos !== undefined && prevPos === 10 && player.position !== 10) {
          if (pid === myId) soundManager.playJailEscape();
        }

        if (prevMoney !== undefined && player.money < prevMoney && pid === myId) {
          const landedTile = data.game.properties?.[player.position];
          if (landedTile && landedTile.owner_id && landedTile.owner_id !== pid) {
            soundManager.playPayRent();
          }
        }

        if (prevBankrupt !== undefined && !prevBankrupt && player.is_bankrupt) {
          if (pid === myId) soundManager.playBankruptcy();
        }

        if (prevMoney !== undefined && player.money !== prevMoney && pid === myId) {
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
    soundManager.playAuctionEnd();
  });

  listen('game:dice_result', (data: any) => {
    set({ diceResult: data });
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
    const myId = get().myId;
    const isWinner = myId ? data.winner_id === myId : false;
    soundManager.playGameEnd(isWinner);
  });

  listen('card:result', (data: any) => {
    set({ lastCardDraw: data });
    const playerName = data.player_id === get().myId ? 'You' : 'A player';
    showToast(`${playerName} drew: ${data.card.text}`, 'info', 5000);
    soundManager.playCardDraw(data.card_type);
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

  // NOTE: These trade event handlers clear incomingTrade/outgoingTradeId unconditionally for
  // ALL players, not just the trade participants. This is intentional — the backend broadcasts
  // trade lifecycle events to all connected clients, and clearing stale trade state for everyone
  // prevents stuck UI. Filtering by participant would require the event payload to include
  // player IDs, which it currently does not.

  listen('trade:completed', () => {
    set({ incomingTrade: null, outgoingTradeId: null });
    showToast('Trade completed!', 'success');
    soundManager.playTradeComplete();
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
}
