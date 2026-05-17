import { create } from 'zustand';
import { socket } from '../services/socket';
import { showToast } from '../components/Toast';
import { formatMoney } from '../utils/format';

interface Player {
  id: string;
  session_id?: string;
  reconnect_token?: string;
  name: string;
  position: number;
  money: number;
  is_in_jail: boolean;
  jail_turns: number;
  get_out_of_jail_cards: number;
  is_bankrupt: boolean;
  properties_owned: number[];
  connected: boolean;
  color: string;
}

interface RoomSettings {
  max_players: number;
  starting_cash: number;
  auction_enabled: boolean;
  double_rent_enabled: boolean;
  mortgage_enabled: boolean;
  free_parking_jackpot: boolean;
  turn_timer_seconds: number;
  random_turn_order: boolean;
  jail_strict_mode: boolean;
  board_theme: string;
}

interface RoomState {
  room_id: string;
  host_id: string;
  players: Record<string, Player>;
  status: string;
  settings: RoomSettings;
}

interface GameState {
  room: RoomState;
  properties: Record<number, any>;
  turn_order: string[];
  current_turn_index: number;
  history_log: string[];
  board_config?: Record<number, any>;
}

interface TurnState {
  active_player_id: string;
  phase: string;
  can_roll: boolean;
  can_end_turn: boolean;
  time_remaining: number;
}

interface AuctionState {
  property_id: number;
  highest_bidder_id: string | null;
  current_bid: number;
  time_remaining: number;
  active: boolean;
  participants: string[];
}

interface DiceResult {
  die1: number;
  die2: number;
  total: number;
  is_double: boolean;
}

interface GameStore {
  connected: boolean;
  myId: string | null;
  room: RoomState | null;
  game: GameState | null;
  turn: TurnState | null;
  auction: AuctionState | null;
  diceResult: DiceResult | null;
  error: string | null;
  
  connect: () => void;
  joinRoom: (code: string, name: string, color: string) => void;
  createRoom: (name: string, color: string) => void;
  startGame: () => void;
  rollDice: () => void;
  endTurn: () => void;
  buyProperty: (id: number) => void;
  startAuction: (propertyId: number) => void;
  placeBid: (amount: number) => void;
  endAuction: () => void;
  updateRoomSettings: (settings: Partial<RoomSettings>) => void;
  buildHouse: (propertyId: number) => void;
  buildHotel: (propertyId: number) => void;
  sellHouse: (propertyId: number) => void;
  sellHotel: (propertyId: number) => void;
}

export const useGameStore = create<GameStore>((set) => {
  // Socket listeners setup once
  socket.on('connect', () => {
    set({ connected: true, myId: socket.id });
  });

  socket.on('disconnect', () => {
    set({ connected: false });
  });

  socket.on('connect_error', (error) => {
    set({ error: error.message || 'Connection failed' });
  });

  socket.on('room:state_update', (room: RoomState) => {
    set({ room });
  });

  socket.on('game:start', (data: { game: GameState, turn: TurnState }) => {
    set({ game: data.game, turn: data.turn, room: data.game.room });
    showToast('Game started! Roll the dice to begin.', 'success');
  });

  socket.on('game:state_update', (data: { game: GameState, turn: TurnState }) => {
    const prevGame = useGameStore.getState().game;
    set({ game: data.game, turn: data.turn, room: data.game.room });

    // Detect new history log entries for toast notifications
    if (prevGame && data.game.history_log.length > prevGame.history_log.length) {
      const newLogs = data.game.history_log.slice(prevGame.history_log.length);
      for (const log of newLogs) {
        const lower = log.toLowerCase();
        if (lower.includes('bought') || lower.includes('built')) showToast(log, 'success');
        else if (lower.includes('bankrupt')) showToast(log, 'error');
        else if (lower.includes('jail') || lower.includes('tax') || lower.includes('fine')) showToast(log, 'warning');
        else if (lower.includes('rent') || lower.includes('mortgage') || lower.includes('rolled')) showToast(log, 'info');
        else showToast(log, 'info');
      }
    }
  });

  socket.on('auction:start', (data: { auction: AuctionState }) => {
    set({ auction: data.auction, error: null });
    showToast('Auction started! Place your bids.', 'info');
  });

  socket.on('auction:state_update', (data: { auction: AuctionState }) => {
    set({ auction: data.auction, error: null });
  });

  socket.on('auction:end', () => {
    set({ auction: null });
    showToast('Auction ended!', 'info');
  });

  socket.on('game:dice_result', (data: DiceResult) => {
    set({ diceResult: data });
    showToast(`Rolled ${data.die1} + ${data.die2} = ${data.total}${data.is_double ? ' (Double!)' : ''}`, 'info');
  });

  return {
    connected: false,
    myId: null,
    room: null,
    game: null,
    turn: null,
    auction: null,
    diceResult: null,
    error: null,

    connect: () => {
      const playerName = localStorage.getItem('dino_player_name') || 'Player';
      const sessionToken = localStorage.getItem('dino_session_token') || '';
      socket.auth = { name: playerName, sessionToken };
      if (!socket.connected) socket.connect();
    },

    joinRoom: (code, name, color) => {
      localStorage.setItem('dino_player_name', name || 'Player');
      const reconnectToken = localStorage.getItem('dino_reconnect_token') || undefined;
      socket.emit('room:join', { room_code: code, name, color, reconnect_token: reconnectToken }, (response: any) => {
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

    createRoom: (name, color) => {
      localStorage.setItem('dino_player_name', name || 'Player');
      socket.emit('room:create', { name, color }, (response: any) => {
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

    startGame: () => {
      socket.emit('game:start', {}, (response: any) => {
        if (response.status === 'error') set({ error: response.message });
      });
    },

    rollDice: () => {
      socket.emit('game:dice_roll', {}, (response: any) => {
         if (response.status === 'error') set({ error: response.message });
      });
    },

    endTurn: () => {
      socket.emit('game:end_turn', {}, (response: any) => {
        if (response.status === 'error') set({ error: response.message });
      });
    },

    buyProperty: (id) => {
      socket.emit('property:buy', { property_id: id }, (response: any) => {
        if (response.status === 'error') {
          set({ error: response.message });
          showToast(response.message, 'error');
        } else {
          showToast('Property purchased!', 'success');
        }
      });
    },

    startAuction: (propertyId) => {
      socket.emit('auction:start', { property_id: propertyId }, (response: any) => {
        if (response.status === 'error') {
          set({ error: response.message });
          showToast(response.message, 'error');
        }
      });
    },

    placeBid: (amount) => {
      socket.emit('auction:bid', { amount }, (response: any) => {
        if (response.status === 'error') {
          set({ error: response.message });
          showToast(response.message, 'error');
        } else {
          showToast(`Bid placed: ${formatMoney(amount)}`, 'success');
        }
      });
    },

    endAuction: () => {
      socket.emit('auction:end', {}, (response: any) => {
        if (response.status === 'error') {
          set({ error: response.message });
          showToast(response.message, 'error');
        }
      });
    },

    updateRoomSettings: (settings) => {
      socket.emit('room:update_settings', { settings }, (response: any) => {
        if (response.status === 'error') {
          set({ error: response.message });
          showToast(response.message, 'error');
        } else {
          showToast('Room settings updated!', 'success');
        }
      });
    },

    buildHouse: (propertyId) => {
      socket.emit('property:build_house', { property_id: propertyId }, (response: any) => {
        if (response.status === 'error') {
          set({ error: response.message });
          showToast(response.message, 'error');
        } else {
          showToast('House built!', 'success');
        }
      });
    },

    buildHotel: (propertyId) => {
      socket.emit('property:build_hotel', { property_id: propertyId }, (response: any) => {
        if (response.status === 'error') {
          set({ error: response.message });
          showToast(response.message, 'error');
        } else {
          showToast('Hotel built!', 'success');
        }
      });
    },

    sellHouse: (propertyId) => {
      socket.emit('property:sell_house', { property_id: propertyId }, (response: any) => {
        if (response.status === 'error') {
          set({ error: response.message });
          showToast(response.message, 'error');
        } else {
          showToast('House sold!', 'info');
        }
      });
    },

    sellHotel: (propertyId) => {
      socket.emit('property:sell_hotel', { property_id: propertyId }, (response: any) => {
        if (response.status === 'error') {
          set({ error: response.message });
          showToast(response.message, 'error');
        } else {
          showToast('Hotel sold!', 'info');
        }
      });
    }
  };
});
