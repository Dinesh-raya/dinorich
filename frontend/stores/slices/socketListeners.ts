import { socket } from '../../services/socket';
import { showToast } from '../../components/Toast';
import { soundManager } from '../../utils/audio';
import type { Player } from './types';
import type { StoreState } from './storeTypes';

let prevPlayerPositions: Record<string, number> = {};
let prevPlayerMoney: Record<string, number> = {};
let prevPlayerBankrupt: Record<string, boolean> = {};
let moneyChangeTimer: ReturnType<typeof setTimeout> | null = null;

export function setupSocketListeners(get: () => StoreState, set: (partial: Partial<StoreState>) => void) {
  socket.on('connect', () => {
    set({ connected: true, myId: socket.id, error: null });
    
    // Auto-rejoin room if credentials are in localStorage
    const roomCode = localStorage.getItem('dino_room_code');
    const reconnectToken = localStorage.getItem('dino_reconnect_token');
    const playerName = localStorage.getItem('dino_player_name');
    if (roomCode && reconnectToken && playerName) {
      socket.emit('room:join', {
        room_code: roomCode,
        name: playerName,
        reconnect_token: reconnectToken
      }, (response: any) => {
        if (response.status === 'success') {
          set({ room: response.room, error: null });
          if (response.game) {
            set({ game: response.game, turn: response.turn });
          }
          if (response.reconnectToken) {
            localStorage.setItem('dino_reconnect_token', response.reconnectToken);
          }
        } else {
          localStorage.removeItem('dino_room_code');
          localStorage.removeItem('dino_reconnect_token');
        }
      });
    }
  });

  socket.on('disconnect', () => {
    set({ connected: false });
  });

  socket.on('connect_error', (error) => {
    set({ connected: false, error: `Connection failed: ${error.message || 'Unknown error'}` });
  });

  socket.io.on('reconnect_attempt', () => {
    socket.auth = {
      name: localStorage.getItem('dino_player_name') || '',
      sessionToken: localStorage.getItem('dino_session_token') || '',
    };
  });

  socket.on('room:state_update', (room: any) => {
    set({ room });
    if (room && room.status === 'waiting') {
      set({ game: null, turn: null, gameOver: null });
    }
  });

  socket.on('game:start', (data: { game: any; turn: any }) => {
    set({ game: data.game, turn: data.turn, room: data.game.room, gameOver: null });
    showToast('Game started! Roll the dice to begin.', 'success');
    soundManager.playGameStart();
  });

  socket.on('game:state_update', (data: { game: any; turn: any }) => {
    const prevGame = get().game;
    set({ game: data.game, turn: data.turn, room: data.game.room });

    if (prevGame && data.game) {
      const players = data.game.room.players;
      const myId = socket.id;

      for (const pid of Object.keys(prevPlayerPositions)) {
        if (!players[pid]) {
          delete prevPlayerPositions[pid];
          delete prevPlayerMoney[pid];
          delete prevPlayerBankrupt[pid];
        }
      }

      for (const [pid, raw] of Object.entries(players)) {
        const player = raw as Player;
        const prevPos = prevPlayerPositions[pid];
        const prevMoney = prevPlayerMoney[pid];
        const prevBankrupt = prevPlayerBankrupt[pid];

        if (prevPos !== undefined && player.position < prevPos && prevPos - player.position > 20) {
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
      }
    }
  });

  socket.on('auction:start', (data: { auction: any }) => {
    set({ auction: data.auction, error: null });
    showToast('Auction started! Place your bids.', 'info');
  });

  socket.on('auction:state_update', (data: { auction: any }) => {
    set({ auction: data.auction, error: null });
  });

  socket.on('auction:end', () => {
    set({ auction: null });
    showToast('Auction ended!', 'info');
    soundManager.playAuctionEnd();
  });

  socket.on('game:dice_result', (data: any) => {
    set({ diceResult: data });
  });

  socket.on('game:over', (data: { winner_id: string | null; winner_name: string }) => {
    set({ gameOver: data });
    const isWinner = data.winner_id === socket.id;
    soundManager.playGameEnd(isWinner);
  });

  socket.on('card:result', (data: any) => {
    set({ lastCardDraw: data });
    const playerName = data.player_id === socket.id ? 'You' : 'A player';
    showToast(`${playerName} drew: ${data.card.text}`, 'info', 5000);
    soundManager.playCardDraw(data.card_type);
  });

  socket.on('trade:offer', (data: any) => {
    if (data.to_player_id === socket.id) {
      set({ incomingTrade: data });
      showToast('Incoming trade offer!', 'info');
    } else if (data.from_player_id === socket.id) {
      set({ outgoingTradeId: data.trade_id });
    }
  });

  socket.on('trade:completed', () => {
    set({ incomingTrade: null, outgoingTradeId: null });
    showToast('Trade completed!', 'success');
    soundManager.playTradeComplete();
  });

  socket.on('trade:rejected', () => {
    set({ incomingTrade: null, outgoingTradeId: null });
    showToast('Trade was rejected.', 'warning');
  });

  socket.on('trade:cancelled', () => {
    set({ incomingTrade: null, outgoingTradeId: null });
    showToast('Trade was cancelled.', 'info');
  });

  socket.on('room:kicked', (data: { message: string }) => {
    set({ room: null, game: null, turn: null });
    showToast(data.message || 'You have been kicked from the room.', 'error');
  });
}

export function resetSocketTracking() {
  if (moneyChangeTimer) clearTimeout(moneyChangeTimer);
  moneyChangeTimer = null;
  prevPlayerPositions = {};
  prevPlayerMoney = {};
  prevPlayerBankrupt = {};
}
