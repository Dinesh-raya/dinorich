import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import { useGameStore } from '../stores/gameStore';
import { animations } from '../animations';
import { THEME } from '../constants/theme';
import { DiceAnim } from './DiceAnim';
import { TokenVisualizer } from './TokenVisualizer';
import { PropertyDetailModal } from './PropertyDetailModal';
import { soundManager } from '../utils/audio';
import { formatMoneyShort } from '../utils/format';

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

// Country flag for Indian cities
const getCountryFlag = (tile: any) => {
  if (tile.type === 'property') return '🇮🇳';
  return null;
};

export const Board = () => {
  const { game, myId, turn, diceResult } = useGameStore();
  const [isRolling, setIsRolling] = useState(false);
  const [diceValues, setDiceValues] = useState({ die1: 1, die2: 1 });
  const [isMoving, setIsMoving] = useState(false);
  const [selectedTile, setSelectedTile] = useState<number | null>(null);

  // Update dice values when backend sends result
  useEffect(() => {
    if (diceResult) {
      setDiceValues({ die1: diceResult.die1, die2: diceResult.die2 });
      setIsRolling(false);

      // Play movement sound after dice land
      soundManager.playPlayerMove();

      // Start movement animation
      setIsMoving(true);
      setTimeout(() => setIsMoving(false), 1500);
    }
  }, [diceResult]);

  // Handle dice roll
  const handleRollDice = () => {
    if (!turn?.can_roll || isRolling) return;

    setIsRolling(true);
    soundManager.playButtonClick();

    // Simulate dice rolling animation
    const rollInterval = setInterval(() => {
      setDiceValues({
        die1: Math.floor(Math.random() * 6) + 1,
        die2: Math.floor(Math.random() * 6) + 1
      });
    }, 100);

    // Send roll to backend (animation continues until response)
    useGameStore.getState().rollDice();

    // Safety timeout: stop animation after 5s even if no response
    setTimeout(() => {
      clearInterval(rollInterval);
    }, 5000);
  };

  // Handle move complete
  const handleMoveComplete = () => {
    setIsMoving(false);
  };

  if (!game) return null;

  // Use dice values (from backend result or local animation)
  const currentDice = diceValues;

  return (
    <div className="flex-1 flex items-center justify-center p-2 sm:p-4 md:p-8 overflow-hidden">
      <motion.div
        className="relative grid border-2 border-primary-500/30 shadow-2xl rounded-2xl overflow-hidden"
        style={{
          gridTemplateColumns: 'repeat(11, minmax(0, 1fr))',
          gridTemplateRows: 'repeat(11, minmax(0, 1fr))',
          aspectRatio: '1/1',
          width: '100%',
          maxWidth: '900px',
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

          <div className="absolute top-6 left-1/2 transform -translate-x-1/2 text-center">
            <motion.h1
              className="heading-cyber text-4xl md:text-5xl"
              variants={animations.glowPulse}
              animate="visible"
            >
              DINO-RICHUP
            </motion.h1>
            <p className="text-text-muted text-sm md:text-base font-cyber mt-1 tracking-widest">
              PAN-INDIA EDITION
            </p>
          </div>

          {/* Turn indicator with enhanced dice */}
          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 w-4/5 max-w-md">
            {turn?.active_player_id === myId ? (
              <motion.div
                className="glass-panel-primary p-5 rounded-2xl border border-primary-500/30 shadow-xl"
                variants={animations.glowPulse}
                animate="visible"
              >
                <div className="flex flex-col items-center gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-2.5 h-2.5 bg-primary-500 rounded-full animate-pulse"></div>
                    <h3 className="text-primary-300 font-bold text-base">YOUR TURN!</h3>
                  </div>

                  {/* Enhanced Dice Display */}
                  <div className="my-1">
                    <DiceAnim
                      die1={currentDice.die1}
                      die2={currentDice.die2}
                      isRolling={isRolling}
                      onRollComplete={() => setIsRolling(false)}
                      size="md"
                      showTotal={!isRolling}
                    />
                  </div>

                  {turn.can_roll && !isRolling && (
                    <motion.button
                      className="btn-primary py-2.5 px-8 text-base font-bold rounded-full flex items-center gap-2"
                      onClick={handleRollDice}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      disabled={isRolling}
                    >
                      <span className="text-lg">🎲</span>
                      ROLL DICE
                    </motion.button>
                  )}

                  {turn.can_end_turn && (
                    <motion.button
                      className="btn-ghost py-1.5 px-5 text-xs"
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

                  {turn.phase === 'buy' && (
                    <motion.div
                      className="mt-1 text-center"
                      variants={animations.fadeIn}
                    >
                      <p className="text-text-muted text-xs mb-2">Buy this property?</p>
                      <div className="flex gap-2">
                        <motion.button
                          className="bg-success-500 text-white font-bold py-1.5 px-5 rounded-lg hover:bg-success-600 transition-colors text-sm"
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
                        <motion.button
                          className="bg-warning-500 text-white font-bold py-1.5 px-5 rounded-lg hover:bg-warning-600 transition-colors text-sm"
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
                      </div>
                    </motion.div>
                  )}
                </div>
              </motion.div>
            ) : (
              <div className="glass-panel p-3 rounded-xl text-text-muted text-center text-sm">
                Waiting for {game.room.players[turn?.active_player_id || '']?.name}'s move...
              </div>
            )}
          </div>
        </div>

        {/* Tiles */}
        {boardData.tiles.map((tile: any) => {
          const pos = getGridPosition(tile.id);
          const isCorner = [0, 10, 20, 30].includes(tile.id);
          const isSide = !isCorner && tile.type !== 'tax' && tile.type !== 'treasury' && tile.type !== 'surprise';
          const propState = getPropertyState(game, tile.id);
          const ownerId = propState?.owner_id;
          const houses = propState?.houses || 0;
          const hotels = propState?.hotels || 0;
          const isMortgaged = propState?.is_mortgaged || false;
          const hasMonopolyOnTile = ownerId ? hasMonopoly(game, tile, ownerId) : false;
          const tileColor = getTileColor(tile);
          const tileIcon = getTileIcon(tile);

          return (
            <motion.div
              key={tile.id}
              className={`flex flex-col relative overflow-hidden cursor-pointer ${
                isCorner
                  ? 'p-1.5 justify-center items-center'
                  : isSide
                  ? ''
                  : ''
              }`}
              style={{
                ...pos,
                border: isCorner
                  ? '2px solid rgba(34, 211, 238, 0.4)'
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
              onClick={() => {
                soundManager.playButtonClick();
                setSelectedTile(tile.id);
              }}
            >
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
                {/* Corner tile icon */}
                {isCorner && tileIcon && (
                  <span className="text-lg md:text-2xl mb-0.5">{tileIcon}</span>
                )}

                {/* Country flag for properties */}
                {!isCorner && getCountryFlag(tile) && (
                  <span className="text-[10px] md:text-xs mb-0.5">{getCountryFlag(tile)}</span>
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
                    className="absolute top-0.5 right-0.5 w-3 h-3 md:w-4 md:h-4 rounded-full border-2 border-white/60 shadow-lg z-20"
                    style={{
                      backgroundColor: game.room.players[ownerId]?.color || THEME.colors.primary[500],
                      boxShadow: `0 0 8px ${game.room.players[ownerId]?.color || THEME.colors.primary[500]}60`
                    }}
                    title={`Owned by ${game.room.players[ownerId]?.name}`}
                    variants={animations.scaleIn}
                    whileHover={{ scale: 1.3 }}
                  ></motion.div>
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
        })}

        {/* Property Detail Modal */}
        <PropertyDetailModal
          tileId={selectedTile}
          onClose={() => setSelectedTile(null)}
        />
      </motion.div>
    </div>
  );
};
