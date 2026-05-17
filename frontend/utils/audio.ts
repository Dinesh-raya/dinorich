/**
 * Enhanced Audio System with comprehensive sound effects
 * Uses placeholder URLs - replace with actual sound files in production
 */
const SOUNDS = {
  // Dice & Game Actions
  dice_roll: 'https://assets.mixkit.co/sfx/preview/mixkit-dice-roll-1994.mp3',
  dice_land: 'https://assets.mixkit.co/sfx/preview/mixkit-dice-land-1995.mp3',
  dice_double: 'https://assets.mixkit.co/sfx/preview/mixkit-winning-chimes-2015.mp3',
  
  // Game Events
  buy_property: 'https://assets.mixkit.co/sfx/preview/mixkit-cash-register-purchase-875.mp3',
  pay_rent: 'https://assets.mixkit.co/sfx/preview/mixkit-cash-register-coin-drop-1993.mp3',
  auction_bid: 'https://assets.mixkit.co/sfx/preview/mixkit-auction-bell-1088.mp3',
  auction_end: 'https://assets.mixkit.co/sfx/preview/mixkit-winning-trumpet-2018.mp3',
  
  // Player Actions
  player_move: 'https://assets.mixkit.co/sfx/preview/mixkit-game-ball-tap-2073.mp3',
  player_jail: 'https://assets.mixkit.co/sfx/preview/mixkit-prison-door-lock-1258.mp3',
  player_free: 'https://assets.mixkit.co/sfx/preview/mixkit-unlock-game-notification-253.mp3',
  pass_go: 'https://assets.mixkit.co/sfx/preview/mixkit-winning-chimes-2015.mp3',
  
  // UI Sounds
  button_click: 'https://assets.mixkit.co/sfx/preview/mixkit-select-click-1109.mp3',
  button_hover: 'https://assets.mixkit.co/sfx/preview/mixkit-light-button-click-1120.mp3',
  modal_open: 'https://assets.mixkit.co/sfx/preview/mixkit-select-click-1109.mp3',
  modal_close: 'https://assets.mixkit.co/sfx/preview/mixkit-light-button-click-1120.mp3',
  
  // Property Development
  build_house: 'https://assets.mixkit.co/sfx/preview/mixkit-construction-tool-1385.mp3',
  build_hotel: 'https://assets.mixkit.co/sfx/preview/mixkit-building-construction-1384.mp3',
  mortgage: 'https://assets.mixkit.co/sfx/preview/mixkit-cash-register-purchase-875.mp3',
  unmortgage: 'https://assets.mixkit.co/sfx/preview/mixkit-cash-register-coin-drop-1993.mp3',
  
  // Card Effects
  chance_card: 'https://assets.mixkit.co/sfx/preview/mixkit-magic-sparkles-3001.mp3',
  community_chest: 'https://assets.mixkit.co/sfx/preview/mixkit-treasure-chest-opening-1992.mp3',
  
  // Game State
  game_start: 'https://assets.mixkit.co/sfx/preview/mixkit-game-show-intro-331.mp3',
  game_end: 'https://assets.mixkit.co/sfx/preview/mixkit-winning-trumpet-2018.mp3',
  player_bankrupt: 'https://assets.mixkit.co/sfx/preview/mixkit-sad-game-over-trombone-471.mp3',
  player_win: 'https://assets.mixkit.co/sfx/preview/mixkit-winning-chimes-2015.mp3',
  
  // Background Music
  bgm_menu: 'https://assets.mixkit.co/music/preview/mixkit-game-show-suspense-waiting-667.mp3',
  bgm_game: 'https://assets.mixkit.co/music/preview/mixkit-game-show-topic-661.mp3',
};

export type SoundName = keyof typeof SOUNDS;

class SoundManager {
  private enabled: boolean = true;
  private musicEnabled: boolean = true;
  private audioMap: Map<string, HTMLAudioElement> = new Map();
  private bgmAudio: HTMLAudioElement | null = null;
  private volume: number = 0.7;
  private musicVolume: number = 0.3;

  constructor() {
    // Preload all sound effects
    Object.entries(SOUNDS).forEach(([key, url]) => {
      const audio = new Audio();
      audio.src = url;
      audio.preload = 'auto';
      audio.volume = this.volume;
      this.audioMap.set(key, audio);
    });
    
    // Initialize background music
    this.bgmAudio = new Audio(SOUNDS.bgm_game);
    this.bgmAudio.loop = true;
    this.bgmAudio.volume = this.musicVolume;
    this.bgmAudio.preload = 'auto';
  }

  play(soundName: SoundName, options: { volume?: number; loop?: boolean } = {}) {
    if (!this.enabled) return;
    
    const audio = this.audioMap.get(soundName);
    if (audio) {
      audio.currentTime = 0;
      audio.volume = options.volume ?? this.volume;
      audio.loop = options.loop ?? false;
      
      // Clone the audio element for overlapping sounds
      const playPromise = audio.cloneNode() as HTMLAudioElement;
      playPromise.volume = options.volume ?? this.volume;
      playPromise.loop = options.loop ?? false;
      
      playPromise.play().catch(e => {
        console.warn(`Audio play failed for ${soundName}:`, e);
      });
    }
  }

  playSequence(sounds: Array<{ name: SoundName; delay?: number; volume?: number }>) {
    if (!this.enabled) return;
    
    sounds.reduce((delay, sound) => {
      setTimeout(() => {
        this.play(sound.name, { volume: sound.volume });
      }, delay);
      return delay + (sound.delay || 300);
    }, 0);
  }

  startBackgroundMusic(type: 'menu' | 'game' = 'game') {
    if (!this.musicEnabled || !this.bgmAudio) return;
    
    this.bgmAudio.src = type === 'menu' ? SOUNDS.bgm_menu : SOUNDS.bgm_game;
    this.bgmAudio.currentTime = 0;
    this.bgmAudio.volume = this.musicVolume;
    
    this.bgmAudio.play().catch(e => {
      console.warn('Background music play failed:', e);
    });
  }

  stopBackgroundMusic() {
    if (this.bgmAudio) {
      this.bgmAudio.pause();
      this.bgmAudio.currentTime = 0;
    }
  }

  setVolume(volume: number) {
    this.volume = Math.max(0, Math.min(1, volume));
    this.audioMap.forEach(audio => {
      audio.volume = this.volume;
    });
  }

  setMusicVolume(volume: number) {
    this.musicVolume = Math.max(0, Math.min(1, volume));
    if (this.bgmAudio) {
      this.bgmAudio.volume = this.musicVolume;
    }
  }

  toggleSound() {
    this.enabled = !this.enabled;
    return this.enabled;
  }

  toggleMusic() {
    this.musicEnabled = !this.musicEnabled;
    if (!this.musicEnabled && this.bgmAudio) {
      this.bgmAudio.pause();
    } else if (this.musicEnabled && this.bgmAudio) {
      this.bgmAudio.play().catch(e => console.warn('Music resume failed:', e));
    }
    return this.musicEnabled;
  }

  setSoundEnabled(enabled: boolean) {
    this.enabled = enabled;
  }

  setMusicEnabled(enabled: boolean) {
    this.musicEnabled = enabled;
    if (!this.musicEnabled && this.bgmAudio) {
      this.bgmAudio.pause();
    } else if (this.musicEnabled && this.bgmAudio) {
      this.bgmAudio.play().catch(e => console.warn('Music resume failed:', e));
    }
  }

  isSoundEnabled(): boolean {
    return this.enabled;
  }

  isMusicEnabled(): boolean {
    return this.musicEnabled;
  }

  // Game-specific sound helpers
  playDiceRoll() {
    this.play('dice_roll');
  }

  playDiceLand() {
    this.play('dice_land');
  }

  playDiceDouble() {
    this.play('dice_double');
  }

  playBuyProperty() {
    this.play('buy_property');
  }

  playPayRent() {
    this.play('pay_rent');
  }

  playAuctionBid() {
    this.play('auction_bid');
  }

  playAuctionEnd() {
    this.play('auction_end');
  }

  playPlayerMove() {
    this.play('player_move');
  }

  playButtonClick() {
    this.play('button_click');
  }

  playButtonHover() {
    this.play('button_hover');
  }

  playGameStart() {
    this.playSequence([
      { name: 'game_start', delay: 0 },
      { name: 'dice_double', delay: 500 }
    ]);
  }

  playGameEnd(isWinner: boolean) {
    if (isWinner) {
      this.play('player_win');
    } else {
      this.play('player_bankrupt');
    }
  }
}

export const soundManager = new SoundManager();

// Hook for React components
export const useSound = () => {
  return {
    play: soundManager.play.bind(soundManager),
    playSequence: soundManager.playSequence.bind(soundManager),
    playDiceRoll: soundManager.playDiceRoll.bind(soundManager),
    playDiceLand: soundManager.playDiceLand.bind(soundManager),
    playBuyProperty: soundManager.playBuyProperty.bind(soundManager),
    playPayRent: soundManager.playPayRent.bind(soundManager),
    playAuctionBid: soundManager.playAuctionBid.bind(soundManager),
    playAuctionEnd: soundManager.playAuctionEnd.bind(soundManager),
    playPlayerMove: soundManager.playPlayerMove.bind(soundManager),
    playButtonClick: soundManager.playButtonClick.bind(soundManager),
    playButtonHover: soundManager.playButtonHover.bind(soundManager),
    playGameStart: soundManager.playGameStart.bind(soundManager),
    playGameEnd: soundManager.playGameEnd.bind(soundManager),
    startBackgroundMusic: soundManager.startBackgroundMusic.bind(soundManager),
    stopBackgroundMusic: soundManager.stopBackgroundMusic.bind(soundManager),
    toggleSound: soundManager.toggleSound.bind(soundManager),
    toggleMusic: soundManager.toggleMusic.bind(soundManager),
    setVolume: soundManager.setVolume.bind(soundManager),
    setMusicVolume: soundManager.setMusicVolume.bind(soundManager),
    isSoundEnabled: soundManager.isSoundEnabled.bind(soundManager),
    isMusicEnabled: soundManager.isMusicEnabled.bind(soundManager),
  };
};
