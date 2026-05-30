/**
 * Audio System — 5 gameplay sounds, mute/unmute toggle only.
 */

const SOUNDS = {
  dice_roll: '/sounds/dice_roll.mp3',
  trade_accepted: '/sounds/trade_accepted.mp3',
  player_debt: '/sounds/player_debt.mp3',
  big_rent: '/sounds/big_rent.mp3',
  build_hotel: '/sounds/build_hotel.mp3',
};

export type SoundName = keyof typeof SOUNDS;

class SoundManager {
  private enabled: boolean = true;
  private audioMap: Map<string, HTMLAudioElement> = new Map();

  constructor() {
    Object.entries(SOUNDS).forEach(([key, url]) => {
      const audio = new Audio();
      audio.src = url;
      audio.preload = 'auto';
      this.audioMap.set(key, audio);
    });
  }

  play(soundName: SoundName) {
    if (!this.enabled) return;
    const audio = this.audioMap.get(soundName);
    if (audio) {
      const clone = audio.cloneNode() as HTMLAudioElement;
      clone.play().catch(() => {});
    }
  }

  toggleSound(): boolean {
    this.enabled = !this.enabled;
    return this.enabled;
  }

  isSoundEnabled(): boolean {
    return this.enabled;
  }
}

export const soundManager = new SoundManager();

export function hapticFeedback(type: 'light' | 'medium' | 'heavy' = 'light') {
  if ('vibrate' in navigator) {
    const patterns: Record<string, number[]> = { light: [10], medium: [20], heavy: [30] };
    navigator.vibrate(patterns[type]);
  }
}

export const useSound = () => ({
  play: soundManager.play.bind(soundManager),
  toggleSound: soundManager.toggleSound.bind(soundManager),
  isSoundEnabled: soundManager.isSoundEnabled.bind(soundManager),
});
