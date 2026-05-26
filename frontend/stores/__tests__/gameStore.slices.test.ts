import { describe, expect, it, vi, beforeEach } from 'vitest';
import { create } from 'zustand';

// Use vi.hoisted so mockSocket is available when vi.mock calls are hoisted
const { mockSocket } = vi.hoisted(() => {
  const mockSocket = {
    id: 'test-socket-id',
    connected: false,
    connect: vi.fn(),
    on: vi.fn(),
    off: vi.fn(),
    emit: vi.fn(),
    removeAllListeners: vi.fn(),
    auth: {} as Record<string, string>,
    io: {
      on: vi.fn(),
      off: vi.fn(),
      removeAllListeners: vi.fn(),
    },
  };
  return { mockSocket };
});

vi.mock('../../services/socket', () => ({
  socket: mockSocket,
}));

vi.mock('../../components/Toast', () => ({
  showToast: vi.fn(),
}));

vi.mock('../../utils/audio', () => ({
  soundManager: {
    playButtonClick: vi.fn(),
    playGameStart: vi.fn(),
    playBuyProperty: vi.fn(),
    playAuctionBid: vi.fn(),
    playAuctionEnd: vi.fn(),
    playBankruptcy: vi.fn(),
    playJailEntry: vi.fn(),
    playJailEscape: vi.fn(),
    playPayRent: vi.fn(),
    playPlayerMove: vi.fn(),
    playPassGo: vi.fn(),
    playCardDraw: vi.fn(),
    playBuild: vi.fn(),
    playMortgage: vi.fn(),
    playUnmortgage: vi.fn(),
    playTradeComplete: vi.fn(),
    playGameEnd: vi.fn(),
    playDiceRoll: vi.fn(),
    playDiceLand: vi.fn(),
    playDiceDouble: vi.fn(),
    isSoundEnabled: vi.fn(() => true),
    setSoundEnabled: vi.fn(),
    setVolume: vi.fn(),
    toggleSound: vi.fn(() => true),
  },
}));

import { createConnectionSlice } from '../../stores/slices/connectionSlice';
import { createRoomSlice } from '../../stores/slices/roomSlice';
import { createUiSlice } from '../../stores/slices/uiSlice';
import { createAuctionSlice } from '../../stores/slices/auctionSlice';
import { createGameSlice } from '../../stores/slices/gameSlice';
import { createPropertySlice } from '../../stores/slices/propertySlice';

const localStorageMock: Record<string, string> = {};

beforeEach(() => {
  vi.clearAllMocks();
  Object.keys(localStorageMock).forEach(k => delete localStorageMock[k]);

  vi.stubGlobal('localStorage', {
    getItem: vi.fn((key: string) => localStorageMock[key] ?? null),
    setItem: vi.fn((key: string, value: string) => { localStorageMock[key] = value; }),
    removeItem: vi.fn((key: string) => { delete localStorageMock[key]; }),
    clear: vi.fn(() => { Object.keys(localStorageMock).forEach(k => delete localStorageMock[k]); }),
    length: 0,
    key: vi.fn(() => null),
  });
});

// Helper: create a store with specific slice(s)
function createTestStore(...sliceCreators: any[]) {
  return (create as any)()((...args: any[]) => Object.assign({}, ...sliceCreators.map(s => s(...args))));
}

// ========== Connection Slice ==========
describe('ConnectionSlice', () => {
  it('initializes with connected=false and myId=null', () => {
    const store = createTestStore(createConnectionSlice);
    expect(store.getState().connected).toBe(false);
    expect(store.getState().myId).toBeNull();
  });

  it('connect() sets socket auth from localStorage and calls socket.connect()', () => {
    localStorageMock['dino_player_name'] = 'TestPlayer';
    localStorageMock['dino_session_token'] = 'tok123';
    mockSocket.connected = false;

    const store = createTestStore(createConnectionSlice);
    store.getState().connect();

    expect(mockSocket.auth).toEqual({ name: 'TestPlayer', sessionToken: 'tok123' });
    expect(mockSocket.connect).toHaveBeenCalled();
  });

  it('connect() does not call connect when already connected', () => {
    localStorageMock['dino_player_name'] = 'TestPlayer';
    mockSocket.connected = true;
    vi.clearAllMocks();

    const store = createTestStore(createConnectionSlice);
    store.getState().connect();

    expect(mockSocket.connect).not.toHaveBeenCalled();
  });

  it('connect() uses empty strings when localStorage is empty', () => {
    mockSocket.connected = false;

    const store = createTestStore(createConnectionSlice);
    store.getState().connect();

    expect(mockSocket.auth).toEqual({ name: '', sessionToken: '' });
  });
});

// ========== Room Slice ==========
describe('RoomSlice', () => {
  it('initializes with room=null', () => {
    const store = createTestStore(createRoomSlice);
    expect(store.getState().room).toBeNull();
  });

  it('createRoom emits room:create with player name', () => {
    const store = createTestStore(createRoomSlice);
    store.getState().createRoom('Alice');

    expect(localStorageMock['dino_player_name']).toBe('Alice');
    expect(mockSocket.emit).toHaveBeenCalledWith('room:create', { name: 'Alice' }, expect.any(Function));
  });

  it('joinRoom emits room:join with code and name', () => {
    const store = createTestStore(createRoomSlice);
    store.getState().joinRoom('ABCDEF', 'Bob');

    expect(localStorageMock['dino_player_name']).toBe('Bob');
    expect(mockSocket.emit).toHaveBeenCalledWith(
      'room:join',
      expect.objectContaining({ room_code: 'ABCDEF', name: 'Bob' }),
      expect.any(Function)
    );
  });

  it('createRoom sets room on success callback', () => {
    mockSocket.emit = vi.fn((_event: string, _data: any, cb?: Function) => {
      if (cb) cb({ status: 'success', room: { room_id: 'XYZ', host_id: 'p1', players: {}, status: 'waiting' } });
    });

    const store = createTestStore(createRoomSlice, createUiSlice);
    store.getState().createRoom('Alice');

    expect(store.getState().room).toEqual(expect.objectContaining({ room_id: 'XYZ' }));
    expect(store.getState().error).toBeNull();
  });

  it('createRoom sets error on failure callback', () => {
    mockSocket.emit = vi.fn((_event: string, _data: any, cb?: Function) => {
      if (cb) cb({ status: 'error', message: 'Name already taken' });
    });

    const store = createTestStore(createRoomSlice, createUiSlice);
    store.getState().createRoom('Alice');

    expect(store.getState().error).toBe('Name already taken');
  });

  it('joinRoom sets room on success callback', () => {
    mockSocket.emit = vi.fn((_event: string, _data: any, cb?: Function) => {
      if (cb) cb({ status: 'success', room: { room_id: 'ABCDEF', host_id: 'p2', players: {}, status: 'waiting' } });
    });

    const store = createTestStore(createRoomSlice);
    store.getState().joinRoom('ABCDEF', 'Bob');

    expect(store.getState().room).toEqual(expect.objectContaining({ room_id: 'ABCDEF' }));
  });

  it('joinRoom sets error on failure callback', () => {
    mockSocket.emit = vi.fn((_event: string, _data: any, cb?: Function) => {
      if (cb) cb({ status: 'error', message: 'Room not found' });
    });

    const store = createTestStore(createRoomSlice, createUiSlice);
    store.getState().joinRoom('XXXXXX', 'Bob');

    expect(store.getState().error).toBe('Room not found');
  });

  it('createRoom saves session ID on success', () => {
    mockSocket.emit = vi.fn((_event: string, _data: any, cb?: Function) => {
      if (cb) cb({ status: 'success', sessionId: 'my-session-id', room: { room_id: 'XYZ', host_id: 'p1', players: {}, status: 'waiting' } });
    });

    const store = createTestStore(createRoomSlice);
    store.getState().createRoom('Alice');

    expect(store.getState().room).toBeDefined();
  });

  it('leaveGame clears room state when socket is disconnected', () => {
    mockSocket.connected = false;

    const store = createTestStore(createRoomSlice);
    store.getState().leaveGame();

    expect(store.getState().room).toBeNull();
  });

  it('leaveGame emits room:leave when socket is connected', () => {
    mockSocket.connected = true;
    mockSocket.emit = vi.fn();

    const store = createTestStore(createRoomSlice);
    store.getState().leaveGame();

    expect(mockSocket.emit).toHaveBeenCalledWith('room:leave', expect.any(Function));
  });
});

// ========== UI Slice ==========
describe('UiSlice', () => {
  it('initializes with default UI state', () => {
    const store = createTestStore(createUiSlice);
    expect(store.getState().error).toBeNull();
    expect(store.getState().pendingAction).toBeNull();
    expect(store.getState().lastCardDraw).toBeNull();
    expect(store.getState().moneyChange).toBeNull();
  });

  it('clearCardDraw resets lastCardDraw to null', () => {
    const store = createTestStore(createUiSlice);
    store.setState({ lastCardDraw: { card: { action: 'move', text: 'Go to jail' }, card_type: 'surprise', player_id: 'p1' } });
    expect(store.getState().lastCardDraw).not.toBeNull();

    store.getState().clearCardDraw();
    expect(store.getState().lastCardDraw).toBeNull();
  });

  it('clearPendingAction resets pendingAction to null', () => {
    const store = createTestStore(createUiSlice);
    store.setState({ pendingAction: 'rollDice' });
    expect(store.getState().pendingAction).toBe('rollDice');

    store.getState().clearPendingAction();
    expect(store.getState().pendingAction).toBeNull();
  });
});

// ========== Auction Slice ==========
describe('AuctionSlice', () => {
  it('initializes with auction=null', () => {
    const store = createTestStore(createAuctionSlice);
    expect(store.getState().auction).toBeNull();
  });

  it('startAuction emits auction:start with property_id', () => {
    mockSocket.emit = vi.fn();

    const store = createTestStore(createAuctionSlice);
    store.getState().startAuction(10);

    expect(mockSocket.emit).toHaveBeenCalledWith('auction:start', { property_id: 10 }, expect.any(Function));
  });

  it('placeBid emits auction:bid with amount', () => {
    mockSocket.emit = vi.fn();

    const store = createTestStore(createAuctionSlice);
    store.getState().placeBid(500);

    expect(mockSocket.emit).toHaveBeenCalledWith('auction:bid', { amount: 500 }, expect.any(Function));
  });

  it('endAuction emits auction:end', () => {
    mockSocket.emit = vi.fn();

    const store = createTestStore(createAuctionSlice);
    store.getState().endAuction();

    expect(mockSocket.emit).toHaveBeenCalledWith('auction:end', {}, expect.any(Function));
  });

  it('startAuction sets error on failure', () => {
    mockSocket.emit = vi.fn((_event: string, _data: any, cb?: Function) => {
      if (cb) cb({ status: 'error', message: 'Not your turn' });
    });

    const store = createTestStore(createAuctionSlice, createUiSlice);
    store.getState().startAuction(10);

    expect(store.getState().error).toBe('Not your turn');
  });
});

// ========== Game Slice ==========
describe('GameSlice', () => {
  it('initializes with default game state', () => {
    const store = createTestStore(createGameSlice);
    expect(store.getState().game).toBeNull();
    expect(store.getState().turn).toBeNull();
    expect(store.getState().diceResult).toBeNull();
    expect(store.getState().incomingTrade).toBeNull();
    expect(store.getState().outgoingTradeId).toBeNull();
    expect(store.getState().gameOver).toBeNull();
    expect(store.getState().hasSave).toBe(false);
  });

  it('rollDice emits game:dice_roll', () => {
    mockSocket.emit = vi.fn();

    const store = createTestStore(createGameSlice);
    store.getState().rollDice();

    expect(mockSocket.emit).toHaveBeenCalledWith('game:dice_roll', {}, expect.any(Function));
  });

  it('endTurn emits game:end_turn', () => {
    mockSocket.emit = vi.fn();

    const store = createTestStore(createGameSlice);
    store.getState().endTurn();

    expect(mockSocket.emit).toHaveBeenCalledWith('game:end_turn', {}, expect.any(Function));
  });

  it('declareBankruptcy emits game:declare_bankruptcy', () => {
    mockSocket.emit = vi.fn();

    const store = createTestStore(createGameSlice);
    store.getState().declareBankruptcy();

    expect(mockSocket.emit).toHaveBeenCalledWith('game:declare_bankruptcy', {}, expect.any(Function));
  });

  it('startGame emits game:start', () => {
    mockSocket.emit = vi.fn();

    const store = createTestStore(createGameSlice);
    store.getState().startGame();

    expect(mockSocket.emit).toHaveBeenCalledWith('game:start', {}, expect.any(Function));
  });

  it('payJailFine emits game:pay_jail_fine', () => {
    mockSocket.emit = vi.fn();

    const store = createTestStore(createGameSlice);
    store.getState().payJailFine();

    expect(mockSocket.emit).toHaveBeenCalledWith('game:pay_jail_fine', {}, expect.any(Function));
  });

  it('useJailCard emits game:use_jail_card', () => {
    mockSocket.emit = vi.fn();

    const store = createTestStore(createGameSlice);
    store.getState().useJailCard();

    expect(mockSocket.emit).toHaveBeenCalledWith('game:use_jail_card', {}, expect.any(Function));
  });

  it('payTax emits game:pay_tax with use_percentage flag', () => {
    mockSocket.emit = vi.fn();

    const store = createTestStore(createGameSlice);
    store.getState().payTax(true);

    expect(mockSocket.emit).toHaveBeenCalledWith('game:pay_tax', { use_percentage: true }, expect.any(Function));
  });

  it('acceptTrade emits trade:accept with trade_id', () => {
    mockSocket.emit = vi.fn();

    const store = createTestStore(createGameSlice);
    store.getState().acceptTrade('trade-123');

    expect(mockSocket.emit).toHaveBeenCalledWith('trade:accept', { trade_id: 'trade-123' }, expect.any(Function));
  });

  it('rejectTrade emits trade:reject with trade_id', () => {
    mockSocket.emit = vi.fn();

    const store = createTestStore(createGameSlice);
    store.getState().rejectTrade('trade-123');

    expect(mockSocket.emit).toHaveBeenCalledWith('trade:reject', { trade_id: 'trade-123' }, expect.any(Function));
  });

  it('cancelTrade emits trade:cancel with trade_id', () => {
    mockSocket.emit = vi.fn();

    const store = createTestStore(createGameSlice);
    store.getState().cancelTrade('trade-123');

    expect(mockSocket.emit).toHaveBeenCalledWith('trade:cancel', { trade_id: 'trade-123' }, expect.any(Function));
  });

  it('clearIncomingTrade resets incomingTrade to null', () => {
    const store = createTestStore(createGameSlice);
    store.setState({ incomingTrade: { trade_id: 't1', from_player_id: 'p1', to_player_id: 'p2', offering_money: 100, requesting_money: 200, offering_properties: [], requesting_properties: [], offering_get_out_of_jail_cards: 0, requesting_get_out_of_jail_cards: 0 } });

    store.getState().clearIncomingTrade();
    expect(store.getState().incomingTrade).toBeNull();
  });
});

// ========== Property Slice ==========
describe('PropertySlice', () => {
  it('buyProperty emits property:buy with property_id', () => {
    mockSocket.emit = vi.fn();

    const store = createTestStore(createPropertySlice);
    store.getState().buyProperty(15);

    expect(mockSocket.emit).toHaveBeenCalledWith('property:buy', { property_id: 15 }, expect.any(Function));
  });

  it('buildHouse emits property:build_house', () => {
    mockSocket.emit = vi.fn();

    const store = createTestStore(createPropertySlice);
    store.getState().buildHouse(5);

    expect(mockSocket.emit).toHaveBeenCalledWith('property:build_house', { property_id: 5 }, expect.any(Function));
  });

  it('buildHotel emits property:build_hotel', () => {
    mockSocket.emit = vi.fn();

    const store = createTestStore(createPropertySlice);
    store.getState().buildHotel(5);

    expect(mockSocket.emit).toHaveBeenCalledWith('property:build_hotel', { property_id: 5 }, expect.any(Function));
  });

  it('sellHouse emits property:sell_house', () => {
    mockSocket.emit = vi.fn();

    const store = createTestStore(createPropertySlice);
    store.getState().sellHouse(5);

    expect(mockSocket.emit).toHaveBeenCalledWith('property:sell_house', { property_id: 5 }, expect.any(Function));
  });

  it('sellHotel emits property:sell_hotel', () => {
    mockSocket.emit = vi.fn();

    const store = createTestStore(createPropertySlice);
    store.getState().sellHotel(5);

    expect(mockSocket.emit).toHaveBeenCalledWith('property:sell_hotel', { property_id: 5 }, expect.any(Function));
  });

  it('mortgageProperty emits property:mortgage', () => {
    mockSocket.emit = vi.fn();

    const store = createTestStore(createPropertySlice);
    store.getState().mortgageProperty(5);

    expect(mockSocket.emit).toHaveBeenCalledWith('property:mortgage', { property_id: 5 }, expect.any(Function));
  });

  it('unmortgageProperty emits property:unmortgage', () => {
    mockSocket.emit = vi.fn();

    const store = createTestStore(createPropertySlice);
    store.getState().unmortgageProperty(5);

    expect(mockSocket.emit).toHaveBeenCalledWith('property:unmortgage', { property_id: 5 }, expect.any(Function));
  });
});

// ========== Combined Store Default State ==========
describe('Combined store defaults', () => {
  it('has all slice properties when combined', () => {
    const combinedStore = createTestStore(
      createConnectionSlice,
      createRoomSlice,
      createGameSlice,
      createUiSlice,
      createAuctionSlice,
      createPropertySlice
    );

    const state = combinedStore.getState() as any;

    // Connection
    expect(state.connected).toBe(false);
    expect(state.myId).toBeNull();
    expect(typeof state.connect).toBe('function');

    // Room
    expect(state.room).toBeNull();
    expect(typeof state.createRoom).toBe('function');
    expect(typeof state.joinRoom).toBe('function');
    expect(typeof state.leaveGame).toBe('function');

    // Game
    expect(state.game).toBeNull();
    expect(state.turn).toBeNull();
    expect(state.diceResult).toBeNull();
    expect(state.gameOver).toBeNull();
    expect(typeof state.rollDice).toBe('function');
    expect(typeof state.endTurn).toBe('function');
    expect(typeof state.declareBankruptcy).toBe('function');

    // UI
    expect(state.error).toBeNull();
    expect(state.pendingAction).toBeNull();
    expect(typeof state.clearCardDraw).toBe('function');
    expect(typeof state.clearPendingAction).toBe('function');

    // Auction
    expect(state.auction).toBeNull();
    expect(typeof state.startAuction).toBe('function');
    expect(typeof state.placeBid).toBe('function');

    // Property
    expect(typeof state.buyProperty).toBe('function');
    expect(typeof state.buildHouse).toBe('function');
    expect(typeof state.mortgageProperty).toBe('function');
    expect(typeof state.unmortgageProperty).toBe('function');
  });
});
