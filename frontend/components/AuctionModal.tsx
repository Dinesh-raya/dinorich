import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '../stores/gameStore';
import { animations } from '../animations';
import { THEME } from '../constants/theme';
import { soundManager } from '../utils/audio';
import { formatMoney } from '../utils/format';
import boardData from '../../shared/configs/board_config.json';

const HOUSE_PRICES: Record<string, number> = {
  brown: 500, light_blue: 600, pink: 1000, orange: 1000,
  red: 1500, yellow: 1500, green: 2000, dark_blue: 2000
};

const getHeaderColor = (color?: string) => {
  switch (color) {
    case 'brown': return 'bg-[#78350f] text-white';
    case 'light_blue': return 'bg-[#0ea5e9] text-white';
    case 'pink': return 'bg-[#ec4899] text-white';
    case 'orange': return 'bg-[#f97316] text-white';
    case 'red': return 'bg-[#ef4444] text-white';
    case 'yellow': return 'bg-[#eab308] text-black';
    case 'green': return 'bg-[#22c55e] text-white';
    case 'dark_blue': return 'bg-[#1e3a8a] text-white';
    default: return 'bg-surface text-text-muted';
  }
};

const PropertyCard = ({ tile }: { tile: any }) => {
  if (!tile) return null;
  const isProperty = tile.type === 'property';
  const isAirport = tile.type === 'airport';
  const isUtility = tile.type === 'utility';

  return (
    <div className="glass-panel border border-white/10 rounded-2xl overflow-hidden shadow-lg h-full flex flex-col">
      {/* Property Header */}
      <div className={`p-3 text-center font-bold font-cyber tracking-wide uppercase text-xs ${getHeaderColor(tile.color)}`}>
        {tile.name}
      </div>
      
      {/* Property Details */}
      <div className="p-3 flex-1 flex flex-col justify-between text-[11px] space-y-1.5 bg-surface/10">
        <div className="flex justify-between border-b border-white/5 pb-0.5">
          <span className="text-text-muted">Type:</span>
          <span className="font-bold text-white capitalize">{tile.type}</span>
        </div>
        <div className="flex justify-between border-b border-white/5 pb-0.5">
          <span className="text-text-muted">Base Price:</span>
          <span className="font-bold text-success-400">₹{tile.price}</span>
        </div>
        <div className="flex justify-between border-b border-white/5 pb-0.5">
          <span className="text-text-muted">Mortgage:</span>
          <span className="font-bold text-accent-400">₹{tile.mortgage}</span>
        </div>

        {isProperty && tile.rent && (
          <div className="space-y-0.5 mt-1">
            <div className="flex justify-between border-b border-white/5 pb-0.5">
              <span className="text-text-muted">Base Rent:</span>
              <span className="text-white">₹{tile.rent[0]}</span>
            </div>
            <div className="flex justify-between border-b border-white/5 pb-0.5">
              <span className="text-text-muted">1 House:</span>
              <span className="text-white">₹{tile.rent[1]}</span>
            </div>
            <div className="flex justify-between border-b border-white/5 pb-0.5">
              <span className="text-text-muted">2 Houses:</span>
              <span className="text-white">₹{tile.rent[2]}</span>
            </div>
            <div className="flex justify-between border-b border-white/5 pb-0.5">
              <span className="text-text-muted">3 Houses:</span>
              <span className="text-white">₹{tile.rent[3]}</span>
            </div>
            <div className="flex justify-between border-b border-white/5 pb-0.5">
              <span className="text-text-muted">4 Houses:</span>
              <span className="text-white">₹{tile.rent[4]}</span>
            </div>
            <div className="flex justify-between border-b border-white/5 pb-0.5">
              <span className="text-text-muted">Hotel:</span>
              <span className="text-white">₹{tile.rent[5]}</span>
            </div>
            <div className="flex justify-between pt-0.5 font-bold">
              <span className="text-text-muted">House Cost:</span>
              <span className="text-primary-300">₹{HOUSE_PRICES[tile.color] || 0}</span>
            </div>
          </div>
        )}

        {isAirport && (
          <div className="space-y-0.5 mt-1">
            <div className="flex justify-between border-b border-white/5 pb-0.5">
              <span className="text-text-muted">1 Owned:</span>
              <span className="text-white">₹250</span>
            </div>
            <div className="flex justify-between border-b border-white/5 pb-0.5">
              <span className="text-text-muted">2 Owned:</span>
              <span className="text-white">₹500</span>
            </div>
            <div className="flex justify-between border-b border-white/5 pb-0.5">
              <span className="text-text-muted">3 Owned:</span>
              <span className="text-white">₹1,000</span>
            </div>
            <div className="flex justify-between pb-0.5">
              <span className="text-text-muted">4 Owned:</span>
              <span className="text-white">₹2,000</span>
            </div>
          </div>
        )}

        {isUtility && (
          <div className="space-y-0.5 mt-1">
            <div className="text-text-muted mb-0.5 text-[9px]">Rent = Dice Roll times:</div>
            <div className="flex justify-between border-b border-white/5 pb-0.5">
              <span className="text-text-muted">1 Owned:</span>
              <span className="text-white">40x</span>
            </div>
            <div className="flex justify-between pb-0.5">
              <span className="text-text-muted">2 Owned:</span>
              <span className="text-white">100x</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export const AuctionModal = () => {
  const { auction, myId, placeBid, endAuction, game } = useGameStore();
  const [bidAmount, setBidAmount] = useState(0);
  const [trackedInitialTime, setTrackedInitialTime] = useState<number | null>(null);

  // Track the initial time from the first auction.time_remaining value
  useEffect(() => {
    if (auction?.active && auction.time_remaining != null && trackedInitialTime === null) {
      setTrackedInitialTime(auction.time_remaining);
    }
    if (!auction?.active) {
      setTrackedInitialTime(null);
    }
  }, [auction?.active, auction?.time_remaining, trackedInitialTime]);

  const initialTime = trackedInitialTime ?? 9;

  useEffect(() => {
    if (auction) {
      setBidAmount(auction.current_bid + 1);
    }
  }, [auction?.current_bid]);

  const isActive = !!auction && auction.active;
  const timeLeft = auction?.time_remaining ?? 0;
  const amIParticipating = !!myId && auction?.participants.includes(myId) || false;
  const currentHighestBidder = auction?.highest_bidder_id ?
    game?.room.players[auction.highest_bidder_id]?.name : 'No bids yet';
  const myMoney = myId ? (game?.room.players[myId]?.money || 0) : 0;
  const canAffordBid = (bidAmount <= myMoney) && !!auction;

  // Get property config
  const tileConfig = auction ? boardData.tiles.find((t: any) => t.id === auction.property_id) : null;
  const propertyName = tileConfig?.name || (auction ? `Property #${auction.property_id}` : '');

  const quickBidOptions = [100, 200, 500];

  const handleQuickBid = (amount: number) => {
    if (!auction) return;
    const newBid = auction.current_bid + amount;
    if (newBid <= myMoney) {
      soundManager.playAuctionBid();
      placeBid && placeBid(newBid);
    }
  };

  const handleBid = () => {
    if (auction && bidAmount > auction.current_bid && bidAmount <= myMoney) {
      soundManager.playAuctionBid();
      placeBid && placeBid(bidAmount);
    }
  };

  return (
    <AnimatePresence>
      {isActive && auction && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-xl p-4"
        >
          <motion.div
            initial={{ scale: 0.8, y: 50, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.8, y: 50, opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="glass-panel-dark p-4 sm:p-8 rounded-2xl sm:rounded-3xl w-[96%] sm:w-full max-w-2xl max-h-[90vh] overflow-y-auto border-2 border-primary-500/30 shadow-2xl neon-glow-strong"
          >
            {/* Header */}
            <div className="text-center mb-6">
              <motion.h2 
                className="heading-cyber text-2xl sm:text-4xl font-bold text-primary-300 mb-1"
                variants={animations.glowPulse}
                animate="visible"
              >
                <span className="text-gradient-primary">AUCTION</span>
              </motion.h2>
              <p className="text-text-muted text-sm sm:text-base font-cyber">
                Bidding for {propertyName}
              </p>
            </div>

            {/* Split Info / Stats Panel */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6 sm:mb-8">
              {/* Property Details Column */}
              <div className="md:col-span-2">
                <PropertyCard tile={tileConfig} />
              </div>

              {/* Stats Cards Column */}
              <div className="md:col-span-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <motion.div
                  key={auction.current_bid}
                  className="glass-panel p-4 rounded-xl border border-primary-500/20 flex flex-col justify-center"
                  initial={{ scale: 1.05, borderColor: 'rgba(34, 211, 238, 0.5)' }}
                  animate={{ scale: 1, borderColor: 'rgba(34, 211, 238, 0.2)' }}
                  transition={{ duration: 0.4 }}
                >
                  <p className="text-xs text-text-muted mb-1">Current Highest Bid</p>
                  <div className="flex items-center gap-2">
                    <motion.div
                      className="w-2.5 h-2.5 bg-primary-500 rounded-full"
                      animate={{ scale: [1, 1.3, 1], opacity: [0.7, 1, 0.7] }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                    />
                    <p className="text-xl sm:text-2xl font-bold text-green-400">{formatMoney(auction.current_bid)}</p>
                  </div>
                  <p className="text-[10px] text-accent-300 mt-1 font-bold truncate">Bidder: {currentHighestBidder}</p>
                </motion.div>

                <motion.div
                  className={`glass-panel p-4 rounded-xl border ${timeLeft <= 5 ? 'border-red-500/50' : timeLeft <= 10 ? 'border-warning-500/40' : 'border-accent-500/20'} flex flex-col justify-center`}
                  whileHover={{ scale: 1.02 }}
                  variants={animations.fadeIn}
                  animate={timeLeft <= 5 ? { boxShadow: ['0 0 0px rgba(239, 68, 68, 0)', '0 0 20px rgba(239, 68, 68, 0.3)', '0 0 0px rgba(239, 68, 68, 0)'] } : {}}
                  transition={timeLeft <= 5 ? { duration: 1, repeat: Infinity } : undefined}
                >
                  <p className="text-xs text-text-muted mb-1">Time Remaining</p>
                  <div className="flex items-center justify-between">
                    <motion.p
                      className={`text-2xl sm:text-3xl font-bold font-mono ${timeLeft <= 5 ? 'text-red-400' : timeLeft <= 10 ? 'text-warning-400' : 'text-accent-400'}`}
                      animate={timeLeft <= 5 ? { scale: [1, 1.1, 1] } : {}}
                      transition={timeLeft <= 5 ? { duration: 0.5, repeat: Infinity } : undefined}
                    >
                      {timeLeft}s
                    </motion.p>
                    <div className="w-16 h-2 bg-surface rounded-full overflow-hidden">
                      <motion.div
                        className={`h-full rounded-full ${timeLeft <= 5 ? 'bg-gradient-to-r from-red-600 to-red-400' : timeLeft <= 10 ? 'bg-gradient-to-r from-warning-600 to-warning-400' : 'bg-gradient-to-r from-accent-500 to-primary-500'}`}
                        initial={{ width: '100%' }}
                        animate={{ width: `${(timeLeft / initialTime) * 100}%` }}
                        transition={{ duration: 1 }}
                      />
                    </div>
                  </div>
                </motion.div>

                <motion.div 
                  className="glass-panel p-4 rounded-xl border border-success-500/20 sm:col-span-2 flex flex-col justify-center"
                  whileHover={{ scale: 1.02 }}
                  variants={animations.fadeIn}
                >
                  <p className="text-xs text-text-muted mb-1">Your Balance</p>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 bg-success-500 rounded-full"></div>
                      <p className="text-xl sm:text-2xl font-bold text-success-400">{formatMoney(myMoney)}</p>
                    </div>
                    <span className={`text-[10px] font-bold ${canAffordBid ? 'text-success-400' : 'text-danger-400 animate-pulse'}`}>
                      {canAffordBid ? '✅ Can Afford' : '❌ Insufficient Funds'}
                    </span>
                  </div>
                </motion.div>
              </div>
            </div>

            {/* Bidding Interface */}
            {amIParticipating ? (
              <motion.div 
                className="space-y-6"
                variants={animations.fadeIn}
              >
                {/* Quick Bid Buttons */}
                <div>
                  <p className="text-text-muted text-xs mb-2">Quick Bid (Add to current)</p>
                  <div className="grid grid-cols-3 gap-3">
                    {quickBidOptions.map(amount => (
                      <motion.button
                        key={amount}
                        onClick={() => handleQuickBid(amount)}
                        className="glass-button py-2.5 px-3 rounded-xl border border-primary-500/30 hover:border-primary-500 transition-all flex flex-col items-center justify-center min-h-[44px]"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        disabled={auction.current_bid + amount > myMoney}
                      >
                        <div className="text-sm font-bold text-primary-300">+{formatMoney(amount)}</div>
                        <div className="text-[9px] text-text-muted truncate">Total: {formatMoney(auction.current_bid + amount)}</div>
                      </motion.button>
                    ))}
                  </div>
                </div>

                {/* Custom Bid */}
                <div>
                  <p className="text-text-muted text-xs mb-2">Custom Bid Amount</p>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <div className="flex-1">
                      <div className="relative">
                        <input 
                          type="number" 
                          value={bidAmount}
                          onChange={(e) => setBidAmount(Number(e.target.value))}
                          className="w-full bg-surface/50 border-2 border-primary-500/30 rounded-xl p-3 text-lg font-bold text-white text-center focus:border-primary-500 focus:outline-none"
                          min={auction.current_bid + 1}
                          max={myMoney}
                        />
                        <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-text-muted font-bold">
                          ₹
                        </div>
                      </div>
                      <div className="flex justify-between mt-1 px-1 text-[10px] text-text-muted">
                        <span>Min: {formatMoney(auction.current_bid + 1)}</span>
                        <span>Max: {formatMoney(myMoney)}</span>
                      </div>
                    </div>
                    
                    <motion.button
                      onClick={handleBid}
                      className="btn-primary w-full sm:w-auto px-6 py-3 text-base font-bold rounded-xl flex items-center justify-center gap-2 min-h-[44px]"
                      whileHover={{ scale: canAffordBid ? 1.02 : 1 }}
                      whileTap={{ scale: canAffordBid ? 0.98 : 1 }}
                      disabled={bidAmount <= auction.current_bid || bidAmount > myMoney}
                    >
                      <span>⚡</span>
                      PLACE BID
                    </motion.button>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="pt-4 border-t border-white/10 flex justify-center">
                  <motion.button
                    onClick={() => {
                      soundManager.playAuctionEnd();
                      endAuction();
                    }}
                    className="btn-ghost w-full sm:w-1/2 py-2.5 rounded-xl min-h-[44px]"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    Leave Auction
                  </motion.button>
                </div>
              </motion.div>
            ) : (
              <motion.div 
                className="text-center py-6"
                variants={animations.fadeIn}
              >
                <div className="text-4xl mb-2">👁️</div>
                <h3 className="text-xl font-bold text-text-main mb-1">Spectator Mode</h3>
                <p className="text-text-muted text-xs mb-4">
                  You are not participating. Watch the bidding unfold!
                </p>
                <div className="glass-panel p-4 rounded-xl inline-block max-w-full">
                  <p className="text-xs text-text-muted">Current Participants</p>
                  <div className="flex flex-wrap gap-1.5 mt-2 justify-center">
                    {auction.participants.map((pid: string) => (
                      <div 
                        key={pid}
                        className="px-2.5 py-1 rounded-full bg-surface border border-primary-500/20 text-xs font-bold"
                        style={{ 
                          color: game?.room.players[pid]?.color || THEME.colors.primary[500]
                        }}
                      >
                        {game?.room.players[pid]?.name}
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {/* Footer */}
            <div className="mt-6 pt-4 border-t border-white/10">
              <div className="flex justify-between items-center text-xs text-text-muted">
                <div className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 bg-primary-500 rounded-full animate-pulse"></div>
                  <span>{auction.participants.length} Bidders</span>
                </div>
                <div>
                  <span className="font-cyber">AUTO-CLOSE: {timeLeft}s</span>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
