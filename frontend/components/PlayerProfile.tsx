import { motion } from 'framer-motion';
import { loadStats } from '../utils/playerProfile';

interface PlayerProfileProps {
  avatar: string;
  name: string;
  compact?: boolean;
}

function StatBadge({ label, value, color }: { label: string; value: string | number; color: string }) {
  return (
    <div className="bg-surface/50 rounded-lg p-2 text-center">
      <div className={`text-lg font-bold ${color}`}>{value}</div>
      <div className="text-[10px] text-text-muted uppercase tracking-wider">{label}</div>
    </div>
  );
}

export function PlayerProfile({ avatar, name, compact = false }: PlayerProfileProps) {
  const stats = loadStats();
  const winRate = stats.gamesPlayed > 0
    ? Math.round((stats.wins / stats.gamesPlayed) * 100)
    : 0;

  if (compact) {
    return (
      <div className="flex items-center gap-3 p-3 bg-surface/30 rounded-xl border border-white/5">
        <div className="text-2xl">{avatar}</div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-bold text-text-main truncate">{name || 'Player'}</div>
          <div className="text-xs text-text-muted">
            {stats.gamesPlayed > 0
              ? `${stats.wins}W / ${stats.losses}L (${winRate}%)`
              : 'New player'}
          </div>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      className="bg-surface/30 rounded-xl border border-white/5 p-4"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="flex items-center gap-3 mb-4">
        <div className="text-4xl">{avatar}</div>
        <div>
          <div className="text-lg font-bold text-text-main">{name || 'Player'}</div>
          <div className="text-xs text-text-muted">
            {stats.gamesPlayed > 0
              ? `Played ${stats.gamesPlayed} game${stats.gamesPlayed !== 1 ? 's' : ''}`
              : 'New player — no games yet'}
          </div>
        </div>
      </div>

      {stats.gamesPlayed > 0 && (
        <div className="grid grid-cols-3 gap-2">
          <StatBadge label="Wins" value={stats.wins} color="text-success-400" />
          <StatBadge label="Losses" value={stats.losses} color="text-danger-400" />
          <StatBadge label="Win Rate" value={`${winRate}%`} color="text-gold-500" />
        </div>
      )}

      {stats.gamesPlayed > 0 && (
        <div className="grid grid-cols-3 gap-2 mt-2">
          <StatBadge label="Earned" value={`₹${(stats.totalMoneyEarned / 1000).toFixed(0)}k`} color="text-accent-300" />
          <StatBadge label="Bought" value={stats.propertiesBought} color="text-primary-400" />
          <StatBadge label="Jailed" value={stats.timesInJail} color="text-warning-400" />
        </div>
      )}
    </motion.div>
  );
}
