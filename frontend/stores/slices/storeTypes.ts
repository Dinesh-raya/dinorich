import type { ConnectionSlice } from './connectionSlice';
import type { RoomSlice } from './roomSlice';
import type { GameSlice } from './gameSlice';
import type { PropertySlice } from './propertySlice';
import type { AuctionSlice } from './auctionSlice';
import type { UiSlice } from './uiSlice';

export type StoreState = ConnectionSlice & RoomSlice & GameSlice & PropertySlice & AuctionSlice & UiSlice;
