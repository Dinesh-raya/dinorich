import { motion } from 'framer-motion';
import { Building2 } from 'lucide-react';
import { soundManager } from '../utils/audio';
import { getRandomName } from '../src/utils/helpers';
import { useState, useEffect } from 'react';
import { loadAvatar, loadSavedName, saveName } from '../utils/playerProfile';
import { AvatarSelector } from './AvatarSelector';
import { PlayerProfile } from './PlayerProfile';

// Lobby Screen
export function LobbyScreen({
  error,
  name,
  setName,
  roomCode,
  setRoomCode,
  createRoom,
  joinRoom
}: {
  error: string | null;
  name: string;
  setName: (n: string) => void;
  roomCode: string;
  setRoomCode: (r: string) => void;
  createRoom: (name: string) => void;
  joinRoom: (code: string, name: string) => void;
}) {
  const [avatar, setAvatar] = useState(loadAvatar);

  useEffect(() => {
    const saved = loadSavedName();
    if (saved && !name) setName(saved);
  }, []);

  const handleNameChange = (n: string) => {
    setName(n);
    saveName(n);
  };

  return (
    <div className="flex min-h-screen-mobile items-center justify-center bg-background p-4 safe-bottom">
      <motion.div
        className="panel-dark p-6 sm:p-8 rounded-3xl w-full max-w-md border-2 border-gold-500/30 shadow-lg"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
      >
        <div className="text-center mb-6 sm:mb-8">
          <motion.div
            className="text-6xl mb-4"
            animate={{ y: [0, -8, 0] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
          >
            <Building2 className="w-12 h-12 mx-auto text-gold-500" />
          </motion.div>
          <h1 className="font-cyber text-3xl sm:text-4xl lg:text-5xl font-bold text-gold-500 gold-glow mb-2">
            DINO-RICHUP
          </h1>
          <p className="text-text-muted font-cyber tracking-widest text-sm">PAN-INDIA EDITION</p>
        </div>

        {error && (
          <motion.div
            className="bg-danger-500/20 border border-danger-500 text-danger-300 p-4 rounded-xl mb-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            {error}
          </motion.div>
        )}

        <div className="space-y-5 sm:space-y-6">
          <div className="flex items-end gap-3">
            <AvatarSelector selected={avatar} onSelect={setAvatar} compact />
            <div className="flex-1">
              <label className="block text-sm text-text-muted mb-2 font-cyber">YOUR NAME</label>
              <input
                type="text"
                inputMode="text"
                autoComplete="off"
                aria-label="Your player name"
                className="w-full bg-surface/50 border-2 border-gold-500/30 rounded-xl p-4 text-white placeholder:text-text-muted focus:border-gold-500 focus:outline-none min-h-[48px]"
                value={name}
                onChange={e => handleNameChange(e.target.value)}
                placeholder="Enter your name"
              />
            </div>
          </div>

          <PlayerProfile avatar={avatar} name={name} compact />

          <p className="text-xs text-text-muted text-center">
            Color will be assigned automatically (unique per player)
          </p>

          <motion.button
            className="w-full btn-gold py-4 text-lg font-bold rounded-xl flex items-center justify-center gap-3 min-h-[56px] touch-ripple relative"
            aria-label="Create a new game room"
            onClick={() => {
              soundManager.playButtonClick();
              soundManager.playGameStart();
              createRoom(name || getRandomName());
            }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            CREATE NEW ROOM
          </motion.button>

          <div className="flex items-center gap-3 my-4">
            <div className="h-px bg-white/10 flex-1"></div>
            <span className="text-text-muted text-sm font-cyber">OR</span>
            <div className="h-px bg-white/10 flex-1"></div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm text-text-muted mb-2 font-cyber">ROOM CODE</label>
              <input
                type="text"
                inputMode="text"
                autoCapitalize="characters"
                autoComplete="off"
                maxLength={6}
                aria-label="Room code"
                className="w-full bg-surface/50 border-2 border-gold-500/30 rounded-xl p-4 text-white placeholder:text-text-muted uppercase tracking-widest focus:border-gold-500 focus:outline-none min-h-[48px]"
                value={roomCode}
                onChange={e => setRoomCode(e.target.value.toUpperCase())}
                placeholder="ABCDEF"
              />
            </div>

            <motion.button
              className="w-full btn-gold-outline py-4 text-lg font-bold rounded-xl flex items-center justify-center gap-3 min-h-[56px] touch-ripple relative"
              aria-label={`Join room ${roomCode || ''}`}
              onClick={() => {
                soundManager.playButtonClick();
                joinRoom(roomCode, name || getRandomName());
              }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              JOIN ROOM
            </motion.button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
