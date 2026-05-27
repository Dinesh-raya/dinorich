import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { soundManager } from '../utils/audio';

interface TutorialStep {
  title: string;
  description: string;
  highlight: string | null; // CSS selector for element to highlight
  icon: string;
}

const TUTORIAL_STEPS: TutorialStep[] = [
  {
    title: 'Welcome to DINO-RICHUP!',
    description: 'Buy properties, collect rent, and bankrupt your opponents to win. This quick tutorial will show you the basics.',
    highlight: null,
    icon: '🏠',
  },
  {
    title: 'Roll the Dice',
    description: 'When it\'s your turn, tap the Roll Dice button to move around the board. Doubles let you roll again!',
    highlight: '[data-tutorial="turn-panel"]',
    icon: '🎲',
  },
  {
    title: 'Buy Properties',
    description: 'Land on an unowned property to buy it. Collect rent when other players land on your properties!',
    highlight: '[data-tutorial="board"]',
    icon: '💰',
  },
  {
    title: 'Pay Rent & Taxes',
    description: 'When you land on owned properties, rent is auto-collected. Watch your money and plan your strategy!',
    highlight: '[data-tutorial="money"]',
    icon: '💸',
  },
  {
    title: 'Build Houses & Hotels',
    description: 'Own all properties in a color group? Build houses to increase rent. Four houses upgrade to a hotel!',
    highlight: '[data-tutorial="sidebar"]',
    icon: '🏗️',
  },
];

const STORAGE_KEY = 'dino_tutorial_done';

export function Tutorial() {
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [highlightRect, setHighlightRect] = useState<DOMRect | null>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  // Check if tutorial should show on mount
  useEffect(() => {
    const done = localStorage.getItem(STORAGE_KEY);
    if (!done) {
      // Small delay so the game board has time to render
      const timer = setTimeout(() => setIsOpen(true), 1500);
      return () => clearTimeout(timer);
    }
  }, []);

  // Update highlight position when step changes
  useEffect(() => {
    if (!isOpen) return;

    const currentStep = TUTORIAL_STEPS[step];
    if (!currentStep?.highlight) {
      setHighlightRect(null);
      return;
    }

    const updateRect = () => {
      const el = document.querySelector(currentStep.highlight!);
      if (el) {
        const rect = el.getBoundingClientRect();
        setHighlightRect(rect);
      } else {
        setHighlightRect(null);
      }
    };

    updateRect();
    // Update on resize
    window.addEventListener('resize', updateRect);
    return () => window.removeEventListener('resize', updateRect);
  }, [step, isOpen]);

  const close = useCallback(() => {
    setIsOpen(false);
    localStorage.setItem(STORAGE_KEY, 'true');
    soundManager.playButtonClick();
  }, []);

  const next = useCallback(() => {
    soundManager.playButtonClick();
    if (step < TUTORIAL_STEPS.length - 1) {
      setStep(step + 1);
    } else {
      close();
    }
  }, [step, close]);

  const prev = useCallback(() => {
    soundManager.playButtonClick();
    if (step > 0) {
      setStep(step - 1);
    }
  }, [step]);

  if (!isOpen) return null;

  const current = TUTORIAL_STEPS[step];
  const isLast = step === TUTORIAL_STEPS.length - 1;
  const isFirst = step === 0;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          ref={overlayRef}
          className="fixed inset-0 z-[100]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          {/* Semi-transparent backdrop with spotlight cutout */}
          <div className="absolute inset-0">
            {highlightRect ? (
              <>
                {/* Full overlay with cutout - use box-shadow for the spotlight effect */}
                <div
                  className="absolute inset-0 bg-black/70 backdrop-blur-sm"
                  style={{
                    maskImage: `radial-gradient(circle ${Math.max(highlightRect.width, highlightRect.height) * 0.7}px at ${highlightRect.left + highlightRect.width / 2}px ${highlightRect.top + highlightRect.height / 2}px, transparent 0%, transparent 50%, black 50%)`,
                    WebkitMaskImage: `radial-gradient(circle ${Math.max(highlightRect.width, highlightRect.height) * 0.7}px at ${highlightRect.left + highlightRect.width / 2}px ${highlightRect.top + highlightRect.height / 2}px, transparent 0%, transparent 50%, black 50%)`,
                  }}
                />
                {/* Highlight glow around the target */}
                <motion.div
                  className="absolute rounded-xl pointer-events-none"
                  style={{
                    top: highlightRect.top - 8,
                    left: highlightRect.left - 8,
                    width: highlightRect.width + 16,
                    height: highlightRect.height + 16,
                    boxShadow: '0 0 0 3px rgba(226, 183, 20, 0.6), 0 0 30px rgba(226, 183, 20, 0.3)',
                  }}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.3 }}
                />
              </>
            ) : (
              <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
            )}
          </div>

          {/* Tutorial Card */}
          <motion.div
            className="absolute z-10 w-[90vw] max-w-sm"
            style={{
              top: highlightRect
                ? Math.min(highlightRect.bottom + 20, window.innerHeight - 280)
                : '50%',
              left: '50%',
              transform: 'translateX(-50%)' + (highlightRect ? '' : ' translateY(-50%)'),
            }}
            key={step}
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          >
            <div
              className="rounded-2xl border border-gold-500/30 p-6 text-center"
              style={{
                background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.98) 0%, rgba(30, 20, 60, 0.98) 100%)',
                boxShadow: '0 0 40px rgba(226, 183, 20, 0.15), 0 20px 60px rgba(0, 0, 0, 0.5)',
              }}
            >
              {/* Icon */}
              <motion.div
                className="text-5xl mb-4"
                animate={{ scale: [1, 1.1, 1], rotate: [0, 5, -5, 0] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                {current.icon}
              </motion.div>

              {/* Title */}
              <h2 className="text-2xl font-bold text-gold-500 font-cyber mb-3">
                {current.title}
              </h2>

              {/* Description */}
              <p className="text-text-muted text-sm leading-relaxed mb-6">
                {current.description}
              </p>

              {/* Step indicator dots */}
              <div className="flex justify-center gap-2 mb-5">
                {TUTORIAL_STEPS.map((_, i) => (
                  <div
                    key={i}
                    className={`w-2 h-2 rounded-full transition-all duration-300 ${
                      i === step
                        ? 'bg-gold-500 w-6'
                        : i < step
                          ? 'bg-gold-500/60'
                          : 'bg-white/20'
                    }`}
                  />
                ))}
              </div>

              {/* Buttons */}
              <div className="flex gap-3">
                {/* Skip button */}
                {!isFirst && (
                  <motion.button
                    onClick={prev}
                    className="flex-1 py-3 rounded-xl bg-surface/50 border border-white/10 text-text-muted hover:bg-white/10 transition-all font-medium min-h-[44px]"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    Back
                  </motion.button>
                )}

                {/* Skip / Got it on first step */}
                <motion.button
                  onClick={close}
                  className="flex-1 py-3 rounded-xl bg-surface/50 border border-white/10 text-text-muted hover:bg-white/10 transition-all font-medium min-h-[44px]"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  {isFirst ? 'Skip' : 'Skip All'}
                </motion.button>

                {/* Next / Got it button */}
                <motion.button
                  onClick={next}
                  className="flex-[2] py-3 rounded-xl font-bold text-background min-h-[44px]"
                  style={{
                    background: 'linear-gradient(135deg, #e2b714 0%, #f0c040 100%)',
                    boxShadow: '0 4px 20px rgba(226, 183, 20, 0.3)',
                  }}
                  whileHover={{ scale: 1.02, boxShadow: '0 6px 30px rgba(226, 183, 20, 0.4)' }}
                  whileTap={{ scale: 0.98 }}
                >
                  {isLast ? 'Got it!' : 'Next'}
                </motion.button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
