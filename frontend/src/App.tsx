import { useEffect, useState, useRef } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import { useGameStore } from '../stores/gameStore';
import { Board } from '../components/Board';
import { AuctionModal } from '../components/AuctionModal';
import { PlayerSidebar } from '../components/PlayerSidebar';
import { RoomSettings } from '../components/RoomSettings';
import { AudioSettings } from '../components/AudioSettings';
import { ToastContainer, showToast } from '../components/Toast';
import { BankruptModal, GameOverModal } from '../components/BankruptModal';
import { TradeModal, TradeNotification } from '../components/TradeModal';
import type { TradeOffer, Player, GameState, RoomState, PropertyState } from '../stores/slices/types';
import { CardDrawModal } from '../components/CardDrawModal';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { ReconnectOverlay } from '../components/ReconnectOverlay';
import { motion, AnimatePresence } from 'framer-motion';
import { soundManager } from '../utils/audio';
import { Globe, Building2, Users, Crown, Copy, Share2, X, LogOut, Settings, FolderOpen, Dice5, Menu, Handshake, Volume2, Save, Play, Pause } from 'lucide-react';
import boardData from '../../shared/configs/board_config.json';

// Hindu mythology inspired default player names
const PLAYER_NAME_POOL = [
  'Shiva', 'Vishnu', 'Hanuman', 'Krishna', 'Rama', 'Ganesha',
  'Kartikeya', 'Narayana', 'Rudra', 'Mahadev', 'Parashurama',
  'Indra', 'Surya', 'Agni', 'Varuna', 'Vayu', 'Yama',
  'Lakshmi', 'Saraswati', 'Durga',
];
const getRandomName = () => PLAYER_NAME_POOL[Math.floor(Math.random() * PLAYER_NAME_POOL.length)];

// Board tile color union (matches board_config.json)
type TileColor = 'brown' | 'light_blue' | 'pink' | 'orange' | 'red' | 'yellow' | 'green' | 'dark_blue';

interface BoardTile {
  id: number;
  name: string;
  type: string;
  color?: TileColor;
  price?: number;
  rent?: number[];
  mortgage?: number;
}

interface Standing {
  id: string;
  name: string;
  color: string;
  money: number;
  properties: number;
  netWorth: number;
  isBankrupt: boolean;
  rank: number;
}

// Helper to calculate standings
function calculateStandings(players: Record<string, Player>, game: GameState): Standing[] {
  const HOUSE_PRICES: Record<TileColor, number> = {
    brown: 500, light_blue: 600, pink: 1000, orange: 1000,
    red: 1500, yellow: 1500, green: 2000, dark_blue: 2000
  };
  const allPlayers = Object.values(players);
  return allPlayers.map((p) => {
    const props = (p.properties_owned || []).map((id) => game.properties?.[id] as PropertyState | undefined).filter((prop): prop is PropertyState => prop != null);
    const propValue = props.reduce((sum, prop) => {
      const config = (boardData.tiles as BoardTile[]).find((t) => t.id === prop.tile_id);
      const price = config?.price || 0;
      const color = config?.color;
      const housePrice = (color && color in HOUSE_PRICES) ? HOUSE_PRICES[color] : 500;
      return sum + price + (prop.houses || 0) * housePrice + (prop.hotels || 0) * housePrice * 5;
    }, 0);
    return {
      id: p.id,
      name: p.name,
      color: p.color,
      money: p.money,
      properties: props.length,
      netWorth: p.money + propValue,
      isBankrupt: p.is_bankrupt
    };
  }).sort((a, b) => {
    if (a.isBankrupt && !b.isBankrupt) return 1;
    if (!a.isBankrupt && b.isBankrupt) return -1;
    return b.netWorth - a.netWorth;
  }).map((p, i) => ({ ...p, rank: i + 1 }));
}

// Helper to map players for sidebar
function mapPlayersForSidebar(room: RoomState, game: GameState, activePlayerId?: string) {
  if (!room) return [];
  return Object.values(room.players).map((p) => ({
    id: p.id,
    name: p.name,
    color: p.color,
    money: p.money,
    position: p.position,
    connected: p.connected,
    isHost: p.id === room.host_id,
    isCurrentTurn: p.id === activePlayerId,
    is_in_jail: p.is_in_jail,
    jail_turns: p.jail_turns,
    properties: game?.properties ? Object.values(game.properties).filter((prop) => prop.owner_id === p.id).map((prop) => prop.tile_id) : []
  }));
}

// Custom hook for Bankruptcy and Game Over detection
function useBankruptcyAndGameOver(
  game: GameState | null,
  myId: string | null,
  setBankruptPlayer: (p: { name: string; creditorName?: string }) => void,
  setShowBankruptModal: (show: boolean) => void,
  setGameWinner: (w: { name: string; isWinner: boolean }) => void,
  setGameStandings: (s: Standing[]) => void,
  setShowGameOverModal: (show: boolean) => void
) {
  const prevBankruptStatus = useRef<Record<string, boolean>>({});

  useEffect(() => {
    if (!game) return;

    const players = game.room.players;

    // Check for newly bankrupt players
    for (const [id, player] of Object.entries(players)) {
      const wasBankrupt = prevBankruptStatus.current[id] || false;
      if (player.is_bankrupt && !wasBankrupt) {
        const creditorId = game.turn_order.find((tid: string) => tid !== id && !players[tid]?.is_bankrupt);
        setBankruptPlayer({
          name: player.name,
          creditorName: creditorId ? players[creditorId]?.name : undefined
        });
        setShowBankruptModal(true);
      }
      prevBankruptStatus.current[id] = player.is_bankrupt;
    }

    // Check for game over
    const activePlayers = Object.values(players).filter((p) => !p.is_bankrupt);
    if (game.room.status === 'finished' && activePlayers.length === 1) {
      const winner = activePlayers[0];
      setGameWinner({
        name: winner.name,
        isWinner: winner.id === myId
      });

      const standings = calculateStandings(players, game);
      setGameStandings(standings);
      setShowGameOverModal(true);
    }
  }, [game, myId, setBankruptPlayer, setShowBankruptModal, setGameWinner, setGameStandings, setShowGameOverModal]);
}

// 1. Connection Loading Screen
function ConnectionScreen({ error }: { error: string | null }) {
  return (
    <div className="flex h-screen items-center justify-center bg-background">
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
          <Globe className="w-6 h-6 mx-auto text-gold-500" />
        </motion.div>
        <h1 className="text-3xl font-bold text-gold-500 mb-3 font-cyber">Connecting to Server</h1>
        {error ? (
          <p className="text-danger-400 font-cyber mb-2">{error}</p>
        ) : (
          <p className="text-text-muted font-cyber">Establishing secure connection...</p>
        )}
        <div className="mt-6 flex justify-center">
          <div className="w-48 h-1 bg-surface rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-gold-500 to-gold-700 rounded-full"
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

// 2. Lobby Screen
function LobbyScreen({
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
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <motion.div
        className="panel-dark p-8 rounded-3xl w-full max-w-md border-2 border-gold-500/30 shadow-lg"
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

        <div className="space-y-6">
          <div>
            <label className="block text-sm text-text-muted mb-2 font-cyber">YOUR NAME</label>
            <input
              className="w-full bg-surface/50 border-2 border-gold-500/30 rounded-xl p-4 text-white placeholder:text-text-muted focus:border-gold-500 focus:outline-none"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Enter your name"
            />
          </div>

          <p className="text-xs text-text-muted text-center">
            Color will be assigned automatically (unique per player)
          </p>

          <motion.button
            className="w-full btn-gold py-4 text-lg font-bold rounded-xl flex items-center justify-center gap-3 min-h-[56px]"
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
                className="w-full bg-surface/50 border-2 border-gold-500/30 rounded-xl p-4 text-white placeholder:text-text-muted uppercase tracking-widest focus:border-gold-500 focus:outline-none"
                value={roomCode}
                onChange={e => setRoomCode(e.target.value.toUpperCase())}
                placeholder="ABCDEF"
                maxLength={6}
              />
            </div>
            
            <motion.button
              className="w-full btn-gold-outline py-4 text-lg font-bold rounded-xl flex items-center justify-center gap-3 min-h-[56px]"
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

// 3. Waiting Room Screen
function WaitingRoomScreen({
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
  hasSave?: boolean; // eslint-disable-line @typescript-eslint/no-unused-vars
  loadGame?: () => void; // eslint-disable-line @typescript-eslint/no-unused-vars
}) {
  const isHost = room.host_id === myId;
  const leaveGame = useGameStore(s => s.leaveGame);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4 bg-background">
      <motion.div
        className="panel-dark p-8 rounded-3xl w-full max-w-2xl border-2 border-gold-500/30 shadow-lg"
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

          {/* Network Share Link */}
          <div className="mt-6 panel-dark p-4 rounded-xl border border-gold-800/20 max-w-sm mx-auto">
            <p className="text-gold-500 text-sm font-bold mb-2">LAN Play</p>
            <p className="text-text-muted text-xs mb-3">Friends on same WiFi open this link, then enter room code:</p>
            <div className="flex items-center gap-2 bg-surface/50 rounded-lg p-2">
              <code className="text-gold-500 text-sm flex-1 font-mono">
                {`http://${window.location.host}`}
              </code>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(`http://${window.location.host}`);
                  showToast('Link copied!', 'success');
                }}
                className="btn-gold-ghost px-3 py-1.5 rounded-lg text-xs min-h-[32px]"
              >
                <Copy className="w-4 h-4" /> Copy
              </button>
            </div>
            <p className="text-text-muted/50 text-[10px] mt-2">Room code: {room.room_id}</p>
          </div>
        </div>
        
        <div className="mb-8">
          <h3 className="text-xl font-bold text-gold-500 mb-4 flex items-center gap-2">
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

        <div className="flex flex-col sm:flex-row gap-4">
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

// Game board view extracted for readability (all props passed from App)
function GameBoardView({
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

        <div className="flex items-center gap-3">
          <div className="panel-dark px-4 py-2 rounded-xl">
            <span className="text-text-muted text-xs">Turn:</span>
            <span className="text-gold-500 font-bold ml-1.5 text-xs">{activePlayerName}</span>
          </div>

          <div className="panel-dark px-4 py-2 rounded-xl">
            <span className="text-text-muted text-xs">My Money:</span>
            <span className="text-success-400 font-bold ml-1.5 text-xs">₹{myMoney ?? 0}</span>
          </div>

          <div className="h-6 w-px bg-white/10 mx-1"></div>

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

          {isMyTurn && (
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
                <h1 className="text-5xl sm:text-7xl font-bold text-warning-400 gold-glow font-cyber mb-4">
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
          className="hidden lg:block absolute left-4 top-4 bottom-4 w-64 z-10"
          initial={{ x: -280, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ delay: 0.3, type: "spring", damping: 25 }}
        >
          <div className="h-full overflow-y-auto scrollbar-hide">
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
          <div className="flex justify-between items-center">
            <div className="text-center">
              <p className="text-xs text-text-muted font-cyber">My Money</p>
              <p className="text-base font-bold text-success-400">₹{myMoney ?? 0}</p>
            </div>

            <div className="flex gap-2">
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

            <div className="flex gap-2">
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

export default App;
