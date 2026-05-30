import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { soundManager } from '../utils/audio';

interface AudioSettingsProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AudioSettings = ({ isOpen, onClose }: AudioSettingsProps) => {
  const [soundEnabled, setSoundEnabled] = useState(true);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (isOpen) {
      setSoundEnabled(soundManager.isSoundEnabled());
    }
  }, [isOpen]);

  const handleToggle = () => {
    const newState = soundManager.toggleSound();
    setSoundEnabled(newState);
  };

  return (
    <AnimatePresence>
      {isOpen && (
    <motion.div
      key="audio-settings"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-xl p-4"
    >
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-label="Audio settings"
        initial={{ scale: 0.8, y: 50, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        exit={{ scale: 0.8, y: 50, opacity: 0 }}
        transition={{ type: 'spring', damping: 25 }}
        className="panel-dark p-5 sm:p-8 rounded-2xl sm:rounded-3xl w-[95vw] max-w-sm max-h-[90vh] overflow-y-auto border-2 border-gold-500/30 shadow-2xl"
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-cyber text-xl sm:text-2xl font-bold text-gold-500">Sound</h2>
          <button
            onClick={onClose}
            className="btn-gold-ghost p-3 min-h-[44px] min-w-[44px] rounded-xl text-text-muted hover:text-white transition-colors"
          >
            ✕
          </button>
        </div>

        <div className="flex items-center justify-between py-4">
          <div>
            <h3 className="text-lg font-bold text-white">Game Sounds</h3>
            <p className="text-sm text-text-muted">Dice, trades, rent, building</p>
          </div>
          <button
            onClick={handleToggle}
            role="switch"
            aria-checked={soundEnabled}
            aria-label="Toggle game sounds"
            className={`relative w-14 h-8 rounded-full transition-colors ${soundEnabled ? 'bg-accent-500' : 'bg-surface'}`}
          >
            <motion.div
              className="absolute top-1 w-6 h-6 bg-white rounded-full"
              animate={{ x: soundEnabled ? 26 : 4 }}
              transition={{ type: 'spring', stiffness: 300 }}
            />
          </button>
        </div>

        <div className="mt-6">
          <button
            onClick={onClose}
            className="w-full py-3 min-h-[44px] bg-surface/50 rounded-xl text-white hover:bg-surface/70 transition-colors"
          >
            Close
          </button>
        </div>
      </motion.div>
    </motion.div>
      )}
    </AnimatePresence>
  );
};
