import { motion } from 'framer-motion';
import { Users, Crown, Copy, LogOut, Settings, FolderOpen, Share2 } from 'lucide-react';
import { soundManager } from '../utils/audio';
import { showToast } from './Toast';
import { RoomSettings } from './RoomSettings';
import { useGameStore } from '../stores/gameStore';
import type { RoomState } from '../stores/slices/types';

// Waiting Room Screen
export function WaitingRoomScreen({
  room,
  myId,
  setShowRoomSettings,
  showRoomSettings,
  hasSave,
  loadGame
}: {
  room: RoomState;
  myId: string | null;
  setShowRoomSettings: (show: boolean) => void;
  showRoomSettings: boolean;
  hasSave?: boolean;
  loadGame?: () => void;
}) {
  const isHost = room.host_id === myId;
  const leaveGame = useGameStore(s => s.leaveGame);

  const handleShare = async () => {
    const shareUrl = window.location.origin;
    const shareData = {
      title: 'DINO-RICHUP',
      text: `Join my room! Code: ${room.room_id}`,
      url: shareUrl,
    };
    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch { /* user cancelled */ }
    } else {
      await navigator.clipboard.writeText(shareUrl);
      showToast('Link copied!', 'success');
    }
  };

  return (
    <div className="flex min-h-screen-mobile flex-col items-center justify-center p-4 bg-background safe-bottom">
      <motion.div
        className="panel-dark p-6 sm:p-8 rounded-3xl w-full max-w-2xl border-2 border-gold-500/30 shadow-lg flex flex-col max-h-[calc(100dvh-2rem)]"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
      >
        <div className="text-center mb-6 sm:mb-8 flex-shrink-0">
          <motion.div
            className="text-5xl mb-4"
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          >
            <Users className="w-8 h-8 mx-auto text-gold-500" />
          </motion.div>
          <h2 className="font-cyber text-2xl sm:text-3xl lg:text-4xl font-bold text-gold-500 mb-2">WAITING ROOM</h2>
          <p className="text-text-muted font-cyber">Share this code with friends:</p>
          <div className="inline-block mt-4">
            <motion.div
              className="text-3xl sm:text-5xl font-bold tracking-[0.15em] sm:tracking-[0.3em] text-gold-500 bg-surface/50 px-6 sm:px-10 py-3 sm:py-5 rounded-2xl border-2 border-gold-500/30 gold-glow-accent font-mono"
              animate={{ boxShadow: ['0 0 15px rgba(168, 85, 247, 0.3)', '0 0 30px rgba(168, 85, 247, 0.5)', '0 0 15px rgba(168, 85, 247, 0.3)'] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            >
              {room.room_id}
            </motion.div>
            <p className="text-sm text-text-muted mt-3 font-cyber">Room will start when all players join</p>
          </div>

          {/* Network Share Link + Mobile Share */}
          <div className="mt-6 panel-dark p-4 rounded-xl border border-gold-800/20 max-w-sm mx-auto">
            <p className="text-gold-500 text-sm font-bold mb-2">LAN Play</p>
            <p className="text-text-muted text-xs mb-3">Friends on same WiFi open this link, then enter room code:</p>
            <div className="flex items-center gap-2 bg-surface/50 rounded-lg p-2">
              <code className="text-gold-500 text-sm flex-1 font-mono truncate">
                {`http://${window.location.host}`}
              </code>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(`http://${window.location.host}`);
                  showToast('Link copied!', 'success');
                }}
                className="btn-gold-ghost px-3 py-1.5 rounded-lg text-xs min-h-[44px] flex-shrink-0"
              >
                <Copy className="w-4 h-4" /> Copy
              </button>
            </div>
            {/* Mobile share button */}
            {typeof navigator.share === 'function' && (
              <button
                onClick={handleShare}
                className="btn-gold-outline w-full mt-3 py-2.5 rounded-lg text-sm min-h-[44px] flex items-center justify-center gap-2"
              >
                <Share2 className="w-4 h-4" /> Share Room Link
              </button>
            )}
            <p className="text-text-muted/50 text-[10px] mt-2">Room code: {room.room_id}</p>
          </div>
        </div>

        <div className="mb-6 sm:mb-8 flex-1 min-h-0 overflow-y-auto scrollbar-hide">
          <h3 className="text-xl font-bold text-gold-500 mb-4 flex items-center gap-2 sticky top-0 bg-[#111827] py-2 z-10">
            PLAYERS ({Object.values(room.players).length}/6)
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {Object.values(room.players).map((p, index) => (
              <motion.div
                key={p.id}
                className="panel-dark p-4 rounded-xl border border-white/10 flex items-center justify-between"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                whileHover={{ scale: 1.02, borderColor: 'rgba(34, 211, 238, 0.3)' }}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-full border-2 shadow-lg"
                    style={{
                      backgroundColor: p.color,
                      borderColor: p.color,
                      boxShadow: `0 0 12px ${p.color}40`
                    }}
                  ></div>
                  <div>
                    <p className="font-bold text-text-main text-sm">{p.name}</p>
                    <p className="text-xs text-text-muted font-cyber">
                      {p.id === room.host_id ? <span className="flex items-center gap-1"><Crown className="w-4 h-4 text-gold-500" /> Host</span> : 'Player'}
                    </p>
                  </div>
                </div>
                <div className={`w-3 h-3 rounded-full ${p.connected ? 'bg-success-500 animate-pulse' : 'bg-danger-500'}`}
                  style={{ boxShadow: p.connected ? '0 0 8px rgba(34, 197, 94, 0.5)' : '0 0 8px rgba(239, 68, 68, 0.5)' }}
                ></div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Sticky bottom actions */}
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 flex-shrink-0 pt-4 border-t border-white/5">
          <motion.button
            onClick={() => {
              soundManager.playButtonClick();
              leaveGame();
            }}
            className="btn-gold-ghost flex-1 py-4 rounded-xl border border-danger-500/30 text-danger-400 hover:bg-danger-500/10 min-h-[56px]"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <LogOut className="w-4 h-4" /> Leave Room
          </motion.button>

          <motion.button
            onClick={() => {
              soundManager.playButtonClick();
              setShowRoomSettings(true);
            }}
            className="btn-gold-ghost flex-1 py-4 rounded-xl min-h-[56px]"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Settings className="w-4 h-4" /> Room Settings
          </motion.button>

          {isHost && hasSave && (
            <motion.button
              onClick={() => {
                soundManager.playButtonClick();
                loadGame?.();
              }}
              className="btn-gold-ghost flex-1 py-4 rounded-xl min-h-[56px] border border-gold-500/30 text-gold-500"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <FolderOpen className="w-4 h-4" /> Load Saved Game
            </motion.button>
          )}

          {isHost && (
            <motion.button
              className="btn-gold flex-1 py-4 text-lg font-bold rounded-xl min-h-[56px]"
              onClick={() => {
                soundManager.playButtonClick();
                soundManager.playGameStart();
                useGameStore.getState().startGame();
              }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              START GAME
            </motion.button>
          )}
        </div>
      </motion.div>

      <RoomSettings
        isOpen={showRoomSettings}
        onClose={() => setShowRoomSettings(false)}
      />
    </div>
  );
}
