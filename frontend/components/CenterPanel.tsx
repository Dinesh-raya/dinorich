import { motion } from 'framer-motion';
import { animations } from '../animations';
import { DiceAnim } from './DiceAnim';
import { useState, useEffect } from 'react';
import { formatMoneyShort } from '../utils/format';

interface GameStats {
  totalProperties: number;
  mortgagedProperties: number;
  housesBuilt: number;
  hotelsBuilt: number;
  totalRentCollected: number;
  jailCount: number;
}

interface CenterPanelProps {
  game: any;
  myId?: string;
  turn?: any;
  onRollDice?: () => void;
  onEndTurn?: () => void;
  onBuyProperty?: () => void;
  onStartAuction?: () => void;
  isRolling?: boolean;
  diceValues?: { die1: number; die2: number };
}

export const CenterPanel = ({
  game,
  myId,
  turn,
  onRollDice,
  onEndTurn,
  onBuyProperty,
  onStartAuction,
  isRolling = false,
  diceValues = { die1: 1, die2: 1 }
}: CenterPanelProps) => {
  const [stats, setStats] = useState<GameStats>({
    totalProperties: 0,
    mortgagedProperties: 0,
    housesBuilt: 0,
    hotelsBuilt: 0,
    totalRentCollected: 0,
    jailCount: 0
  });

  const [time, setTime] = useState(new Date());
  const [showAdvancedStats, setShowAdvancedStats] = useState(false);

  // Calculate game stats
  useEffect(() => {
    if (!game) return;

    let totalProperties = 0;
    let mortgagedProperties = 0;
    let housesBuilt = 0;
    let hotelsBuilt = 0;
    let jailCount = 0;

    Object.values(game.properties || {}).forEach((prop: any) => {
      totalProperties++;
      if (prop.is_mortgaged) mortgagedProperties++;
      if (prop.houses) housesBuilt += prop.houses;
      if (prop.hotels) hotelsBuilt += prop.hotels;
    });

    // Count players in jail
    Object.values(game.room.players || {}).forEach((player: any) => {
      if (player.is_in_jail) jailCount++;
    });

    setStats({
      totalProperties,
      mortgagedProperties,
      housesBuilt,
      hotelsBuilt,
      totalRentCollected: 0, // This would need to be tracked in game state
      jailCount
    });
  }, [game]);

  // Update time every second
  useEffect(() => {
    const interval = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  const isMyTurn = turn?.active_player_id === myId;
  const activePlayer = turn?.active_player_id ? game?.room?.players?.[turn.active_player_id] : null;
  const myPlayer = myId ? game?.room?.players?.[myId] : null;

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getGamePhaseLabel = () => {
    if (!turn) return 'Waiting...';
    if (turn.phase === 'roll') return 'Roll Phase';
    if (turn.phase === 'buy') return 'Buy Phase';
    if (turn.phase === 'auction') return 'Auction Phase';
    if (turn.phase === 'jail') return 'Jail Phase';
    return 'Action Phase';
  };

  const getTurnTimeRemaining = () => {
    if (!turn?.time_remaining) return null;
    const minutes = Math.floor(turn.time_remaining / 60);
    const seconds = turn.time_remaining % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="absolute inset-0 z-0" style={{ gridRow: '2 / 11', gridColumn: '2 / 11' }}>
      {/* Background effects */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary-900/10 via-accent-900/5 to-primary-900/10 rounded-3xl">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-primary-400/5 via-transparent to-transparent"></div>
        
        {/* Animated grid lines */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0 border border-primary-500/20 rounded-3xl"></div>
          <div className="absolute top-1/2 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary-500/30 to-transparent"></div>
          <div className="absolute left-1/2 top-0 bottom-0 w-px bg-gradient-to-b from-transparent via-primary-500/30 to-transparent"></div>
        </div>
      </div>
      
      {/* Game title */}
      <div className="absolute top-4 left-1/2 transform -translate-x-1/2 text-center">
        <motion.h1 
          className="heading-cyber text-3xl md:text-5xl"
          variants={animations.glowPulse}
          animate="visible"
        >
          DINO-RICHUP
        </motion.h1>
        <p className="text-text-muted text-sm md:text-lg font-cyber mt-1">
          PAN-INDIA EDITION
        </p>
        <div className="mt-2 text-xs text-text-muted flex items-center justify-center gap-2">
          <span>{formatTime(time)}</span>
          <span className="w-1 h-1 bg-text-muted rounded-full"></span>
          <span>{getGamePhaseLabel()}</span>
          {getTurnTimeRemaining() && (
            <>
              <span className="w-1 h-1 bg-text-muted rounded-full"></span>
              <span className="text-accent-400">{getTurnTimeRemaining()} remaining</span>
            </>
          )}
        </div>
      </div>

      {/* Left stats panel */}
      <div className="absolute top-4 left-4 w-48">
        <motion.div 
          className="glass-panel-dark p-4 rounded-xl border border-primary-500/20"
          variants={animations.fadeInLeft}
          initial="hidden"
          animate="visible"
        >
          <h3 className="text-primary-300 font-bold mb-3 flex items-center gap-2">
            <span className="text-accent-400">📊</span>
            Game Stats
          </h3>
          
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-text-muted text-sm">Properties</span>
              <span className="text-text-main font-bold">{stats.totalProperties}</span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-text-muted text-sm">Houses</span>
              <span className="text-success-400 font-bold">{stats.housesBuilt}</span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-text-muted text-sm">Hotels</span>
              <span className="text-danger-400 font-bold">{stats.hotelsBuilt}</span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-text-muted text-sm">In Jail</span>
              <span className="text-warning-400 font-bold">{stats.jailCount}</span>
            </div>
          </div>

          <button
            className="mt-3 w-full text-xs text-text-muted hover:text-primary-300 transition-colors"
            onClick={() => setShowAdvancedStats(!showAdvancedStats)}
          >
            {showAdvancedStats ? 'Hide details' : 'Show details'} ↓
          </button>

          {showAdvancedStats && (
            <motion.div
              className="mt-3 pt-3 border-t border-white/10"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
            >
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-text-muted text-xs">Mortgaged</span>
                  <span className="text-warning-400 text-sm">{stats.mortgagedProperties}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-text-muted text-xs">Active Players</span>
                  <span className="text-success-400 text-sm">{Object.keys(game?.room?.players || {}).length}</span>
                </div>
              </div>
            </motion.div>
          )}
        </motion.div>
      </div>

      {/* Right player info panel */}
      {myPlayer && (
        <div className="absolute top-4 right-4 w-48">
          <motion.div 
            className="glass-panel-dark p-4 rounded-xl border border-accent-500/20"
            variants={animations.fadeInRight}
            initial="hidden"
            animate="visible"
          >
            <h3 className="text-accent-300 font-bold mb-3 flex items-center gap-2">
              <span className="text-primary-400">👤</span>
              My Status
            </h3>
            
            <div className="space-y-3">
              <div>
                <div className="text-text-muted text-xs">Balance</div>
                <div className="text-2xl font-bold text-success-400">
                  {formatMoneyShort(myPlayer.money)}
                </div>
              </div>
              
              <div>
                <div className="text-text-muted text-xs">Position</div>
                <div className="text-text-main font-bold">Tile {myPlayer.position}</div>
              </div>
              
              {myPlayer.is_in_jail && (
                <div className="bg-danger-500/10 border border-danger-500/20 rounded-lg p-2">
                  <div className="flex items-center gap-2">
                    <span className="text-danger-400">🔒</span>
                    <span className="text-sm text-danger-300">In Jail</span>
                  </div>
                </div>
              )}
              
              <div className="pt-2 border-t border-white/10">
                <div className="text-text-muted text-xs">Properties Owned</div>
                <div className="text-text-main font-bold">
                  {Object.values(game.properties || {}).filter((p: any) => p.owner_id === myId).length}
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Bottom center - Turn controls */}
      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 w-4/5 max-w-2xl">
        {isMyTurn ? (
          <motion.div 
            className="glass-panel-primary p-6 rounded-2xl border border-primary-500/30 shadow-xl"
            variants={animations.glowPulse}
            animate="visible"
          >
            <div className="flex flex-col items-center gap-4">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 bg-primary-500 rounded-full animate-pulse"></div>
                <h3 className="text-primary-300 font-bold text-lg">YOUR TURN!</h3>
                {activePlayer && (
                  <div className="text-text-muted text-sm">
                    Playing as <span className="text-accent-300">{activePlayer.name}</span>
                  </div>
                )}
              </div>
              
              {/* Enhanced Dice Display */}
              <div className="my-2">
                <DiceAnim
                  die1={diceValues.die1}
                  die2={diceValues.die2}
                  isRolling={isRolling}
                  size="md"
                  showTotal={!isRolling}
                />
              </div>
              
              {/* Action buttons */}
              <div className="flex flex-wrap gap-3 justify-center">
                {turn?.can_roll && !isRolling && onRollDice && (
                  <motion.button
                    className="btn-primary py-3 px-6 text-lg font-bold rounded-full flex items-center gap-2"
                    onClick={onRollDice}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    disabled={isRolling}
                  >
                    <span className="text-xl">🎲</span>
                    ROLL DICE
                  </motion.button>
                )}
                
                {turn?.can_end_turn && onEndTurn && (
                  <motion.button
                    className="btn-ghost py-2 px-6 text-sm"
                    onClick={onEndTurn}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    END TURN
                  </motion.button>
                )}
                
                {turn?.phase === 'buy' && (
                  <div className="flex gap-3">
                    {onBuyProperty && (
                      <motion.button
                        className="bg-success-500 text-white font-bold py-2 px-6 rounded-lg hover:bg-success-600 transition-colors"
                        onClick={onBuyProperty}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        Buy Property
                      </motion.button>
                    )}
                    
                    {onStartAuction && (
                      <motion.button
                        className="bg-warning-500 text-white font-bold py-2 px-6 rounded-lg hover:bg-warning-600 transition-colors"
                        onClick={onStartAuction}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        Start Auction
                      </motion.button>
                    )}
                  </div>
                )}
              </div>
              
              {/* Turn timer */}
              {getTurnTimeRemaining() && (
                <div className="mt-2 text-center">
                  <div className="text-text-muted text-sm">Time remaining</div>
                  <div className="text-xl font-bold text-accent-400">{getTurnTimeRemaining()}</div>
                </div>
              )}
            </div>
          </motion.div>
        ) : (
          <div className="glass-panel p-6 rounded-xl text-center">
            <div className="flex flex-col items-center gap-3">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-text-muted rounded-full"></div>
                <h3 className="text-text-muted font-bold">WAITING FOR TURN</h3>
              </div>
              
              {activePlayer && (
                <>
                  <div className="text-text-main text-lg">
                    <span className="text-primary-300">{activePlayer.name}</span> is playing
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-6 h-6 rounded-full border-2 border-white"
                      style={{ backgroundColor: activePlayer.color }}
                    ></div>
                    <div className="text-text-muted">
                      Balance: <span className="text-success-400">{formatMoneyShort(activePlayer.money)}</span>
                    </div>
                  </div>
                </>
              )}
              
              {/* Show dice from previous roll */}
              {!isRolling && (diceValues.die1 > 1 || diceValues.die2 > 1) && (
                <div className="mt-2">
                  <div className="text-text-muted text-sm mb-1">Last roll</div>
                  <DiceAnim
                    die1={diceValues.die1}
                    die2={diceValues.die2}
                    isRolling={false}
                    size="sm"
                    showTotal={true}
                  />
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Bottom corners - Quick actions */}
      <div className="absolute bottom-4 left-4">
        <div className="flex gap-2">
          <button className="glass-panel p-2 rounded-lg text-text-muted hover:text-primary-300 transition-colors">
            <span className="text-lg">⚙️</span>
          </button>
          <button className="glass-panel p-2 rounded-lg text-text-muted hover:text-accent-300 transition-colors">
            <span className="text-lg">📖</span>
          </button>
        </div>
      </div>
      
      <div className="absolute bottom-4 right-4">
        <button className="glass-panel p-2 rounded-lg text-text-muted hover:text-success-300 transition-colors">
          <span className="text-lg">💬</span>
        </button>
      </div>
    </div>
  );
};