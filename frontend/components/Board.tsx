import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect, useRef, memo } from 'react';
import { useGameStore } from '../stores/gameStore';
import { animations } from '../animations';
// THEME import removed - using direct color values
import { DiceAnim } from './DiceAnim';
import { TokenVisualizer } from './TokenVisualizer';
import { PropertyDetailModal } from './PropertyDetailModal';
import { soundManager } from '../utils/audio';
import { formatMoney, formatMoneyShort } from '../utils/format';

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

// Helper function to check if a player has monopoly on a color group
const hasMonopoly = (game: any, tile: any, playerId: string) => {
  if (!tile.color || tile.type !== 'property') return false;

  const colorGroupIds = boardData.tiles
    .filter((t: any) => t.color === tile.color && t.type === 'property')
    .map((t: any) => t.id);

  return colorGroupIds.every((id: number) => {
    const prop = game.properties[id];
    return prop && prop.owner_id === playerId;
  });
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

// Memoized tile component to prevent re-rendering all 40 tiles
interface BoardTileProps {
  tile: any;
  pos: { gridRow: number; gridColumn: number };
  isCorner: boolean;
  isSide: boolean;
  ownerId: string | undefined;
  houses: number;
  hotels: number;
  isMortgaged: boolean;
  hasMonopolyOnTile: boolean;
  tileColor: string;
  tileIcon: string | null;
  playerColor: string | undefined;
  playerName: string | undefined;
  ownerIcon: string;
  isLandingTile: boolean;
  isMyTile: boolean;
  onTileClick: (id: number) => void;
}

const BoardTile = memo(({
  tile, pos, isCorner, isSide, ownerId, houses, hotels,
  isMortgaged, hasMonopolyOnTile, tileColor, tileIcon,
  playerColor, playerName, ownerIcon, isLandingTile, isMyTile, onTileClick
}: BoardTileProps) => {
  return (
    <motion.div
      className={`flex flex-col relative overflow-hidden cursor-pointer ${
        isCorner ? 'p-1.5 justify-center items-center' : ''
      }`}
      style={{
        ...pos,
        border: isCorner
          ? '2px solid rgba(34, 211, 238, 0.4)'
          : ownerId
          ? `2px solid ${playerColor || 'rgba(255, 255, 255, 0.15)'}80`
          : isSide
          ? '1px solid rgba(255, 255, 255, 0.15)'
          : '1px solid rgba(255, 255, 255, 0.08)',
        background: isCorner
          ? 'linear-gradient(135deg, rgba(15, 23, 42, 0.9) 0%, rgba(30, 41, 59, 0.9) 100%)'
          : 'rgba(15, 23, 42, 0.85)',
        transition: 'all 0.2s ease'
      }}
      variants={animations.fadeIn}
      whileHover={{
        scale: 1.08,
        zIndex: 20,
        boxShadow: '0 0 20px rgba(34, 211, 238, 0.2)',
        borderColor: 'rgba(34, 211, 238, 0.5)'
      }}
      transition={{ duration: 0.15 }}
      onClick={() => onTileClick(tile.id)}
    >
      {/* Landing glow effect */}
      {isLandingTile && (
        <motion.div
          className="absolute inset-0 z-10 pointer-events-none rounded-2xl"
          initial={{ boxShadow: '0 0 0px rgba(34, 211, 238, 0)' }}
          animate={{
            boxShadow: [
              '0 0 0px rgba(34, 211, 238, 0)',
              '0 0 30px rgba(34, 211, 238, 0.6), inset 0 0 20px rgba(34, 211, 238, 0.15)',
              '0 0 0px rgba(34, 211, 238, 0)'
            ]
          }}
          transition={{ duration: 1.2, ease: 'easeOut' }}
        />
      )}

      {/* Owned by me pulse */}
      {isMyTile && !isLandingTile && (
        <motion.div
          className="absolute inset-0 z-10 pointer-events-none rounded-2xl"
          animate={{
            boxShadow: [
              '0 0 0px rgba(34, 211, 238, 0)',
              '0 0 8px rgba(34, 211, 238, 0.2)',
              '0 0 0px rgba(34, 211, 238, 0)'
            ]
          }}
          transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
        />
      )}

      {/* Color bar for properties */}
      {!isCorner && tile.color && (
        <div
          className={`h-5 w-full relative ${hasMonopolyOnTile ? 'border-b-2 border-yellow-400' : 'border-b border-white/10'}`}
          style={{
            background: hasMonopolyOnTile
              ? `linear-gradient(90deg, ${tileColor} 0%, ${tileColor}cc 50%, ${tileColor} 100%)`
              : tileColor,
            boxShadow: hasMonopolyOnTile
              ? `inset 0 0 15px rgba(255, 255, 0, 0.4), 0 0 10px ${tileColor}40`
              : `0 2px 4px ${tileColor}20`
          }}
        >
          {hasMonopolyOnTile && (
            <motion.div
              className="absolute inset-0"
              style={{
                background: 'linear-gradient(90deg, transparent 0%, rgba(255, 255, 0, 0.3) 50%, transparent 100%)'
              }}
              animate={{ x: ['-100%', '100%'] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
            />
          )}
        </div>
      )}

      {/* Special type indicator */}
      {!isCorner && !tile.color && (
        <div
          className="h-4 w-full border-b border-white/10 flex items-center justify-center"
          style={{ backgroundColor: tileColor }}
        >
          {tileIcon && <span className="text-[8px]">{tileIcon}</span>}
        </div>
      )}

      <div className={`flex-1 flex flex-col items-center text-center px-0.5 ${isCorner ? '' : 'justify-between py-0.5'}`}>
        {isCorner && tileIcon && (
          <span className="text-lg md:text-2xl mb-0.5">{tileIcon}</span>
        )}

        {!isCorner && tile.type === 'property' && (
          <span className="text-[10px] md:text-xs mb-0.5">🇮🇳</span>
        )}

        <span className={`font-bold leading-tight ${
          isCorner
            ? 'text-xs md:text-sm text-primary-300'
            : 'text-[10px] md:text-[12px] text-text-main'
        }`}>
          {tile.name}
        </span>

        {tile.price && (
          <span className="text-[9px] md:text-[10px] font-semibold text-primary-400/80 mt-0.5">
            {formatMoneyShort(tile.price)}
          </span>
        )}

        {/* House/Hotel indicators */}
        {(houses > 0 || hotels > 0) && (
          <motion.div
            className="flex flex-wrap justify-center gap-0.5 mt-0.5"
            variants={animations.scaleIn}
          >
            {hotels > 0 ? (
              <div className="relative">
                <div className="w-3 h-3 md:w-4 md:h-4 bg-red-500 rounded-sm shadow-lg"
                  style={{ boxShadow: '0 0 6px rgba(239, 68, 68, 0.6)' }}
                ></div>
              </div>
            ) : (
              Array.from({ length: Math.min(houses, 4) }).map((_, i) => (
                <div
                  key={i}
                  className="w-2 h-2 md:w-2.5 md:h-2.5 bg-green-500 rounded-sm shadow"
                  style={{ boxShadow: '0 0 4px rgba(34, 197, 94, 0.5)' }}
                ></div>
              ))
            )}
          </motion.div>
        )}

        {/* Owner indicator */}
        {ownerId && (
          <motion.div
            className="absolute top-0.5 right-0.5 w-5 h-5 md:w-6 md:h-6 rounded-full border-2 border-white/80 shadow-lg z-20 flex items-center justify-center text-xs md:text-sm"
            style={{
              backgroundColor: (playerColor || '#888') + '60',
              boxShadow: `0 0 12px ${playerColor || '#888'}80`
            }}
            title={`Owned by ${playerName}`}
            variants={animations.scaleIn}
            whileHover={{ scale: 1.3 }}
          >
            {ownerIcon}
          </motion.div>
        )}

        {/* Mortgaged indicator */}
        {isMortgaged && (
          <motion.div
            className="absolute top-0.5 left-0.5 w-3 h-3 md:w-4 md:h-4 bg-gray-700 rounded-full border border-white/50 shadow-lg z-20 flex items-center justify-center"
            title="Mortgaged"
            variants={animations.scaleIn}
          >
            <span className="text-white text-[6px] font-bold">M</span>
          </motion.div>
        )}

        {/* Monopoly crown indicator */}
        {hasMonopolyOnTile && (
          <motion.div
            className="absolute -top-1 left-1/2 transform -translate-x-1/2 z-30"
            variants={animations.float}
            animate="visible"
          >
            <span className="text-yellow-400 text-xs drop-shadow-lg">👑</span>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
});
BoardTile.displayName = 'BoardTile';

// Center game log — shows all events for transparency
const CenterGameLog = ({ historyLog }: { historyLog: string[] }) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to latest entry
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [historyLog.length]);

  if (historyLog.length === 0) return null;

  return (
    <div className="absolute top-[52%] left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-10 pointer-events-none w-[70%] max-w-xs">
      <div
        ref={scrollRef}
        className="flex flex-col gap-1 max-h-40 overflow-y-auto scrollbar-hide px-1"
        style={{ maskImage: 'linear-gradient(to bottom, transparent 0%, black 15%, black 85%, transparent 100%)' }}
      >
        {historyLog.map((log, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: i === historyLog.length - 1 ? 1 : 0.6, x: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div
              className={`px-3 py-1.5 rounded-lg text-center ${i === historyLog.length - 1 ? 'border border-primary-500/25' : 'border border-transparent'}`}
              style={i === historyLog.length - 1 ? {
                background: 'linear-gradient(135deg, rgba(34, 211, 238, 0.1) 0%, rgba(15, 23, 42, 0.85) 100%)',
                boxShadow: '0 2px 12px rgba(34, 211, 238, 0.1)'
              } : {
                background: 'rgba(15, 23, 42, 0.4)'
              }}
            >
              <p className={`${i === historyLog.length - 1 ? 'text-xs text-text-main font-medium' : 'text-[11px] text-text-muted'} leading-relaxed`}>
                {log}
              </p>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export const Board = () => {
  const { game, myId, turn, diceResult, moneyChange } = useGameStore();
  const [isRolling, setIsRolling] = useState(false);
  const [diceValues, setDiceValues] = useState({ die1: 1, die2: 1 });
  const [isMoving, setIsMoving] = useState(false);
  const [selectedTile, setSelectedTile] = useState<number | null>(null);
  const [landingTile, setLandingTile] = useState<number | null>(null);
  const [boardZoom, setBoardZoom] = useState(1);
  const [isShaking, setIsShaking] = useState(false);

  // Update dice values when backend sends result
  useEffect(() => {
    if (diceResult) {
      setDiceValues({ die1: diceResult.die1, die2: diceResult.die2 });
      setIsRolling(false);

      // Play movement sound after dice land
      soundManager.playPlayerMove();

      // Start movement animation and highlight landing tile
      setIsMoving(true);
      if (game) {
        const activePlayerId = game.turn_order[game.current_turn_index];
        const activePlayer = game.room.players?.[activePlayerId];
        if (activePlayer) {
          setLandingTile(activePlayer.position);
          setTimeout(() => setLandingTile(null), 1500);
        }
      }
      setTimeout(() => setIsMoving(false), 1500);
    }
  }, [diceResult]);

  // Screen shake on bankruptcy
  useEffect(() => {
    if (game) {
      const bankruptPlayers = Object.values(game.room.players).filter((p: any) => p.is_bankrupt);
      if (bankruptPlayers.length > 0) {
        setIsShaking(true);
        setTimeout(() => setIsShaking(false), 500);
      }
    }
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

  if (!game) return null;

  // Use dice values (from backend result or local animation)
  const currentDice = diceValues;
  const viewportRef = useRef<HTMLDivElement>(null);

  const renderTurnPanel = (isMobile: boolean) => {
    return (
      <div 
        className={
          isMobile 
            ? "lg:hidden absolute bottom-[76px] left-1/2 transform -translate-x-1/2 w-[92%] max-w-sm z-30" 
            : "absolute bottom-4 left-1/2 transform -translate-x-1/2 w-4/5 max-w-md hidden lg:block"
        }
      >
        {turn?.active_player_id === myId ? (
          <motion.div
            key={`${isMobile ? 'mobile-' : ''}turn-${turn?.active_player_id}`}
            className={`glass-panel-primary rounded-2xl border border-primary-500/30 shadow-xl ${isMobile ? 'p-4' : 'p-5'}`}
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          >
            <div className={`flex flex-col items-center ${isMobile ? 'gap-2' : 'gap-3'}`}>
              <div className={`flex items-center ${isMobile ? 'gap-2' : 'gap-3'}`}>
                <motion.div
                  className="w-3 h-3 bg-primary-500 rounded-full"
                  animate={{ scale: [1, 1.3, 1], opacity: [0.7, 1, 0.7] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                />
                <h3 className={`text-primary-300 font-bold ${isMobile ? 'text-xs md:text-sm' : 'text-xs md:text-base'}`}>YOUR TURN!</h3>
              </div>

              {/* Turn timer bar */}
              {turn?.time_remaining != null && game?.room?.settings?.turn_timer_seconds && (
                <div className="w-full max-w-xs">
                  <div className="flex justify-between items-center text-xs mb-1">
                    <span className="text-text-muted">Time</span>
                    <span className={`font-mono font-bold ${
                      turn.time_remaining <= 10 ? 'text-danger-400' :
                      turn.time_remaining <= 20 ? 'text-warning-400' :
                      'text-primary-400'
                    }`}>
                      {Math.floor(turn.time_remaining / 60)}:{(turn.time_remaining % 60).toString().padStart(2, '0')}
                    </span>
                  </div>
                  <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full rounded-full"
                      style={{
                        background: turn.time_remaining <= 10
                          ? 'linear-gradient(90deg, #ef4444, #f87171)'
                          : turn.time_remaining <= 20
                          ? 'linear-gradient(90deg, #f59e0b, #fbbf24)'
                          : 'linear-gradient(90deg, #22d3ee, #a855f7)'
                      }}
                      initial={{ width: '100%' }}
                      animate={{ width: `${(turn.time_remaining / game.room.settings.turn_timer_seconds) * 100}%` }}
                      transition={{ duration: 0.5 }}
                    />
                  </div>
                </div>
              )}

              {/* Enhanced Dice Display */}
              <div className="my-1">
                <DiceAnim
                  die1={currentDice.die1}
                  die2={currentDice.die2}
                  isRolling={isRolling}
                  onRollComplete={() => setIsRolling(false)}
                  size={isMobile ? "sm" : "md"}
                  showTotal={!isRolling}
                />
              </div>

              {/* Floating money change indicator */}
              <AnimatePresence>
                {moneyChange && (
                  <motion.div
                    key={moneyChange.timestamp}
                    className="text-center"
                    initial={{ opacity: 0, y: 10, scale: 0.8 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -30, scale: 1.2 }}
                    transition={{ type: 'spring', damping: 15, stiffness: 200 }}
                  >
                    <span className={`text-2xl md:text-3xl font-black drop-shadow-lg ${
                      moneyChange.amount > 0 ? 'text-green-400' : 'text-red-400'
                    }`}>
                      {moneyChange.amount > 0 ? '+' : ''}{formatMoney(moneyChange.amount)}
                    </span>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Debt warning — player must resolve or bankrupt */}
              {turn.in_debt && (
                <motion.div
                  className="flex flex-col items-center gap-2 w-full"
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                >
                  <div className="px-4 py-2 rounded-xl border border-red-500/40 bg-red-500/10 text-center w-full">
                    <p className="text-red-400 text-sm font-bold">IN DEBT — ₹{Math.abs(game.room.players[myId!]?.money || 0)} owed</p>
                    <p className="text-red-300/70 text-xs mt-1">Trade, mortgage, or sell to resolve. Or declare bankruptcy.</p>
                  </div>
                  <motion.button
                    className="btn-primary py-2.5 px-5 text-xs md:text-sm font-bold rounded-full bg-red-600 hover:bg-red-500 border-red-500 w-full"
                    onClick={() => {
                      soundManager.playButtonClick();
                      useGameStore.getState().declareBankruptcy();
                    }}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    DECLARE BANKRUPTCY
                  </motion.button>
                </motion.div>
              )}

              {/* Jail actions */}
              {myId && game.room.players[myId]?.is_in_jail && turn.can_roll && !turn.in_debt && (
                <motion.div
                  className="flex flex-col items-center gap-2"
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                >
                  <div className="px-4 py-1.5 rounded-xl border border-warning-500/40 bg-warning-500/10 text-center">
                    <p className="text-warning-400 text-xs md:text-sm font-bold">IN JAIL</p>
                    <p className="text-warning-300/70 text-[10px] md:text-xs mt-0.5">Pay fine, use card, or roll for doubles</p>
                  </div>
                  <div className="flex gap-2 flex-wrap justify-center">
                    <motion.button
                      className="btn-ghost py-2 px-4 text-[10px] md:text-xs border-warning-500/30 text-warning-400"
                      onClick={() => {
                        soundManager.playButtonClick();
                        useGameStore.getState().payJailFine();
                      }}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      PAY FINE (₹5,000)
                    </motion.button>
                    {(game.room.players[myId]?.get_out_of_jail_cards ?? 0) > 0 && (
                      <motion.button
                        className="btn-ghost py-2 px-4 text-[10px] md:text-xs border-accent-500/30 text-accent-400"
                        onClick={() => {
                          soundManager.playButtonClick();
                          useGameStore.getState().useJailCard();
                        }}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        USE CARD ({game.room.players[myId]?.get_out_of_jail_cards})
                      </motion.button>
                    )}
                  </div>
                </motion.div>
              )}

              {turn.can_roll && !isRolling && !turn.in_debt && (
                <motion.button
                  className="btn-primary py-2.5 px-6 text-xs md:text-base font-bold rounded-full flex items-center gap-2"
                  onClick={handleRollDice}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  disabled={isRolling}
                >
                  <span className="text-sm md:text-lg">🎲</span>
                  {myId && game.room.players[myId]?.is_in_jail ? 'ROLL FOR DOUBLES' : 'ROLL DICE'}
                </motion.button>
              )}

              {turn.can_end_turn && !turn.in_debt && (
                <motion.button
                  className="btn-ghost py-2 px-4 text-[10px] md:text-xs"
                  onClick={() => {
                    soundManager.playButtonClick();
                    useGameStore.getState().endTurn();
                  }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  END TURN
                </motion.button>
              )}

              {/* Tax choice */}
              {turn.pending_tax && myId && (
                <motion.div
                  className="flex flex-col items-center gap-2"
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                >
                  <div className="px-4 py-1.5 rounded-xl border border-danger-500/40 bg-danger-500/10 text-center">
                    <p className="text-danger-400 text-xs md:text-sm font-bold">{turn.pending_tax.name}</p>
                    <p className="text-danger-300/70 text-[10px] md:text-xs mt-0.5">Choose payment method</p>
                  </div>
                  <div className="flex gap-2 flex-wrap justify-center">
                    <motion.button
                      className="btn-ghost py-2 px-4 text-[10px] md:text-xs border-danger-500/30 text-danger-400"
                      onClick={() => {
                        soundManager.playButtonClick();
                        useGameStore.getState().payTax(false);
                      }}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      PAY ₹{turn.pending_tax.amount?.toLocaleString()}
                    </motion.button>
                    <motion.button
                      className="btn-ghost py-2 px-4 text-[10px] md:text-xs border-warning-500/30 text-warning-400"
                      onClick={() => {
                        soundManager.playButtonClick();
                        useGameStore.getState().payTax(true);
                      }}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      PAY 10% OF WORTH
                    </motion.button>
                  </div>
                </motion.div>
              )}

              {turn.phase === 'buy' && (
                <motion.div
                  className="mt-1 text-center"
                  variants={animations.fadeIn}
                >
                  <p className="text-text-muted text-[10px] md:text-xs mb-2">Buy this property?</p>
                  <div className="flex gap-2">
                    <motion.button
                      className="bg-success-500 text-white font-bold py-2.5 px-5 rounded-lg hover:bg-success-600 transition-colors text-xs md:text-sm"
                      onClick={() => {
                        const me = game.room.players[myId!];
                        soundManager.playBuyProperty();
                        useGameStore.getState().buyProperty(me.position);
                      }}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      Buy
                    </motion.button>
                    {game.room.settings?.auction_enabled !== false && (
                      <motion.button
                        className="bg-warning-500 text-white font-bold py-2.5 px-5 rounded-lg hover:bg-warning-600 transition-colors text-xs md:text-sm"
                        onClick={() => {
                          const me = game.room.players[myId!];
                          soundManager.playAuctionBid();
                          useGameStore.getState().startAuction(me.position);
                        }}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        Auction
                      </motion.button>
                    )}
                  </div>
                </motion.div>
              )}
            </div>
          </motion.div>
        ) : (
          <motion.div
            key={`${isMobile ? 'mobile-' : ''}waiting-${turn?.active_player_id}`}
            className={`glass-panel rounded-xl text-center border border-white/10 ${isMobile ? 'p-3' : 'p-4'}`}
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.3 }}
          >
            <div className="flex items-center justify-center gap-3">
              <motion.div
                className="w-2 h-2 bg-accent-400 rounded-full"
                animate={{ scale: [1, 1.4, 1], opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 1.2, repeat: Infinity }}
              />
              <span className="text-text-muted text-xs md:text-sm">
                Waiting for <span className="text-accent-300 font-bold">{game.room.players[turn?.active_player_id || '']?.name}</span>'s move...
              </span>
            </div>
          </motion.div>
        )}
      </div>
    );
  };

  return (
    <div ref={viewportRef} className={`flex-1 flex items-center justify-center overflow-hidden p-1 lg:p-4 relative board-container ${isShaking ? 'animate-shake' : ''}`}>
      {/* Mobile Zoom Toggle */}
      <motion.button
        className="lg:hidden absolute top-2 right-2 z-30 w-10 h-10 rounded-xl bg-surface/80 border border-primary-500/30 text-primary-300 flex items-center justify-center backdrop-blur-sm shadow-lg"
        onClick={() => setBoardZoom(prev => prev === 1 ? 1.5 : 1)}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        title={boardZoom === 1 ? 'Zoom In' : 'Zoom Out'}
      >
        <span className="text-lg">{boardZoom === 1 ? '🔍' : '🔎'}</span>
      </motion.button>

      <motion.div
        drag={boardZoom > 1}
        dragConstraints={viewportRef}
        dragElastic={0.1}
        animate={{
          scale: boardZoom,
          x: boardZoom === 1 ? 0 : undefined,
          y: boardZoom === 1 ? 0 : undefined,
        }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        style={{
          transformOrigin: 'center center',
        }}
        className="flex items-center justify-center touch-none w-full h-full"
      >
      <motion.div
        className="relative grid border-2 border-primary-500/30 shadow-2xl rounded-2xl overflow-hidden"
        style={{
          gridTemplateColumns: 'repeat(11, minmax(0, 1fr))',
          gridTemplateRows: 'repeat(11, minmax(0, 1fr))',
          aspectRatio: '1/1',
          width: '100%',
          maxWidth: 'min(calc(100vh - 160px), calc(100vw - 16px))',
          maxHeight: 'calc(100vh - 160px)',
          ['--board-max' as any]: 'min(calc(100vh - 160px), calc(100vw - 16px))',
          position: 'relative',
          background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.95) 0%, rgba(30, 41, 59, 0.95) 100%)',
          boxShadow: '0 0 60px rgba(34, 211, 238, 0.1), 0 0 120px rgba(168, 85, 247, 0.05), inset 0 1px 0 rgba(255, 255, 255, 0.05)'
        }}
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
            money: p.money
          }))}
          currentPlayerId={turn?.active_player_id}
          isMoving={isMoving}
          onMoveComplete={handleMoveComplete}
        />

        {/* Center Area */}
        <div className="absolute inset-0 z-0" style={{ gridRow: '2 / 11', gridColumn: '2 / 11' }}>
          <div className="absolute inset-0 rounded-2xl overflow-hidden">
            <div className="absolute inset-0"
              style={{
                background: 'linear-gradient(135deg, rgba(34, 211, 238, 0.03) 0%, rgba(168, 85, 247, 0.03) 50%, rgba(34, 211, 238, 0.03) 100%)'
              }}
            />
            <div className="absolute inset-0"
              style={{
                backgroundImage: 'radial-gradient(ellipse at center, rgba(34, 211, 238, 0.08) 0%, transparent 70%)'
              }}
            />
          </div>

          <div className="absolute top-2 md:top-6 left-1/2 transform -translate-x-1/2 text-center">
            <motion.h1
              className="heading-cyber text-xl md:text-5xl"
              variants={animations.glowPulse}
              animate="visible"
            >
              DINO-RICHUP
            </motion.h1>
            <p className="text-text-muted text-[10px] md:text-base font-cyber mt-0.5 md:mt-1 tracking-widest">
              PAN-INDIA EDITION
            </p>

            {/* Compact game stats */}
            {game && (
              <div className="mt-2 flex items-center justify-center gap-3 text-[10px] text-text-muted">
                {(() => {
                  const props = Object.values(game.properties || {});
                  const owned = props.filter((p: any) => p.owner_id).length;
                  const houses = props.reduce((sum: number, p: any) => sum + (p.houses || 0), 0);
                  const hotels = props.reduce((sum: number, p: any) => sum + (p.hotels || 0), 0);
                  const mortgaged = props.filter((p: any) => p.is_mortgaged).length;
                  const bankHouses = game.houses_remaining ?? 32;
                  const bankHotels = game.hotels_remaining ?? 12;
                  return (
                    <>
                      <span>{owned} properties</span>
                      <span className="w-1 h-1 bg-text-muted rounded-full"></span>
                      <span className="text-success-400">{houses}H</span>
                      <span className="text-danger-400">{hotels}Ho</span>
                      <span className="w-1 h-1 bg-text-muted rounded-full"></span>
                      <span className="text-info-400">Bank: {bankHouses}H/{bankHotels}Ho</span>
                      {mortgaged > 0 && (
                        <>
                          <span className="w-1 h-1 bg-text-muted rounded-full"></span>
                          <span className="text-warning-400">{mortgaged}M</span>
                        </>
                      )}
                    </>
                  );
                })()}
              </div>
            )}
          </div>

          {/* Center game log — all events visible for transparency */}
          {game && <CenterGameLog historyLog={game.history_log} />}

          {/* Center cell turn panel (desktop only) */}
          {renderTurnPanel(false)}
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
              ownerId={ownerId}
              houses={propState?.houses || 0}
              hotels={propState?.hotels || 0}
              isMortgaged={propState?.is_mortgaged || false}
              hasMonopolyOnTile={ownerId ? hasMonopoly(game, tile, ownerId) : false}
              tileColor={getTileColor(tile)}
              tileIcon={getTileIcon(tile)}
              playerColor={playerColor}
              playerName={ownerId ? game.room.players[ownerId]?.name : undefined}
              ownerIcon={ownerId ? (ownerIcons[playerColor || ''] || '⚪') : ''}
              isLandingTile={landingTile === tile.id}
              isMyTile={ownerId === myId}
              onTileClick={(id) => {
                soundManager.playButtonClick();
                setSelectedTile(id);
              }}
            />
          );
        })}

      </motion.div>
      </motion.div>

      {/* Mobile-only viewport turn panel */}
      {renderTurnPanel(true)}

      {/* Property Detail Modal (moved to viewport level to avoid transformed ancestor bug) */}
      <PropertyDetailModal
        tileId={selectedTile}
        onClose={() => setSelectedTile(null)}
      />
    </div>
  );
};
