import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { soundManager } from '../utils/audio';

interface AudioSettingsProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AudioSettings = ({ isOpen, onClose }: AudioSettingsProps) => {
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [soundVolume, setSoundVolume] = useState(70);

  useEffect(() => {
    if (isOpen) {
      setSoundEnabled(soundManager.isSoundEnabled());
      setSoundVolume(70);
    }
  }, [isOpen]);

  const handleSoundToggle = () => {
    const newState = !soundEnabled;
    setSoundEnabled(newState);
    soundManager.toggleSound();
  };

  const handleSoundVolumeChange = (value: number) => {
    setSoundVolume(value);
    soundManager.setVolume(value / 100);
  };

  const handleTestSound = () => {
    soundManager.playButtonClick();
  };

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-xl p-4"
    >
      <motion.div
        initial={{ scale: 0.8, y: 50, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        exit={{ scale: 0.8, y: 50, opacity: 0 }}
        transition={{ type: 'spring', damping: 25 }}
        className="glass-panel-dark p-6 sm:p-8 rounded-3xl w-full max-w-md border-2 border-accent-500/30 shadow-2xl"
      >
        <div className="flex items-center justify-between mb-6 sm:mb-8">
          <h2 className="heading-cyber text-xl sm:text-2xl font-bold text-primary-300">Audio Settings</h2>
          <button
            onClick={onClose}
            className="glass-button p-3 rounded-xl text-text-muted hover:text-white transition-colors"
          >
            ✕
          </button>
        </div>

        <div className="space-y-8">
          {/* Sound Effects */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-white">Sound Effects</h3>
                <p className="text-sm text-text-muted">Game action sounds</p>
              </div>
              <button
                onClick={handleSoundToggle}
                className={`relative w-14 h-8 rounded-full transition-colors ${soundEnabled ? 'bg-accent-500' : 'bg-surface'}`}
              >
                <motion.div
                  className="absolute top-1 w-6 h-6 bg-white rounded-full"
                  animate={{ x: soundEnabled ? 26 : 4 }}
                  transition={{ type: 'spring', stiffness: 300 }}
                />
              </button>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-text-muted">Volume</span>
                <span className="text-white font-bold">{soundVolume}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={soundVolume}
                onChange={(e) => handleSoundVolumeChange(parseInt(e.target.value))}
                className="w-full h-2 bg-surface rounded-full appearance-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-6 [&::-webkit-slider-thumb]:w-6 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-accent-500"
              />
            </div>

            <button
              onClick={handleTestSound}
              className="w-full py-3 bg-surface/50 rounded-xl text-white hover:bg-surface/70 transition-colors flex items-center justify-center gap-2"
            >
              <span className="text-xl">🔊</span>
              Test Sound
            </button>
          </div>

          {/* Sound Presets */}
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-white">Sound Presets</h3>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => {
                  handleSoundVolumeChange(100);
                  setSoundEnabled(true);
                  soundManager.setSoundEnabled(true);
                }}
                className="py-3 bg-accent-500/20 border border-accent-500/30 rounded-xl text-accent-300 hover:bg-accent-500/30 transition-colors"
              >
                Loud
              </button>
              <button
                onClick={() => {
                  handleSoundVolumeChange(50);
                  setSoundEnabled(true);
                  soundManager.setSoundEnabled(true);
                }}
                className="py-3 bg-surface/50 border border-white/10 rounded-xl text-white hover:bg-surface/70 transition-colors"
              >
                Balanced
              </button>
              <button
                onClick={() => {
                  handleSoundVolumeChange(30);
                  setSoundEnabled(true);
                  soundManager.setSoundEnabled(true);
                }}
                className="py-3 bg-surface/50 border border-white/10 rounded-xl text-white hover:bg-surface/70 transition-colors"
              >
                Quiet
              </button>
              <button
                onClick={() => {
                  setSoundEnabled(false);
                  soundManager.setSoundEnabled(false);
                }}
                className="py-3 bg-danger-500/20 border border-danger-500/30 rounded-xl text-danger-300 hover:bg-danger-500/30 transition-colors"
              >
                Mute All
              </button>
            </div>
          </div>

          {/* Audio Info */}
          <div className="pt-6 border-t border-white/10">
            <p className="text-sm text-text-muted text-center">
              Audio uses placeholder URLs from Mixkit. Replace with actual sound files in production.
            </p>
          </div>
        </div>

        <div className="mt-8 flex gap-4">
          <button
            onClick={onClose}
            className="flex-1 py-3 bg-surface/50 rounded-xl text-white hover:bg-surface/70 transition-colors"
          >
            Close
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};
