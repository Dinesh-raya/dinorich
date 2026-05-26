import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { createElement, Fragment } from 'react';

// Mock framer-motion
vi.mock('framer-motion', () => ({
  AnimatePresence: ({ children }: { children: React.ReactNode }) =>
    createElement(Fragment, null, children),
  motion: new Proxy(
    {},
    {
      get: (_target, prop: string) => {
        return ({ children, ...rest }: any) => createElement(prop, rest, children);
      },
    }
  ),
}));

// Mock the audio utility
vi.mock('../../utils/audio', () => ({
  soundManager: {
    playButtonClick: vi.fn(),
    playPlayerMove: vi.fn(),
    playAuctionBid: vi.fn(),
  },
}));

// Mock the format utility
vi.mock('../../utils/format', () => ({
  formatMoney: (n: number) => `Rs${n}`,
  formatMoneyShort: (n: number) => `Rs${n}`,
}));

// Mock child components that have complex dependencies
vi.mock('../DiceAnim', () => ({
  DiceAnim: ({ die1, die2 }: any) =>
    createElement('div', { 'data-testid': 'dice-anim' }, `${die1}+${die2}`),
}));

vi.mock('../TokenVisualizer', () => ({
  TokenVisualizer: () => createElement('div', { 'data-testid': 'token-visualizer' }),
}));

vi.mock('../PropertyDetailModal', () => ({
  PropertyDetailModal: () => createElement('div', { 'data-testid': 'property-modal' }),
}));

// Mock board config data - path is relative to the test file location
vi.mock('../../../shared/configs/board_config.json', () => ({
  default: {
    tiles: [
      { id: 0, name: 'GO', type: 'corner' },
      { id: 1, name: 'Guwahati', type: 'property', color: 'brown', price: 600 },
      { id: 2, name: 'Treasury Card', type: 'treasury' },
      { id: 3, name: 'Goa', type: 'property', color: 'brown', price: 600 },
      { id: 4, name: 'Income Tax', type: 'tax', amount: 2400 },
      { id: 5, name: 'Delhi Airport', type: 'airport', price: 2000 },
      { id: 6, name: 'Ahmedabad', type: 'property', color: 'light_blue', price: 1000 },
      { id: 7, name: 'Surprise Card', type: 'surprise' },
      { id: 8, name: 'Pune', type: 'property', color: 'light_blue', price: 1000 },
      { id: 9, name: 'Hyderabad', type: 'property', color: 'light_blue', price: 1200 },
      { id: 10, name: 'Traffic Police Jail', type: 'corner' },
      { id: 11, name: 'Jaipur', type: 'property', color: 'pink', price: 1400 },
      { id: 12, name: 'NTPC Power', type: 'utility', price: 1500 },
      { id: 13, name: 'Chandigarh', type: 'property', color: 'pink', price: 1400 },
      { id: 14, name: 'Lucknow', type: 'property', color: 'pink', price: 1600 },
      { id: 15, name: 'Mumbai Airport', type: 'airport', price: 2000 },
      { id: 16, name: 'Kochi', type: 'property', color: 'orange', price: 1800 },
      { id: 17, name: 'Treasury Card', type: 'treasury' },
      { id: 18, name: 'Thiruvananthapuram', type: 'property', color: 'orange', price: 1800 },
      { id: 19, name: 'Chennai', type: 'property', color: 'orange', price: 2000 },
      { id: 20, name: 'Free Parking', type: 'corner' },
      { id: 21, name: 'Surat', type: 'property', color: 'red', price: 2200 },
      { id: 22, name: 'Surprise Card', type: 'surprise' },
      { id: 23, name: 'Indore', type: 'property', color: 'red', price: 2200 },
      { id: 24, name: 'Bhopal', type: 'property', color: 'red', price: 2400 },
      { id: 25, name: 'Chennai Airport', type: 'airport', price: 2000 },
      { id: 26, name: 'Kolkata', type: 'property', color: 'yellow', price: 2600 },
      { id: 27, name: 'Patna', type: 'property', color: 'yellow', price: 2600 },
      { id: 28, name: 'Jal Jeevan Water', type: 'utility', price: 1500 },
      { id: 29, name: 'Bengaluru', type: 'property', color: 'yellow', price: 2800 },
      { id: 30, name: 'Go To Jail', type: 'corner' },
      { id: 31, name: 'Noida', type: 'property', color: 'green', price: 3000 },
      { id: 32, name: 'Gurugram', type: 'property', color: 'green', price: 3000 },
      { id: 33, name: 'Treasury Card', type: 'treasury' },
      { id: 34, name: 'Agra', type: 'property', color: 'green', price: 3200 },
      { id: 35, name: 'Kolkata Airport', type: 'airport', price: 2000 },
      { id: 36, name: 'Surprise Card', type: 'surprise' },
      { id: 37, name: 'Mumbai', type: 'property', color: 'dark_blue', price: 3500 },
      { id: 38, name: 'Luxury Tax', type: 'tax', amount: 1500 },
      { id: 39, name: 'Delhi', type: 'property', color: 'dark_blue', price: 4000 },
    ],
  },
}));

// Mock window.matchMedia for useIsMobile hook
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock the gameStore
const mockGameStore: Record<string, any> = {
  game: null,
  myId: null,
  turn: null,
  diceResult: null,
  moneyChange: null,
  pendingAction: null,
};

const mockStoreActions = {
  rollDice: vi.fn(),
  endTurn: vi.fn(),
  declareBankruptcy: vi.fn(),
  buyProperty: vi.fn(),
  startAuction: vi.fn(),
  payJailFine: vi.fn(),
  useJailCard: vi.fn(),
  payTax: vi.fn(),
};

vi.mock('../../stores/gameStore', () => ({
  useGameStore: Object.assign(
    (selector?: (state: any) => any) => {
      const state = { ...mockGameStore, ...mockStoreActions };
      return selector ? selector(state) : state;
    },
    {
      getState: () => ({ ...mockGameStore, ...mockStoreActions }),
    }
  ),
}));

import { Board } from '../Board';

beforeEach(() => {
  vi.clearAllMocks();
  mockGameStore.game = null;
  mockGameStore.myId = null;
  mockGameStore.turn = null;
  mockGameStore.diceResult = null;
  mockGameStore.moneyChange = null;
  mockGameStore.pendingAction = null;
});

describe('Board', () => {
  it('renders null when no game exists', () => {
    mockGameStore.game = null;
    const { container } = render(<Board />);
    expect(container.firstChild).toBeNull();
  });

  it('renders the board grid when game exists', () => {
    mockGameStore.game = {
      room: {
        room_id: 'TEST',
        host_id: 'p1',
        status: 'playing',
        settings: { turn_timer_seconds: 60 },
        players: {
          p1: {
            id: 'p1',
            name: 'Player 1',
            position: 0,
            money: 15000,
            is_in_jail: false,
            is_bankrupt: false,
            color: '#ef4444',
            get_out_of_jail_cards: 0,
          },
        },
      },
      properties: {},
      turn_order: ['p1'],
      current_turn_index: 0,
      history_log: [],
    };
    mockGameStore.myId = 'p1';
    mockGameStore.turn = {
      active_player_id: 'p1',
      phase: 'action',
      can_roll: true,
      can_end_turn: false,
      in_debt: false,
      debt_creditor_id: null,
      time_remaining: 60,
      pending_tax: null,
      pending_rent: null,
    };

    render(<Board />);

    // The board title should be visible
    expect(screen.getByText('DINO-RICHUP')).toBeInTheDocument();
    expect(screen.getByText('PAN-INDIA EDITION')).toBeInTheDocument();
  });

  it('renders tile names from board config', () => {
    mockGameStore.game = {
      room: {
        room_id: 'TEST',
        host_id: 'p1',
        status: 'playing',
        settings: {},
        players: {
          p1: {
            id: 'p1',
            name: 'Player 1',
            position: 0,
            money: 15000,
            is_in_jail: false,
            is_bankrupt: false,
            color: '#ef4444',
            get_out_of_jail_cards: 0,
          },
        },
      },
      properties: {},
      turn_order: ['p1'],
      current_turn_index: 0,
      history_log: [],
    };
    mockGameStore.myId = 'p1';
    mockGameStore.turn = {
      active_player_id: 'p1',
      phase: 'action',
      can_roll: true,
      can_end_turn: false,
      in_debt: false,
      debt_creditor_id: null,
      time_remaining: 60,
      pending_tax: null,
      pending_rent: null,
    };

    render(<Board />);

    // Check a few tile names from the mock board config
    // Corner tiles have emoji icons in the same container, so we use non-corner tiles
    expect(screen.getByText('GO')).toBeInTheDocument();
    expect(screen.getByText('Guwahati')).toBeInTheDocument();
    expect(screen.getByText('Goa')).toBeInTheDocument();
    expect(screen.getByText('Ahmedabad')).toBeInTheDocument();
    expect(screen.getByText('Pune')).toBeInTheDocument();
    expect(screen.getByText('Bengaluru')).toBeInTheDocument();
    expect(screen.getByText('Delhi')).toBeInTheDocument();
  });

  it('renders the roll dice button on your turn', () => {
    mockGameStore.game = {
      room: {
        room_id: 'TEST',
        host_id: 'p1',
        status: 'playing',
        settings: {},
        players: {
          p1: {
            id: 'p1',
            name: 'Player 1',
            position: 0,
            money: 15000,
            is_in_jail: false,
            is_bankrupt: false,
            color: '#ef4444',
            get_out_of_jail_cards: 0,
          },
        },
      },
      properties: {},
      turn_order: ['p1'],
      current_turn_index: 0,
      history_log: [],
    };
    mockGameStore.myId = 'p1';
    mockGameStore.turn = {
      active_player_id: 'p1',
      phase: 'action',
      can_roll: true,
      can_end_turn: false,
      in_debt: false,
      debt_creditor_id: null,
      time_remaining: 60,
      pending_tax: null,
      pending_rent: null,
    };

    render(<Board />);

    expect(screen.getByText('YOUR TURN')).toBeInTheDocument();
    expect(screen.getByText('ROLL DICE')).toBeInTheDocument();
  });

  it('shows waiting message when it is another player\'s turn', () => {
    mockGameStore.game = {
      room: {
        room_id: 'TEST',
        host_id: 'p1',
        status: 'playing',
        settings: {},
        players: {
          p1: {
            id: 'p1',
            name: 'Player 1',
            position: 0,
            money: 15000,
            is_in_jail: false,
            is_bankrupt: false,
            color: '#ef4444',
            get_out_of_jail_cards: 0,
          },
          p2: {
            id: 'p2',
            name: 'Player 2',
            position: 5,
            money: 15000,
            is_in_jail: false,
            is_bankrupt: false,
            color: '#3b82f6',
            get_out_of_jail_cards: 0,
          },
        },
      },
      properties: {},
      turn_order: ['p1', 'p2'],
      current_turn_index: 1,
      history_log: [],
    };
    mockGameStore.myId = 'p1';
    mockGameStore.turn = {
      active_player_id: 'p2',
      phase: 'roll',
      can_roll: false,
      can_end_turn: false,
      in_debt: false,
      debt_creditor_id: null,
      time_remaining: 60,
      pending_tax: null,
      pending_rent: null,
    };

    render(<Board />);

    expect(screen.getByText('Waiting')).toBeInTheDocument();
    expect(screen.getByText(/Player 2/)).toBeInTheDocument();
  });

  it('renders the token visualizer overlay', () => {
    mockGameStore.game = {
      room: {
        room_id: 'TEST',
        host_id: 'p1',
        status: 'playing',
        settings: {},
        players: {
          p1: {
            id: 'p1',
            name: 'Player 1',
            position: 0,
            money: 15000,
            is_in_jail: false,
            is_bankrupt: false,
            color: '#ef4444',
            get_out_of_jail_cards: 0,
          },
        },
      },
      properties: {},
      turn_order: ['p1'],
      current_turn_index: 0,
      history_log: [],
    };
    mockGameStore.myId = 'p1';
    mockGameStore.turn = {
      active_player_id: 'p1',
      phase: 'action',
      can_roll: true,
      can_end_turn: false,
      in_debt: false,
      debt_creditor_id: null,
      time_remaining: 60,
      pending_tax: null,
      pending_rent: null,
    };

    render(<Board />);

    expect(screen.getByTestId('token-visualizer')).toBeInTheDocument();
  });

  it('shows game stats when game exists', () => {
    mockGameStore.game = {
      room: {
        room_id: 'TEST',
        host_id: 'p1',
        status: 'playing',
        settings: {},
        players: {
          p1: {
            id: 'p1',
            name: 'Player 1',
            position: 0,
            money: 15000,
            is_in_jail: false,
            is_bankrupt: false,
            color: '#ef4444',
            get_out_of_jail_cards: 0,
          },
        },
      },
      properties: {},
      turn_order: ['p1'],
      current_turn_index: 0,
      history_log: [],
      houses_remaining: 32,
      hotels_remaining: 12,
    };
    mockGameStore.myId = 'p1';
    mockGameStore.turn = {
      active_player_id: 'p1',
      phase: 'action',
      can_roll: true,
      can_end_turn: false,
      in_debt: false,
      debt_creditor_id: null,
      time_remaining: 60,
      pending_tax: null,
      pending_rent: null,
    };

    render(<Board />);

    // Stats display should show props and bank info
    expect(screen.getByText(/props/)).toBeInTheDocument();
    expect(screen.getByText(/Bank/)).toBeInTheDocument();
  });

  it('shows property prices on tiles', () => {
    mockGameStore.game = {
      room: {
        room_id: 'TEST',
        host_id: 'p1',
        status: 'playing',
        settings: {},
        players: {
          p1: {
            id: 'p1',
            name: 'Player 1',
            position: 0,
            money: 15000,
            is_in_jail: false,
            is_bankrupt: false,
            color: '#ef4444',
            get_out_of_jail_cards: 0,
          },
        },
      },
      properties: {},
      turn_order: ['p1'],
      current_turn_index: 0,
      history_log: [],
    };
    mockGameStore.myId = 'p1';
    mockGameStore.turn = {
      active_player_id: 'p1',
      phase: 'action',
      can_roll: true,
      can_end_turn: false,
      in_debt: false,
      debt_creditor_id: null,
      time_remaining: 60,
      pending_tax: null,
      pending_rent: null,
    };

    render(<Board />);

    // formatMoneyShort(600) = 'Rs600' (mocked)
    // Guwahati and Goa are both brown, price 600
    const priceElements = screen.getAllByText('Rs600');
    expect(priceElements.length).toBeGreaterThanOrEqual(2);
  });
});
