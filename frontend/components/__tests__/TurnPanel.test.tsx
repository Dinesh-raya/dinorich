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

// Mock audio utility
vi.mock('../../utils/audio', () => ({
  soundManager: {
    playButtonClick: vi.fn(),
    playAuctionBid: vi.fn(),
  },
  hapticFeedback: vi.fn(),
}));

// Mock format utility
vi.mock('../../utils/format', () => ({
  formatMoney: (n: number) => `\u20B9${n.toLocaleString('en-IN')}`,
}));

// Mock animations
vi.mock('../../animations', () => ({
  animations: {
    fadeIn: {},
  },
}));

// Mock DiceAnim component
vi.mock('../DiceAnim', () => ({
  DiceAnim: ({ die1, die2 }: any) =>
    createElement('div', { 'data-testid': 'dice-anim' }, `${die1}+${die2}`),
}));

// Mock gameStore
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
      const state = { ...mockStoreActions };
      return selector ? selector(state) : state;
    },
    {
      getState: () => ({ ...mockStoreActions }),
    }
  ),
}));

import { TurnPanel } from '../TurnPanel';

function makeDefaults(overrides: Record<string, any> = {}) {
  return {
    isMobile: false,
    turn: {
      active_player_id: 'p1',
      phase: 'action',
      can_roll: true,
      can_end_turn: false,
      in_debt: false,
      debt_creditor_id: null,
      time_remaining: 60,
      pending_tax: null,
      pending_rent: null,
    },
    myId: 'p1' as string | null,
    game: {
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
    },
    isRolling: false,
    diceValues: { die1: 3, die2: 5 },
    moneyChange: null as { amount: number; timestamp: number } | null,
    pendingAction: null as string | null,
    handleRollDice: vi.fn(),
    setIsRolling: vi.fn(),
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('TurnPanel', () => {
  describe('your turn', () => {
    it('shows "YOUR TURN" when it is your turn', () => {
      const props = makeDefaults();
      render(<TurnPanel {...props} />);
      expect(screen.getByText('YOUR TURN')).toBeInTheDocument();
    });

    it('shows "ROLL DICE" button when can_roll is true', () => {
      const props = makeDefaults();
      render(<TurnPanel {...props} />);
      expect(screen.getByText('ROLL DICE')).toBeInTheDocument();
    });

    it('shows the dice component', () => {
      const props = makeDefaults();
      render(<TurnPanel {...props} />);
      expect(screen.getByTestId('dice-anim')).toBeInTheDocument();
    });

    it('calls handleRollDice when ROLL DICE is clicked', () => {
      const props = makeDefaults();
      render(<TurnPanel {...props} />);
      screen.getByText('ROLL DICE').click();
      expect(props.handleRollDice).toHaveBeenCalledOnce();
    });
  });

  describe('waiting for another player', () => {
    it('shows "Waiting" when it is not your turn', () => {
      const props = makeDefaults({
        turn: {
          active_player_id: 'p2',
          phase: 'action',
          can_roll: false,
          can_end_turn: false,
          in_debt: false,
          debt_creditor_id: null,
          time_remaining: 60,
          pending_tax: null,
          pending_rent: null,
        },
      });
      render(<TurnPanel {...props} />);
      expect(screen.getByText('Waiting')).toBeInTheDocument();
    });

    it('shows active player name when waiting', () => {
      const props = makeDefaults({
        turn: {
          active_player_id: 'p2',
          phase: 'action',
          can_roll: false,
          can_end_turn: false,
          in_debt: false,
          debt_creditor_id: null,
          time_remaining: 60,
          pending_tax: null,
          pending_rent: null,
        },
      });
      render(<TurnPanel {...props} />);
      expect(screen.getByText('Player 2')).toBeInTheDocument();
    });

    it('shows "is playing..." text', () => {
      const props = makeDefaults({
        turn: {
          active_player_id: 'p2',
          phase: 'action',
          can_roll: false,
          can_end_turn: false,
          in_debt: false,
          debt_creditor_id: null,
          time_remaining: 60,
          pending_tax: null,
          pending_rent: null,
        },
      });
      render(<TurnPanel {...props} />);
      expect(screen.getByText(/is playing\.\.\./)).toBeInTheDocument();
    });
  });

  describe('buy phase', () => {
    it('shows BUY button during buy phase', () => {
      const props = makeDefaults({
        turn: {
          active_player_id: 'p1',
          phase: 'buy',
          can_roll: false,
          can_end_turn: false,
          in_debt: false,
          debt_creditor_id: null,
          time_remaining: 60,
          pending_tax: null,
          pending_rent: null,
        },
      });
      render(<TurnPanel {...props} />);
      expect(screen.getByText('Buy this property?')).toBeInTheDocument();
      expect(screen.getByText('BUY')).toBeInTheDocument();
    });

    it('shows AUCTION button during buy phase when auction enabled', () => {
      const props = makeDefaults({
        turn: {
          active_player_id: 'p1',
          phase: 'buy',
          can_roll: false,
          can_end_turn: false,
          in_debt: false,
          debt_creditor_id: null,
          time_remaining: 60,
          pending_tax: null,
          pending_rent: null,
        },
      });
      render(<TurnPanel {...props} />);
      expect(screen.getByText('AUCTION')).toBeInTheDocument();
    });
  });

  describe('jail actions', () => {
    it('shows jail warning when player is in jail', () => {
      const props = makeDefaults({
        turn: {
          active_player_id: 'p1',
          phase: 'action',
          can_roll: true,
          can_end_turn: false,
          in_debt: false,
          debt_creditor_id: null,
          time_remaining: 60,
          pending_tax: null,
          pending_rent: null,
        },
        game: {
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
                is_in_jail: true,
                is_bankrupt: false,
                color: '#ef4444',
                get_out_of_jail_cards: 0,
                jail_turns: 1,
              },
            },
          },
        },
      });
      render(<TurnPanel {...props} />);
      expect(screen.getByText('IN JAIL')).toBeInTheDocument();
      expect(screen.getByText(/Pay fine, use card, or roll for doubles/)).toBeInTheDocument();
    });

    it('shows PAY FINE button when in jail', () => {
      const props = makeDefaults({
        turn: {
          active_player_id: 'p1',
          phase: 'action',
          can_roll: true,
          can_end_turn: false,
          in_debt: false,
          debt_creditor_id: null,
          time_remaining: 60,
          pending_tax: null,
          pending_rent: null,
        },
        game: {
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
                is_in_jail: true,
                is_bankrupt: false,
                color: '#ef4444',
                get_out_of_jail_cards: 0,
                jail_turns: 1,
              },
            },
          },
        },
      });
      render(<TurnPanel {...props} />);
      expect(screen.getByText(/PAY FINE/)).toBeInTheDocument();
    });

    it('shows "ROLL FOR DOUBLES" button when in jail instead of "ROLL DICE"', () => {
      const props = makeDefaults({
        turn: {
          active_player_id: 'p1',
          phase: 'action',
          can_roll: true,
          can_end_turn: false,
          in_debt: false,
          debt_creditor_id: null,
          time_remaining: 60,
          pending_tax: null,
          pending_rent: null,
        },
        game: {
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
                is_in_jail: true,
                is_bankrupt: false,
                color: '#ef4444',
                get_out_of_jail_cards: 0,
                jail_turns: 1,
              },
            },
          },
        },
      });
      render(<TurnPanel {...props} />);
      expect(screen.getByText('ROLL FOR DOUBLES')).toBeInTheDocument();
    });

    it('shows USE CARD button when player has GOOJF cards in jail', () => {
      const props = makeDefaults({
        turn: {
          active_player_id: 'p1',
          phase: 'action',
          can_roll: true,
          can_end_turn: false,
          in_debt: false,
          debt_creditor_id: null,
          time_remaining: 60,
          pending_tax: null,
          pending_rent: null,
        },
        game: {
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
                is_in_jail: true,
                is_bankrupt: false,
                color: '#ef4444',
                get_out_of_jail_cards: 1,
                jail_turns: 1,
              },
            },
          },
        },
      });
      render(<TurnPanel {...props} />);
      expect(screen.getByText(/USE CARD/)).toBeInTheDocument();
    });
  });

  describe('END TURN button', () => {
    it('shows END TURN when can_end_turn is true', () => {
      const props = makeDefaults({
        turn: {
          active_player_id: 'p1',
          phase: 'action',
          can_roll: false,
          can_end_turn: true,
          in_debt: false,
          debt_creditor_id: null,
          time_remaining: 60,
          pending_tax: null,
          pending_rent: null,
        },
      });
      render(<TurnPanel {...props} />);
      expect(screen.getByText('END TURN')).toBeInTheDocument();
    });

    it('does not show END TURN when can_end_turn is false', () => {
      const props = makeDefaults({
        turn: {
          active_player_id: 'p1',
          phase: 'action',
          can_roll: true,
          can_end_turn: false,
          in_debt: false,
          debt_creditor_id: null,
          time_remaining: 60,
          pending_tax: null,
          pending_rent: null,
        },
      });
      render(<TurnPanel {...props} />);
      expect(screen.queryByText('END TURN')).not.toBeInTheDocument();
    });
  });

  describe('debt warning', () => {
    it('shows IN DEBT warning when turn has in_debt true', () => {
      const props = makeDefaults({
        turn: {
          active_player_id: 'p1',
          phase: 'action',
          can_roll: false,
          can_end_turn: false,
          in_debt: true,
          debt_creditor_id: null,
          time_remaining: 60,
          pending_tax: null,
          pending_rent: null,
        },
        game: {
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
                money: -500,
                is_in_jail: false,
                is_bankrupt: false,
                color: '#ef4444',
                get_out_of_jail_cards: 0,
              },
            },
          },
        },
      });
      render(<TurnPanel {...props} />);
      expect(screen.getByText(/IN DEBT/)).toBeInTheDocument();
      expect(screen.getByText(/DECLARE BANKRUPTCY/)).toBeInTheDocument();
    });
  });

  describe('tax choice', () => {
    it('shows tax options when pending_tax is set', () => {
      const props = makeDefaults({
        turn: {
          active_player_id: 'p1',
          phase: 'action',
          can_roll: false,
          can_end_turn: false,
          in_debt: false,
          debt_creditor_id: null,
          time_remaining: 60,
          pending_tax: { name: 'Income Tax', amount: 2400 },
          pending_rent: null,
        },
      });
      render(<TurnPanel {...props} />);
      expect(screen.getByText('Income Tax')).toBeInTheDocument();
      expect(screen.getByText('Choose payment method')).toBeInTheDocument();
      expect(screen.getByText(/PAY \u20B92,400/)).toBeInTheDocument();
      expect(screen.getByText('PAY 10% OF WORTH')).toBeInTheDocument();
    });
  });

  describe('mobile layout', () => {
    it('renders without crashing in mobile mode', () => {
      const props = makeDefaults({ isMobile: true });
      render(<TurnPanel {...props} />);
      expect(screen.getByText('YOUR TURN')).toBeInTheDocument();
    });
  });

  describe('money change display', () => {
    it('shows positive money change indicator', () => {
      const props = makeDefaults({
        moneyChange: { amount: 1500, timestamp: Date.now() },
      });
      render(<TurnPanel {...props} />);
      expect(screen.getByText(/\+.*1,500/)).toBeInTheDocument();
    });

    it('shows negative money change indicator', () => {
      const props = makeDefaults({
        moneyChange: { amount: -500, timestamp: Date.now() },
      });
      render(<TurnPanel {...props} />);
      expect(screen.getByText(/-.*500/)).toBeInTheDocument();
    });
  });

  describe('pending action states', () => {
    it('shows PROCESSING when pendingAction is declareBankruptcy', () => {
      const props = makeDefaults({
        pendingAction: 'declareBankruptcy',
        turn: {
          active_player_id: 'p1',
          phase: 'action',
          can_roll: false,
          can_end_turn: false,
          in_debt: true,
          debt_creditor_id: null,
          time_remaining: 60,
          pending_tax: null,
          pending_rent: null,
        },
        game: {
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
                money: -500,
                is_in_jail: false,
                is_bankrupt: false,
                color: '#ef4444',
                get_out_of_jail_cards: 0,
              },
            },
          },
        },
      });
      render(<TurnPanel {...props} />);
      expect(screen.getByText('PROCESSING...')).toBeInTheDocument();
    });

    it('shows BUYING when pendingAction is buyProperty', () => {
      const props = makeDefaults({
        pendingAction: 'buyProperty',
        turn: {
          active_player_id: 'p1',
          phase: 'buy',
          can_roll: false,
          can_end_turn: false,
          in_debt: false,
          debt_creditor_id: null,
          time_remaining: 60,
          pending_tax: null,
          pending_rent: null,
        },
      });
      render(<TurnPanel {...props} />);
      expect(screen.getByText('BUYING...')).toBeInTheDocument();
    });

    it('shows ENDING when pendingAction is endTurn', () => {
      const props = makeDefaults({
        pendingAction: 'endTurn',
        turn: {
          active_player_id: 'p1',
          phase: 'action',
          can_roll: false,
          can_end_turn: true,
          in_debt: false,
          debt_creditor_id: null,
          time_remaining: 60,
          pending_tax: null,
          pending_rent: null,
        },
      });
      render(<TurnPanel {...props} />);
      expect(screen.getByText('ENDING...')).toBeInTheDocument();
    });
  });
});
