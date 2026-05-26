import { StateCreator } from 'zustand';
import type { CardDraw, MoneyChange } from './types';
import type { StoreState } from './storeTypes';

export interface UiSlice {
  error: string | null;
  pendingAction: string | null;
  lastCardDraw: CardDraw | null;
  moneyChange: MoneyChange | null;

  clearCardDraw: () => void;
  clearPendingAction: () => void;
}

export const createUiSlice: StateCreator<StoreState, [], [], UiSlice> = (set) => ({
  error: null,
  pendingAction: null,
  lastCardDraw: null,
  moneyChange: null,

  clearCardDraw: () => {
    set({ lastCardDraw: null });
  },

  clearPendingAction: () => {
    set({ pendingAction: null });
  },
});
