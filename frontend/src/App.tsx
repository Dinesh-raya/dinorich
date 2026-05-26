import { useEffect, useState, useRef } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import { useGameStore } from '../stores/gameStore';
import { ToastContainer } from '../components/Toast';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { motion } from 'framer-motion';
import { Dice5 } from 'lucide-react';
import { ConnectionScreen } from '../components/ConnectionScreen';
import { LobbyScreen } from '../components/LobbyScreen';
import { WaitingRoomScreen } from '../components/WaitingRoomScreen';
import { GameBoardView } from '../components/GameBoardView';
import { useBankruptcyAndGameOver } from './hooks/useBankruptcyAndGameOver';
import type { TradeOffer } from '../stores/slices/types';
import type { Standing } from './utils/helpers';

// Sync zustand room state with URL
function NavigationEffect() {
  const navigate = useNavigate();
  const room = useGameStore(s => s.room);
  const connected = useGameStore(s => s.connected);
  const prevRoomId = useRef<string | null>(null);
  const prevConnected = useRef(connected);

  useEffect(() => {
    if (room) {
      if (prevRoomId.current !== room.room_id) {
        prevRoomId.current = room.room_id;
        navigate(`/room/${room.room_id}`, { replace: true });
      }
    } else if (prevRoomId.current !== null) {
      prevRoomId.current = null;
      navigate('/', { replace: true });
    }
  }, [room, navigate]);

  useEffect(() => {
    if (prevConnected.current && !connected && prevRoomId.current) {
      prevRoomId.current = null;
      navigate('/', { replace: true });
    }
    prevConnected.current = connected;
  }, [connected, navigate]);

  return null;
}

function App() {
  const connected = useGameStore(s => s.connected);
  const room = useGameStore(s => s.room);
  const game = useGameStore(s => s.game);
  const connect = useGameStore(s => s.connect);
  const createRoom = useGameStore(s => s.createRoom);
  const joinRoom = useGameStore(s => s.joinRoom);
  const error = useGameStore(s => s.error);
  const myId = useGameStore(s => s.myId);
  const incomingTrade = useGameStore(s => s.incomingTrade);
  const leaveGame = useGameStore(s => s.leaveGame);
  const hasSave = useGameStore(s => s.hasSave);
  const saveGame = useGameStore(s => s.saveGame);
  const loadGame = useGameStore(s => s.loadGame);
  const listSaves = useGameStore(s => s.listSaves);

  const [name, setName] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [showRoomSettings, setShowRoomSettings] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showAudioSettings, setShowAudioSettings] = useState(false);
  const [showBankruptModal, setShowBankruptModal] = useState(false);
  const [bankruptPlayer, setBankruptPlayer] = useState<{ name: string; creditorName?: string } | null>(null);
  const [showGameOverModal, setShowGameOverModal] = useState(false);
  const [gameWinner, setGameWinner] = useState<{ name: string; isWinner: boolean } | null>(null);
  const [gameStandings, setGameStandings] = useState<Standing[]>([]);
  const [showTradeModal, setShowTradeModal] = useState(false);
  const [activeCounterOffer, setActiveCounterOffer] = useState<TradeOffer | null>(null);
  const [loadingTimeout, setLoadingTimeout] = useState(false);

  useEffect(() => {
    connect();
  }, [connect]);

  // Loading game timeout
  useEffect(() => {
    if (!room || game) {
      setLoadingTimeout(false);
      return;
    }
    const timer = setTimeout(() => setLoadingTimeout(true), 30000);
    return () => clearTimeout(timer);
  }, [room, game]);

  // Check for saved games when in waiting room
  useEffect(() => {
    if (room && room.status === 'waiting') {
      listSaves();
    }
  }, [room?.room_id, room?.status, listSaves]);

  // Handle bankruptcy and game over logic via hook
  useBankruptcyAndGameOver(
    game,
    myId,
    setBankruptPlayer,
    setShowBankruptModal,
    setGameWinner,
    setGameStandings,
    setShowGameOverModal
  );

  const pauseGame = useGameStore(s => s.pauseGame);
  const resumeGame = useGameStore(s => s.resumeGame);

  return (
    <ErrorBoundary>
      {!connected && <ConnectionScreen error={error} />}

      <NavigationEffect />

      <Routes>
        {/* Lobby: no room yet */}
        <Route
          path="/"
          element={
            !room ? (
              <LobbyScreen
                error={error}
                name={name}
                setName={setName}
                roomCode={roomCode}
                setRoomCode={setRoomCode}
                createRoom={createRoom}
                joinRoom={joinRoom}
              />
            ) : null
          }
        />

        {/* Room: waiting or in-game */}
        <Route
          path="/room/:roomCode"
          element={
            room ? (
              room.status === 'waiting' ? (
                <>
                  <ToastContainer />
                  <WaitingRoomScreen
                    room={room}
                    myId={myId}
                    setShowRoomSettings={setShowRoomSettings}
                    showRoomSettings={showRoomSettings}
                    hasSave={hasSave}
                    loadGame={loadGame}
                  />
                </>
              ) : !game || !game.turn_order ? (
                /* Loading game spinner */
                <div className="flex h-screen items-center justify-center bg-background">
                  <motion.div
                    className="text-center"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.5 }}
                  >
                    <motion.div
                      className="mb-6 flex justify-center"
                      animate={{ rotate: [0, 360] }}
                      transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                    >
                      <Dice5 className="w-16 h-16 text-gold-500" />
                    </motion.div>
                    <h1 className="text-3xl font-bold text-gold-500 mb-3 font-cyber">Loading Game</h1>
                    {loadingTimeout ? (
                      <p className="text-danger-400 font-cyber mb-2">
                        Game is taking longer than expected. The host may still be setting up, or there may be a connection issue.
                      </p>
                    ) : (
                      <p className="text-text-muted font-cyber">Initializing board and players...</p>
                    )}
                    <div className="mt-6 flex justify-center gap-2">
                      {[0, 1, 2].map(i => (
                        <motion.div
                          key={i}
                          className="w-3 h-3 bg-gold-500 rounded-full"
                          animate={{ scale: [1, 1.5, 1], opacity: [0.5, 1, 0.5] }}
                          transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
                        />
                      ))}
                    </div>
                  </motion.div>
                </div>
              ) : (
                /* Active game board */
                <GameBoardView
                  game={game}
                  room={room}
                  myId={myId}
                  showMobileMenu={showMobileMenu}
                  setShowMobileMenu={setShowMobileMenu}
                  setShowRoomSettings={setShowRoomSettings}
                  showAudioSettings={showAudioSettings}
                  setShowAudioSettings={setShowAudioSettings}
                  showBankruptModal={showBankruptModal}
                  setShowBankruptModal={setShowBankruptModal}
                  bankruptPlayer={bankruptPlayer}
                  showGameOverModal={showGameOverModal}
                  setShowGameOverModal={setShowGameOverModal}
                  gameWinner={gameWinner}
                  gameStandings={gameStandings}
                  showTradeModal={showTradeModal}
                  setShowTradeModal={setShowTradeModal}
                  activeCounterOffer={activeCounterOffer}
                  setActiveCounterOffer={setActiveCounterOffer}
                  incomingTrade={incomingTrade}
                  leaveGame={leaveGame}
                  saveGame={saveGame}
                  pauseGame={pauseGame}
                  resumeGame={resumeGame}
                />
              )
            ) : null
          }
        />

        {/* Catch-all: redirect to lobby */}
        <Route path="*" element={null} />
      </Routes>
    </ErrorBoundary>
  );
}

export default App;
