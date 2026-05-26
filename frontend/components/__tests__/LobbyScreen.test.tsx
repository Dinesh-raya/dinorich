import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
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
    playGameStart: vi.fn(),
  },
}));

// Mock lucide-react
vi.mock('lucide-react', () => ({
  Building2: (props: any) => createElement('div', { ...props, 'data-testid': 'building-icon' }),
}));

// Mock getRandomName
vi.mock('../../src/utils/helpers', () => ({
  getRandomName: () => 'TestPlayer',
}));

import { LobbyScreen } from '../LobbyScreen';

function makeDefaults(overrides: Record<string, any> = {}) {
  return {
    error: null as string | null,
    name: '',
    setName: vi.fn(),
    roomCode: '',
    setRoomCode: vi.fn(),
    createRoom: vi.fn(),
    joinRoom: vi.fn(),
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('LobbyScreen', () => {
  describe('rendering', () => {
    it('renders the game title "DINO-RICHUP"', () => {
      const props = makeDefaults();
      render(<LobbyScreen {...props} />);
      expect(screen.getByText('DINO-RICHUP')).toBeInTheDocument();
    });

    it('renders the subtitle "PAN-INDIA EDITION"', () => {
      const props = makeDefaults();
      render(<LobbyScreen {...props} />);
      expect(screen.getByText('PAN-INDIA EDITION')).toBeInTheDocument();
    });

    it('renders "CREATE NEW ROOM" button', () => {
      const props = makeDefaults();
      render(<LobbyScreen {...props} />);
      expect(screen.getByText('CREATE NEW ROOM')).toBeInTheDocument();
    });

    it('renders "JOIN ROOM" button', () => {
      const props = makeDefaults();
      render(<LobbyScreen {...props} />);
      expect(screen.getByText('JOIN ROOM')).toBeInTheDocument();
    });

    it('renders "OR" divider', () => {
      const props = makeDefaults();
      render(<LobbyScreen {...props} />);
      expect(screen.getByText('OR')).toBeInTheDocument();
    });

    it('renders the building icon', () => {
      const props = makeDefaults();
      render(<LobbyScreen {...props} />);
      expect(screen.getByTestId('building-icon')).toBeInTheDocument();
    });
  });

  describe('name input', () => {
    it('renders the name input field', () => {
      const props = makeDefaults();
      render(<LobbyScreen {...props} />);
      expect(screen.getByPlaceholderText('Enter your name')).toBeInTheDocument();
    });

    it('shows "YOUR NAME" label', () => {
      const props = makeDefaults();
      render(<LobbyScreen {...props} />);
      expect(screen.getByText('YOUR NAME')).toBeInTheDocument();
    });

    it('calls setName when name input changes', () => {
      const props = makeDefaults();
      render(<LobbyScreen {...props} />);
      const input = screen.getByPlaceholderText('Enter your name');
      fireEvent.change(input, { target: { value: 'Dinesh' } });
      expect(props.setName).toHaveBeenCalledWith('Dinesh');
    });

    it('displays the current name value', () => {
      const props = makeDefaults({ name: 'Dinesh' });
      render(<LobbyScreen {...props} />);
      const input = screen.getByPlaceholderText('Enter your name') as HTMLInputElement;
      expect(input.value).toBe('Dinesh');
    });
  });

  describe('room code input', () => {
    it('renders the room code input field', () => {
      const props = makeDefaults();
      render(<LobbyScreen {...props} />);
      expect(screen.getByPlaceholderText('ABCDEF')).toBeInTheDocument();
    });

    it('shows "ROOM CODE" label', () => {
      const props = makeDefaults();
      render(<LobbyScreen {...props} />);
      expect(screen.getByText('ROOM CODE')).toBeInTheDocument();
    });

    it('converts room code input to uppercase', () => {
      const props = makeDefaults();
      render(<LobbyScreen {...props} />);
      const input = screen.getByPlaceholderText('ABCDEF');
      fireEvent.change(input, { target: { value: 'abc' } });
      expect(props.setRoomCode).toHaveBeenCalledWith('ABC');
    });

    it('displays the current room code value', () => {
      const props = makeDefaults({ roomCode: 'XYZ123' });
      render(<LobbyScreen {...props} />);
      const input = screen.getByPlaceholderText('ABCDEF') as HTMLInputElement;
      expect(input.value).toBe('XYZ123');
    });

    it('room code input has maxLength of 6', () => {
      const props = makeDefaults();
      render(<LobbyScreen {...props} />);
      const input = screen.getByPlaceholderText('ABCDEF');
      expect(input).toHaveAttribute('maxLength', '6');
    });
  });

  describe('create room', () => {
    it('calls createRoom with name when CREATE NEW ROOM is clicked with name filled', () => {
      const props = makeDefaults({ name: 'Dinesh' });
      render(<LobbyScreen {...props} />);
      screen.getByText('CREATE NEW ROOM').click();
      expect(props.createRoom).toHaveBeenCalledWith('Dinesh');
    });

    it('calls createRoom with random name when name is empty', () => {
      const props = makeDefaults({ name: '' });
      render(<LobbyScreen {...props} />);
      screen.getByText('CREATE NEW ROOM').click();
      expect(props.createRoom).toHaveBeenCalledWith('TestPlayer');
    });
  });

  describe('join room', () => {
    it('calls joinRoom with code and name when JOIN ROOM is clicked', () => {
      const props = makeDefaults({ roomCode: 'ABC123', name: 'Dinesh' });
      render(<LobbyScreen {...props} />);
      screen.getByText('JOIN ROOM').click();
      expect(props.joinRoom).toHaveBeenCalledWith('ABC123', 'Dinesh');
    });

    it('calls joinRoom with random name when name is empty', () => {
      const props = makeDefaults({ roomCode: 'ABC123', name: '' });
      render(<LobbyScreen {...props} />);
      screen.getByText('JOIN ROOM').click();
      expect(props.joinRoom).toHaveBeenCalledWith('ABC123', 'TestPlayer');
    });
  });

  describe('error display', () => {
    it('renders error message when error is provided', () => {
      const props = makeDefaults({ error: 'Room not found' });
      render(<LobbyScreen {...props} />);
      expect(screen.getByText('Room not found')).toBeInTheDocument();
    });

    it('does not render error when error is null', () => {
      const props = makeDefaults({ error: null });
      render(<LobbyScreen {...props} />);
      expect(screen.queryByText(/not found/)).not.toBeInTheDocument();
    });
  });

  describe('color assignment note', () => {
    it('shows color assignment message', () => {
      const props = makeDefaults();
      render(<LobbyScreen {...props} />);
      expect(screen.getByText(/Color will be assigned automatically/)).toBeInTheDocument();
    });
  });
});
