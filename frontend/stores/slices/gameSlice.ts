import { StateCreator } from 'zustand';
import { socket } from '../../services/socket';
import { showToast } from '../../components/Toast';
import type { GameState, TurnState, TradeOffer } from './types';
import type { StoreState } from './storeTypes';

export interface GameSlice {
  game: GameState | null;
  turn: TurnState | null;
  diceResult: { die1: number; die2: number; total: number; is_double: boolean } | null;
  incomingTrade: TradeOffer | null;
  outgoingTradeId: string | null;
  gameOver: { winner_id: string | null; winner_name: string } | null;

  startGame: () => void;
  rollDice: () => void;
  endTurn: () => void;
  declareBankruptcy: () => void;
  payJailFine: () => void;
  useJailCard: () => void;
  payTax: (usePercentage: boolean) => void;
  acceptTrade: (tradeId: string) => void;
  rejectTrade: (tradeId: string) => void;
  cancelTrade: (tradeId: string) => void;
  clearIncomingTrade: () => void;
}

export const createGameSlice: StateCreator<StoreState, [], [], GameSlice> = (set, get) => ({
  game: null,
  turn: null,
  diceResult: null,
  incomingTrade: null,
  outgoingTradeId: null,
  gameOver: null,

  startGame: () => {
    if (get().pendingAction) return;
    set({ pendingAction: 'startGame' });
    socket.emit('game:start', {}, (response: any) => {
      set({ pendingAction: null });
      if (response.status === 'error') set({ error: response.message });
      else set({ error: null });
    });
  },

  rollDice: () => {
    if (get().pendingAction) {
      showToast('Please wait for current action to complete...', 'warning');
      return;
    }
    set({ pendingAction: 'rollDice' });
    socket.emit('game:dice_roll', {}, (response: any) => {
      set({ pendingAction: null });
      if (response.status === 'error') {
        set({ error: response.message });
        showToast(response.message, 'error');
      }
    });
  },

  endTurn: () => {
    if (get().pendingAction) {
      showToast('Please wait for current action to complete...', 'warning');
      return;
    }
    set({ pendingAction: 'endTurn' });
    socket.emit('game:end_turn', {}, (response: any) => {
      set({ pendingAction: null });
      if (response.status === 'error') {
        set({ error: response.message });
        showToast(response.message, 'error');
      }
    });
  },

  declareBankruptcy: () => {
    if (get().pendingAction) {
      showToast('Please wait...', 'warning');
      return;
    }
    set({ pendingAction: 'declareBankruptcy' });
    socket.emit('game:declare_bankruptcy', {}, (response: any) => {
      set({ pendingAction: null });
      if (response.status === 'error') {
        set({ error: response.message });
        showToast(response.message, 'error');
      }
    });
  },

  payJailFine: () => {
    if (get().pendingAction) return;
    set({ pendingAction: 'payJailFine' });
    socket.emit('game:pay_jail_fine', {}, (response: any) => {
      set({ pendingAction: null });
      if (response.status === 'error') {
        set({ error: response.message });
        showToast(response.message, 'error');
      } else {
        showToast('Paid fine and released from jail!', 'success');
      }
    });
  },

  useJailCard: () => {
    if (get().pendingAction) return;
    set({ pendingAction: 'useJailCard' });
    socket.emit('game:use_jail_card', {}, (response: any) => {
      set({ pendingAction: null });
      if (response.status === 'error') {
        set({ error: response.message });
        showToast(response.message, 'error');
      } else {
        showToast('Used Get Out of Jail Free card!', 'success');
      }
    });
  },

  payTax: (usePercentage) => {
    if (get().pendingAction) return;
    set({ pendingAction: 'payTax' });
    socket.emit('game:pay_tax', { use_percentage: usePercentage }, (response: any) => {
      set({ pendingAction: null });
      if (response.status === 'error') {
        set({ error: response.message });
        showToast(response.message, 'error');
      } else {
        showToast(usePercentage ? 'Paid 10% of worth!' : 'Tax paid!', 'success');
      }
    });
  },

  acceptTrade: (tradeId) => {
    if (get().pendingAction) return;
    set({ pendingAction: 'acceptTrade' });
    socket.emit('trade:accept', { trade_id: tradeId }, (response: any) => {
      set({ pendingAction: null });
      if (response.status === 'error') {
        set({ error: response.message });
        showToast(response.message, 'error');
      } else {
        showToast('Trade accepted!', 'success');
        set({ incomingTrade: null });
      }
    });
  },

  rejectTrade: (tradeId) => {
    if (get().pendingAction) return;
    set({ pendingAction: 'rejectTrade' });
    socket.emit('trade:reject', { trade_id: tradeId }, (response: any) => {
      set({ pendingAction: null });
      if (response.status === 'error') {
        set({ error: response.message });
        showToast(response.message, 'error');
      } else {
        showToast('Trade rejected.', 'info');
        set({ incomingTrade: null });
      }
    });
  },

  cancelTrade: (tradeId) => {
    if (get().pendingAction) return;
    set({ pendingAction: 'cancelTrade' });
    socket.emit('trade:cancel', { trade_id: tradeId }, (response: any) => {
      set({ pendingAction: null });
      if (response.status === 'error') {
        set({ error: response.message });
        showToast(response.message, 'error');
      } else {
        showToast('Trade cancelled.', 'info');
        set({ outgoingTradeId: null });
      }
    });
  },

  clearIncomingTrade: () => {
    set({ incomingTrade: null });
  },
});
