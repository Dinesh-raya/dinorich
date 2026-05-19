import { create } from 'zustand';
import { socket } from '../services/socket';
import { showToast } from '../components/Toast';
import { formatMoney } from '../utils/format';
import { soundManager } from '../utils/audio';

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
  houses_remaining?: number;
  hotels_remaining?: number;
}

interface TurnState {
  active_player_id: string;
  phase: string;
  can_roll: boolean;
  can_end_turn: boolean;
  in_debt: boolean;
  debt_creditor_id: string | null;
  time_remaining: number;
  pending_tax: { amount: number; name: string; tile_id: number } | null;
  pending_rent: { payer_id: string; owner_id: string; amount: number; property_id: number; property_name: string } | null;
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

interface CardDraw {
  card: any;
  card_type: string;
  player_id: string;
}

interface TradeOffer {
  trade_id: string;
  from_player_id: string;
  to_player_id: string;
  offering_money: number;
  requesting_money: number;
  offering_properties: number[];
  requesting_properties: number[];
  offering_get_out_of_jail_cards: number;
  requesting_get_out_of_jail_cards: number;
}

interface GameStore {
  connected: boolean;
  myId: string | null;
  room: RoomState | null;
  game: GameState | null;
  turn: TurnState | null;
  auction: AuctionState | null;
  diceResult: DiceResult | null;
  lastCardDraw: CardDraw | null;
  incomingTrade: TradeOffer | null;
  error: string | null;

  connect: () => void;
  joinRoom: (code: string, name: string) => void;
  createRoom: (name: string) => void;
  startGame: () => void;
  rollDice: () => void;
  endTurn: () => void;
  declareBankruptcy: () => void;
  buyProperty: (id: number) => void;
  startAuction: (propertyId: number) => void;
  placeBid: (amount: number) => void;
  endAuction: () => void;
  updateRoomSettings: (settings: Partial<RoomSettings>) => void;
  buildHouse: (propertyId: number) => void;
  buildHotel: (propertyId: number) => void;
  sellHouse: (propertyId: number) => void;
  sellHotel: (propertyId: number) => void;
  mortgageProperty: (propertyId: number) => void;
  unmortgageProperty: (propertyId: number) => void;
  payJailFine: () => void;
  useJailCard: () => void;
  payTax: (usePercentage: boolean) => void;
  collectRent: () => void;
  acceptTrade: (tradeId: string) => void;
  rejectTrade: (tradeId: string) => void;
  clearCardDraw: () => void;
  clearIncomingTrade: () => void;
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
    set({ game: data.game, turn: data.turn, room: data.game.room });
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
  });

  socket.on('game:over', (_data: { winner_id: string | null, winner_name: string }) => {
    // Game over is handled by App.tsx via room status check
    // This listener ensures the event is received
  });

  socket.on('card:result', (data: CardDraw) => {
    set({ lastCardDraw: data });
    const playerName = data.player_id === socket.id ? 'You' : 'A player';
    showToast(`${playerName} drew: ${data.card.text}`, 'info', 5000);
    soundManager.playCardDraw(data.card_type as 'treasury' | 'surprise');
  });

  socket.on('trade:offer', (data: TradeOffer) => {
    if (data.to_player_id === socket.id) {
      set({ incomingTrade: data });
      showToast('Incoming trade offer!', 'info');
    }
  });

  socket.on('trade:completed', () => {
    set({ incomingTrade: null });
    showToast('Trade completed!', 'success');
    soundManager.playTradeComplete();
  });

  socket.on('trade:rejected', () => {
    set({ incomingTrade: null });
    showToast('Trade was rejected.', 'warning');
  });

  socket.on('trade:cancelled', () => {
    set({ incomingTrade: null });
    showToast('Trade was cancelled.', 'info');
  });

  return {
    connected: false,
    myId: null,
    room: null,
    game: null,
    turn: null,
    auction: null,
    diceResult: null,
    lastCardDraw: null,
    incomingTrade: null,
    error: null,

    connect: () => {
      const playerName = localStorage.getItem('dino_player_name') || '';
      const sessionToken = localStorage.getItem('dino_session_token') || '';
      socket.auth = { name: playerName, sessionToken };
      if (!socket.connected) socket.connect();
    },

    joinRoom: (code, name) => {
      localStorage.setItem('dino_player_name', name);
      const reconnectToken = localStorage.getItem('dino_reconnect_token') || undefined;
      socket.emit('room:join', { room_code: code, name, reconnect_token: reconnectToken }, (response: any) => {
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
      localStorage.setItem('dino_player_name', name);
      socket.emit('room:create', { name }, (response: any) => {
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

    declareBankruptcy: () => {
      socket.emit('game:declare_bankruptcy', {}, (response: any) => {
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
          soundManager.playBuild('house');
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
          soundManager.playBuild('hotel');
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
    },

    mortgageProperty: (propertyId) => {
      socket.emit('property:mortgage', { property_id: propertyId }, (response: any) => {
        if (response.status === 'error') {
          set({ error: response.message });
          showToast(response.message, 'error');
        } else {
          showToast('Property mortgaged!', 'success');
          soundManager.playMortgage();
        }
      });
    },

    unmortgageProperty: (propertyId) => {
      socket.emit('property:unmortgage', { property_id: propertyId }, (response: any) => {
        if (response.status === 'error') {
          set({ error: response.message });
          showToast(response.message, 'error');
        } else {
          showToast('Property unmortgaged!', 'success');
          soundManager.playUnmortgage();
        }
      });
    },

    payJailFine: () => {
      socket.emit('game:pay_jail_fine', {}, (response: any) => {
        if (response.status === 'error') {
          set({ error: response.message });
          showToast(response.message, 'error');
        } else {
          showToast('Paid fine and released from jail!', 'success');
          soundManager.playJailEscape();
        }
      });
    },

    useJailCard: () => {
      socket.emit('game:use_jail_card', {}, (response: any) => {
        if (response.status === 'error') {
          set({ error: response.message });
          showToast(response.message, 'error');
        } else {
          showToast('Used Get Out of Jail Free card!', 'success');
          soundManager.playJailEscape();
        }
      });
    },

    payTax: (usePercentage: boolean) => {
      socket.emit('game:pay_tax', { use_percentage: usePercentage }, (response: any) => {
        if (response.status === 'error') {
          set({ error: response.message });
          showToast(response.message, 'error');
        } else {
          showToast(usePercentage ? 'Paid 10% of worth!' : 'Tax paid!', 'success');
        }
      });
    },

    collectRent: () => {
      socket.emit('game:collect_rent', {}, (response: any) => {
        if (response.status === 'error') {
          set({ error: response.message });
          showToast(response.message, 'error');
        } else {
          showToast('Rent collected!', 'success');
        }
      });
    },

    acceptTrade: (tradeId: string) => {
      socket.emit('trade:accept', { trade_id: tradeId }, (response: any) => {
        if (response.status === 'error') {
          set({ error: response.message });
          showToast(response.message, 'error');
        } else {
          showToast('Trade accepted!', 'success');
          set({ incomingTrade: null });
        }
      });
    },

    rejectTrade: (tradeId: string) => {
      socket.emit('trade:reject', { trade_id: tradeId }, (response: any) => {
        if (response.status === 'error') {
          set({ error: response.message });
          showToast(response.message, 'error');
        } else {
          showToast('Trade rejected.', 'info');
          set({ incomingTrade: null });
        }
      });
    },

    clearCardDraw: () => {
      set({ lastCardDraw: null });
    },

    clearIncomingTrade: () => {
      set({ incomingTrade: null });
    }
  };
});
