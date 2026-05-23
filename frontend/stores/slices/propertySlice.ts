import { StateCreator } from 'zustand';
import { socket } from '../../services/socket';
import { showToast } from '../../components/Toast';
import { soundManager } from '../../utils/audio';
import type { StoreState } from './storeTypes';

export interface PropertySlice {
  buyProperty: (id: number) => void;
  buildHouse: (propertyId: number) => void;
  buildHotel: (propertyId: number) => void;
  sellHouse: (propertyId: number) => void;
  sellHotel: (propertyId: number) => void;
  mortgageProperty: (propertyId: number) => void;
  unmortgageProperty: (propertyId: number) => void;
}

export const createPropertySlice: StateCreator<StoreState, [], [], PropertySlice> = (set, get) => ({
  buyProperty: (id) => {
    if (get().pendingAction) {
      showToast('Please wait for current action to complete...', 'warning');
      return;
    }
    set({ pendingAction: 'buyProperty' });
    socket.emit('property:buy', { property_id: id }, (response: any) => {
      set({ pendingAction: null });
      if (response.status === 'error') {
        set({ error: response.message });
        showToast(response.message, 'error');
      } else {
        showToast('Property purchased!', 'success');
        soundManager.playBuyProperty();
      }
    });
  },

  buildHouse: (propertyId) => {
    if (get().pendingAction) return;
    set({ pendingAction: 'buildHouse' });
    socket.emit('property:build_house', { property_id: propertyId }, (response: any) => {
      set({ pendingAction: null });
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
    if (get().pendingAction) return;
    set({ pendingAction: 'buildHotel' });
    socket.emit('property:build_hotel', { property_id: propertyId }, (response: any) => {
      set({ pendingAction: null });
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
    if (get().pendingAction) return;
    set({ pendingAction: 'sellHouse' });
    socket.emit('property:sell_house', { property_id: propertyId }, (response: any) => {
      set({ pendingAction: null });
      if (response.status === 'error') {
        set({ error: response.message });
        showToast(response.message, 'error');
      } else {
        showToast('House sold!', 'info');
      }
    });
  },

  sellHotel: (propertyId) => {
    if (get().pendingAction) return;
    set({ pendingAction: 'sellHotel' });
    socket.emit('property:sell_hotel', { property_id: propertyId }, (response: any) => {
      set({ pendingAction: null });
      if (response.status === 'error') {
        set({ error: response.message });
        showToast(response.message, 'error');
      } else {
        showToast('Hotel sold!', 'info');
      }
    });
  },

  mortgageProperty: (propertyId) => {
    if (get().pendingAction) return;
    set({ pendingAction: 'mortgageProperty' });
    socket.emit('property:mortgage', { property_id: propertyId }, (response: any) => {
      set({ pendingAction: null });
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
    if (get().pendingAction) return;
    set({ pendingAction: 'unmortgageProperty' });
    socket.emit('property:unmortgage', { property_id: propertyId }, (response: any) => {
      set({ pendingAction: null });
      if (response.status === 'error') {
        set({ error: response.message });
        showToast(response.message, 'error');
      } else {
        showToast('Property unmortgaged!', 'success');
        soundManager.playUnmortgage();
      }
    });
  },
});
