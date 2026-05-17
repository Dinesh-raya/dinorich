import { useEffect, useState, useRef } from 'react';
import { useGameStore } from '../stores/gameStore';
import { Board } from '../components/Board';
import { AuctionModal } from '../components/AuctionModal';
import { PlayerSidebar } from '../components/PlayerSidebar';
import { RoomSettings } from '../components/RoomSettings';
import { AudioSettings } from '../components/AudioSettings';
import { ToastContainer } from '../components/Toast';
import { BankruptModal, GameOverModal } from '../components/BankruptModal';
import { TradeModal } from '../components/TradeModal';
import { motion, AnimatePresence } from 'framer-motion';
import { soundManager } from '../utils/audio';

// Floating Game Log Notification Component
const GameLogNotification = ({ historyLog }: { historyLog: string[] }) => {
  const [latestLog, setLatestLog] = useState<string | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const prevLogLength = useRef(0);

  useEffect(() => {
    if (historyLog.length > prevLogLength.current && historyLog.length > 0) {
      const newLog = historyLog[historyLog.length - 1];
      setLatestLog(newLog);
      setIsVisible(true);

      // Hide after 4 seconds
      const timer = setTimeout(() => {
        setIsVisible(false);
      }, 4000);

      return () => clearTimeout(timer);
    }
    prevLogLength.current = historyLog.length;
  }, [historyLog]);

  return (
    <AnimatePresence>
      {isVisible && latestLog && (
        <motion.div
          className="absolute bottom-24 left-1/2 transform -translate-x-1/2 z-20 pointer-events-none"
          initial={{ opacity: 0, y: 20, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -10, scale: 0.95 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
        >
          <div className="glass-panel px-5 py-3 rounded-xl border border-primary-500/30 max-w-md backdrop-blur-xl"
            style={{
              background: 'linear-gradient(135deg, rgba(34, 211, 238, 0.15) 0%, rgba(15, 23, 42, 0.95) 100%)',
              boxShadow: '0 8px 32px rgba(34, 211, 238, 0.2), 0 0 60px rgba(34, 211, 238, 0.1)'
            }}
          >
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 bg-primary-400 rounded-full animate-pulse"></div>
              <p className="text-sm text-text-main font-medium">{latestLog}</p>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

function App() {
  const { connected, room, game, connect, createRoom, joinRoom, error, myId } = useGameStore();
  const [name, setName] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [showRoomSettings, setShowRoomSettings] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showAudioSettings, setShowAudioSettings] = useState(false);
  const [showBankruptModal, setShowBankruptModal] = useState(false);
  const [bankruptPlayer, setBankruptPlayer] = useState<{ name: string; creditorName?: string } | null>(null);
  const [showGameOverModal, setShowGameOverModal] = useState(false);
  const [gameWinner, setGameWinner] = useState<{ name: string; isWinner: boolean } | null>(null);
  const [showTradeModal, setShowTradeModal] = useState(false);
  const prevBankruptStatus = useRef<Record<string, boolean>>({});

  useEffect(() => {
    connect();
  }, [connect]);

  // Detect bankruptcy and game over
  useEffect(() => {
    if (!game) return;

    const players = game.room.players;

    // Check for newly bankrupt players
    for (const [id, player] of Object.entries(players)) {
      const wasBankrupt = prevBankruptStatus.current[id] || false;
      if (player.is_bankrupt && !wasBankrupt) {
        // Find creditor (player who received assets)
        const creditorId = game.turn_order.find(tid => tid !== id && !players[tid]?.is_bankrupt);
        setBankruptPlayer({
          name: player.name,
          creditorName: creditorId ? players[creditorId]?.name : undefined
        });
        setShowBankruptModal(true);
      }
      prevBankruptStatus.current[id] = player.is_bankrupt;
    }

    // Check for game over
    const activePlayers = Object.values(players).filter(p => !p.is_bankrupt);
    if (game.room.status === 'finished' && activePlayers.length === 1) {
      const winner = activePlayers[0];
      setGameWinner({
        name: winner.name,
        isWinner: winner.id === myId
      });
      setShowGameOverModal(true);
    }
  }, [game, myId]);

  if (!connected) {
    return (
      <div className="flex h-screen items-center justify-center bg-background mesh-gradient">
        <motion.div
          className="text-center"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
        >
          <motion.div
            className="text-7xl mb-6"
            animate={{ rotate: [0, 10, -10, 0], scale: [1, 1.1, 1] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          >
            🌐
          </motion.div>
          <h1 className="text-3xl font-bold text-primary-300 mb-3 font-cyber">Connecting to Server</h1>
          <p className="text-text-muted font-cyber">Establishing secure connection...</p>
          <div className="mt-6 flex justify-center">
            <div className="w-48 h-1 bg-surface rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-primary-500 to-accent-500 rounded-full"
                animate={{ x: ['-100%', '100%'] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
                style={{ width: '50%' }}
              />
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  // Lobby
  if (!room) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background mesh-gradient p-4">
        <motion.div
          className="glass-panel-dark p-8 rounded-3xl w-full max-w-md border-2 border-primary-500/30 shadow-2xl"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
        >
          <div className="text-center mb-8">
            <motion.div
              className="text-6xl mb-4"
              animate={{ y: [0, -8, 0] }}
              transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
            >
              🦕
            </motion.div>
            <h1 className="heading-cyber text-5xl font-bold text-primary-300 neon-glow mb-2">
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

          <div className="space-y-6">
            <div>
              <label className="block text-sm text-text-muted mb-2 font-cyber">YOUR NAME</label>
              <input 
                className="w-full bg-surface/50 border-2 border-primary-500/30 rounded-xl p-4 text-white placeholder:text-text-muted focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/50"
                value={name} 
                onChange={e => setName(e.target.value)} 
                placeholder="Enter your name"
              />
            </div>

            <motion.button
              className="w-full btn-primary py-4 text-lg font-bold rounded-xl flex items-center justify-center gap-3"
              onClick={() => {
                soundManager.playButtonClick();
                soundManager.playGameStart();
                createRoom(name || 'Player', 'cyan');
              }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <span className="text-2xl">🚀</span>
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
                  className="w-full bg-surface/50 border-2 border-accent-500/30 rounded-xl p-4 text-white placeholder:text-text-muted uppercase tracking-widest focus:border-accent-500 focus:outline-none focus:ring-2 focus:ring-accent-500/50"
                  value={roomCode} 
                  onChange={e => setRoomCode(e.target.value.toUpperCase())} 
                  placeholder="ABCDEF"
                  maxLength={6}
                />
              </div>
              
              <motion.button
                className="w-full btn-accent py-4 text-lg font-bold rounded-xl flex items-center justify-center gap-3"
                onClick={() => {
                  soundManager.playButtonClick();
                  joinRoom(roomCode, name || 'Player', 'cyan');
                }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <span className="text-2xl">🔗</span>
                JOIN ROOM
              </motion.button>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  // Waiting Room
  if (room.status === 'waiting') {
    const isHost = room.host_id === myId;
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-4 bg-background mesh-gradient">
        <motion.div
          className="glass-panel-dark p-8 rounded-3xl w-full max-w-2xl border-2 border-primary-500/30 shadow-2xl"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
        >
          <div className="text-center mb-8">
            <motion.div
              className="text-5xl mb-4"
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            >
              🎮
            </motion.div>
            <h2 className="heading-cyber text-4xl font-bold text-primary-300 mb-2">WAITING ROOM</h2>
            <p className="text-text-muted font-cyber">Share this code with friends:</p>
            <div className="inline-block mt-4">
              <motion.div
                className="text-5xl font-bold tracking-[0.3em] text-accent-400 bg-surface/50 px-10 py-5 rounded-2xl border-2 border-accent-500/30 neon-glow-accent font-mono"
                animate={{ boxShadow: ['0 0 15px rgba(168, 85, 247, 0.3)', '0 0 30px rgba(168, 85, 247, 0.5)', '0 0 15px rgba(168, 85, 247, 0.3)'] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
              >
                {room.room_id}
              </motion.div>
              <p className="text-sm text-text-muted mt-3 font-cyber">Room will start when all players join</p>
            </div>
          </div>
          
          <div className="mb-8">
            <h3 className="text-xl font-bold text-primary-300 mb-4 flex items-center gap-2">
              <span className="text-2xl">👥</span>
              PLAYERS ({Object.values(room.players).length}/6)
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {Object.values(room.players).map((p, index) => (
                <motion.div
                  key={p.id}
                  className="glass-panel p-4 rounded-xl border border-white/10 flex items-center justify-between"
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
                      <p className="font-bold text-text-main">{p.name}</p>
                      <p className="text-xs text-text-muted font-cyber">
                        {p.id === room.host_id ? '👑 Host' : 'Player'}
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

          <div className="flex flex-col sm:flex-row gap-4">
            <motion.button
              onClick={() => {
                soundManager.playButtonClick();
                setShowRoomSettings(true);
              }}
              className="btn-ghost flex-1 py-4 rounded-xl"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              ⚙️ Room Settings
            </motion.button>
            
            {isHost && (
              <motion.button
                className="btn-primary flex-1 py-4 text-lg font-bold rounded-xl"
                onClick={() => {
                  soundManager.playButtonClick();
                  soundManager.playGameStart();
                  useGameStore.getState().startGame();
                }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                🚀 START GAME
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

  if (!game) {
    return (
      <div className="flex h-screen items-center justify-center bg-background mesh-gradient">
        <motion.div
          className="text-center"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
        >
          <motion.div
            className="text-7xl mb-6"
            animate={{ rotate: [0, 360] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
          >
            🎲
          </motion.div>
          <h1 className="text-3xl font-bold text-primary-300 mb-3 font-cyber">Loading Game</h1>
          <p className="text-text-muted font-cyber">Initializing board and players...</p>
          <div className="mt-6 flex justify-center gap-2">
            {[0, 1, 2].map(i => (
              <motion.div
                key={i}
                className="w-3 h-3 bg-primary-500 rounded-full"
                animate={{ scale: [1, 1.5, 1], opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
              />
            ))}
          </div>
        </motion.div>
      </div>
    );
  }

  // Game Board
  const activePlayerId = game.turn_order[game.current_turn_index];
  const activePlayerName = activePlayerId ? game.room.players?.[activePlayerId]?.name : 'Unknown';
  const myMoney = myId ? game.room.players?.[myId]?.money : undefined;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Mobile Top Bar */}
      <div className="lg:hidden flex items-center justify-between p-3 border-b border-white/10 bg-surface/50 backdrop-blur-sm">
        <button
          onClick={() => setShowMobileMenu(!showMobileMenu)}
          className="glass-button p-2 rounded-lg"
        >
          <span className="text-xl">☰</span>
        </button>

        <h1 className="heading-cyber text-lg font-bold text-primary-300">DINO-RICHUP</h1>

        <div className="flex items-center gap-2">
          <div className="text-xs">
            <span className="text-text-muted">Turn:</span>
            <span className="text-accent-400 font-bold ml-1">{activePlayerName}</span>
          </div>
        </div>
      </div>

      {/* Desktop Header */}
      <div className="hidden lg:flex justify-between items-center p-4 border-b border-white/10 bg-surface/50 backdrop-blur-sm">
        <div className="flex items-center gap-4">
          <h1 className="heading-cyber text-2xl font-bold text-primary-300 neon-glow">DINO-RICHUP</h1>
          <span className="text-text-muted font-cyber text-sm tracking-widest">PAN-INDIA EDITION</span>
        </div>

        <div className="flex items-center gap-3">
          <div className="glass-panel px-4 py-2 rounded-xl">
            <span className="text-text-muted text-xs">Turn:</span>
            <span className="text-accent-400 font-bold ml-1.5 text-xs">{activePlayerName}</span>
          </div>

          <div className="glass-panel px-4 py-2 rounded-xl">
            <span className="text-text-muted text-xs">My Money:</span>
            <span className="text-success-400 font-bold ml-1.5 text-xs">₹{myMoney ?? 0}</span>
          </div>

          <div className="h-6 w-px bg-white/10 mx-1"></div>

          <motion.button
            onClick={() => {
              soundManager.playButtonClick();
              navigator.clipboard.writeText(room?.room_id || '');
            }}
            className="glass-button px-3 py-2 rounded-xl text-xs flex items-center gap-1.5"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            title="Copy Room Code"
          >
            📋 <span className="text-text-muted">Share</span>
          </motion.button>

          <motion.button
            onClick={() => {
              soundManager.playButtonClick();
              setShowTradeModal(true);
            }}
            className="glass-button px-3 py-2 rounded-xl text-xs flex items-center gap-1.5"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            title="Trade"
          >
            🤝 <span className="text-text-muted">Trade</span>
          </motion.button>

          <motion.button
            onClick={() => {
              soundManager.playButtonClick();
              setShowAudioSettings(true);
            }}
            className="glass-button px-3 py-2 rounded-xl"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            🔊
          </motion.button>

          <motion.button
            onClick={() => {
              soundManager.playButtonClick();
              setShowRoomSettings(true);
            }}
            className="glass-button px-3 py-2 rounded-xl"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            ⚙️
          </motion.button>
        </div>
      </div>

      {/* Main Content - Fullscreen Board Layout */}
      <div className="flex-1 relative overflow-hidden">
        {/* Mobile Sidebar (Drawer) */}
        {showMobileMenu && (
          <div className="lg:hidden fixed inset-0 z-40">
            <div
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
              onClick={() => setShowMobileMenu(false)}
            />
            <motion.div
              className="absolute top-0 left-0 h-full w-80 bg-surface border-r border-white/10 shadow-2xl"
              initial={{ x: -320 }}
              animate={{ x: 0 }}
              transition={{ type: "spring", damping: 25 }}
            >
              <div className="p-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-bold text-primary-300">Game Menu</h2>
                  <button
                    onClick={() => setShowMobileMenu(false)}
                    className="text-2xl text-text-muted"
                  >
                    ✕
                  </button>
                </div>

                {/* Mobile Menu Options */}
                <div className="space-y-3 mb-6">
                  <button
                    onClick={() => {
                      soundManager.playButtonClick();
                      setShowAudioSettings(true);
                      setShowMobileMenu(false);
                    }}
                    className="w-full glass-button p-4 rounded-xl flex items-center gap-3"
                  >
                    <span className="text-xl">🔊</span>
                    <span className="font-medium">Audio Settings</span>
                  </button>

                  <button
                    onClick={() => {
                      soundManager.playButtonClick();
                      setShowRoomSettings(true);
                      setShowMobileMenu(false);
                    }}
                    className="w-full glass-button p-4 rounded-xl flex items-center gap-3"
                  >
                    <span className="text-xl">⚙️</span>
                    <span className="font-medium">Room Settings</span>
                  </button>
                </div>

                <PlayerSidebar
                  players={Object.values(room.players).map((p: any) => ({
                    id: p.id,
                    name: p.name,
                    color: p.color,
                    money: p.money,
                    position: p.position,
                    connected: p.connected,
                    isHost: p.id === room.host_id,
                    isCurrentTurn: p.id === activePlayerId,
                    is_in_jail: p.is_in_jail,
                    jail_turns: p.jail_turns
                  }))}
                  currentPlayerId={myId || undefined}
                  activePlayerId={activePlayerId}
                  compact
                />
              </div>
            </motion.div>
          </div>
        )}

        {/* Board - Centered Fullscreen */}
        <div className="absolute inset-0 flex items-center justify-center p-4 lg:p-8">
          <Board />
        </div>

        {/* Floating Player Panel - Left (Desktop) */}
        <motion.div
          className="hidden lg:block absolute left-4 top-4 bottom-4 w-64 z-10"
          initial={{ x: -280, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ delay: 0.3, type: "spring", damping: 25 }}
        >
          <div className="h-full overflow-y-auto scrollbar-hide">
            <PlayerSidebar
              players={Object.values(room.players).map((p: any) => ({
                id: p.id,
                name: p.name,
                color: p.color,
                money: p.money,
                position: p.position,
                connected: p.connected,
                isHost: p.id === room.host_id,
                isCurrentTurn: p.id === activePlayerId,
                is_in_jail: p.is_in_jail,
                jail_turns: p.jail_turns
              }))}
              currentPlayerId={myId || undefined}
              activePlayerId={activePlayerId}
              compact
            />
          </div>
        </motion.div>

        {/* Floating History Panel - Right (Desktop) */}
        <motion.div
          className="hidden lg:block absolute right-4 top-4 bottom-4 w-60 z-10"
          initial={{ x: 280, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ delay: 0.4, type: "spring", damping: 25 }}
        >
          <div className="glass-panel-dark h-full rounded-2xl p-4 border border-white/10 overflow-hidden backdrop-blur-xl"
            style={{
              background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.85) 0%, rgba(30, 41, 59, 0.85) 100%)',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)'
            }}
          >
            <h3 className="text-sm font-bold text-primary-300 mb-4 flex items-center gap-2 font-cyber">
              <span>📜</span>
              GAME HISTORY
            </h3>

            <div className="space-y-2 overflow-y-auto h-[calc(100%-2.5rem)] pr-1 scrollbar-hide">
              {game.history_log.slice().reverse().map((log, i) => (
                <motion.div
                  key={i}
                  className={`p-2.5 rounded-lg border border-white/5 transition-all duration-300 ${
                    i === 0 ? 'bg-primary-500/10 border-primary-500/20' : 'bg-surface/30'
                  }`}
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: i === 0 ? 1 : 0.7 - (i * 0.05), x: 0 }}
                  transition={{ delay: i * 0.02 }}
                >
                  <p className={`text-xs leading-relaxed ${i === 0 ? 'text-text-main font-medium' : 'text-text-muted'}`}>
                    {log}
                  </p>
                  {i === 0 && (
                    <p className="text-[10px] text-primary-400 mt-1 font-mono">Just now</p>
                  )}
                </motion.div>
              ))}

              {game.history_log.length === 0 && (
                <div className="text-center py-8">
                  <div className="text-2xl mb-2 opacity-50">📝</div>
                  <p className="text-text-muted text-xs">No events yet</p>
                </div>
              )}
            </div>
          </div>
        </motion.div>

        {/* Floating Game Log Notification - Center Bottom */}
        <GameLogNotification historyLog={game.history_log} />

        {/* Mobile Bottom Bar */}
        <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-surface/90 backdrop-blur-xl border-t border-white/10 p-3 z-30">
          <div className="flex justify-between items-center">
            <div className="text-center">
              <p className="text-[10px] text-text-muted font-cyber">My Money</p>
              <p className="text-base font-bold text-success-400">₹{myMoney ?? 0}</p>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => {
                  soundManager.playButtonClick();
                  navigator.clipboard.writeText(room?.room_id || '');
                }}
                className="glass-button p-2 rounded-lg text-xs"
                title="Copy Room Code"
              >
                📋
              </button>
              <button
                onClick={() => {
                  soundManager.playButtonClick();
                  if (navigator.share) {
                    navigator.share({
                      title: 'DINO-RICHUP',
                      text: `Join my game! Room code: ${room?.room_id}`,
                    });
                  }
                }}
                className="glass-button p-2 rounded-lg text-xs"
                title="Share Room"
              >
                📤
              </button>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowMobileMenu(true)}
                className="glass-button p-2.5 rounded-xl"
              >
                <span className="text-lg">👥</span>
              </button>

              <button
                onClick={() => {
                  soundManager.playButtonClick();
                  setShowAudioSettings(true);
                }}
                className="glass-button p-2.5 rounded-xl"
              >
                <span className="text-lg">🔊</span>
              </button>

              <button
                onClick={() => {
                  soundManager.playButtonClick();
                  setShowRoomSettings(true);
                }}
                className="glass-button p-2.5 rounded-xl"
              >
                <span className="text-lg">⚙️</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Modals & Notifications */}
      <ToastContainer />
      <AuctionModal />
      <RoomSettings
        isOpen={showRoomSettings}
        onClose={() => setShowRoomSettings(false)}
      />
      <AudioSettings
        isOpen={showAudioSettings}
        onClose={() => setShowAudioSettings(false)}
      />
      <BankruptModal
        isOpen={showBankruptModal}
        playerName={bankruptPlayer?.name || ''}
        creditorName={bankruptPlayer?.creditorName}
        onClose={() => setShowBankruptModal(false)}
      />
      <GameOverModal
        isOpen={showGameOverModal}
        winnerName={gameWinner?.name || ''}
        isWinner={gameWinner?.isWinner || false}
        onClose={() => {
          setShowGameOverModal(false);
          // Return to lobby by reloading
          window.location.reload();
        }}
      />
      <TradeModal
        isOpen={showTradeModal}
        onClose={() => setShowTradeModal(false)}
      />
    </div>
  );
}

export default App;
