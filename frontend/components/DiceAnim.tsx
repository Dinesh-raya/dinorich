import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { soundManager } from '../utils/audio';

interface DiceAnimProps {
  die1: number;
  die2: number;
  isRolling?: boolean;
  onRollComplete?: () => void;
  size?: 'sm' | 'md' | 'lg';
  showTotal?: boolean;
}

export const DiceAnim = ({
  die1,
  die2,
  isRolling = false,
  onRollComplete,
  size = 'md',
  showTotal = true
}: DiceAnimProps) => {
  const total = die1 + die2;
  const soundTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const completeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [displayDie1, setDisplayDie1] = useState(die1);
  const [displayDie2, setDisplayDie2] = useState(die2);
  const [hasLanded, setHasLanded] = useState(false);

  const sizeClasses = {
    sm: 'w-10 h-10 text-lg',
    md: 'w-14 h-14 text-2xl',
    lg: 'w-20 h-20 text-4xl'
  };

  const dotPositions: Record<number, string[]> = {
    1: ['center'],
    2: ['top-left', 'bottom-right'],
    3: ['top-left', 'center', 'bottom-right'],
    4: ['top-left', 'top-right', 'bottom-left', 'bottom-right'],
    5: ['top-left', 'top-right', 'center', 'bottom-left', 'bottom-right'],
    6: ['top-left', 'top-right', 'middle-left', 'middle-right', 'bottom-left', 'bottom-right']
  };

  const renderDiceFace = (value: number) => {
    const positions = dotPositions[value] || [];

    return (
      <div className="relative w-full h-full">
        <div className="absolute inset-0 bg-gradient-to-br from-white to-slate-100 rounded-xl shadow-inner" />
        <div className="absolute inset-0 border-2 border-slate-300/50 rounded-xl" />
        {positions.map((pos, idx) => {
          let positionClass = '';
          switch (pos) {
            case 'top-left': positionClass = 'top-1 left-1'; break;
            case 'top-right': positionClass = 'top-1 right-1'; break;
            case 'middle-left': positionClass = 'top-1/2 left-1 -translate-y-1/2'; break;
            case 'middle-right': positionClass = 'top-1/2 right-1 -translate-y-1/2'; break;
            case 'bottom-left': positionClass = 'bottom-1 left-1'; break;
            case 'bottom-right': positionClass = 'bottom-1 right-1'; break;
            case 'center': positionClass = 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2'; break;
          }

          return (
            <div
              key={idx}
              className={`absolute w-2 h-2 md:w-3 md:h-3 bg-slate-800 rounded-full ${positionClass}`}
            />
          );
        })}
      </div>
    );
  };

  // Randomize displayed dice faces during rolling
  useEffect(() => {
    if (isRolling) {
      setHasLanded(false);
      const interval = setInterval(() => {
        setDisplayDie1(Math.floor(Math.random() * 6) + 1);
        setDisplayDie2(Math.floor(Math.random() * 6) + 1);
      }, 80);

      // Stop randomization and show final values after 1.2s
      const stopTimer = setTimeout(() => {
        clearInterval(interval);
        setDisplayDie1(die1);
        setDisplayDie2(die2);
        setHasLanded(true);
      }, 1200);

      return () => {
        clearInterval(interval);
        clearTimeout(stopTimer);
      };
    } else {
      setDisplayDie1(die1);
      setDisplayDie2(die2);
    }
  }, [isRolling, die1, die2]);

  // Handle sound and completion timing
  useEffect(() => {
    if (soundTimerRef.current) clearTimeout(soundTimerRef.current);
    if (completeTimerRef.current) clearTimeout(completeTimerRef.current);

    if (isRolling) {
      soundManager.playDiceRoll();

      // Play land sound when dice settle
      soundTimerRef.current = setTimeout(() => {
        soundManager.playDiceLand();
        if (die1 === die2) {
          soundManager.playDiceDouble();
        }
      }, 1200);

      // Fire onRollComplete after animation finishes
      completeTimerRef.current = setTimeout(() => {
        onRollComplete?.();
      }, 1500);
    }

    return () => {
      if (soundTimerRef.current) clearTimeout(soundTimerRef.current);
      if (completeTimerRef.current) clearTimeout(completeTimerRef.current);
    };
  }, [isRolling, die1, die2, onRollComplete]);

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="flex items-center gap-5" role="img" aria-label={`Die 1: ${isRolling ? 'rolling' : displayDie1}, Die 2: ${isRolling ? 'rolling' : displayDie2}${!isRolling ? `, total: ${displayDie1 + displayDie2}` : ''}`}>
        {/* Die 1 */}
        <motion.div
          className={`relative ${sizeClasses[size]} rounded-xl overflow-hidden border-2 border-white/40`}
          style={{
            boxShadow: isRolling
              ? '0 0 25px rgba(34, 211, 238, 0.3), 0 6px 20px rgba(0,0,0,0.4)'
              : hasLanded
                ? '0 0 20px rgba(34, 211, 238, 0.4), 0 4px 15px rgba(0,0,0,0.3)'
                : '0 0 10px rgba(34, 211, 238, 0.1), 0 4px 12px rgba(0,0,0,0.2)'
          }}
          animate={isRolling ? {
            y: [0, -12, 0, -8, 0, -4, 0],
            rotate: [0, -8, 8, -5, 5, -2, 0],
            scale: [1, 1.08, 1, 1.05, 1, 1.02, 1],
          } : hasLanded ? {
            y: [0, -4, 0],
            scale: [1, 1.05, 1],
          } : {
            y: 0,
            rotate: 0,
            scale: 1,
          }}
          transition={isRolling ? {
            duration: 1.2,
            ease: 'easeInOut',
          } : hasLanded ? {
            duration: 0.3,
            ease: 'easeOut',
          } : {
            type: 'spring',
            stiffness: 300,
            damping: 20,
          }}
        >
          {renderDiceFace(displayDie1)}
        </motion.div>

        {/* Die 2 */}
        <motion.div
          className={`relative ${sizeClasses[size]} rounded-xl overflow-hidden border-2 border-white/40`}
          style={{
            boxShadow: isRolling
              ? '0 0 25px rgba(34, 211, 238, 0.3), 0 6px 20px rgba(0,0,0,0.4)'
              : hasLanded
                ? '0 0 20px rgba(34, 211, 238, 0.4), 0 4px 15px rgba(0,0,0,0.3)'
                : '0 0 10px rgba(34, 211, 238, 0.1), 0 4px 12px rgba(0,0,0,0.2)'
          }}
          animate={isRolling ? {
            y: [0, -12, 0, -8, 0, -4, 0],
            rotate: [0, 8, -8, 5, -5, 2, 0],
            scale: [1, 1.08, 1, 1.05, 1, 1.02, 1],
          } : hasLanded ? {
            y: [0, -4, 0],
            scale: [1, 1.05, 1],
          } : {
            y: 0,
            rotate: 0,
            scale: 1,
          }}
          transition={isRolling ? {
            duration: 1.2,
            ease: 'easeInOut',
            delay: 0.05,
          } : hasLanded ? {
            duration: 0.3,
            ease: 'easeOut',
            delay: 0.05,
          } : {
            type: 'spring',
            stiffness: 300,
            damping: 20,
            delay: 0.05,
          }}
        >
          {renderDiceFace(displayDie2)}
        </motion.div>
      </div>

      {/* Total display */}
      {showTotal && (
        <AnimatePresence mode="wait">
          {!isRolling && hasLanded && (
            <motion.div
              key={`total-${die1}-${die2}`}
              className="flex flex-col items-center gap-1"
              initial={{ y: 8, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -8, opacity: 0 }}
              transition={{ duration: 0.25 }}
            >
              <div className="text-text-muted text-sm">Total</div>
              <div className="text-3xl font-bold text-gold-500">
                {total}
              </div>

              {die1 === die2 && (
                <motion.div
                  className="mt-1 px-3 py-1 bg-gold-500/20 rounded-full border border-gold-500/30"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.1, type: 'spring', stiffness: 400 }}
                >
                  <span className="text-accent-300 text-xs font-bold">DOUBLES!</span>
                </motion.div>
              )}

              {die1 === 1 && die2 === 1 && (
                <motion.div
                  className="mt-1 px-3 py-1 bg-danger-500/20 rounded-full border border-danger-500/30"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.15, type: 'spring', stiffness: 400 }}
                >
                  <span className="text-danger-300 text-xs font-bold">SNAKE EYES!</span>
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      )}

      {/* Rolling indicator */}
      <AnimatePresence>
        {isRolling && (
          <motion.div
            className="flex items-center gap-2"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            <div className="flex gap-1">
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  className="w-2 h-2 bg-primary-500 rounded-full"
                  animate={{
                    scale: [1, 1.5, 1],
                    opacity: [0.5, 1, 0.5]
                  }}
                  transition={{
                    duration: 0.6,
                    repeat: Infinity,
                    delay: i * 0.2
                  }}
                />
              ))}
            </div>
            <span className="text-text-muted text-sm">Rolling...</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
