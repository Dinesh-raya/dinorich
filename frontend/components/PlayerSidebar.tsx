import { motion, AnimatePresence } from 'framer-motion';
import { animations } from '../animations';
import { useState } from 'react';
import { formatMoneyShort } from '../utils/format';

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
  const averageMoney = Math.floor(totalMoney / players.length);
  const richestPlayer = players.reduce((richest, p) =>
    p.money > richest.money ? p : richest
  );

  const togglePlayerExpansion = (playerId: string) => {
    setExpandedPlayer(expandedPlayer === playerId ? null : playerId);
    if (onPlayerClick) onPlayerClick(playerId);
  };

  const getPlayerRank = (player: Player) => {
    const sortedByMoney = [...players].sort((a, b) => b.money - a.money);
    return sortedByMoney.findIndex(p => p.id === player.id) + 1;
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
      className={`glass-panel-dark rounded-2xl border border-primary-500/20 overflow-hidden ${compact ? 'w-full' : 'w-72 lg:w-80'}`}
      variants={animations.fadeIn}
      initial="hidden"
      animate="visible"
    >
      {/* Header */}
      <div className="bg-gradient-to-r from-primary-900/50 to-accent-900/30 p-4 border-b border-primary-500/30">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-primary-300 flex items-center gap-2">
              <span className="text-accent-400">👥</span>
              Players ({players.length})
            </h2>
            <p className="text-text-muted text-sm">Total: {formatMoney(totalMoney)}</p>
          </div>
          
          {/* Sort controls */}
          <div className="flex gap-1 bg-surface/50 rounded-lg p-1">
            {(['money', 'name', 'position'] as const).map((sortType) => (
              <button
                key={sortType}
                className={`px-2 py-1 text-xs rounded-md transition-colors ${sortBy === sortType ? 'bg-primary-500/30 text-primary-300' : 'text-text-muted hover:text-text-main'}`}
                onClick={() => setSortBy(sortType)}
              >
                {sortType.charAt(0).toUpperCase() + sortType.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Stats summary */}
        <div className="grid grid-cols-2 gap-2 mt-3">
          <div className="bg-success-500/10 border border-success-500/20 rounded-lg p-2">
            <div className="text-xs text-text-muted">Richest</div>
            <div className="text-sm font-bold text-success-400 truncate" title={richestPlayer.name}>
              {richestPlayer.name}
            </div>
            <div className="text-xs text-success-300">{formatMoney(richestPlayer.money)}</div>
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
        <AnimatePresence>
          {sortedPlayers.map((player, index) => {
            const isCurrent = player.id === currentPlayerId;
            const isActive = player.id === activePlayerId;
            const isExpanded = expandedPlayer === player.id;
            const rank = getPlayerRank(player);
            const moneyPercentage = totalMoney > 0 ? (player.money / totalMoney) * 100 : 0;

            return (
              <motion.div
                key={player.id}
                className={`border-b border-white/10 ${isCurrent ? 'bg-primary-900/20' : 'hover:bg-surface/30'} transition-colors cursor-pointer`}
                variants={animations.fadeIn}
                initial="hidden"
                animate="visible"
                transition={{ delay: index * 0.05 }}
                onClick={() => togglePlayerExpansion(player.id)}
                whileHover={{ x: 4 }}
              >
                <div className="p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      {/* Player rank */}
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${rank <= 3 ? 'bg-accent-500/30 text-accent-300' : 'bg-surface text-text-muted'}`}>
                        {rank}
                      </div>

                      {/* Player color indicator */}
                      <div className="relative">
                        <div
                          className="w-8 h-8 rounded-full border-2 border-white/50 shadow-lg"
                          style={{ backgroundColor: player.color }}
                        >
                          {isCurrent && (
                            <div className="absolute -top-1 -right-1 w-3 h-3 bg-primary-500 rounded-full border border-white animate-pulse"></div>
                          )}
                        </div>
                        {!player.connected && (
                          <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-danger-500 rounded-full border border-white"></div>
                        )}
                      </div>

                      {/* Player info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-text-main truncate" title={player.name}>
                            {player.name}
                            {player.isHost && <span className="ml-1 text-xs text-accent-400">👑</span>}
                            {isActive && <span className="ml-1 text-xs text-primary-400 animate-pulse">▶</span>}
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
                            <div className="text-sm font-bold text-primary-300">
                              {player.properties?.length || 0} owned
                            </div>
                          </div>
                          <div className="bg-surface/30 rounded-lg p-2">
                            <div className="text-xs text-text-muted">Net Worth</div>
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
                          <div className="mt-2 bg-primary-500/10 border border-primary-500/20 rounded-lg p-2">
                            <div className="flex items-center gap-2">
                              <span className="text-primary-400 animate-pulse">🎲</span>
                              <span className="text-sm text-primary-300">
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
            className="flex-1 bg-primary-500/20 hover:bg-primary-500/30 text-primary-300 text-sm py-2 rounded-lg transition-colors flex items-center justify-center gap-1"
            onClick={() => setExpandedPlayer(null)}
          >
            <span>Collapse All</span>
          </button>
          <button
            className="flex-1 bg-accent-500/20 hover:bg-accent-500/30 text-accent-300 text-sm py-2 rounded-lg transition-colors flex items-center justify-center gap-1"
            onClick={() => setSortBy('money')}
          >
            <span>Sort by $</span>
          </button>
        </div>
      </div>
    </motion.div>
  );
};

// Compact version for mobile/small screens
export const CompactPlayerSidebar = ({ players, activePlayerId }: { players: Player[], activePlayerId?: string }) => {
  return (
    <div className="glass-panel-dark rounded-xl p-3">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-bold text-primary-300">Players</h3>
        <span className="text-xs text-text-muted">{players.length} online</span>
      </div>
      
      <div className="flex flex-wrap gap-2">
        {players.map(player => (
          <div
            key={player.id}
            className="relative group"
            title={`${player.name}: ${formatMoneyShort(player.money)}`}
          >
            <div
              className="w-8 h-8 rounded-full border-2 border-white/50"
              style={{ backgroundColor: player.color }}
            >
              {player.id === activePlayerId && (
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-primary-500 rounded-full border border-white animate-pulse"></div>
              )}
            </div>
            
            {/* Tooltip */}
            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-50">
              <div className="glass-panel px-3 py-2 rounded-lg whitespace-nowrap text-sm">
                <div className="font-bold">{player.name}</div>
                <div className="text-xs text-text-muted">{formatMoneyShort(player.money)}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};