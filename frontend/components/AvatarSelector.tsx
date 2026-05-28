import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AVATARS, saveAvatar } from '../utils/playerProfile';

interface AvatarSelectorProps {
  selected: string;
  onSelect: (emoji: string) => void;
  compact?: boolean;
}

export function AvatarSelector({ selected, onSelect, compact = false }: AvatarSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleSelect = (emoji: string) => {
    saveAvatar(emoji);
    onSelect(emoji);
    setIsOpen(false);
  };

  if (compact) {
    return (
      <div className="relative">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="w-12 h-12 rounded-full bg-surface/50 border-2 border-gold-500/30 flex items-center justify-center text-2xl hover:border-gold-500 transition-colors min-h-[44px] min-w-[44px]"
          aria-label="Choose avatar"
        >
          {selected}
        </button>
        <AnimatePresence>
          {isOpen && (
            <motion.div
              className="absolute top-14 left-0 z-50 bg-surface border border-gold-500/30 rounded-xl p-3 shadow-xl grid grid-cols-4 gap-2 min-w-[200px]"
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ duration: 0.15 }}
            >
              {AVATARS.map((avatar) => (
                <button
                  key={avatar.emoji}
                  type="button"
                  onClick={() => handleSelect(avatar.emoji)}
                  className={`w-10 h-10 rounded-lg flex items-center justify-center text-xl transition-all min-h-[44px] min-w-[44px] ${
                    selected === avatar.emoji
                      ? 'bg-gold-500/30 border border-gold-500 scale-110'
                      : 'hover:bg-white/10 border border-transparent'
                  }`}
                  title={avatar.label}
                  aria-label={`Select ${avatar.label} avatar`}
                >
                  {avatar.emoji}
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  return (
    <div>
      <label className="block text-sm text-text-muted mb-2 font-cyber">AVATAR</label>
      <div className="grid grid-cols-8 gap-2">
        {AVATARS.map((avatar) => (
          <button
            key={avatar.emoji}
            type="button"
            onClick={() => handleSelect(avatar.emoji)}
            className={`w-10 h-10 rounded-lg flex items-center justify-center text-xl transition-all min-h-[44px] min-w-[44px] ${
              selected === avatar.emoji
                ? 'bg-gold-500/30 border-2 border-gold-500 scale-110'
                : 'bg-surface/50 border border-white/10 hover:bg-white/10'
            }`}
            title={avatar.label}
            aria-label={`Select ${avatar.label} avatar`}
          >
            {avatar.emoji}
          </button>
        ))}
      </div>
    </div>
  );
}
