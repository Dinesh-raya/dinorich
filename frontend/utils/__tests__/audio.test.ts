import { describe, expect, it, vi, beforeEach } from 'vitest';

const mockPlay = vi.fn().mockResolvedValue(undefined);

vi.stubGlobal('Audio', class MockAudio {
  src = '';
  preload = '';
  play = mockPlay;
  cloneNode = vi.fn(() => ({
    src: '',
    play: mockPlay,
  }));
});

const { soundManager } = await import('../audio');

beforeEach(() => {
  vi.clearAllMocks();
});

describe('SoundManager', () => {
  it('exports a soundManager singleton', () => {
    expect(soundManager).toBeDefined();
    expect(typeof soundManager).toBe('object');
  });

  it('has play, toggleSound, and isSoundEnabled methods', () => {
    expect(typeof soundManager.play).toBe('function');
    expect(typeof soundManager.toggleSound).toBe('function');
    expect(typeof soundManager.isSoundEnabled).toBe('function');
  });
});

describe('SoundManager toggle', () => {
  it('toggles sound on/off and returns new state', () => {
    expect(soundManager.isSoundEnabled()).toBe(true);

    const result1 = soundManager.toggleSound();
    expect(result1).toBe(false);
    expect(soundManager.isSoundEnabled()).toBe(false);

    const result2 = soundManager.toggleSound();
    expect(result2).toBe(true);
    expect(soundManager.isSoundEnabled()).toBe(true);
  });
});

describe('SoundManager play', () => {
  it('plays a registered sound', () => {
    soundManager.play('dice_roll');
    expect(mockPlay).toHaveBeenCalled();
  });

  it('does not throw for any registered sound', () => {
    const sounds = ['dice_roll', 'trade_accepted', 'player_debt', 'big_rent', 'build_hotel'] as const;
    for (const s of sounds) {
      expect(() => soundManager.play(s)).not.toThrow();
    }
  });

  it('does not call play when disabled', () => {
    soundManager.toggleSound(); // disable
    vi.clearAllMocks();

    soundManager.play('dice_roll');
    expect(mockPlay).not.toHaveBeenCalled();

    soundManager.toggleSound(); // re-enable
  });
});
