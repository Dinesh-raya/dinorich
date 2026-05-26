import { motion, AnimatePresence } from 'framer-motion';
import { animations } from '../animations';
import { useState, useMemo, useEffect } from 'react';
import { formatMoneyShort } from '../utils/format';

// Map color hex to icon
const COLOR_ICONS: Record<string, string> = {
  '#ef4444': '🔴',
  '#3b82f6': '🔵',
  '#22c55e': '🟢',
  '#eab308': '🟡',
  '#a855f7': '🟣',
  '#f97316': '🟠',
};
const getColorIcon = (color: string) => COLOR_ICONS[color] || '⚪';

interface Player {
  id: string;
  name: string;
  color: string;
  money: number;
  position: number;
  connected: boolean;
  isHost?: boolean;
  isCurrentTurn?: boolean;
  properties?: number[];
  is_in_jail?: boolean;
  jail_turns?: number;
  is_bankrupt?: boolean;
}

interface PlayerSidebarProps {
  players: Player[];
  currentPlayerId?: string;
  activePlayerId?: string;
  onPlayerClick?: (playerId: string) => void;
  compact?: boolean;
}

export const PlayerSidebar = ({
  players,
  currentPlayerId,
  activePlayerId,
  onPlayerClick,
  compact = false
}: PlayerSidebarProps) => {
  const [expandedPlayer, setExpandedPlayer] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'money' | 'name' | 'position'>('money');

  // Collapse expanded panel if the player is no longer in the game or has disconnected/gone bankrupt
  useEffect(() => {
    if (expandedPlayer) {
      const player = players.find(p => p.id === expandedPlayer);
      if (!player || player.is_bankrupt || !player.connected) {
        setExpandedPlayer(null);
      }
    }
  }, [players, expandedPlayer]);

  // Sort players based on selected criteria
  const sortedPlayers = [...players].sort((a, b) => {
    switch (sortBy) {
      case 'money':
        return b.money - a.money;
      case 'name':
        return a.name.localeCompare(b.name);
      case 'position':
        return a.position - b.position;
      default:
        return 0;
    }
  });

  // Calculate player stats
  const totalMoney = players.reduce((sum, p) => sum + p.money, 0);
  const averageMoney = players.length === 0 ? 0 : Math.floor(totalMoney / players.length);
  const richestPlayer = players.length === 0 ? null : players.reduce((richest, p) =>
    p.money > richest.money ? p : richest
  );

  const togglePlayerExpansion = (playerId: string) => {
    setExpandedPlayer(expandedPlayer === playerId ? null : playerId);
    if (onPlayerClick) onPlayerClick(playerId);
  };

  // Memoize money-based ranking to avoid re-sorting per player per render
  const moneyRankMap = useMemo(() => {
    const sorted = [...players].sort((a, b) => b.money - a.money);
    const map = new Map<string, number>();
    sorted.forEach((p, i) => map.set(p.id, i + 1));
    return map;
  }, [players]);

  const getPlayerRank = (player: Player) => {
    return moneyRankMap.get(player.id) ?? 1;
  };

  const getPositionName = (position: number) => {
    if (position === 0) return 'GO';
    if (position === 10) return 'JAIL';
    if (position === 20) return 'FREE PARKING';
    if (position === 30) return 'GO TO JAIL';
    return `Tile ${position}`;
  };

  const formatMoney = (amount: number) => {
    return formatMoneyShort(amount);
  };

  return (
    <motion.div
      className={`panel-dark rounded-2xl border border-gold-800/20 overflow-hidden ${compact ? 'w-full' : 'w-72 lg:w-80'}`}
      variants={animations.fadeIn}
      initial="hidden"
      animate="visible"
    >
      {/* Header */}
      <div className="bg-gradient-to-r from-primary-900/50 to-accent-900/30 p-3 border-b border-gold-500/30">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-gold-500 flex items-center gap-2">
              <span className="text-accent-400">👥</span>
              Players ({players.length})
            </h2>
            <p className="text-text-muted text-xs">Total: {formatMoney(totalMoney)}</p>
          </div>
          
          {/* Sort controls */}
          <div className="flex gap-1 bg-surface/50 rounded-lg p-1">
            {(['money', 'name', 'position'] as const).map((sortType) => (
              <button
                key={sortType}
                className={`px-3 py-2 text-xs rounded-md transition-colors min-h-[44px] ${sortBy === sortType ? 'bg-primary-500/30 text-gold-500' : 'text-text-muted hover:text-text-main'}`}
                onClick={() => setSortBy(sortType)}
              >
                {sortType.charAt(0).toUpperCase() + sortType.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Stats summary */}
        <div className="grid grid-cols-2 gap-1.5 mt-2">
          <div className="bg-success-500/10 border border-success-500/20 rounded-lg p-1.5">
            <div className="text-xs text-text-muted">Richest</div>
            <div className="text-sm font-bold text-success-400 truncate" title={richestPlayer?.name ?? '-'}>
              {richestPlayer?.name ?? '-'}
            </div>
            <div className="text-xs text-success-300">{formatMoney(richestPlayer?.money ?? 0)}</div>
          </div>
          <div className="bg-warning-500/10 border border-warning-500/20 rounded-lg p-2">
            <div className="text-xs text-text-muted">Average</div>
            <div className="text-sm font-bold text-warning-400">{formatMoney(averageMoney)}</div>
            <div className="text-xs text-warning-300">per player</div>
          </div>
        </div>
      </div>

      {/* Players list */}
      <div className="overflow-y-auto max-h-[500px]">
        <AnimatePresence mode="popLayout">
          {sortedPlayers.map((player, index) => {
            const isCurrent = player.id === currentPlayerId;
            const isActive = player.id === activePlayerId;
            const isExpanded = expandedPlayer === player.id;
            const rank = getPlayerRank(player);
            const moneyPercentage = totalMoney > 0 ? (player.money / totalMoney) * 100 : 0;

            return (
              <motion.div
                key={player.id}
                className={`border-b border-white/10 ${isActive ? 'bg-primary-900/30 border-l-2 border-l-primary-500' : isCurrent ? 'bg-primary-900/15' : 'hover:bg-surface/30'} ${!player.connected ? 'opacity-50' : ''} transition-colors cursor-pointer`}
                variants={animations.fadeIn}
                initial="hidden"
                animate="visible"
                transition={{ delay: index * 0.05 }}
                onClick={() => togglePlayerExpansion(player.id)}
                whileHover={player.connected ? { x: 3 } : undefined}
              >
                <div className="p-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      {/* Player rank */}
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${rank <= 3 ? 'bg-accent-500/30 text-accent-300' : 'bg-surface text-text-muted'}`}>
                        {rank}
                      </div>

                      {/* Player color indicator with icon */}
                      <div className="relative">
                        <div
                          className={`w-10 h-10 rounded-full border-2 border-white/50 shadow-lg flex items-center justify-center text-xl ${!player.connected ? 'filter grayscale brightness-50' : ''}`}
                          style={{ backgroundColor: player.color + '40' }}
                        >
                          {getColorIcon(player.color)}
                          {isCurrent && player.connected && (
                            <div className="absolute -top-1 -right-1 w-3 h-3 bg-primary-500 rounded-full border border-white animate-pulse"></div>
                          )}
                        </div>
                        {!player.connected && (
                          <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-danger-500 rounded-full border border-white animate-pulse flex items-center justify-center text-[9px] font-bold text-white shadow-md" title="Offline">
                            !
                          </div>
                        )}
                      </div>

                      {/* Player info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-text-main truncate flex items-center gap-1.5" title={player.name}>
                            <span className={!player.connected ? 'line-through text-text-muted' : ''}>{player.name}</span>
                            {player.isHost && <span className="text-xs text-accent-400">👑</span>}
                            {isActive && player.connected && <span className="text-xs text-gold-500 animate-pulse">▶</span>}
                            {!player.connected && (
                              <span className="px-1.5 py-0.5 bg-danger-500/20 text-danger-400 border border-danger-500/30 rounded text-[9px] font-cyber tracking-wide uppercase animate-pulse">
                                Offline
                              </span>
                            )}
                          </h3>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-text-muted">
                          <span>{getPositionName(player.position)}</span>
                          {player.is_in_jail && (
                            <span className="px-1.5 py-0.5 bg-danger-500/20 text-danger-300 rounded text-xs">
                              JAIL ({player.jail_turns || 0})
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Money display */}
                    <div className="text-right">
                      <div className={`text-sm font-bold ${player.money < 0 ? 'text-danger-400' : 'text-success-400'}`}>
                        {formatMoney(player.money)}
                      </div>
                      <div className="text-xs text-text-muted">
                        {moneyPercentage.toFixed(1)}%
                      </div>
                    </div>
                  </div>

                  {/* Money bar */}
                  <div className="mt-2">
                    <div className="h-1 bg-surface rounded-full overflow-hidden">
                      <motion.div
                        className="h-full rounded-full"
                        style={{
                          backgroundColor: player.color,
                          width: `${Math.min(moneyPercentage, 100)}%`
                        }}
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min(moneyPercentage, 100)}%` }}
                        transition={{ duration: 0.5, delay: 0.1 }}
                      />
                    </div>
                  </div>

                  {/* Expanded details */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        className="mt-3 pt-3 border-t border-white/10"
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                      >
                        <div className="grid grid-cols-2 gap-3">
                          <div className="bg-surface/30 rounded-lg p-2">
                            <div className="text-xs text-text-muted">Properties</div>
                            <div className="text-sm font-bold text-gold-500">
                              {player.properties?.length || 0} owned
                            </div>
                          </div>
                          <div className="bg-surface/30 rounded-lg p-2">
                            <div className="text-xs text-text-muted">Cash</div>
                            <div className="text-sm font-bold text-accent-300">
                              {formatMoney(player.money)}
                            </div>
                          </div>
                        </div>
                        
                        {player.is_in_jail && (
                          <div className="mt-2 bg-danger-500/10 border border-danger-500/20 rounded-lg p-2">
                            <div className="flex items-center gap-2">
                              <span className="text-danger-400">🔒</span>
                              <span className="text-sm text-danger-300">
                                In Jail for {player.jail_turns || 0} more turns
                              </span>
                            </div>
                          </div>
                        )}

                        {isActive && (
                          <div className="mt-2 bg-primary-500/10 border border-gold-800/20 rounded-lg p-2">
                            <div className="flex items-center gap-2">
                              <span className="text-gold-500 animate-pulse">🎲</span>
                              <span className="text-sm text-gold-500">
                                Currently playing
                              </span>
                            </div>
                          </div>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Footer with quick actions */}
      <div className="p-3 border-t border-white/10 bg-surface/20">
        <div className="flex gap-2">
          <button
            className="flex-1 bg-gold-500/20 hover:bg-primary-500/30 text-gold-500 text-sm py-3 rounded-lg transition-colors flex items-center justify-center gap-1 min-h-[44px]"
            onClick={() => setExpandedPlayer(null)}
          >
            <span>Collapse All</span>
          </button>
          <button
            className="flex-1 bg-gold-500/20 hover:bg-accent-500/30 text-accent-300 text-sm py-3 rounded-lg transition-colors flex items-center justify-center gap-1 min-h-[44px]"
            onClick={() => setSortBy('money')}
          >
            <span>Sort by $</span>
          </button>
        </div>
      </div>
    </motion.div>
  );
};
