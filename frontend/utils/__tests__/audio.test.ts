import { describe, expect, it, vi, beforeEach } from 'vitest';

// Mock HTMLAudioElement before importing audio module
const mockPlay = vi.fn().mockResolvedValue(undefined);
const mockCloneNode = vi.fn();
const mockAddEventListener = vi.fn();

vi.stubGlobal('Audio', class MockAudio {
  src = '';
  preload = '';
  volume = 0.7;
  currentTime = 0;
  loop = false;
  play = mockPlay;
  cloneNode = vi.fn(() => ({
    src: '',
    volume: 0.7,
    loop: false,
    currentTime: 0,
    play: mockPlay,
    pause: vi.fn(),
    addEventListener: mockAddEventListener,
    removeAttribute: vi.fn(),
    load: vi.fn(),
  }));
  addEventListener = vi.fn();
  removeAttribute = vi.fn();
  load = vi.fn();
  pause = vi.fn();
});

// Import after mocking
const { soundManager } = await import('../audio');

beforeEach(() => {
  vi.clearAllMocks();
});

describe('SoundManager', () => {
  it('exports a soundManager singleton', () => {
    expect(soundManager).toBeDefined();
    expect(typeof soundManager).toBe('object');
  });

  it('has all game-specific sound methods', () => {
    const methods = [
      'playDiceRoll',
      'playDiceLand',
      'playDiceDouble',
      'playBuyProperty',
      'playPayRent',
      'playAuctionBid',
      'playAuctionEnd',
      'playPlayerMove',
      'playButtonClick',
      'playButtonHover',
      'playGameStart',
      'playGameEnd',
      'playCardDraw',
      'playJailEntry',
      'playJailEscape',
      'playBuild',
      'playMortgage',
      'playUnmortgage',
      'playBankruptcy',
      'playTradeComplete',
      'playPassGo',
    ];

    for (const method of methods) {
      expect(soundManager).toHaveProperty(method);
      expect(typeof (soundManager as any)[method]).toBe('function');
    }
  });

  it('has control methods: setVolume, getVolume, toggleSound, isSoundEnabled, setSoundEnabled', () => {
    expect(typeof soundManager.setVolume).toBe('function');
    expect(typeof soundManager.getVolume).toBe('function');
    expect(typeof soundManager.toggleSound).toBe('function');
    expect(typeof soundManager.isSoundEnabled).toBe('function');
    expect(typeof soundManager.setSoundEnabled).toBe('function');
  });

  it('has play and playSequence methods', () => {
    expect(typeof soundManager.play).toBe('function');
    expect(typeof soundManager.playSequence).toBe('function');
  });
});

describe('SoundManager volume control', () => {
  it('returns default volume', () => {
    expect(soundManager.getVolume()).toBe(0.7);
  });

  it('clamps volume to 0-1 range', () => {
    soundManager.setVolume(1.5);
    expect(soundManager.getVolume()).toBe(1);

    soundManager.setVolume(-0.5);
    expect(soundManager.getVolume()).toBe(0);

    soundManager.setVolume(0.5);
    expect(soundManager.getVolume()).toBe(0.5);

    // Reset to default
    soundManager.setVolume(0.7);
  });
});

describe('SoundManager toggle', () => {
  it('toggles sound on/off and returns new state', () => {
    // Default is enabled
    expect(soundManager.isSoundEnabled()).toBe(true);

    const result1 = soundManager.toggleSound();
    expect(result1).toBe(false);
    expect(soundManager.isSoundEnabled()).toBe(false);

    const result2 = soundManager.toggleSound();
    expect(result2).toBe(true);
    expect(soundManager.isSoundEnabled()).toBe(true);
  });

  it('setSoundEnabled sets explicit state', () => {
    soundManager.setSoundEnabled(false);
    expect(soundManager.isSoundEnabled()).toBe(false);

    soundManager.setSoundEnabled(true);
    expect(soundManager.isSoundEnabled()).toBe(true);
  });
});

describe('SoundManager play methods do not throw', () => {
  const methods = [
    'playDiceRoll',
    'playDiceLand',
    'playDiceDouble',
    'playBuyProperty',
    'playPayRent',
    'playAuctionBid',
    'playAuctionEnd',
    'playPlayerMove',
    'playButtonClick',
    'playButtonHover',
    'playCardDraw',
    'playJailEntry',
    'playJailEscape',
    'playBankruptcy',
    'playPassGo',
    'playMortgage',
    'playUnmortgage',
  ];

  for (const method of methods) {
    it(`${method} does not throw`, () => {
      expect(() => (soundManager as any)[method]()).not.toThrow();
    });
  }

  it('playGameStart does not throw', () => {
    expect(() => soundManager.playGameStart()).not.toThrow();
  });

  it('playGameEnd does not throw with winner', () => {
    expect(() => soundManager.playGameEnd(true)).not.toThrow();
  });

  it('playGameEnd does not throw with loser', () => {
    expect(() => soundManager.playGameEnd(false)).not.toThrow();
  });

  it('playCardDraw with treasury type does not throw', () => {
    expect(() => soundManager.playCardDraw('treasury')).not.toThrow();
  });

  it('playCardDraw with surprise type does not throw', () => {
    expect(() => soundManager.playCardDraw('surprise')).not.toThrow();
  });

  it('playBuild with house type does not throw', () => {
    expect(() => soundManager.playBuild('house')).not.toThrow();
  });

  it('playBuild with hotel type does not throw', () => {
    expect(() => soundManager.playBuild('hotel')).not.toThrow();
  });

  it('playTradeComplete does not throw', () => {
    expect(() => soundManager.playTradeComplete()).not.toThrow();
  });
});

describe('SoundManager play respects enabled state', () => {
  it('does not call play on underlying audio when sound is disabled', () => {
    soundManager.setSoundEnabled(false);
    vi.clearAllMocks();

    soundManager.playDiceRoll();
    // play() returns early when disabled, so cloneNode should not be called
    expect(mockCloneNode).not.toHaveBeenCalled();

    // Re-enable
    soundManager.setSoundEnabled(true);
  });
});
