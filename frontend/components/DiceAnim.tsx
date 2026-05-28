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
  const onRollCompleteRef = useRef(onRollComplete);
  onRollCompleteRef.current = onRollComplete;
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
        {/* Base with rich gradient */}
        <div className="absolute inset-0 rounded-xl"
          style={{
            background: 'linear-gradient(145deg, #ffffff 0%, #f1f5f9 30%, #e2e8f0 70%, #cbd5e1 100%)',
          }}
        />
        {/* Top highlight for 3D feel */}
        <div className="absolute inset-0 rounded-xl"
          style={{
            background: 'linear-gradient(180deg, rgba(255,255,255,0.8) 0%, transparent 40%)',
          }}
        />
        {/* Inner shadow for depth */}
        <div className="absolute inset-[1px] rounded-xl"
          style={{
            boxShadow: 'inset 0 2px 4px rgba(255,255,255,0.6), inset 0 -2px 4px rgba(0,0,0,0.08)',
          }}
        />
        {/* Outer border with subtle gradient */}
        <div className="absolute inset-0 rounded-xl border border-white/60" />
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
              className={`absolute w-2 h-2 md:w-2.5 md:h-2.5 rounded-full ${positionClass}`}
              style={{
                background: 'radial-gradient(circle at 35% 35%, #475569, #1e293b)',
                boxShadow: '0 1px 2px rgba(0,0,0,0.3), inset 0 1px 1px rgba(255,255,255,0.1)',
              }}
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
        onRollCompleteRef.current?.();
      }, 1500);
    }

    return () => {
      if (soundTimerRef.current) clearTimeout(soundTimerRef.current);
      if (completeTimerRef.current) clearTimeout(completeTimerRef.current);
    };
  }, [isRolling, die1, die2]);

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="flex items-center gap-5" role="img" aria-label={`Die 1: ${isRolling ? 'rolling' : displayDie1}, Die 2: ${isRolling ? 'rolling' : displayDie2}${!isRolling ? `, total: ${displayDie1 + displayDie2}` : ''}`} aria-live="polite">
        {/* Die 1 */}
        <motion.div
          className={`relative ${sizeClasses[size]} rounded-xl overflow-hidden border-2`}
          style={{
            boxShadow: isRolling
              ? '0 0 30px rgba(212, 164, 55, 0.4), 0 8px 25px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.2)'
              : hasLanded
                ? '0 0 25px rgba(212, 164, 55, 0.5), 0 6px 20px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.15)'
                : '0 0 12px rgba(212, 164, 55, 0.15), 0 4px 14px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.1)',
            background: 'linear-gradient(145deg, #1e293b 0%, #0f172a 100%)',
            borderColor: isRolling ? 'rgba(212, 164, 55, 0.5)' : hasLanded ? 'rgba(212, 164, 55, 0.6)' : 'rgba(212, 164, 55, 0.25)',
          }}
          animate={isRolling ? {
            y: [0, -16, 0, -10, 0, -5, 0, -2, 0],
            rotate: [0, -12, 15, -10, 12, -6, 8, -3, 0],
            scale: [1, 1.12, 0.95, 1.08, 0.97, 1.04, 0.99, 1.01, 1],
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
          className={`relative ${sizeClasses[size]} rounded-xl overflow-hidden border-2`}
          style={{
            boxShadow: isRolling
              ? '0 0 30px rgba(212, 164, 55, 0.4), 0 8px 25px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.2)'
              : hasLanded
                ? '0 0 25px rgba(212, 164, 55, 0.5), 0 6px 20px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.15)'
                : '0 0 12px rgba(212, 164, 55, 0.15), 0 4px 14px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.1)',
            background: 'linear-gradient(145deg, #1e293b 0%, #0f172a 100%)',
            borderColor: isRolling ? 'rgba(212, 164, 55, 0.5)' : hasLanded ? 'rgba(212, 164, 55, 0.6)' : 'rgba(212, 164, 55, 0.25)',
          }}
          animate={isRolling ? {
            y: [0, -16, 0, -10, 0, -5, 0, -2, 0],
            rotate: [0, -12, 15, -10, 12, -6, 8, -3, 0],
            scale: [1, 1.12, 0.95, 1.08, 0.97, 1.04, 0.99, 1.01, 1],
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
              initial={{ y: 12, opacity: 0, scale: 0.8 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: -12, opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.3, type: 'spring', stiffness: 300 }}
            >
              <div className="text-gold-500/60 text-xs font-cyber tracking-wider uppercase">Total</div>
              <div className="text-4xl font-bold font-cyber gold-glow"
                style={{ textShadow: '0 0 20px rgba(212, 164, 55, 0.4)' }}>
                {total}
              </div>
              {die1 === die2 && (
                <motion.div
                  className="mt-1 px-4 py-1.5 rounded-full"
                  style={{ background: 'linear-gradient(135deg, rgba(212, 164, 55, 0.2), rgba(212, 164, 55, 0.1))', border: '1px solid rgba(212, 164, 55, 0.3)' }}
                  initial={{ scale: 0, rotate: -10 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ delay: 0.15, type: 'spring', stiffness: 500 }}
                >
                  <span className="text-gold-500 text-xs font-bold font-cyber tracking-wider">DOUBLES!</span>
                </motion.div>
              )}
              {die1 === 1 && die2 === 1 && (
                <motion.div
                  className="mt-1 px-4 py-1.5 rounded-full"
                  style={{ background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.2), rgba(220, 38, 38, 0.1))', border: '1px solid rgba(239, 68, 68, 0.3)' }}
                  initial={{ scale: 0, rotate: 10 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ delay: 0.2, type: 'spring', stiffness: 500 }}
                >
                  <span className="text-danger-400 text-xs font-bold font-cyber tracking-wider">SNAKE EYES!</span>
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
