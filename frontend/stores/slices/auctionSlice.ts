import { StateCreator } from 'zustand';
import { socket } from '../../services/socket';
import { showToast } from '../../components/Toast';
import { formatMoney } from '../../utils/format';
import type { AuctionState } from './types';
import type { StoreState } from './storeTypes';

export interface AuctionSlice {
  auction: AuctionState | null;
  startAuction: (propertyId: number) => void;
  placeBid: (amount: number) => void;
  endAuction: () => void;
}

export const createAuctionSlice: StateCreator<StoreState, [], [], AuctionSlice> = (set, get) => ({
  auction: null,

  startAuction: (propertyId) => {
    if (get().pendingAction) return;
    set({ pendingAction: 'startAuction' });
    socket.emit('auction:start', { property_id: propertyId }, (response: any) => {
      set({ pendingAction: null });
      if (response.status === 'error') {
        set({ error: response.message });
        showToast(response.message, 'error');
      }
    });
  },

  placeBid: (amount) => {
    if (get().pendingAction) return;
    set({ pendingAction: 'placeBid' });
    socket.emit('auction:bid', { amount }, (response: any) => {
      set({ pendingAction: null });
      if (response.status === 'error') {
        set({ error: response.message });
        showToast(response.message, 'error');
      } else {
        showToast(`Bid placed: ${formatMoney(amount)}`, 'success');
      }
    });
  },

  endAuction: () => {
    if (get().pendingAction) return;
    set({ pendingAction: 'endAuction' });
    socket.emit('auction:end', {}, (response: any) => {
      set({ pendingAction: null });
      if (response.status === 'error') {
        set({ error: response.message });
        showToast(response.message, 'error');
      }
    });
  },
});
