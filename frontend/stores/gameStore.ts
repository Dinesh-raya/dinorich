import { create } from 'zustand';
import { createConnectionSlice, ConnectionSlice } from './slices/connectionSlice';
import { createRoomSlice, RoomSlice } from './slices/roomSlice';
import { createGameSlice, GameSlice } from './slices/gameSlice';
import { createPropertySlice, PropertySlice } from './slices/propertySlice';
import { createAuctionSlice, AuctionSlice } from './slices/auctionSlice';
import { createUiSlice, UiSlice } from './slices/uiSlice';
import { setupSocketListeners, resetSocketTracking } from './slices/socketListeners';

export type StoreState = ConnectionSlice & RoomSlice & GameSlice & PropertySlice & AuctionSlice & UiSlice;

export const useGameStore = create<StoreState>()((set, get, store) => {
  setupSocketListeners(get, set);

  const slices = {
    ...createConnectionSlice(set, get, store),
    ...createRoomSlice(set, get, store),
    ...createGameSlice(set, get, store),
    ...createPropertySlice(set, get, store),
    ...createAuctionSlice(set, get, store),
    ...createUiSlice(set, get, store),
  };

  return {
    ...slices,
    leaveGame: () => {
      resetSocketTracking();
      slices.leaveGame();
    },
  };
});
