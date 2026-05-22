import { motion, AnimatePresence } from 'framer-motion';
import { formatMoney } from '../utils/format';

interface BankruptModalProps {
  isOpen: boolean;
  playerName: string;
  creditorName?: string;
  onClose: () => void;
}

export const BankruptModal = ({ isOpen, playerName, creditorName, onClose }: BankruptModalProps) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />

          {/* Modal */}
          <motion.div
            className="relative w-full max-w-md rounded-2xl border-2 border-danger-500/30 p-6 sm:p-8 text-center"
            style={{
              background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.98) 0%, rgba(30, 20, 40, 0.98) 100%)',
              boxShadow: '0 0 60px rgba(239, 68, 68, 0.2), 0 0 120px rgba(239, 68, 68, 0.1)'
            }}
            initial={{ scale: 0.8, y: 30, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.8, y: 30, opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
          >
            {/* Icon */}
            <motion.div
              className="text-5xl sm:text-7xl mb-4 sm:mb-6"
              animate={{ rotate: [0, -10, 10, -10, 0], scale: [1, 1.1, 1] }}
              transition={{ duration: 0.5, repeat: 2 }}
            >
              💸
            </motion.div>

            {/* Title */}
            <h2 className="text-3xl font-bold text-danger-400 mb-4 font-cyber">
              BANKRUPT!
            </h2>

            {/* Message */}
            <p className="text-text-main text-lg mb-2">
              {playerName} has gone bankrupt!
            </p>
            {creditorName && (
              <p className="text-text-muted mb-6">
                All assets transferred to <span className="text-accent-400 font-bold">{creditorName}</span>
              </p>
            )}
            {!creditorName && (
              <p className="text-text-muted mb-6">
                All assets returned to the bank
              </p>
            )}

            {/* Eliminated Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-danger-500/20 border border-danger-500/30 mb-6">
              <span className="text-danger-400 font-bold">ELIMINATED</span>
            </div>

            {/* Close Button */}
            <motion.button
              onClick={onClose}
              className="w-full py-3 rounded-xl bg-surface/50 border border-white/10 text-text-main hover:bg-white/10 transition-all"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              Continue as Spectator
            </motion.button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// Game Over Modal
interface PlayerStanding {
  id: string;
  name: string;
  color: string;
  money: number;
  properties: number;
  netWorth: number;
  isBankrupt: boolean;
  rank: number;
}

interface GameOverModalProps {
  isOpen: boolean;
  winnerName: string;
  isWinner: boolean;
  standings?: PlayerStanding[];
  onClose: () => void;
}

export const GameOverModal = ({ isOpen, winnerName, isWinner, standings, onClose }: GameOverModalProps) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />

          {/* Modal */}
          <motion.div
            className="relative w-full max-w-lg rounded-2xl border-2 border-accent-500/30 p-6 sm:p-8 text-center max-h-[90vh] overflow-y-auto"
            style={{
              background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.98) 0%, rgba(30, 20, 60, 0.98) 100%)',
              boxShadow: '0 0 60px rgba(168, 85, 247, 0.2), 0 0 120px rgba(168, 85, 247, 0.1)'
            }}
            initial={{ scale: 0.8, y: 30, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.8, y: 30, opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
          >
            {/* Icon */}
            <motion.div
              className="text-6xl sm:text-8xl mb-4"
              animate={{ y: [0, -20, 0], scale: [1, 1.2, 1] }}
              transition={{ duration: 1, repeat: Infinity, repeatDelay: 2 }}
            >
              {isWinner ? '🏆' : '👑'}
            </motion.div>

            {/* Title */}
            <h2 className="text-4xl font-bold text-accent-300 mb-2 font-cyber">
              {isWinner ? 'YOU WIN!' : 'GAME OVER'}
            </h2>

            {/* Winner */}
            <p className="text-text-main text-xl mb-1">
              🎉 {winnerName} 🎉
            </p>
            <p className="text-text-muted mb-4">
              is the last one standing!
            </p>

            {/* Trophy Animation */}
            {isWinner && (
              <motion.div
                className="flex justify-center gap-4 mb-4"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
              >
                {['🎊', '✨', '🎉', '✨', '🎊'].map((emoji, i) => (
                  <motion.span
                    key={i}
                    className="text-2xl"
                    animate={{ y: [0, -15, 0] }}
                    transition={{ duration: 1, delay: i * 0.2, repeat: Infinity }}
                  >
                    {emoji}
                  </motion.span>
                ))}
              </motion.div>
            )}

            {/* Final Standings */}
            {standings && standings.length > 0 && (
              <div className="mb-6">
                <h3 className="text-text-muted text-sm font-bold mb-3 uppercase tracking-wider">Final Standings</h3>
                <div className="space-y-2">
                  {standings.map((player, index) => (
                    <motion.div
                      key={player.id}
                      className={`flex items-center gap-3 p-3 rounded-xl ${
                        index === 0 ? 'bg-accent-500/20 border border-accent-500/30' :
                        player.isBankrupt ? 'bg-white/5 opacity-60' : 'bg-white/5'
                      }`}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.3 + index * 0.1 }}
                    >
                      {/* Rank */}
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                        index === 0 ? 'bg-accent-500 text-white' :
                        index === 1 ? 'bg-gray-400 text-white' :
                        index === 2 ? 'bg-amber-600 text-white' :
                        'bg-white/10 text-text-muted'
                      }`}>
                        {player.rank}
                      </div>

                      {/* Player info */}
                      <div className="flex-1 text-left">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: player.color }}
                          />
                          <span className={`font-bold text-sm ${player.isBankrupt ? 'line-through text-text-muted' : 'text-text-main'}`}>
                            {player.name}
                          </span>
                          {index === 0 && <span className="text-xs">👑</span>}
                          {player.isBankrupt && <span className="text-xs text-danger-400">BANKRUPT</span>}
                        </div>
                      </div>

                      {/* Stats */}
                      <div className="text-right">
                        <p className="text-sm font-bold text-primary-400">{formatMoney(player.netWorth)}</p>
                        <p className="text-[10px] text-text-muted">{player.properties} properties</p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}

            {/* Close Button */}
            <motion.button
              onClick={onClose}
              className="w-full py-3 rounded-xl font-bold text-lg"
              style={{
                background: 'linear-gradient(135deg, #a855f7 0%, #7c3aed 100%)',
                boxShadow: '0 4px 20px rgba(168, 85, 247, 0.3)'
              }}
              whileHover={{ scale: 1.02, boxShadow: '0 6px 30px rgba(168, 85, 247, 0.4)' }}
              whileTap={{ scale: 0.98 }}
            >
              Play Again
            </motion.button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
