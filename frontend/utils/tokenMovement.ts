import { animations } from '../animations';
import { soundManager } from './audio';

export interface TokenPosition {
  tileId: number;
  x: number;
  y: number;
}

export interface TokenMoveConfig {
  playerId: string;
  fromTileId: number;
  toTileId: number;
  steps: number;
  duration?: number;
  onStepComplete?: (currentTile: number) => void;
  onMoveComplete?: () => void;
}

/**
 * Calculate intermediate positions for smooth token movement
 */
export const calculateMovementPath = (
  fromTileId: number,
  _toTileId: number,
  steps: number
): number[] => {
  const path: number[] = [];

  // Step one tile at a time to avoid Math.floor() duplicates/skips
  for (let i = 0; i <= steps; i++) {
    const current = (fromTileId + i) % 40;
    path.push(current);
  }

  return path;
};

/**
 * Get grid position for a tile ID (matching Board.tsx logic)
 */
export const getGridPosition = (index: number) => {
  if (index >= 0 && index <= 10) return { gridRow: 11, gridColumn: 11 - index };
  if (index > 10 && index <= 20) return { gridRow: 11 - (index - 10), gridColumn: 1 };
  if (index > 20 && index <= 30) return { gridRow: 1, gridColumn: 1 + (index - 20) };
  if (index > 30 && index < 40) return { gridRow: 1 + (index - 30), gridColumn: 11 };
  return { gridRow: 6, gridColumn: 6 };
};

/**
 * Convert grid position to pixel coordinates
 */
export const gridToPixelPosition = (
  gridPos: { gridRow: number; gridColumn: number },
  boardSize: { width: number; height: number }
) => {
  const cellWidth = boardSize.width / 11;
  const cellHeight = boardSize.height / 11;
  
  return {
    x: (gridPos.gridColumn - 1) * cellWidth + cellWidth / 2,
    y: (gridPos.gridRow - 1) * cellHeight + cellHeight / 2
  };
};

/**
 * Create a smooth token movement animation
 */
export const createTokenMovement = (
  config: TokenMoveConfig
) => {
  const {
    fromTileId,
    toTileId,
    steps,
    duration = 0.5,
    onStepComplete: _onStepComplete,
    onMoveComplete: _onMoveComplete
  } = config;

  const path = calculateMovementPath(fromTileId, toTileId, steps);
  
  return {
    initial: { scale: 1 },
    animate: {
      scale: [1, 1.1, 1],
      transition: {
        duration,
        ease: "easeInOut"
      }
    },
    transition: {
      staggerChildren: duration / path.length
    }
  };
};

/**
 * Create particle effect for token movement
 */
export const createMovementParticles = (
  startPos: { x: number; y: number },
  _endPos: { x: number; y: number },
  count: number = 8
) => {
  const particles = [];
  
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2;
    const distance = 20 + Math.random() * 30;
    
    particles.push({
      id: `particle-${i}`,
      x: startPos.x + Math.cos(angle) * distance,
      y: startPos.y + Math.sin(angle) * distance,
      size: 2 + Math.random() * 4,
      color: i % 2 === 0 ? '#00ffff' : '#ff00ff',
      duration: 0.3 + Math.random() * 0.4
    });
  }
  
  return particles;
};

/**
 * Hook for managing token movement animations
 */
export const useTokenMovement = () => {
  const moveToken = async (config: TokenMoveConfig) => {
    const { fromTileId, toTileId, steps } = config;
    
    // Play movement sound
    soundManager.play('player_move');
    
    // Calculate movement path
    const path = calculateMovementPath(fromTileId, toTileId, steps);
    
    // Animate through each step
    for (let i = 0; i < path.length; i++) {
      const currentTile = path[i];
      
      // Call step callback
      if (config.onStepComplete) {
        config.onStepComplete(currentTile);
      }
      
      // Add slight delay between steps for visual effect
      if (i < path.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    // Play arrival sound
    setTimeout(() => {
      soundManager.play('player_move');
    }, 200);
    
    // Call completion callback
    if (config.onMoveComplete) {
      config.onMoveComplete();
    }
  };

  const jumpToTile = () => {
    // Play teleport sound
    soundManager.play('player_move');
    
    return {
      initial: { scale: 0, opacity: 0 },
      animate: {
        scale: 1,
        opacity: 1,
        transition: {
          type: 'spring',
          stiffness: 300,
          damping: 20
        }
      }
    };
  };

  const bounceAnimation = () => {
    return {
      animate: {
        y: [0, -15, 0],
        scale: [1, 1.1, 1]
      },
      transition: {
        duration: 0.5,
        repeat: 2,
        repeatType: 'reverse' as const
      }
    };
  };

  const jailBounceAnimation = () => {
    return {
      animate: {
        rotate: [0, 10, -10, 0],
        y: [0, -20, 0],
        scale: [1, 1.2, 1]
      },
      transition: {
        duration: 0.8,
        repeat: 1,
        repeatType: 'reverse' as const
      }
    };
  };

  const moneyChangeAnimation = (amount: number) => {
    const isPositive = amount > 0;
    
    return {
      initial: { scale: 0, opacity: 0 },
      animate: { 
        scale: 1, 
        opacity: 1,
        color: isPositive ? '#10b981' : '#ef4444'
      },
      exit: { scale: 0, opacity: 0 },
      transition: {
        duration: 0.3,
        delay: 0.1
      }
    };
  };

  return {
    moveToken,
    jumpToTile,
    bounceAnimation,
    jailBounceAnimation,
    moneyChangeAnimation
  };
};

/**
 * Predefined animation presets for common movements
 */
export const tokenAnimationPresets = {
  normalMove: {
    transition: animations.transitionPresets.springBouncy,
    whileHover: { scale: 1.2 },
    whileTap: { scale: 0.9 }
  },
  
  fastMove: {
    transition: { duration: 0.2, ease: "linear" },
    whileHover: { scale: 1.1 }
  },
  
  jailEntry: {
    initial: { rotate: -180, scale: 0 },
    animate: { 
      rotate: 0, 
      scale: 1,
      transition: {
        type: 'spring',
        stiffness: 200,
        damping: 15
      }
    }
  },
  
  passGo: {
    animate: {
      scale: [1, 1.5, 1],
      rotate: [0, 360, 0]
    },
    transition: {
      duration: 1,
      ease: "easeInOut"
    }
  },
  
  propertyPurchase: {
    initial: { scale: 0, y: 20 },
    animate: { 
      scale: 1, 
      y: 0,
      transition: {
        type: 'spring',
        stiffness: 300,
        damping: 20
      }
    },
    exit: { scale: 0, y: -20 }
  }
};