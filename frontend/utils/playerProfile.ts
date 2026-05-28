export interface PlayerStats {
  gamesPlayed: number;
  wins: number;
  losses: number;
  totalMoneyEarned: number;
  propertiesBought: number;
  timesInJail: number;
  lastPlayedAt: string;
}

export const DEFAULT_STATS: PlayerStats = {
  gamesPlayed: 0,
  wins: 0,
  losses: 0,
  totalMoneyEarned: 0,
  propertiesBought: 0,
  timesInJail: 0,
  lastPlayedAt: '',
};

export const AVATARS = [
  { emoji: '🦖', label: 'T-Rex' },
  { emoji: '🐉', label: 'Dragon' },
  { emoji: '🦁', label: 'Lion' },
  { emoji: '🐯', label: 'Tiger' },
  { emoji: '🦅', label: 'Eagle' },
  { emoji: '🐺', label: 'Wolf' },
  { emoji: '🦈', label: 'Shark' },
  { emoji: '🦊', label: 'Fox' },
  { emoji: '🐼', label: 'Panda' },
  { emoji: '🦉', label: 'Owl' },
  { emoji: '🔥', label: 'Fire' },
  { emoji: '⚡', label: 'Lightning' },
  { emoji: '💎', label: 'Diamond' },
  { emoji: '👑', label: 'Crown' },
  { emoji: '🎯', label: 'Target' },
  { emoji: '🚀', label: 'Rocket' },
];

const STATS_KEY = 'dino-player-stats';
const AVATAR_KEY = 'dino-player-avatar';
const NAME_KEY = 'dino-player-name';

export function loadStats(): PlayerStats {
  try {
    const raw = localStorage.getItem(STATS_KEY);
    if (raw) return { ...DEFAULT_STATS, ...JSON.parse(raw) };
  } catch {}
  return { ...DEFAULT_STATS };
}

export function saveStats(stats: PlayerStats): void {
  try {
    localStorage.setItem(STATS_KEY, JSON.stringify(stats));
  } catch {}
}

export function recordGameEnd(won: boolean, moneyEarned: number, propertiesBought: number, timesInJail: number): void {
  const stats = loadStats();
  stats.gamesPlayed += 1;
  if (won) stats.wins += 1;
  else stats.losses += 1;
  stats.totalMoneyEarned += moneyEarned;
  stats.propertiesBought += propertiesBought;
  stats.timesInJail += timesInJail;
  stats.lastPlayedAt = new Date().toISOString();
  saveStats(stats);
}

export function loadAvatar(): string {
  try {
    return localStorage.getItem(AVATAR_KEY) || AVATARS[0].emoji;
  } catch {
    return AVATARS[0].emoji;
  }
}

export function saveAvatar(emoji: string): void {
  try {
    localStorage.setItem(AVATAR_KEY, emoji);
  } catch {}
}

export function loadSavedName(): string {
  try {
    return localStorage.getItem(NAME_KEY) || '';
  } catch {
    return '';
  }
}

export function saveName(name: string): void {
  try {
    localStorage.setItem(NAME_KEY, name);
  } catch {}
}
