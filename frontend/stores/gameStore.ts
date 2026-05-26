import { create } from 'zustand';
import { createConnectionSlice } from './slices/connectionSlice';
import { createRoomSlice } from './slices/roomSlice';
import { createGameSlice } from './slices/gameSlice';
import { createPropertySlice } from './slices/propertySlice';
import { createAuctionSlice } from './slices/auctionSlice';
import { createUiSlice } from './slices/uiSlice';
import { setupSocketListeners, resetSocketTracking } from './slices/socketListeners';
import type { StoreState } from './slices/storeTypes';

let pendingActionTimeout: ReturnType<typeof setTimeout> | null = null;

export const useGameStore = create<StoreState>()((set, get, store) => {
  // Wrap set to add pendingAction timeout (auto-clear after 15s)
  const wrappedSet: typeof set = (partial, replace) => {
    set(partial, replace);
    if (partial && typeof partial === 'object' && 'pendingAction' in partial) {
      if (pendingActionTimeout) clearTimeout(pendingActionTimeout);
      if (partial.pendingAction) {
        pendingActionTimeout = setTimeout(() => {
          pendingActionTimeout = null;
          set({ pendingAction: null });
        }, 15000);
      } else {
        pendingActionTimeout = null;
      }
    }
  };

  setupSocketListeners(get, wrappedSet);

  const slices = {
    ...createConnectionSlice(wrappedSet, get, store),
    ...createRoomSlice(wrappedSet, get, store),
    ...createGameSlice(wrappedSet, get, store),
    ...createPropertySlice(wrappedSet, get, store),
    ...createAuctionSlice(wrappedSet, get, store),
    ...createUiSlice(wrappedSet, get, store),
  };

  return {
    ...slices,
    leaveGame: () => {
      if (pendingActionTimeout) clearTimeout(pendingActionTimeout);
      pendingActionTimeout = null;
      resetSocketTracking();
      slices.leaveGame();
    },
  };
});
