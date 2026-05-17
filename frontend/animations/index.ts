import { Variants } from 'framer-motion';

/**
 * Animation presets for Framer Motion
 * These presets align with the custom animations defined in tailwind.config.js
 */

// ===== ENTRANCE ANIMATIONS =====

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      duration: 0.3,
      ease: "easeOut"
    }
  }
};

export const fadeInUp: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.4,
      ease: "easeOut"
    }
  }
};

export const fadeInDown: Variants = {
  hidden: { opacity: 0, y: -20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.4,
      ease: "easeOut"
    }
  }
};

export const fadeInLeft: Variants = {
  hidden: { opacity: 0, x: -20 },
  visible: {
    opacity: 1,
    x: 0,
    transition: {
      duration: 0.4,
      ease: "easeOut"
    }
  }
};

export const fadeInRight: Variants = {
  hidden: { opacity: 0, x: 20 },
  visible: {
    opacity: 1,
    x: 0,
    transition: {
      duration: 0.4,
      ease: "easeOut"
    }
  }
};

export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.9 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: {
      duration: 0.3,
      ease: "easeOut"
    }
  }
};

export const bounceIn: Variants = {
  hidden: { opacity: 0, scale: 0.8 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: {
      type: "spring",
      damping: 10,
      stiffness: 100
    }
  }
};

// ===== EXIT ANIMATIONS =====

export const fadeOut: Variants = {
  visible: { opacity: 1 },
  hidden: {
    opacity: 0,
    transition: {
      duration: 0.3,
      ease: "easeIn"
    }
  }
};

export const fadeOutDown: Variants = {
  visible: { opacity: 1, y: 0 },
  hidden: {
    opacity: 0,
    y: 20,
    transition: {
      duration: 0.3,
      ease: "easeIn"
    }
  }
};

export const fadeOutUp: Variants = {
  visible: { opacity: 1, y: 0 },
  hidden: {
    opacity: 0,
    y: -20,
    transition: {
      duration: 0.3,
      ease: "easeIn"
    }
  }
};

// ===== SPECIAL EFFECT ANIMATIONS =====

export const glowPulse: Variants = {
  hidden: { 
    boxShadow: "0 0 0px rgba(34, 211, 238, 0)"
  },
  visible: {
    boxShadow: [
      "0 0 0px rgba(34, 211, 238, 0)",
      "0 0 20px rgba(34, 211, 238, 0.7)",
      "0 0 0px rgba(34, 211, 238, 0)"
    ],
    transition: {
      duration: 2,
      repeat: Infinity,
      repeatType: "loop",
      ease: "easeInOut"
    }
  }
};

export const float: Variants = {
  hidden: { y: 0 },
  visible: {
    y: [0, -10, 0],
    transition: {
      duration: 3,
      repeat: Infinity,
      repeatType: "loop",
      ease: "easeInOut"
    }
  }
};

export const neonFlicker: Variants = {
  hidden: { 
    opacity: 1,
    filter: "brightness(1)"
  },
  visible: {
    opacity: [1, 0.9, 1, 0.95, 1],
    filter: ["brightness(1)", "brightness(1.2)", "brightness(1)", "brightness(1.1)", "brightness(1)"],
    transition: {
      duration: 0.5,
      repeat: Infinity,
      repeatType: "loop",
      times: [0, 0.2, 0.5, 0.8, 1]
    }
  }
};

export const pulseSoft: Variants = {
  hidden: { scale: 1 },
  visible: {
    scale: [1, 1.05, 1],
    transition: {
      duration: 2,
      repeat: Infinity,
      repeatType: "loop",
      ease: "easeInOut"
    }
  }
};

// ===== STAGGERED ANIMATIONS =====

export const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2
    }
  }
};

export const staggerItem: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.4,
      ease: "easeOut"
    }
  }
};

// ===== BOARD SPECIFIC ANIMATIONS =====

export const diceRoll: Variants = {
  hidden: { rotate: 0 },
  visible: {
    rotate: [0, 180, 360, 540, 720],
    transition: {
      duration: 1,
      ease: "easeOut"
    }
  }
};

export const tokenMove: Variants = {
  hidden: { scale: 1 },
  visible: {
    scale: [1, 1.2, 1],
    transition: {
      duration: 0.3,
      ease: "easeOut"
    }
  }
};

export const propertyHighlight: Variants = {
  hidden: { 
    scale: 1,
    boxShadow: "0 0 0px rgba(34, 211, 238, 0)"
  },
  visible: {
    scale: [1, 1.05, 1],
    boxShadow: [
      "0 0 0px rgba(34, 211, 238, 0)",
      "0 0 20px rgba(34, 211, 238, 0.7)",
      "0 0 0px rgba(34, 211, 238, 0)"
    ],
    transition: {
      duration: 0.8,
      ease: "easeInOut"
    }
  }
};

export const moneyChange: Variants = {
  hidden: { scale: 1, color: "#f8fafc" },
  visible: {
    scale: [1, 1.2, 1],
    color: ["#f8fafc", "#22c55e", "#f8fafc"],
    transition: {
      duration: 0.6,
      ease: "easeOut"
    }
  }
};

export const jailBounce: Variants = {
  hidden: { y: 0 },
  visible: {
    y: [0, -15, 0, -8, 0],
    transition: {
      duration: 0.8,
      ease: "easeOut"
    }
  }
};

// ===== CARD ANIMATIONS =====

export const cardDraw: Variants = {
  hidden: { 
    rotateY: 180,
    opacity: 0,
    scale: 0.8
  },
  visible: {
    rotateY: 0,
    opacity: 1,
    scale: 1,
    transition: {
      duration: 0.5,
      ease: "easeOut"
    }
  }
};

export const cardFlip: Variants = {
  hidden: { rotateY: 0 },
  visible: {
    rotateY: 180,
    transition: {
      duration: 0.6,
      ease: "easeInOut"
    }
  }
};

// ===== MODAL & OVERLAY ANIMATIONS =====

export const modalBackdrop: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      duration: 0.2,
      ease: "easeOut"
    }
  }
};

export const modalContent: Variants = {
  hidden: { opacity: 0, scale: 0.9, y: 20 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      duration: 0.3,
      ease: "easeOut"
    }
  }
};

export const slideInFromBottom: Variants = {
  hidden: { y: "100%" },
  visible: {
    y: 0,
    transition: {
      type: "spring",
      damping: 25,
      stiffness: 200
    }
  }
};

export const slideInFromRight: Variants = {
  hidden: { x: "100%" },
  visible: {
    x: 0,
    transition: {
      type: "spring",
      damping: 25,
      stiffness: 200
    }
  }
};

// ===== TRANSITION PRESETS =====

export const transitionPresets = {
  fast: { duration: 0.15, ease: "easeInOut" },
  normal: { duration: 0.3, ease: "easeInOut" },
  slow: { duration: 0.5, ease: "easeInOut" },
  spring: { type: "spring", damping: 15, stiffness: 100 },
  springBouncy: { type: "spring", damping: 10, stiffness: 100 },
  springStiff: { type: "spring", damping: 20, stiffness: 200 },
};

// ===== ANIMATION CONFIGURATIONS =====

export const animationConfig = {
  // Default animation settings
  defaults: {
    initial: "hidden",
    animate: "visible",
    exit: "hidden",
    variants: fadeIn
  },
  
  // Page transitions
  page: {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -20 },
    transition: { duration: 0.3 }
  },
  
  // List items
  listItem: {
    initial: { opacity: 0, x: -20 },
    animate: { opacity: 1, x: 0 },
    transition: { duration: 0.2 }
  },
  
  // Button hover
  buttonHover: {
    whileHover: { scale: 1.05 },
    whileTap: { scale: 0.95 },
    transition: { duration: 0.2 }
  },
  
  // Card hover
  cardHover: {
    whileHover: { 
      y: -5,
      boxShadow: "0 10px 25px rgba(0, 0, 0, 0.2)"
    },
    transition: { duration: 0.3 }
  },
  
  // Toggle switch
  toggle: {
    initial: { scale: 1 },
    whileTap: { scale: 0.95 },
    transition: { duration: 0.1 }
  },
  
  // Loading spinner
  spinner: {
    animate: { rotate: 360 },
    transition: {
      duration: 1,
      repeat: Infinity,
      ease: "linear"
    }
  }
};

// ===== HELPER FUNCTIONS =====

/**
 * Creates a staggered animation for a list of items
 */
export function createStaggerAnimation(delay: number = 0.1): Variants {
  return {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: delay
      }
    }
  };
}

/**
 * Creates a pulse animation with custom color
 */
export function createPulseAnimation(color: string = "#22d3ee"): Variants {
  return {
    hidden: { boxShadow: `0 0 0px ${color}00` },
    visible: {
      boxShadow: [
        `0 0 0px ${color}00`,
        `0 0 20px ${color}70`,
        `0 0 0px ${color}00`
      ],
      transition: {
        duration: 2,
        repeat: Infinity,
        repeatType: "loop"
      }
    }
  };
}

/**
 * Creates a bounce animation with custom intensity
 */
export function createBounceAnimation(intensity: number = 10): Variants {
  return {
    hidden: { y: 0 },
    visible: {
      y: [0, -intensity, 0],
      transition: {
        duration: 0.6,
        repeat: Infinity,
        repeatType: "loop"
      }
    }
  };
}

// Export all animations as a single object for easy importing
export const animations = {
  // Entrance
  fadeIn,
  fadeInUp,
  fadeInDown,
  fadeInLeft,
  fadeInRight,
  scaleIn,
  bounceIn,
  
  // Exit
  fadeOut,
  fadeOutDown,
  fadeOutUp,
  
  // Special Effects
  glowPulse,
  float,
  neonFlicker,
  pulseSoft,
  
  // Staggered
  staggerContainer,
  staggerItem,
  
  // Board Specific
  diceRoll,
  tokenMove,
  propertyHighlight,
  moneyChange,
  jailBounce,
  
  // Card
  cardDraw,
  cardFlip,
  
  // Modal
  modalBackdrop,
  modalContent,
  slideInFromBottom,
  slideInFromRight,
  
  // Configurations
  transitionPresets,
  animationConfig,
  
  // Helper functions
  createStaggerAnimation,
  createPulseAnimation,
  createBounceAnimation,
};

export default animations;