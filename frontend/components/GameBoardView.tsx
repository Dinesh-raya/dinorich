import type React from 'react';
import { useState, Suspense, lazy } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Copy, Share2, X, Menu, Handshake, Volume2, Settings, Save, Play, Pause, Users, Bug, History } from 'lucide-react';
import { soundManager } from '../utils/audio';
import { showToast } from './Toast';
import { useGameStore } from '../stores/gameStore';
import { Board } from './Board';
import { PlayerSidebar } from './PlayerSidebar';
import { ErrorBoundary } from './ErrorBoundary';
import { ReconnectOverlay } from './ReconnectOverlay';
import { ToastContainer } from './Toast';
import { Tutorial } from './Tutorial';
import { QuickChat } from './QuickChat';
import { GameHistory, GameHistoryButton } from './GameHistory';
import type { TradeOffer, GameState, RoomState } from '../stores/slices/types';
import { mapPlayersForSidebar, type Standing } from '../src/utils/helpers';

// Lazy-loaded modals (heavy, only shown on user interaction)
const AuctionModal = lazy(() => import('./AuctionModal').then(m => ({ default: m.AuctionModal })));
const AudioSettings = lazy(() => import('./AudioSettings').then(m => ({ default: m.AudioSettings })));
const BankruptModal = lazy(() => import('./BankruptModal').then(m => ({ default: m.BankruptModal })));
const GameOverModal = lazy(() => import('./BankruptModal').then(m => ({ default: m.GameOverModal })));
const TradeModal = lazy(() => import('./TradeModal').then(m => ({ default: m.TradeModal })));
const TradeNotification = lazy(() => import('./TradeModal').then(m => ({ default: m.TradeNotification })));
const CardDrawModal = lazy(() => import('./CardDrawModal').then(m => ({ default: m.CardDrawModal })));
const QAPanel = lazy(() => import('./QAPanel').then(m => ({ default: m.QAPanel })));

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
  const [showQAPanel, setShowQAPanel] = useState(false);
  const [showGameHistory, setShowGameHistory] = useState(false);
  const isQAMode = game.room.settings.qa_mode?.enabled === true;

  return (
    <div className="min-h-screen flex flex-col bg-background overflow-x-hidden">
      {/* Mobile Top Bar */}
      <div className="lg:hidden flex items-center justify-between p-2 pt-[calc(0.5rem+env(safe-area-inset-top))] border-b border-white/10 bg-surface/50 backdrop-blur-sm">
        <button
          onClick={() => setShowMobileMenu(!showMobileMenu)}
          aria-label={showMobileMenu ? 'Close menu' : 'Open menu'}
          aria-expanded={showMobileMenu}
          className="btn-gold-ghost p-2 rounded-lg min-h-[44px] min-w-[44px] active:scale-95 transition-transform"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex flex-col items-center">
          <h1 className="font-cyber text-sm font-bold text-gold-500 leading-tight">DINO-RICHUP</h1>
          <span className="text-[10px] text-text-muted/60 font-cyber tracking-wider hidden sm:block">PAN-INDIA EDITION</span>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex flex-col items-end">
            <span className="text-[10px] text-text-muted">Turn: <span className="text-gold-500 font-bold">{activePlayerName}</span></span>
            <button
              onClick={() => {
                navigator.clipboard.writeText(room?.room_id || '');
                showToast('Room code copied!', 'success');
              }}
              className="text-[10px] text-text-muted/70 hover:text-gold-500 transition-colors active:scale-95"
              title="Tap to copy room code"
            >
              Room: <span className="font-bold text-gold-500/70">{room?.room_id}</span>
            </button>
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

          <div data-tutorial="money" className="panel-dark px-4 py-2 rounded-xl flex items-center gap-2">
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
              aria-label="Open trade dialog"
              className="btn-gold-ghost px-3 py-2 rounded-xl text-xs flex items-center gap-1.5 min-h-[36px]"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              title="Trade"
            >
              <Handshake className="w-4 h-4" /> <span className="text-text-muted">Trade</span>
            </motion.button>

            <GameHistoryButton
              historyLog={game.history_log}
              onClick={() => {
                soundManager.playButtonClick();
                setShowGameHistory(true);
              }}
            />

            {/* QA Panel button - visible only to host when QA mode is enabled */}
            {isQAMode && isHost && (
              <motion.button
                onClick={() => {
                  soundManager.playButtonClick();
                  setShowQAPanel(true);
                }}
                aria-label="Open QA testing panel"
                className="px-3 py-2 rounded-xl text-xs flex items-center gap-1.5 min-h-[36px] bg-purple-500/10 border border-purple-500/30 text-purple-300 hover:bg-purple-500/20 transition-colors"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                title="QA Testing Panel"
              >
                <Bug className="w-4 h-4" /> <span className="text-purple-300">QA</span>
              </motion.button>
            )}
          </div>

          <div className="h-8 w-px bg-gradient-to-b from-transparent via-gold-500/20 to-transparent mx-2"></div>

          {/* Settings group */}
          <div className="flex items-center gap-1.5">
            <motion.button
              onClick={() => {
                soundManager.playButtonClick();
                setShowAudioSettings(true);
              }}
              aria-label="Open audio settings"
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
              aria-label="Open room settings"
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
                aria-label="Save game"
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
                aria-label={isPaused ? 'Resume game' : 'Pause game'}
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
        <AnimatePresence>
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
              exit={{ x: -320 }}
              transition={{ type: "spring", damping: 25 }}
              drag="x"
              dragConstraints={{ left: -288, right: 0 }}
              dragElastic={0.1}
              onDragEnd={(_e, info) => {
                if (info.offset.x < -100) setShowMobileMenu(false);
              }}
            >
              <div className="p-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-bold text-gold-500">Game Menu</h2>
                  <button
                    onClick={() => setShowMobileMenu(false)}
                    aria-label="Close menu"
                    className="text-2xl text-text-muted min-h-[44px] min-w-[44px] flex items-center justify-center"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Mobile Menu Options */}
                <div className="space-y-3 mb-6">
                  <button
                    onClick={() => {
                      soundManager.playButtonClick();
                      setShowGameHistory(true);
                      setShowMobileMenu(false);
                    }}
                    className="w-full btn-gold-ghost p-4 rounded-xl flex items-center gap-3 min-h-[52px]"
                  >
                    <History className="w-5 h-5" />
                    <span className="font-medium">Game History</span>
                    {game.history_log.length > 0 && (
                      <span className="ml-auto text-xs text-text-muted/60">{game.history_log.length}</span>
                    )}
                  </button>

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
        </AnimatePresence>

        {/* Board - Centered Fullscreen */}
        <div data-tutorial="board" className="absolute inset-0 flex items-center justify-center p-2 lg:p-4">
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
          <div data-tutorial="sidebar" className="h-full overflow-y-auto scrollbar-hide rounded-xl opacity-90 hover:opacity-100 transition-all duration-300 hover:shadow-lg"
            style={{ '--hover-glow': '0 0 15px rgba(212, 164, 55, 0.08)' } as React.CSSProperties}
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
                    }).catch(() => {});
                  } else {
                    navigator.clipboard.writeText(window.location.origin).then(() => {
                      showToast('Link copied!', 'success');
                    }).catch(() => {});
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
                aria-label="Open players menu"
                className="btn-gold-ghost p-3 rounded-xl min-h-[44px] min-w-[44px] active:scale-95 transition-transform"
              >
                <Users className="w-5 h-5" />
              </button>

              <button
                onClick={() => {
                  soundManager.playButtonClick();
                  setShowTradeModal(true);
                }}
                aria-label="Open trade dialog"
                className="btn-gold-ghost p-3 rounded-xl min-h-[44px] min-w-[44px] active:scale-95 transition-transform"
                title="Trade"
              >
                <Handshake className="w-5 h-5" />
              </button>

              {/* QA Panel button for mobile */}
              {isQAMode && isHost && (
                <button
                  onClick={() => {
                    soundManager.playButtonClick();
                    setShowQAPanel(true);
                  }}
                  aria-label="Open QA testing panel"
                  className="p-3 rounded-xl min-h-[44px] min-w-[44px] active:scale-95 transition-transform bg-purple-500/10 border border-purple-500/30 text-purple-300"
                  title="QA Testing Panel"
                >
                  <Bug className="w-5 h-5" />
                </button>
              )}

              <button
                onClick={() => {
                  soundManager.playButtonClick();
                  setShowGameHistory(true);
                }}
                aria-label={`View game history, ${game.history_log.length} events`}
                className="btn-gold-ghost p-3 rounded-xl min-h-[44px] min-w-[44px] active:scale-95 transition-transform relative"
                title="Game History"
              >
                <History className="w-5 h-5" />
                {game.history_log.length > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-gold-500 text-[9px] text-background font-bold flex items-center justify-center">
                    {game.history_log.length > 99 ? '99+' : game.history_log.length}
                  </span>
                )}
              </button>
              <button
                onClick={() => {
                  soundManager.playButtonClick();
                  setShowAudioSettings(true);
                }}
                aria-label="Open audio settings"
                className="btn-gold-ghost p-3 rounded-xl min-h-[44px] min-w-[44px] active:scale-95 transition-transform"
              >
                <Volume2 className="w-5 h-5" />
              </button>

              <button
                onClick={() => {
                  soundManager.playButtonClick();
                  setShowRoomSettings(true);
                }}
                aria-label="Open room settings"
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
                  aria-label={isPaused ? 'Resume game' : 'Pause game'}
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

      {/* Modals & Notifications (lazy-loaded, Suspense with null fallback) */}
      <Suspense fallback={null}>
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

      {/* QA Panel - host-only testing controls */}
      {isQAMode && isHost && (
        <QAPanel
          isOpen={showQAPanel}
          onClose={() => setShowQAPanel(false)}
          game={game}
          room={room}
        />
      )}

      {/* Game History Panel */}
      <GameHistory
        historyLog={game.history_log}
        isOpen={showGameHistory}
        onClose={() => setShowGameHistory(false)}
      />
      </Suspense>

      {/* First-time tutorial overlay */}
      <Tutorial />

      {/* Quick chat floating messages + button */}
      {game && room && <QuickChat />}
    </div>
  );
}
