import { motion } from 'framer-motion';
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useGameStore } from '../stores/gameStore';
import { animations } from '../animations';
import { TokenVisualizer } from './TokenVisualizer';
import { PropertyDetailModal } from './PropertyDetailModal';
import { soundManager } from '../utils/audio';
import { BoardTile } from './BoardTile';
import { CenterGameLog } from './CenterGameLog';
import { TurnPanel } from './TurnPanel';

// Calculate board cell size based on viewport dimensions
const calculateCellSize = (): number => {
  if (typeof window === 'undefined') return 44;
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  if (vw < 1024) {
    // Mobile: board fills width with 8px padding each side
    return Math.floor((vw - 16) / 11);
  }
  // Desktop: board capped by height and width, leaving room for sidebar/header
  return Math.floor(Math.min(vh - 120, vw - 320) / 11);
};

import boardData from '../../shared/configs/board_config.json';

// Color mapping for board tiles with richer colors
const BOARD_COLORS: Record<string, string> = {
  brown: '#92400e',
  light_blue: '#0ea5e9',
  pink: '#ec4899',
  orange: '#f97316',
  red: '#ef4444',
  yellow: '#eab308',
  green: '#22c55e',
  dark_blue: '#3b82f6',
  utility: '#94a3b8',
  airport: '#6b7280',
  tax: '#dc2626',
  card: '#d97706',
  jail: '#475569',
  free_parking: '#10b981',
  go: '#22c55e',
};

// Get grid position for 11x11 board
const getGridPosition = (index: number) => {
  if (index >= 0 && index <= 10) return { gridRow: 11, gridColumn: 11 - index };
  if (index > 10 && index <= 20) return { gridRow: 11 - (index - 10), gridColumn: 1 };
  if (index > 20 && index <= 30) return { gridRow: 1, gridColumn: 1 + (index - 20) };
  if (index > 30 && index < 40) return { gridRow: 1 + (index - 30), gridColumn: 11 };
  return { gridRow: 6, gridColumn: 6 };
};

// Helper function to get property state
const getPropertyState = (game: any, tileId: number) => {
  return game.properties[tileId] || null;
};

// Helper function to get tile color
const getTileColor = (tile: any) => {
  return BOARD_COLORS[tile.color] || tile.color || '#475569';
};

// Get special tile icon
const getTileIcon = (tile: any) => {
  if (tile.id === 0) return '🏁';
  if (tile.id === 10) return '👮';
  if (tile.id === 20) return '🅿️';
  if (tile.id === 30) return '🚨';
  if (tile.type === 'airport') return '✈️';
  if (tile.type === 'utility') return '⚡';
  if (tile.type === 'tax') return '💰';
  if (tile.type === 'treasury') return '🏛️';
  if (tile.type === 'surprise') return '❓';
  return null;
};

export const Board = () => {
  const { game, myId, turn, diceResult, moneyChange, pendingAction } = useGameStore();
  const [isRolling, setIsRolling] = useState(false);
  const [diceValues, setDiceValues] = useState({ die1: 1, die2: 1 });
  const [isMoving, setIsMoving] = useState(false);
  const [selectedTile, setSelectedTile] = useState<number | null>(null);
  const [landingTile, setLandingTile] = useState<number | null>(null);
  const [isShaking, setIsShaking] = useState(false);

  // Fluid cell size — recalculates on resize
  const [cellSize, setCellSize] = useState(calculateCellSize);
  useEffect(() => {
    const recalc = () => setCellSize(calculateCellSize());
    window.addEventListener('resize', recalc);
    return () => window.removeEventListener('resize', recalc);
  }, []);
  const shakenPlayers = useRef(new Set<string>());
  const viewportRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef(game);
  gameRef.current = game;

  // Memoize game stats computation to avoid recalculating on every render
  const gameStats = useMemo(() => {
    if (!game) return null;
    const props = Object.values(game.properties || {});
    const owned = props.filter((p: any) => p.owner_id).length;
    const houses = props.reduce((sum: number, p: any) => sum + (p.houses || 0), 0);
    const hotels = props.reduce((sum: number, p: any) => sum + (p.hotels || 0), 0);
    const mortgaged = props.filter((p: any) => p.is_mortgaged).length;
    const bankHouses = game.houses_remaining ?? 32;
    const bankHotels = game.hotels_remaining ?? 12;
    return { owned, houses, hotels, mortgaged, bankHouses, bankHotels };
  }, [game?.properties, game?.houses_remaining, game?.hotels_remaining]);

  // Pre-compute monopoly set: tile IDs where the owner has all properties in the color group
  const monopolySet = useMemo(() => {
    const set = new Set<number>();
    if (!game?.properties) return set;

    // Group property tiles by color
    const colorGroups: Record<string, { id: number }[]> = {};
    for (const tile of boardData.tiles as any[]) {
      if (tile.type === 'property' && tile.color) {
        (colorGroups[tile.color] ??= []).push(tile);
      }
    }

    // For each color group, check if one owner has all tiles
    for (const tiles of Object.values(colorGroups)) {
      const firstProp = game.properties[tiles[0].id];
      if (!firstProp?.owner_id) continue;
      const ownerId = firstProp.owner_id;
      const allOwned = tiles.every(t => game.properties[t.id]?.owner_id === ownerId);
      if (allOwned) {
        for (const t of tiles) set.add(t.id);
      }
    }
    return set;
  }, [game?.properties]);

  // Update dice values when backend sends result
  useEffect(() => {
    if (diceResult) {
      setDiceValues({ die1: diceResult.die1, die2: diceResult.die2 });
      setIsRolling(false);

      // Play movement sound after dice land
      soundManager.playPlayerMove();

      // Start movement animation and highlight landing tile
      setIsMoving(true);
      const timers: ReturnType<typeof setTimeout>[] = [];
      const currentGame = gameRef.current;
      if (currentGame) {
        const activePlayerId = currentGame.turn_order[currentGame.current_turn_index];
        const activePlayer = currentGame.room.players?.[activePlayerId];
        if (activePlayer) {
          setLandingTile(activePlayer.position);
          timers.push(setTimeout(() => setLandingTile(null), 1500));
        }
      }
      timers.push(setTimeout(() => setIsMoving(false), 1500));
      return () => timers.forEach(clearTimeout);
    }
  }, [diceResult]);

  // Screen shake on bankruptcy (fires once per new bankruptcy)
  useEffect(() => {
    if (!game) return;
    const timers: ReturnType<typeof setTimeout>[] = [];
    for (const [pid, player] of Object.entries(game.room.players)) {
      if ((player as any).is_bankrupt && !shakenPlayers.current.has(pid)) {
        shakenPlayers.current.add(pid);
        setIsShaking(true);
        timers.push(setTimeout(() => setIsShaking(false), 500));
      }
    }
    return () => timers.forEach(clearTimeout);
  }, [game?.room.players]);

  // Handle dice roll (animation handled by DiceAnim component)
  const handleRollDice = () => {
    if (!turn?.can_roll || isRolling) return;

    setIsRolling(true);
    soundManager.playButtonClick();

    // Send roll to backend — DiceAnim handles all randomization
    useGameStore.getState().rollDice();
  };

  // Handle move complete
  const handleMoveComplete = () => {
    setIsMoving(false);
  };

  // Stable callback for tile clicks — prevents BoardTile re-renders from inline arrow
  const handleTileClick = useCallback((id: number) => {
    soundManager.playButtonClick();
    setSelectedTile(id);
  }, []);

  if (!game) return null;

  const isMobile = cellSize < 40;

  return (
    <div ref={viewportRef} className={`flex-1 flex items-center justify-center p-1 lg:p-4 relative board-container ${isShaking ? 'animate-shake' : ''}`}>
      <motion.div
        className="relative grid border-2 border-gold-500/30 shadow-2xl rounded-2xl overflow-visible"
        style={{
          '--cell': `${cellSize}px`,
          gridTemplateColumns: 'repeat(11, var(--cell))',
          gridTemplateRows: 'repeat(11, var(--cell))',
          aspectRatio: '1/1',
          width: `${cellSize * 11}px`,
          maxWidth: `${cellSize * 11}px`,
          position: 'relative',
          background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.95) 0%, rgba(30, 41, 59, 0.95) 100%)',
          boxShadow: '0 0 60px rgba(34, 211, 238, 0.1), 0 0 120px rgba(168, 85, 247, 0.05), inset 0 1px 0 rgba(255, 255, 255, 0.05)'
        } as React.CSSProperties}
        variants={animations.fadeIn}
        initial="hidden"
        animate="visible"
      >
        {/* Board texture overlay */}
        <div className="absolute inset-0 z-0 pointer-events-none opacity-30"
          style={{
            backgroundImage: `radial-gradient(circle at 25% 25%, rgba(34, 211, 238, 0.1) 0%, transparent 50%),
                             radial-gradient(circle at 75% 75%, rgba(168, 85, 247, 0.1) 0%, transparent 50%)`,
          }}
        />

        {/* Token Visualizer Overlay */}
        <TokenVisualizer
          players={Object.values(game.room.players).map((p: any) => ({
            id: p.id,
            name: p.name,
            color: p.color,
            position: p.position,
            money: p.money,
            is_in_jail: p.is_in_jail
          }))}
          currentPlayerId={turn?.active_player_id}
          isMoving={isMoving}
          onMoveComplete={handleMoveComplete}
          cellSize={cellSize}
        />

        {/* Center Area */}
        <div className="absolute inset-0 z-0" style={{ gridRow: '2 / 11', gridColumn: '2 / 11' }}>
          <div className="absolute inset-0 rounded-lg overflow-hidden">
            {/* Multi-layer subtle background */}
            <div className="absolute inset-0"
              style={{
                background: 'radial-gradient(ellipse at center, rgba(212, 164, 55, 0.04) 0%, transparent 70%)',
              }}
            />
            <div className="absolute inset-0"
              style={{
                background: 'linear-gradient(135deg, rgba(34, 211, 238, 0.02) 0%, rgba(168, 85, 247, 0.02) 50%, rgba(212, 164, 55, 0.02) 100%)',
              }}
            />
            {/* Subtle corner accents */}
            <div className="absolute top-0 left-0 w-8 h-8 border-t border-l border-gold-500/10 rounded-tl-lg" />
            <div className="absolute top-0 right-0 w-8 h-8 border-t border-r border-gold-500/10 rounded-tr-lg" />
            <div className="absolute bottom-0 left-0 w-8 h-8 border-b border-l border-gold-500/10 rounded-bl-lg" />
            <div className="absolute bottom-0 right-0 w-8 h-8 border-b border-r border-gold-500/10 rounded-br-lg" />
          </div>

          <div className="absolute top-1 md:top-3 left-1/2 transform -translate-x-1/2 text-center">
            <motion.h1
              className="font-cyber text-sm md:text-2xl font-bold tracking-wider"
              style={{
                textShadow: '0 0 15px rgba(212, 164, 55, 0.3), 0 0 30px rgba(212, 164, 55, 0.1)',
                background: 'linear-gradient(135deg, #d4a437 0%, #f0d68a 50%, #d4a437 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
              variants={animations.glowPulse}
              animate="visible"
            >
              DINO-RICHUP
            </motion.h1>
            <p className="text-text-muted text-[10px] md:text-xs font-cyber mt-0 tracking-[0.3em] uppercase opacity-60">
              PAN-INDIA EDITION
            </p>

            {/* Compact game stats — more integrated */}
            {gameStats && (
              <div className="mt-1 flex items-center justify-center gap-2 text-[10px] md:text-xs">
                <span className="text-text-muted/70">{gameStats.owned} props</span>
                <span className="w-0.5 h-0.5 bg-gold-500/40 rounded-full"></span>
                <span className="text-success-400/80">{gameStats.houses}H</span>
                <span className="text-danger-400/80">{gameStats.hotels}Ho</span>
                <span className="w-0.5 h-0.5 bg-gold-500/40 rounded-full"></span>
                <span className="text-info-400/70">Bank {gameStats.bankHouses}/{gameStats.bankHotels}</span>
                {gameStats.mortgaged > 0 && (
                  <>
                    <span className="w-0.5 h-0.5 bg-gold-500/40 rounded-full"></span>
                    <span className="text-warning-400/80">{gameStats.mortgaged}M</span>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Turn focus zone — cinematic emphasis for active player */}
          {turn && myId && turn.active_player_id === myId && (
            <motion.div
              className="absolute top-[30%] left-1/2 transform -translate-x-1/2 -translate-y-1/2 pointer-events-none"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: [0, 0.15, 0], scale: [0.9, 1.1, 0.9] }}
              transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
              style={{
                width: '80%',
                height: '40%',
                background: 'radial-gradient(ellipse, rgba(212, 164, 55, 0.15) 0%, transparent 70%)',
                borderRadius: '50%',
              }}
            />
          )}

          {/* Center game log — all events visible for transparency */}
          {game && <CenterGameLog historyLog={game.history_log} />}

          {/* Center cell turn panel (desktop only) */}
          {!isMobile && (
            <TurnPanel
              isMobile={false}
              cellSize={cellSize}
              turn={turn}
              myId={myId}
              game={game}
              isRolling={isRolling}
              diceValues={diceValues}
              moneyChange={moneyChange}
              pendingAction={pendingAction}
              handleRollDice={handleRollDice}
              setIsRolling={setIsRolling}
            />
          )}
        </div>

        {/* Tiles */}
        {boardData.tiles.map((tile: any) => {
          const isCorner = [0, 10, 20, 30].includes(tile.id);
          const isSide = !isCorner && tile.type !== 'tax' && tile.type !== 'treasury' && tile.type !== 'surprise';
          const propState = getPropertyState(game, tile.id);
          const ownerId = propState?.owner_id;
          const ownerIcons: Record<string, string> = {
            '#ef4444': '🔴', '#3b82f6': '🔵', '#22c55e': '🟢',
            '#eab308': '🟡', '#a855f7': '🟣', '#f97316': '🟠'
          };
          const playerColor = ownerId ? game.room.players[ownerId]?.color : undefined;

          return (
            <BoardTile
              key={tile.id}
              tile={tile}
              pos={getGridPosition(tile.id)}
              isCorner={isCorner}
              isSide={isSide}
              cellSize={cellSize}
              ownerId={ownerId}
              houses={propState?.houses || 0}
              hotels={propState?.hotels || 0}
              isMortgaged={propState?.is_mortgaged || false}
              hasMonopolyOnTile={ownerId ? monopolySet.has(tile.id) : false}
              tileColor={getTileColor(tile)}
              tileIcon={getTileIcon(tile)}
              playerColor={playerColor}
              playerName={ownerId ? game.room.players[ownerId]?.name : undefined}
              ownerIcon={ownerId ? (ownerIcons[playerColor || ''] || '⚪') : ''}
              isLandingTile={landingTile === tile.id}
              isMyTile={ownerId === myId}
              onTileClick={handleTileClick}
            />
          );
        })}

      </motion.div>

      {/* Mobile-only viewport turn panel */}
      {isMobile && (
        <TurnPanel
          isMobile={true}
          cellSize={cellSize}
          turn={turn}
          myId={myId}
          game={game}
          isRolling={isRolling}
          diceValues={diceValues}
          moneyChange={moneyChange}
          pendingAction={pendingAction}
          handleRollDice={handleRollDice}
          setIsRolling={setIsRolling}
        />
      )}

      {/* Property Detail Modal (moved to viewport level to avoid transformed ancestor bug) */}
      <PropertyDetailModal
        tileId={selectedTile}
        onClose={() => setSelectedTile(null)}
      />
    </div>
  );
};
