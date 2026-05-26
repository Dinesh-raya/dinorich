import { motion, AnimatePresence } from 'framer-motion';
import { Copy, Share2, X, Menu, Handshake, Volume2, Settings, Save, Play, Pause, Users } from 'lucide-react';
import { soundManager } from '../utils/audio';
import { showToast } from './Toast';
import { useGameStore } from '../stores/gameStore';
import { Board } from './Board';
import { PlayerSidebar } from './PlayerSidebar';
import { AuctionModal } from './AuctionModal';
import { AudioSettings } from './AudioSettings';
import { BankruptModal, GameOverModal } from './BankruptModal';
import { TradeModal, TradeNotification } from './TradeModal';
import { CardDrawModal } from './CardDrawModal';
import { ErrorBoundary } from './ErrorBoundary';
import { ReconnectOverlay } from './ReconnectOverlay';
import { ToastContainer } from './Toast';
import type { TradeOffer, GameState, RoomState } from '../stores/slices/types';
import { mapPlayersForSidebar, type Standing } from '../src/utils/helpers';

// Game board view extracted for readability (all props passed from App)
export function GameBoardView({
  game,
  room,
  myId,
  showMobileMenu,
  setShowMobileMenu,
  setShowRoomSettings,
  showAudioSettings,
  setShowAudioSettings,
  showBankruptModal,
  setShowBankruptModal,
  bankruptPlayer,
  showGameOverModal,
  setShowGameOverModal,
  gameWinner,
  gameStandings,
  showTradeModal,
  setShowTradeModal,
  activeCounterOffer,
  setActiveCounterOffer,
  incomingTrade,
  leaveGame,
  saveGame,
  pauseGame,
  resumeGame,
}: {
  game: GameState;
  room: RoomState;
  myId: string | null;
  showMobileMenu: boolean;
  setShowMobileMenu: (v: boolean) => void;
  setShowRoomSettings: (v: boolean) => void;
  showAudioSettings: boolean;
  setShowAudioSettings: (v: boolean) => void;
  showBankruptModal: boolean;
  setShowBankruptModal: (v: boolean) => void;
  bankruptPlayer: { name: string; creditorName?: string } | null;
  showGameOverModal: boolean;
  setShowGameOverModal: (v: boolean) => void;
  gameWinner: { name: string; isWinner: boolean } | null;
  gameStandings: Standing[];
  showTradeModal: boolean;
  setShowTradeModal: (v: boolean) => void;
  activeCounterOffer: TradeOffer | null;
  setActiveCounterOffer: (v: TradeOffer | null) => void;
  incomingTrade: TradeOffer | null;
  leaveGame: () => void;
  saveGame: () => void;
  pauseGame: () => void;
  resumeGame: () => void;
}) {
  const activePlayerId = game.turn_order[game.current_turn_index];
  const activePlayerName = activePlayerId ? game.room.players?.[activePlayerId]?.name : 'Unknown';
  const myMoney = myId ? game.room.players?.[myId]?.money : undefined;
  const sidebarPlayers = mapPlayersForSidebar(room, game, activePlayerId);
  const isPaused = game.room.settings.game_paused === true;
  const isMyTurn = activePlayerId === myId;
  const isHost = room.host_id === myId;
  const connected = useGameStore(s => s.connected);

  return (
    <div className="min-h-screen flex flex-col bg-background overflow-x-hidden">
      {/* Mobile Top Bar */}
      <div className="lg:hidden flex items-center justify-between p-3 border-b border-white/10 bg-surface/50 backdrop-blur-sm">
        <button
          onClick={() => setShowMobileMenu(!showMobileMenu)}
          className="btn-gold-ghost p-2 rounded-lg min-h-[44px] min-w-[44px] active:scale-95 transition-transform"
        >
          <Menu className="w-5 h-5" />
        </button>

        <h1 className="font-cyber text-lg font-bold text-gold-500">DINO-RICHUP</h1>

        <div className="flex items-center gap-2">
          <div className="text-xs">
            <span className="text-text-muted">Turn:</span>
            <span className="text-gold-500 font-bold ml-1">{activePlayerName}</span>
          </div>
        </div>
      </div>

      {/* Desktop Header */}
      <div className="hidden lg:flex justify-between items-center p-4 border-b border-white/10 bg-surface/50 backdrop-blur-sm">
        <div className="flex items-center gap-4">
          <h1 className="font-cyber text-2xl font-bold text-gold-500 gold-glow">DINO-RICHUP</h1>
          <span className="text-text-muted font-cyber text-sm tracking-widest">PAN-INDIA EDITION</span>
        </div>

        <div className="flex items-center gap-2">
          <div className="panel-dark px-4 py-2 rounded-xl flex items-center gap-2">
            <div className="flex flex-col">
              <span className="text-text-muted text-[10px] font-cyber tracking-wider uppercase">Turn</span>
              <span className="text-gold-500 font-bold font-cyber text-sm">{activePlayerName}</span>
            </div>
          </div>

          <div className="panel-dark px-4 py-2 rounded-xl flex items-center gap-2">
            <div className="flex flex-col">
              <span className="text-text-muted text-[10px] font-cyber tracking-wider uppercase">Money</span>
              <span className="text-success-400 font-bold font-cyber text-sm">{'\u20B9'}{myMoney ?? 0}</span>
            </div>
          </div>

          <div className="h-8 w-px bg-gradient-to-b from-transparent via-gold-500/20 to-transparent"></div>

          {/* Info group */}
          <div className="flex items-center gap-1.5">
            <motion.button
              onClick={() => {
                soundManager.playButtonClick();
                navigator.clipboard.writeText(room?.room_id || '');
                showToast('Room code copied to clipboard!', 'success');
              }}
              className="btn-gold-ghost px-3 py-2 rounded-xl text-xs flex items-center gap-1.5 min-h-[36px]"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              title="Copy Room Code"
            >
              <Copy className="w-4 h-4" /> <span className="text-text-muted">Share</span>
            </motion.button>

            <motion.button
              onClick={() => {
                soundManager.playButtonClick();
                setShowTradeModal(true);
              }}
              className="btn-gold-ghost px-3 py-2 rounded-xl text-xs flex items-center gap-1.5 min-h-[36px]"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              title="Trade"
            >
              <Handshake className="w-4 h-4" /> <span className="text-text-muted">Trade</span>
            </motion.button>
          </div>

          <div className="h-8 w-px bg-gradient-to-b from-transparent via-gold-500/20 to-transparent mx-2"></div>

          {/* Settings group */}
          <div className="flex items-center gap-1.5">
            <motion.button
              onClick={() => {
                soundManager.playButtonClick();
                setShowAudioSettings(true);
              }}
              className="btn-gold-ghost px-3 py-2 rounded-xl min-h-[36px]"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Volume2 className="w-4 h-4" />
            </motion.button>

            <motion.button
              onClick={() => {
                soundManager.playButtonClick();
                setShowRoomSettings(true);
              }}
              className="btn-gold-ghost px-3 py-2 rounded-xl min-h-[36px]"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Settings className="w-4 h-4" />
            </motion.button>

            {isHost && (
              <motion.button
                onClick={() => {
                  soundManager.playButtonClick();
                  saveGame();
                }}
                className="btn-gold-ghost px-3 py-2 rounded-xl text-xs flex items-center gap-1.5 min-h-[36px] border border-gold-500/30"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                title="Save Game"
              >
                <Save className="w-4 h-4" /> <span className="text-text-muted">Save</span>
              </motion.button>
            )}
          </div>

          {/* Action group */}
          {isMyTurn && (
            <>
              <div className="h-8 w-px bg-gradient-to-b from-transparent via-gold-500/20 to-transparent mx-2"></div>
              <motion.button
                onClick={() => {
                  soundManager.playButtonClick();
                  if (isPaused) resumeGame();
                  else pauseGame();
                }}
                className={`btn-gold-ghost px-3 py-2 rounded-xl text-xs flex items-center gap-1.5 min-h-[36px] ${isPaused ? 'border border-success-500/50' : 'border border-warning-500/50'}`}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                title={isPaused ? 'Resume Game' : 'Pause Game'}
              >
                {isPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />} <span className="text-text-muted">{isPaused ? 'Resume' : 'Pause'}</span>
              </motion.button>
            </>
          )}
        </div>
      </div>

      {/* Main Content - Fullscreen Board Layout */}
      <div className="flex-1 relative pb-16 lg:pb-0">
        {/* Mobile Sidebar (Drawer) */}
        {showMobileMenu && (
          <div className="lg:hidden fixed inset-0 z-40">
            <div
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
              onClick={() => setShowMobileMenu(false)}
            />
            <motion.div
              className="absolute top-0 left-0 h-full w-72 max-w-[85vw] bg-surface border-r border-white/10 shadow-lg"
              initial={{ x: -320 }}
              animate={{ x: 0 }}
              transition={{ type: "spring", damping: 25 }}
            >
              <div className="p-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-bold text-gold-500">Game Menu</h2>
                  <button
                    onClick={() => setShowMobileMenu(false)}
                    className="text-2xl text-text-muted"
                  >
                    <X className="w-5 h-5" />
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
                    className="w-full btn-gold-ghost p-4 rounded-xl flex items-center gap-3 min-h-[52px]"
                  >
                    <Volume2 className="w-5 h-5" />
                    <span className="font-medium">Audio Settings</span>
                  </button>

                  <button
                    onClick={() => {
                      soundManager.playButtonClick();
                      setShowRoomSettings(true);
                      setShowMobileMenu(false);
                    }}
                    className="w-full btn-gold-ghost p-4 rounded-xl flex items-center gap-3 min-h-[52px]"
                  >
                    <Settings className="w-5 h-5" />
                    <span className="font-medium">Room Settings</span>
                  </button>

                  {isHost && (
                    <button
                      onClick={() => {
                        soundManager.playButtonClick();
                        saveGame();
                        setShowMobileMenu(false);
                      }}
                      className="w-full btn-gold-ghost p-4 rounded-xl flex items-center gap-3 min-h-[52px] border border-gold-500/30"
                    >
                      <Save className="w-5 h-5" />
                      <span className="font-medium">Save Game</span>
                    </button>
                  )}
                </div>

                <PlayerSidebar
                  players={sidebarPlayers}
                  currentPlayerId={myId || undefined}
                  activePlayerId={activePlayerId}
                  compact
                />
              </div>
            </motion.div>
          </div>
        )}

        {/* Board - Centered Fullscreen */}
        <div className="absolute inset-0 flex items-center justify-center p-2 lg:p-4">
          <ErrorBoundary>
            <Board />
          </ErrorBoundary>
        </div>

        {/* PAUSED Overlay */}
        <AnimatePresence>
          {isPaused && (
            <motion.div
              className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              <motion.div
                className="text-center"
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                transition={{ duration: 0.3 }}
              >
                <h1 className="text-5xl sm:text-7xl font-bold font-cyber mb-4"
                  style={{
                    background: 'linear-gradient(135deg, #d4a437 0%, #f0d68a 50%, #d4a437 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    filter: 'drop-shadow(0 0 30px rgba(212, 164, 55, 0.3))',
                  }}>
                  PAUSED
                </h1>
                <p className="text-text-muted font-cyber text-lg">
                  {isMyTurn ? 'You can resume the game.' : 'Waiting for current player to resume...'}
                </p>
                {isMyTurn && (
                <motion.button
                  onClick={() => {
                    soundManager.playButtonClick();
                    resumeGame();
                  }}
                  className="mt-6 btn-gold px-8 py-3 text-lg font-bold rounded-xl min-h-[48px]"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Play className="w-4 h-4 inline" /> Resume Game
                </motion.button>
                )}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Floating Player Panel - Left (Desktop) */}
        <motion.div
          className="hidden lg:block absolute left-3 top-3 bottom-3 w-56 z-10"
          initial={{ x: -240, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ delay: 0.3, type: 'spring', damping: 25 }}
        >
          <div className="h-full overflow-y-auto scrollbar-hide rounded-xl opacity-90 hover:opacity-100 transition-all duration-300 hover:shadow-lg"
            style={{ '--hover-glow': '0 0 15px rgba(212, 164, 55, 0.08)' } as any}
          >
            <ErrorBoundary>
            <PlayerSidebar
              players={sidebarPlayers}
              currentPlayerId={myId || undefined}
              activePlayerId={activePlayerId}
              compact
            />
            </ErrorBoundary>
          </div>
        </motion.div>

        {/* Mobile Bottom Bar */}
        <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-surface/90 border-t border-white/10 p-2 safe-bottom z-30">
          <div className="flex justify-between items-center px-2">
            <div className="text-center min-w-[60px]">
              <p className="text-[10px] text-text-muted font-cyber tracking-wider uppercase">Money</p>
              <p className="text-lg font-bold text-success-400 font-cyber">{'\u20B9'}{myMoney ?? 0}</p>
            </div>

            <div className="flex gap-1.5">
              <button
                onClick={() => {
                  soundManager.playButtonClick();
                  navigator.clipboard.writeText(room?.room_id || '');
                  showToast('Room code copied!', 'success');
                }}
                className="btn-gold-ghost p-3 rounded-lg text-xs min-h-[44px] min-w-[44px] active:scale-95 transition-transform"
                title="Copy Room Code"
              >
                <Copy className="w-5 h-5" />
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
                className="btn-gold-ghost p-3 rounded-lg text-xs min-h-[44px] min-w-[44px] active:scale-95 transition-transform"
                title="Share Room"
              >
                <Share2 className="w-5 h-5" />
              </button>
            </div>

            <div className="flex gap-1.5">
              <button
                onClick={() => setShowMobileMenu(true)}
                className="btn-gold-ghost p-3 rounded-xl min-h-[44px] min-w-[44px] active:scale-95 transition-transform"
              >
                <Users className="w-5 h-5" />
              </button>

              <button
                onClick={() => {
                  soundManager.playButtonClick();
                  setShowTradeModal(true);
                }}
                className="btn-gold-ghost p-3 rounded-xl min-h-[44px] min-w-[44px] active:scale-95 transition-transform"
                title="Trade"
              >
                <Handshake className="w-5 h-5" />
              </button>

              <button
                onClick={() => {
                  soundManager.playButtonClick();
                  setShowAudioSettings(true);
                }}
                className="btn-gold-ghost p-3 rounded-xl min-h-[44px] min-w-[44px] active:scale-95 transition-transform"
              >
                <Volume2 className="w-5 h-5" />
              </button>

              <button
                onClick={() => {
                  soundManager.playButtonClick();
                  setShowRoomSettings(true);
                }}
                className="btn-gold-ghost p-3 rounded-xl min-h-[44px] min-w-[44px] active:scale-95 transition-transform"
              >
                <Settings className="w-5 h-5" />
              </button>
              {isMyTurn && (
                <button
                  onClick={() => {
                    soundManager.playButtonClick();
                    if (isPaused) resumeGame();
                    else pauseGame();
                  }}
                  className={`btn-gold-ghost p-3 rounded-xl min-h-[44px] min-w-[44px] active:scale-95 transition-transform ${isPaused ? 'border border-success-500/50' : 'border border-warning-500/50'}`}
                  title={isPaused ? 'Resume Game' : 'Pause Game'}
                >
                  {isPaused ? <Play className="w-5 h-5" /> : <Pause className="w-5 h-5" />}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modals & Notifications */}
      <ToastContainer />
      <ErrorBoundary><AuctionModal /></ErrorBoundary>
      <ErrorBoundary><AudioSettings isOpen={showAudioSettings} onClose={() => setShowAudioSettings(false)} /></ErrorBoundary>

      <ErrorBoundary><BankruptModal
        isOpen={showBankruptModal}
        playerName={bankruptPlayer?.name || ''}
        creditorName={bankruptPlayer?.creditorName}
        onClose={() => setShowBankruptModal(false)}
      /></ErrorBoundary>
      <GameOverModal
        isOpen={showGameOverModal}
        winnerName={gameWinner?.name || ''}
        isWinner={gameWinner?.isWinner || false}
        standings={gameStandings}
        onClose={() => {
          setShowGameOverModal(false);
        }}
        onLeave={() => {
          setShowGameOverModal(false);
          leaveGame();
        }}
      />
      <ErrorBoundary><TradeModal
        isOpen={showTradeModal}
        onClose={() => {
          setShowTradeModal(false);
          setActiveCounterOffer(null);
        }}
        counterOffer={activeCounterOffer}
        onClearCounterOffer={() => setActiveCounterOffer(null)}
      /></ErrorBoundary>

      {/* Incoming Trade Notification */}
      <AnimatePresence>
        {incomingTrade && incomingTrade.to_player_id === myId && (
          <TradeNotification
            key={incomingTrade.trade_id}
            trade={incomingTrade}
            onAccept={() => useGameStore.getState().acceptTrade(incomingTrade.trade_id)}
            onReject={() => useGameStore.getState().rejectTrade(incomingTrade.trade_id)}
            onCounter={() => {
              setActiveCounterOffer(incomingTrade);
              setShowTradeModal(true);
            }}
          />
        )}
      </AnimatePresence>

      {/* Card Draw Modal */}
      <CardDrawModal />
      <ReconnectOverlay connected={connected} hasRoom={!!room} />
    </div>
  );
}
