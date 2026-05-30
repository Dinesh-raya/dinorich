import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

const registrations: Array<{ event: string; handler: (...args: any[]) => void }> = [];

const mockSocket = {
  id: 'test-socket-id',
  connected: false,
  connect: vi.fn(),
  on: vi.fn((event: string, handler: (...args: any[]) => void) => {
    registrations.push({ event, handler });
  }),
  emit: vi.fn((_event: string, _data: any, cb?: Function) => {
    if (cb) cb({ status: 'ok' });
  }),
  removeAllListeners: vi.fn(),
  auth: {} as Record<string, string>,
  io: {
    on: vi.fn(),
    removeAllListeners: vi.fn(),
  },
};

vi.mock('../../../services/socket', () => ({
  socket: mockSocket,
}));

vi.mock('../../../utils/audio', () => ({
  soundManager: {
    play: vi.fn(),
    isSoundEnabled: vi.fn(() => true),
    toggleSound: vi.fn(() => true),
  },
  hapticFeedback: vi.fn(),
}));

vi.mock('../../../components/Toast', () => ({
  showToast: vi.fn(),
}));

const localStorageMock: Record<string, string> = {};
let useGameStore: any;

beforeEach(async () => {
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

  const mod = await import('../../../stores/gameStore');
  useGameStore = mod.useGameStore;
});

afterEach(() => {
  vi.unstubAllGlobals();
});

function handler(event: string) {
  const r = registrations.find(r => r.event === event);
  return r ? r.handler : null;
}

describe('gameStore', () => {
  it('exports useGameStore as a function', () => {
    expect(useGameStore).toBeDefined();
    expect(typeof useGameStore).toBe('function');
  });

  it('initializes with default state', () => {
    const state = useGameStore.getState();
    expect(state.connected).toBe(false);
    expect(state.myId).toBeNull();
    expect(state.room).toBeNull();
    expect(state.game).toBeNull();
    expect(state.turn).toBeNull();
    expect(state.auction).toBeNull();
    expect(state.diceResult).toBeNull();
    expect(state.error).toBeNull();
    expect(state.moneyChange).toBeNull();
    expect(state.pendingAction).toBeNull();
  });

  it('registers all expected socket event listeners on init', () => {
    const expected = [
      'connect',
      'disconnect',
      'connect_error',
      'session:init',
      'room:state_update',
      'game:start',
      'game:state_update',
      'auction:start',
      'auction:state_update',
      'auction:end',
      'game:dice_result',
      'game:over',
      'card:result',
      'trade:offer',
      'trade:completed',
      'trade:rejected',
      'trade:cancelled',
      'room:kicked',
    ];
    const registered = registrations.map(r => r.event);
    for (const ev of expected) {
      expect(registered).toContain(ev);
    }
  });

  it('sets connected state on socket connect event', () => {
    const h = handler('connect');
    expect(h).toBeDefined();
    h!();
    expect(useGameStore.getState().connected).toBe(true);
    // myId is set by session:init, not by connect
    expect(useGameStore.getState().myId).toBeNull();
  });

  it('handles session:init event and stores credentials', () => {
    const h = handler('session:init');
    expect(h).toBeDefined();
    h!({ session_token: 'new-token', session_id: 'stable-id' });
    expect(useGameStore.getState().myId).toBe('stable-id');
    expect(localStorageMock['dino_session_token']).toBe('new-token');
  });

  it('sets connected false on disconnect', () => {
    const h = handler('disconnect');
    expect(h).toBeDefined();
    h!();
    expect(useGameStore.getState().connected).toBe(false);
  });

  it('sets error on connect_error', () => {
    const h = handler('connect_error');
    expect(h).toBeDefined();
    h!(new Error('boom'));
    expect(useGameStore.getState().error).toBe('Connection failed: boom');
  });

  it('handles room:state_update event', () => {
    const h = handler('room:state_update');
    expect(h).toBeDefined();

    const mockRoom = { room_id: 'ABCDEF', host_id: 'test', players: {}, status: 'waiting' };
    h!(mockRoom);
    expect(useGameStore.getState().room).toEqual(mockRoom);
  });

  it('connects and sets socket auth', () => {
    localStorageMock['dino_player_name'] = 'TestPlayer';
    localStorageMock['dino_session_token'] = 'tok123';

    useGameStore.getState().connect();

    expect(mockSocket.auth).toEqual({ name: 'TestPlayer', sessionToken: 'tok123' });
    expect(mockSocket.connect).toHaveBeenCalled();
  });

  it('creates room via socket emit', () => {
    useGameStore.getState().createRoom('TestPlayer');

    expect(localStorageMock['dino_player_name']).toBe('TestPlayer');
    expect(mockSocket.emit).toHaveBeenCalledWith('room:create', { name: 'TestPlayer' }, expect.any(Function));
  });

  it('joins room via socket emit', () => {
    useGameStore.getState().joinRoom('ABCDEF', 'TestPlayer');

    expect(localStorageMock['dino_player_name']).toBe('TestPlayer');
    expect(mockSocket.emit).toHaveBeenCalledWith(
      'room:join',
      expect.objectContaining({ room_code: 'ABCDEF', name: 'TestPlayer' }),
      expect.any(Function)
    );
  });

  it('blocks duplicate emits while action is pending', () => {
    useGameStore.setState({ pendingAction: 'rollDice' });
    useGameStore.getState().endTurn();
    expect(mockSocket.emit).not.toHaveBeenCalled();
  });

  it('allows emits after pending action is cleared', () => {
    useGameStore.setState({ pendingAction: 'rollDice' });
    useGameStore.setState({ pendingAction: null });
    useGameStore.getState().endTurn();
    expect(mockSocket.emit).toHaveBeenCalledWith('game:end_turn', {}, expect.any(Function));
  });

  it('rolls dice via socket emit', () => {
    useGameStore.getState().rollDice();
    expect(mockSocket.emit).toHaveBeenCalledWith('game:dice_roll', {}, expect.any(Function));
  });

  it('ends turn via socket emit', () => {
    useGameStore.getState().endTurn();
    expect(mockSocket.emit).toHaveBeenCalledWith('game:end_turn', {}, expect.any(Function));
  });

  it('handles dice_result event', () => {
    const h = handler('game:dice_result');
    expect(h).toBeDefined();

    const mockDice = { die1: 3, die2: 5, total: 8, is_double: false };
    h!(mockDice);
    expect(useGameStore.getState().diceResult).toEqual(mockDice);
  });

  it('resets state on leaveGame', () => {
    // leaveGame skips emit when socket is disconnected (disconnect handler cleans up server-side)
    mockSocket.connected = false;
    useGameStore.getState().leaveGame();

    // When disconnected, no emit is sent
    expect(mockSocket.emit).not.toHaveBeenCalledWith('room:leave', expect.any(Function));

    const state = useGameStore.getState();
    expect(state.room).toBeNull();
    expect(state.game).toBeNull();
    expect(state.turn).toBeNull();
  });

  it('handles game:start event', () => {
    const h = handler('game:start');
    expect(h).toBeDefined();

    const mockData = {
      game: { room: { room_id: 'X' }, properties: {}, turn_order: [], current_turn_index: 0, history_log: [] },
      turn: { active_player_id: 'p1', phase: 'roll', can_roll: true, can_end_turn: false, in_debt: false, debt_creditor_id: null, time_remaining: 60, pending_tax: null, pending_rent: null },
    };
    h!(mockData);
    expect(useGameStore.getState().game).toEqual(mockData.game);
    expect(useGameStore.getState().turn).toEqual(mockData.turn);
  });

  it('handles auction:start event', () => {
    const h = handler('auction:start');
    expect(h).toBeDefined();

    const mockAuction = { property_id: 5, highest_bidder_id: null, current_bid: 0, time_remaining: 30, active: true, participants: ['p1'] };
    h!({ auction: mockAuction });
    expect(useGameStore.getState().auction).toEqual(mockAuction);
  });

  it('handles auction:end event', () => {
    useGameStore.getState().auction = { property_id: 5, highest_bidder_id: null, current_bid: 0, time_remaining: 30, active: true, participants: ['p1'] };

    const h = handler('auction:end');
    expect(h).toBeDefined();
    h!();
    expect(useGameStore.getState().auction).toBeNull();
  });

  it('handles game:over event', () => {
    const h = handler('game:over');
    expect(h).toBeDefined();

    h!({ winner_id: 'p1', winner_name: 'Alice' });
    expect(useGameStore.getState().gameOver).toEqual({ winner_id: 'p1', winner_name: 'Alice' });
  });

  it('handles incoming trade:offer', () => {
    const h = handler('trade:offer');
    expect(h).toBeDefined();

    const myId = useGameStore.getState().myId || 'test-socket-id';
    h!({ trade_id: 't1', from_player_id: 'p2', to_player_id: myId, offering_money: 100, requesting_money: 200, offering_properties: [], requesting_properties: [], offering_get_out_of_jail_cards: 0, requesting_get_out_of_jail_cards: 0 });

    expect(useGameStore.getState().incomingTrade).toBeDefined();
    expect(useGameStore.getState().incomingTrade.trade_id).toBe('t1');
  });

  it('handles trade:completed', () => {
    useGameStore.getState().incomingTrade = { trade_id: 't1' } as any;
    useGameStore.getState().outgoingTradeId = 't1';

    const h = handler('trade:completed');
    expect(h).toBeDefined();
    h!();
    expect(useGameStore.getState().incomingTrade).toBeNull();
    expect(useGameStore.getState().outgoingTradeId).toBeNull();
  });

  it('handles trade:rejected', () => {
    useGameStore.getState().incomingTrade = { trade_id: 't1' } as any;

    const h = handler('trade:rejected');
    expect(h).toBeDefined();
    h!();
    expect(useGameStore.getState().incomingTrade).toBeNull();
  });

  it('handles room:kicked', () => {
    const h = handler('room:kicked');
    expect(h).toBeDefined();
    h!({ message: 'Go away' });
    expect(useGameStore.getState().room).toBeNull();
    expect(useGameStore.getState().game).toBeNull();
    expect(useGameStore.getState().turn).toBeNull();
  });

  it('buyProperty emits property:buy', () => {
    useGameStore.getState().buyProperty(10);
    expect(mockSocket.emit).toHaveBeenCalledWith('property:buy', { property_id: 10 }, expect.any(Function));
  });

  it('placeBid emits auction:bid', () => {
    useGameStore.getState().placeBid(500);
    expect(mockSocket.emit).toHaveBeenCalledWith('auction:bid', { amount: 500 }, expect.any(Function));
  });

  it('startGame emits game:start', () => {
    useGameStore.getState().startGame();
    expect(mockSocket.emit).toHaveBeenCalledWith('game:start', {}, expect.any(Function));
  });

  it('declareBankruptcy emits game:declare_bankruptcy', () => {
    useGameStore.getState().declareBankruptcy();
    expect(mockSocket.emit).toHaveBeenCalledWith('game:declare_bankruptcy', {}, expect.any(Function));
  });

  it('updateRoomSettings emits room:update_settings', () => {
    useGameStore.getState().updateRoomSettings({ max_players: 4 } as any);
    expect(mockSocket.emit).toHaveBeenCalledWith('room:update_settings', { settings: { max_players: 4 } }, expect.any(Function));
  });

  it('buildHouse emits property:build_house', () => {
    useGameStore.getState().buildHouse(5);
    expect(mockSocket.emit).toHaveBeenCalledWith('property:build_house', { property_id: 5 }, expect.any(Function));
  });

  it('mortgageProperty emits property:mortgage', () => {
    useGameStore.getState().mortgageProperty(5);
    expect(mockSocket.emit).toHaveBeenCalledWith('property:mortgage', { property_id: 5 }, expect.any(Function));
  });

  it('unmortgageProperty emits property:unmortgage', () => {
    useGameStore.getState().unmortgageProperty(5);
    expect(mockSocket.emit).toHaveBeenCalledWith('property:unmortgage', { property_id: 5 }, expect.any(Function));
  });
});
