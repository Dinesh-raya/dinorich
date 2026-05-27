import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import { formatMoneyShort } from '../utils/format';

interface Player {
  id: string;
  name: string;
  color: string;
  position: number;
  money: number;
  is_in_jail?: boolean;
}

interface TokenVisualizerProps {
  players: Player[];
  currentPlayerId?: string;
  isMoving?: boolean;
  onMoveComplete?: () => void;
  cellSize?: number;
}

// Get grid position matching Board.tsx logic
const getGridPosition = (index: number) => {
  if (index >= 0 && index <= 10) return { gridRow: 11, gridColumn: 11 - index };
  if (index > 10 && index <= 20) return { gridRow: 11 - (index - 10), gridColumn: 1 };
  if (index > 20 && index <= 30) return { gridRow: 1, gridColumn: 1 + (index - 20) };
  if (index > 30 && index < 40) return { gridRow: 1 + (index - 30), gridColumn: 11 };
  return { gridRow: 6, gridColumn: 6 };
};

export const TokenVisualizer = ({
  players,
  currentPlayerId,
  isMoving = false,
  onMoveComplete,
  cellSize = 44
}: TokenVisualizerProps) => {
  const tokenScale = cellSize < 35 ? 0.6 : 0.7;
  const [highlightedPlayer, setHighlightedPlayer] = useState<string | null>(null);

  // Handle movement animation
  useEffect(() => {
    if (isMoving && currentPlayerId) {
      const timer = setTimeout(() => {
        if (onMoveComplete) onMoveComplete();
      }, 1500);

      return () => clearTimeout(timer);
    }
  }, [isMoving, currentPlayerId, onMoveComplete]);

  // Get player offset for multiple players on same tile
  const getPlayerOffset = (playerIndex: number, totalOnTile: number) => {
    if (totalOnTile <= 1) return { x: 0, y: 0 };

    const radius = cellSize * 0.15;
    const angle = (playerIndex / totalOnTile) * Math.PI * 2;

    return {
      x: Math.cos(angle) * radius,
      y: Math.sin(angle) * radius
    };
  };

  // Group players by position
  const playersByPosition = players.reduce((acc, player) => {
    if (!acc[player.position]) {
      acc[player.position] = [];
    }
    acc[player.position].push(player);
    return acc;
  }, {} as Record<number, Player[]>);

  return (
    <>
      {/* Player tokens */}
      {Object.entries(playersByPosition).map(([position, playersOnTile]) => {
        const gridPos = getGridPosition(parseInt(position));

        return (
          <div
            key={position}
            className="absolute z-40 flex items-center justify-center"
            style={{
              ...gridPos,
              pointerEvents: 'none'
            }}
          >
            {playersOnTile.map((player, index) => {
              const offset = getPlayerOffset(index, playersOnTile.length);
              const isCurrent = player.id === currentPlayerId;
              const isHighlighted = player.id === highlightedPlayer;

              return (
                <motion.div
                  key={player.id}
                  className="absolute rounded-full border-2 border-white shadow-xl group cursor-pointer"
                  style={{
                    left: `calc(50% + ${offset.x}px)`,
                    top: `calc(50% + ${offset.y}px)`,
                    width: `${cellSize * tokenScale}px`,
                    height: `${cellSize * tokenScale}px`,
                    backgroundColor: player.color,
                    transform: 'translate(-50%, -50%)',
                    zIndex: isCurrent ? 50 : 40,
                    pointerEvents: 'auto'
                  }}
                  layoutId={`player-${player.id}`}
                  initial={false}
                  whileHover={{ scale: 1.3, zIndex: 60 }}
                  whileTap={{ scale: 0.9 }}
                  onHoverStart={() => setHighlightedPlayer(player.id)}
                  onHoverEnd={() => setHighlightedPlayer(null)}
                >
                  {/* Player indicator dot */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-3 h-3 bg-white/90 rounded-full"></div>
                  </div>

                  {/* Glow effect for current/highlighted player */}
                  {(isCurrent || isHighlighted) && (
                    <motion.div
                      className="absolute inset-0 rounded-full border-2 border-white/50"
                      animate={{
                        scale: [1, 1.2, 1],
                        opacity: [0.7, 1, 0.7]
                      }}
                      transition={{
                        duration: 1.5,
                        repeat: Infinity,
                        ease: "easeInOut"
                      }}
                    />
                  )}

                  {/* Player info tooltip */}
                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
                    <motion.div
                      className="panel-dark px-3 py-2 rounded-lg whitespace-nowrap text-sm"
                      initial={{ y: 10, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ duration: 0.2 }}
                    >
                      <div className="font-bold text-text-main">{player.name}</div>
                      <div className="text-text-muted text-xs">{formatMoneyShort(player.money)}</div>
                      <div className="text-text-muted text-xs">Tile {player.position}</div>
                    </motion.div>
                    <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-surface/90"></div>
                  </div>

                  {/* Jail animation — use is_in_jail field from player data */}
                  {player.is_in_jail && (
                    <motion.div
                      className="absolute -top-1 -right-1 w-3 h-3 bg-danger-500 rounded-full border border-white"
                      animate={{
                        scale: [1, 1.5, 1],
                        opacity: [0.7, 1, 0.7]
                      }}
                      transition={{
                        duration: 1,
                        repeat: Infinity,
                        ease: "easeInOut"
                      }}
                    />
                  )}

                  {/* Go animation */}
                  {player.position === 0 && (
                    <motion.div
                      className="absolute -top-1 -right-1 w-3 h-3 bg-success-500 rounded-full border border-white"
                      animate={{
                        rotate: [0, 360],
                        scale: [1, 1.2, 1]
                      }}
                      transition={{
                        duration: 2,
                        repeat: Infinity,
                        ease: "linear"
                      }}
                    />
                  )}
                </motion.div>
              );
            })}
          </div>
        );
      })}

      {/* Movement trail effect for current player */}
      {currentPlayerId && isMoving && (
        <motion.div
          className="absolute z-30 pointer-events-none"
          style={{
            ...getGridPosition(players.find(p => p.id === currentPlayerId)?.position ?? 0),
            justifySelf: 'center',
            alignSelf: 'center'
          }}
        >
          <motion.div
            className="w-4 h-4 bg-primary-400 rounded-full"
            style={{ boxShadow: '0 0 20px 10px rgba(0, 200, 255, 0.3)' }}
            animate={{
              scale: [1, 2, 1],
              opacity: [0.8, 0, 0.8]
            }}
            transition={{
              duration: 0.8,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />
        </motion.div>
      )}
    </>
  );
};
