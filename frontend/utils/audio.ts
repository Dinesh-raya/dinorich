/**
 * Audio System with local procedural sound effects
 */
const SOUNDS = {
  // Dice & Game Actions
  dice_roll: '/sounds/dice_roll.wav',
  dice_land: '/sounds/dice_land.wav',
  dice_double: '/sounds/dice_double.wav',

  // Game Events
  buy_property: '/sounds/buy_property.wav',
  pay_rent: '/sounds/pay_rent.wav',
  auction_bid: '/sounds/auction_bid.wav',
  auction_end: '/sounds/auction_end.wav',

  // Player Actions
  player_move: '/sounds/player_move.wav',
  player_jail: '/sounds/player_jail.wav',
  player_free: '/sounds/player_free.wav',
  pass_go: '/sounds/pass_go.wav',

  // UI Sounds
  button_click: '/sounds/button_click.wav',
  button_hover: '/sounds/button_hover.wav',
  modal_open: '/sounds/modal_open.wav',
  modal_close: '/sounds/modal_close.wav',

  // Property Development
  build_house: '/sounds/build_house.wav',
  build_hotel: '/sounds/build_hotel.wav',
  mortgage: '/sounds/mortgage.wav',
  unmortgage: '/sounds/unmortgage.wav',

  // Card Effects
  chance_card: '/sounds/chance_card.wav',
  community_chest: '/sounds/community_chest.wav',

  // Game State
  game_start: '/sounds/game_start.wav',
  game_end: '/sounds/game_end.wav',
  player_bankrupt: '/sounds/player_bankrupt.wav',
  player_win: '/sounds/player_win.wav',

};

export type SoundName = keyof typeof SOUNDS;

class SoundManager {
  private enabled: boolean = true;
  private audioMap: Map<string, HTMLAudioElement> = new Map();
  private volume: number = 0.7;

  constructor() {
    // Preload all sound effects
    Object.entries(SOUNDS).forEach(([key, url]) => {
      const audio = new Audio();
      audio.src = url;
      audio.preload = 'auto';
      audio.volume = this.volume;
      this.audioMap.set(key, audio);
    });
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

  setVolume(volume: number) {
    this.volume = Math.max(0, Math.min(1, volume));
    this.audioMap.forEach(audio => {
      audio.volume = this.volume;
    });
  }

  toggleSound() {
    this.enabled = !this.enabled;
    return this.enabled;
  }

  setSoundEnabled(enabled: boolean) {
    this.enabled = enabled;
  }

  isSoundEnabled(): boolean {
    return this.enabled;
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

  playCardDraw(type: 'treasury' | 'surprise' = 'treasury') {
    this.play(type === 'treasury' ? 'community_chest' : 'chance_card');
  }

  playJailEntry() {
    this.play('player_jail');
  }

  playJailEscape() {
    this.play('player_free');
  }

  playBuild(type: 'house' | 'hotel' = 'house') {
    this.play(type === 'house' ? 'build_house' : 'build_hotel');
  }

  playMortgage() {
    this.play('mortgage');
  }

  playUnmortgage() {
    this.play('unmortgage');
  }

  playBankruptcy() {
    this.play('player_bankrupt');
  }

  playTradeComplete() {
    this.playSequence([
      { name: 'buy_property', delay: 0 },
      { name: 'dice_double', delay: 300 }
    ]);
  }

  playPassGo() {
    this.play('pass_go');
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
    toggleSound: soundManager.toggleSound.bind(soundManager),
    setVolume: soundManager.setVolume.bind(soundManager),
    isSoundEnabled: soundManager.isSoundEnabled.bind(soundManager),
  };
};
