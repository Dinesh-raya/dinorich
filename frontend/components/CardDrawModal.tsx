import { motion, AnimatePresence } from 'framer-motion';
import { useEffect } from 'react';
import { useGameStore } from '../stores/gameStore';
import { animations } from '../animations';
import boardData from '../../shared/configs/board_config.json';

const CARD_COLORS: Record<string, { bg: string; border: string; icon: string }> = {
  treasury: {
    bg: 'from-blue-900/90 to-cyan-900/90',
    border: 'border-cyan-500/40',
    icon: '🏦'
  },
  surprise: {
    bg: 'from-purple-900/90 to-pink-900/90',
    border: 'border-purple-500/40',
    icon: '❓'
  }
};

export const CardDrawModal = () => {
  const { lastCardDraw, myId, game, clearCardDraw } = useGameStore();

  useEffect(() => {
    if (lastCardDraw) {
      const timer = setTimeout(() => {
        clearCardDraw();
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [lastCardDraw, clearCardDraw]);

  if (!lastCardDraw || !game) return null;

  const { card, card_type, player_id } = lastCardDraw;
  const player = game.room.players[player_id];
  const isMe = player_id === myId;
  const cardStyle = CARD_COLORS[card_type] || CARD_COLORS.treasury;

  // Determine card effect description
  let effectText = '';
  if (card.action === 'add_money') {
    effectText = `+₹${card.amount?.toLocaleString()}`;
  } else if (card.action === 'pay_money') {
    effectText = `-₹${card.amount?.toLocaleString()}`;
  } else if (card.action === 'move_to') {
    const destTile = boardData.tiles.find((t: any) => t.id === card.destination);
    effectText = `Move to ${destTile?.name || 'GO'}`;
  } else if (card.action === 'move_relative') {
    effectText = card.amount < 0 ? `Go back ${Math.abs(card.amount)} spaces` : `Move forward ${card.amount} spaces`;
  } else if (card.action === 'go_to_jail') {
    effectText = 'Go to Jail!';
  } else if (card.action === 'get_out_of_jail_free') {
    effectText = 'Get Out of Jail Free';
  }

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[60] flex items-center justify-center pointer-events-none"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <motion.div
          className={`relative w-72 rounded-2xl border-2 ${cardStyle.border} overflow-hidden pointer-events-auto`}
          style={{
            background: `linear-gradient(135deg, rgba(15, 23, 42, 0.95) 0%, rgba(30, 20, 60, 0.95) 100%)`,
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5), 0 0 40px rgba(168, 85, 247, 0.2)'
          }}
          variants={animations.cardDraw}
          initial="hidden"
          animate="visible"
          onClick={() => clearCardDraw()}
        >
          {/* Card header */}
          <div className={`p-4 bg-gradient-to-r ${cardStyle.bg} text-center`}>
            <span className="text-3xl">{cardStyle.icon}</span>
            <h3 className="text-white font-bold text-lg mt-1 font-cyber">
              {card_type === 'treasury' ? 'TREASURY' : 'SURPRISE'}
            </h3>
          </div>

          {/* Card content */}
          <div className="p-4 text-center">
            <p className="text-text-main text-sm mb-3 leading-relaxed">
              {card.text}
            </p>

            {effectText && (
              <motion.div
                className={`inline-block px-4 py-1.5 rounded-full text-sm font-bold ${
                  effectText.startsWith('+') ? 'bg-success-500/20 text-success-400' :
                  effectText.startsWith('-') ? 'bg-danger-500/20 text-danger-400' :
                  effectText.includes('Jail') ? 'bg-danger-500/20 text-danger-400' :
                  'bg-primary-500/20 text-primary-400'
                }`}
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.3 }}
              >
                {effectText}
              </motion.div>
            )}

            <p className="text-text-muted text-xs mt-3">
              {isMe ? 'You drew this card' : `${player?.name || 'Player'} drew this card`}
            </p>
          </div>

          {/* Click to dismiss */}
          <div className="px-4 pb-3 text-center">
            <p className="text-text-muted/50 text-[10px]">Click to dismiss</p>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
