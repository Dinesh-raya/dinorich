import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { animations } from '../animations';
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
  
  const sizeClasses = {
    sm: 'w-8 h-8 text-lg',
    md: 'w-12 h-12 text-2xl',
    lg: 'w-16 h-16 text-3xl'
  };

  const dotPositions: Record<number, string[]> = {
    1: ['center'],
    2: ['top-left', 'bottom-right'],
    3: ['top-left', 'center', 'bottom-right'],
    4: ['top-left', 'top-right', 'bottom-left', 'bottom-right'],
    5: ['top-left', 'top-right', 'center', 'bottom-left', 'bottom-right'],
    6: ['top-left', 'top-right', 'middle-left', 'middle-right', 'bottom-left', 'bottom-right']
  };

  const renderDiceFace = (value: number, _isDie1: boolean) => {
    const positions = dotPositions[value] || [];
    
    return (
      <div className="relative w-full h-full">
        {/* Dice background with gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-white to-slate-100 rounded-xl shadow-inner"></div>
        
        {/* Dice border with glow effect */}
        <div className="absolute inset-0 border-2 border-slate-300/50 rounded-xl"></div>
        
        {/* Dice dots */}
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
        
        {/* Rolling animation overlay */}
        {isRolling && (
          <motion.div
            className="absolute inset-0 bg-gradient-to-br from-primary-500/20 to-accent-500/20 rounded-xl"
            animate={{
              rotateX: [0, 360],
              rotateY: [0, 360],
              scale: [1, 1.1, 1]
            }}
            transition={{
              duration: 0.5,
              repeat: Infinity,
              repeatType: 'loop'
            }}
          />
        )}
      </div>
    );
  };

  // Play dice sound when rolling starts and ends
  useEffect(() => {
    if (isRolling) {
      soundManager.playDiceRoll();
      // Play landing sound after a delay
      const timer = setTimeout(() => {
        soundManager.playDiceLand();
        if (die1 === die2) {
          soundManager.playDiceDouble();
        }
      }, 800);
      return () => clearTimeout(timer);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRolling]);

  return (
    <motion.div 
      className="flex flex-col items-center gap-4"
      variants={animations.fadeIn}
      initial="hidden"
      animate="visible"
    >
      <div className="flex items-center gap-4">
        {/* Die 1 */}
        <motion.div
          key={`die1-${die1}-${isRolling ? 'rolling' : 'static'}`}
          className={`relative ${sizeClasses[size]} rounded-xl shadow-2xl overflow-hidden border-2 border-white/30`}
          initial={isRolling ? { 
            rotateX: 0, 
            rotateY: 0, 
            rotateZ: 0,
            scale: 0.8,
            opacity: 0.5 
          } : { 
            rotateX: 180, 
            rotateY: 180, 
            scale: 0.5, 
            opacity: 0 
          }}
          animate={isRolling ? {
            rotateX: [0, 360, 720, 1080],
            rotateY: [0, 180, 360, 540],
            rotateZ: [0, 90, 180, 270],
            scale: [0.8, 1.1, 0.9, 1],
            opacity: [0.5, 1, 0.8, 1]
          } : {
            rotateX: 0,
            rotateY: 0,
            scale: 1,
            opacity: 1
          }}
          transition={isRolling ? {
            duration: 1.5,
            ease: "easeInOut",
            times: [0, 0.3, 0.7, 1]
          } : {
            duration: 0.6,
            type: 'spring',
            stiffness: 200,
            damping: 15
          }}
          onAnimationComplete={() => {
            if (isRolling && onRollComplete) {
              setTimeout(onRollComplete, 300);
            }
          }}
        >
          {renderDiceFace(die1, true)}
          
          {/* Glow effect */}
          {!isRolling && (
            <motion.div
              className="absolute inset-0 rounded-xl border-2 border-primary-400/30"
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, 0.5, 0] }}
              transition={{ duration: 0.8, repeat: 1 }}
            />
          )}
        </motion.div>

        {/* Die 2 */}
        <motion.div
          key={`die2-${die2}-${isRolling ? 'rolling' : 'static'}`}
          className={`relative ${sizeClasses[size]} rounded-xl shadow-2xl overflow-hidden border-2 border-white/30`}
          initial={isRolling ? { 
            rotateX: 0, 
            rotateY: 0, 
            rotateZ: 0,
            scale: 0.8,
            opacity: 0.5 
          } : { 
            rotateX: -180, 
            rotateY: -180, 
            scale: 0.5, 
            opacity: 0 
          }}
          animate={isRolling ? {
            rotateX: [0, -360, -720, -1080],
            rotateY: [0, -180, -360, -540],
            rotateZ: [0, -90, -180, -270],
            scale: [0.8, 1.1, 0.9, 1],
            opacity: [0.5, 1, 0.8, 1]
          } : {
            rotateX: 0,
            rotateY: 0,
            scale: 1,
            opacity: 1
          }}
          transition={isRolling ? {
            duration: 1.5,
            ease: "easeInOut",
            times: [0, 0.3, 0.7, 1],
            delay: 0.1
          } : {
            duration: 0.6,
            type: 'spring',
            stiffness: 200,
            damping: 15,
            delay: 0.1
          }}
        >
          {renderDiceFace(die2, false)}
          
          {/* Glow effect */}
          {!isRolling && (
            <motion.div
              className="absolute inset-0 rounded-xl border-2 border-accent-400/30"
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, 0.5, 0] }}
              transition={{ duration: 0.8, repeat: 1, delay: 0.2 }}
            />
          )}
        </motion.div>
      </div>

      {/* Total display */}
      {showTotal && (
        <AnimatePresence mode="wait">
          {!isRolling && (
            <motion.div
              key={`total-${total}`}
              className="flex flex-col items-center gap-1"
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -10, opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              <div className="text-text-muted text-sm">Total</div>
              <motion.div
                className="text-3xl font-bold text-primary-300"
                initial={{ scale: 0.5 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 300 }}
              >
                {total}
              </motion.div>
              
              {/* Special animations for doubles */}
              {die1 === die2 && (
                <motion.div
                  className="mt-1 px-3 py-1 bg-accent-500/20 rounded-full border border-accent-500/30"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.2 }}
                >
                  <span className="text-accent-300 text-xs font-bold">DOUBLES!</span>
                </motion.div>
              )}
              
              {/* Special animation for snake eyes */}
              {die1 === 1 && die2 === 1 && (
                <motion.div
                  className="mt-1 px-3 py-1 bg-danger-500/20 rounded-full border border-danger-500/30"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.3 }}
                >
                  <span className="text-danger-300 text-xs font-bold">SNAKE EYES!</span>
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      )}

      {/* Rolling indicator */}
      {isRolling && (
        <motion.div
          className="flex items-center gap-2"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <div className="flex gap-1">
            {[1, 2, 3].map((i) => (
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
    </motion.div>
  );
};
