import { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { socket } from '../services/socket';
import { useGameStore } from '../stores/gameStore';
import { soundManager } from '../utils/audio';

const QUICK_MESSAGES = [
  { label: 'Nice!', emoji: '👍' },
  { label: 'Ouch!', emoji: '😣' },
  { label: 'GG', emoji: '🏆' },
  { label: 'Hurry up!', emoji: '⏰' },
  { label: 'Good game!', emoji: '🎉' },
] as const;

interface FloatingMessage {
  id: string;
  playerId: string;
  playerName: string;
  message: string;
  emoji: string;
  color: string;
  timestamp: number;
}

// Global registry for floating messages — shared across instances
let floatingMessages: FloatingMessage[] = [];
let floatingListeners: Set<() => void> = new Set();

function addFloatingMessage(msg: FloatingMessage) {
  floatingMessages = [...floatingMessages, msg];
  floatingListeners.forEach(fn => fn());
  // Auto-dismiss after 3s
  setTimeout(() => {
    floatingMessages = floatingMessages.filter(m => m.id !== msg.id);
    floatingListeners.forEach(fn => fn());
  }, 3000);
}

// Register socket listener once
let listenerRegistered = false;
function registerChatListener() {
  if (listenerRegistered) return;
  listenerRegistered = true;

  socket.on('chat:quick_message', (data: {
    player_id: string;
    player_name: string;
    message: string;
    emoji: string;
    color: string;
  }) => {
    addFloatingMessage({
      id: Math.random().toString(36).slice(2),
      playerId: data.player_id,
      playerName: data.player_name,
      message: data.message,
      emoji: data.emoji,
      color: data.color,
      timestamp: Date.now(),
    });
  });
}

export function QuickChat() {
  const room = useGameStore(s => s.room);
  const game = useGameStore(s => s.game);
  const [isExpanded, setIsExpanded] = useState(false);
  const [localMessages, setLocalMessages] = useState<FloatingMessage[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  // Register socket listener
  useEffect(() => {
    registerChatListener();
  }, []);

  // Subscribe to floating message changes
  useEffect(() => {
    const update = () => setLocalMessages([...floatingMessages]);
    floatingListeners.add(update);
    return () => { floatingListeners.delete(update); };
  }, []);

  // Close on outside click
  useEffect(() => {
    if (!isExpanded) return;
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsExpanded(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [isExpanded]);

  const sendMessage = useCallback((label: string, emoji: string) => {
    soundManager.playButtonClick();
    socket.emit('chat:quick', { message: label, emoji });
    setIsExpanded(false);
  }, []);

  if (!room || !game) return null;

  return (
    <>
      {/* Floating messages overlay */}
      <AnimatePresence>
        {localMessages.map(msg => (
          <FloatingBubble key={msg.id} message={msg} />
        ))}
      </AnimatePresence>

      {/* Quick chat button + expanded panel */}
      <div ref={containerRef} className="fixed bottom-[calc(80px+env(safe-area-inset-bottom))] right-3 z-40 lg:bottom-4 lg:right-4">
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              className="absolute bottom-14 right-0 flex flex-col gap-1.5 mb-2"
              initial={{ opacity: 0, y: 10, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.9 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            >
              {QUICK_MESSAGES.map((msg, i) => (
                <motion.button
                  key={msg.label}
                  onClick={() => sendMessage(msg.label, msg.emoji)}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-surface/95 border border-white/10 text-text-main text-sm font-medium hover:bg-surface-hover hover:border-gold-500/30 transition-all whitespace-nowrap min-h-[44px] backdrop-blur-sm"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  whileHover={{ scale: 1.05, x: -4 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <span className="text-lg">{msg.emoji}</span>
                  <span>{msg.label}</span>
                </motion.button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Toggle button */}
        <motion.button
          onClick={() => {
            soundManager.playButtonClick();
            setIsExpanded(!isExpanded);
          }}
          aria-label={isExpanded ? 'Close quick chat' : 'Open quick chat'}
          aria-expanded={isExpanded}
          className="w-12 h-12 rounded-full bg-surface border border-gold-500/30 text-gold-500 flex items-center justify-center shadow-lg hover:border-gold-500/60 transition-colors min-h-[44px] min-w-[44px]"
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          title="Quick Chat"
        >
          <motion.span
            className="text-xl"
            animate={isExpanded ? { rotate: 0 } : { rotate: 0 }}
          >
            💬
          </motion.span>
        </motion.button>
      </div>
    </>
  );
}

// Floating message bubble that appears above the game
function FloatingBubble({ message }: { message: FloatingMessage }) {
  return (
    <motion.div
      className="fixed z-[90] pointer-events-none flex flex-col items-center"
      style={{
        // Position in upper-center area, staggered by timestamp
        top: `${10 + (message.timestamp % 3) * 5}%`,
        left: '50%',
      }}
      initial={{ opacity: 0, y: 20, x: '-50%', scale: 0.5 }}
      animate={{ opacity: 1, y: 0, x: '-50%', scale: 1 }}
      exit={{ opacity: 0, y: -30, x: '-50%', scale: 0.5 }}
      transition={{ type: 'spring', damping: 20, stiffness: 300 }}
    >
      <div
        className="flex items-center gap-2 px-4 py-2 rounded-2xl border backdrop-blur-sm shadow-lg"
        style={{
          background: 'rgba(15, 23, 42, 0.9)',
          borderColor: message.color + '40',
          boxShadow: `0 0 20px ${message.color}20`,
        }}
      >
        <span className="text-xl">{message.emoji}</span>
        <div className="flex flex-col">
          <span className="text-[10px] font-bold" style={{ color: message.color }}>
            {message.playerName}
          </span>
          <span className="text-sm text-text-main font-medium">{message.message}</span>
        </div>
      </div>
    </motion.div>
  );
}
