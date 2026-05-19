import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '../stores/gameStore';
import { animations } from '../animations';
import { THEME } from '../constants/theme';
import { soundManager } from '../utils/audio';
import { formatMoney } from '../utils/format';
import boardData from '../../shared/configs/board_config.json';

export const AuctionModal = () => {
  const { auction, myId, placeBid, endAuction, game } = useGameStore();
  const [bidAmount, setBidAmount] = useState(0);
  const [initialTime] = useState(9); // 9 seconds default

  useEffect(() => {
    if (auction) {
      setBidAmount(auction.current_bid + 10);
    }
  }, [auction?.current_bid]);

  if (!auction || !auction.active) return null;

  const timeLeft = auction.time_remaining ?? 0;
  const amIParticipating = !!myId && auction.participants.includes(myId);
  const currentHighestBidder = auction.highest_bidder_id ?
    game?.room.players[auction.highest_bidder_id]?.name : 'No bids yet';
  const myMoney = myId ? (game?.room.players[myId]?.money || 0) : 0;
  const canAffordBid = bidAmount <= myMoney;

  // Get property name from board config
  const tileConfig = boardData.tiles.find((t: any) => t.id === auction.property_id);
  const propertyName = tileConfig?.name || `Property #${auction.property_id}`;

  const quickBidOptions = [100, 500, 1000, 5000];
  const bidIncrementOptions = [10, 50, 100, 500];

  const handleQuickBid = (amount: number) => {
    const newBid = auction.current_bid + amount;
    if (newBid <= myMoney) {
      soundManager.playAuctionBid();
      placeBid && placeBid(newBid);
    }
  };

  const handleBid = () => {
    if (bidAmount > auction.current_bid && bidAmount <= myMoney) {
      soundManager.playAuctionBid();
      placeBid && placeBid(bidAmount);
    }
  };

  const handleBidIncrement = (increment: number) => {
    setBidAmount(auction.current_bid + increment);
  };

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-xl"
        variants={animations.modalBackdrop}
      >
        <motion.div 
          initial={{ scale: 0.8, y: 50, opacity: 0 }}
          animate={{ scale: 1, y: 0, opacity: 1 }}
          exit={{ scale: 0.8, y: 50, opacity: 0 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="glass-panel-dark p-8 rounded-3xl w-full max-w-2xl border-2 border-primary-500/30 shadow-2xl neon-glow-strong"
          variants={animations.modalContent}
        >
          {/* Header */}
          <div className="text-center mb-8">
            <motion.h2 
              className="heading-cyber text-4xl font-bold text-primary-300 mb-2"
              variants={animations.glowPulse}
              animate="visible"
            >
              <span className="text-gradient-primary">AUCTION</span>
            </motion.h2>
            <p className="text-text-muted text-lg font-cyber">
              Bidding for {propertyName}
            </p>
          </div>

          {/* Auction Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <motion.div
              key={auction.current_bid}
              className="glass-panel p-6 rounded-2xl border border-primary-500/20"
              initial={{ scale: 1.05, borderColor: 'rgba(34, 211, 238, 0.5)' }}
              animate={{ scale: 1, borderColor: 'rgba(34, 211, 238, 0.2)' }}
              transition={{ duration: 0.4 }}
            >
              <p className="text-sm text-text-muted mb-2">Current Highest Bid</p>
              <div className="flex items-center gap-3">
                <motion.div
                  className="w-3 h-3 bg-primary-500 rounded-full"
                  animate={{ scale: [1, 1.3, 1], opacity: [0.7, 1, 0.7] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                />
                <p className="text-3xl font-bold text-green-400">{formatMoney(auction.current_bid)}</p>
              </div>
              <p className="text-xs text-accent-300 mt-2 font-bold">Bidder: {currentHighestBidder}</p>
            </motion.div>

            <motion.div
              className={`glass-panel p-6 rounded-2xl border ${timeLeft <= 5 ? 'border-red-500/50' : timeLeft <= 10 ? 'border-warning-500/40' : 'border-accent-500/20'}`}
              whileHover={{ scale: 1.02 }}
              variants={animations.fadeIn}
              animate={timeLeft <= 5 ? { boxShadow: ['0 0 0px rgba(239, 68, 68, 0)', '0 0 20px rgba(239, 68, 68, 0.3)', '0 0 0px rgba(239, 68, 68, 0)'] } : {}}
              transition={timeLeft <= 5 ? { duration: 1, repeat: Infinity } : undefined}
            >
              <p className="text-sm text-text-muted mb-2">Time Remaining</p>
              <div className="flex items-center justify-center">
                <motion.p
                  className={`text-5xl font-bold font-mono ${timeLeft <= 5 ? 'text-red-400' : timeLeft <= 10 ? 'text-warning-400' : 'text-accent-400'}`}
                  animate={timeLeft <= 5 ? { scale: [1, 1.1, 1] } : {}}
                  transition={timeLeft <= 5 ? { duration: 0.5, repeat: Infinity } : undefined}
                >
                  {timeLeft}
                </motion.p>
              </div>
              <div className="mt-3 h-2.5 bg-surface rounded-full overflow-hidden">
                <motion.div
                  className={`h-full rounded-full ${timeLeft <= 5 ? 'bg-gradient-to-r from-red-600 to-red-400' : timeLeft <= 10 ? 'bg-gradient-to-r from-warning-600 to-warning-400' : 'bg-gradient-to-r from-accent-500 to-primary-500'}`}
                  initial={{ width: '100%' }}
                  animate={{ width: `${(timeLeft / initialTime) * 100}%` }}
                  transition={{ duration: 1 }}
                />
              </div>
            </motion.div>

            <motion.div 
              className="glass-panel p-6 rounded-2xl border border-success-500/20"
              whileHover={{ scale: 1.02 }}
              variants={animations.fadeIn}
            >
              <p className="text-sm text-text-muted mb-2">Your Balance</p>
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 bg-success-500 rounded-full"></div>
                <p className="text-3xl font-bold text-success-400">{formatMoney(myMoney)}</p>
              </div>
              <p className="text-xs text-text-muted mt-2">
                {canAffordBid ? '✅ Can afford bid' : '❌ Insufficient funds'}
              </p>
            </motion.div>
          </div>

          {/* Bidding Interface */}
          {amIParticipating ? (
            <motion.div 
              className="space-y-6"
              variants={animations.fadeIn}
            >
              {/* Quick Bid Buttons */}
              <div>
                <p className="text-text-muted text-sm mb-3">Quick Bid (Add to current)</p>
                <div className="flex flex-wrap gap-3">
                  {quickBidOptions.map(amount => (
                    <motion.button
                      key={amount}
                      onClick={() => handleQuickBid(amount)}
                      className="glass-button flex-1 min-w-[120px] py-3 px-4 rounded-xl border border-primary-500/30 hover:border-primary-500 transition-all"
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      disabled={auction.current_bid + amount > myMoney}
                    >
                      <div className="text-center">
                        <div className="text-lg font-bold text-primary-300">+{formatMoney(amount)}</div>
                        <div className="text-xs text-text-muted">Total: {formatMoney(auction.current_bid + amount)}</div>
                      </div>
                    </motion.button>
                  ))}
                </div>
              </div>

              {/* Custom Bid */}
              <div>
                <p className="text-text-muted text-sm mb-3">Custom Bid Amount</p>
                <div className="flex gap-4">
                  <div className="flex-1">
                    <div className="relative">
                      <input 
                        type="number" 
                        value={bidAmount}
                        onChange={(e) => setBidAmount(Number(e.target.value))}
                        className="w-full bg-surface/50 border-2 border-primary-500/30 rounded-xl p-4 text-2xl font-bold text-white text-center focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/50"
                        min={auction.current_bid + 1}
                        max={myMoney}
                      />
                      <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-text-muted">
                        ₹
                      </div>
                    </div>
                    <div className="flex justify-between mt-2">
                      <span className="text-xs text-text-muted">Min: {formatMoney(auction.current_bid + 1)}</span>
                      <span className="text-xs text-text-muted">Your max: {formatMoney(myMoney)}</span>
                    </div>
                  </div>
                  
                  <motion.button
                    onClick={handleBid}
                    className="btn-primary px-8 text-lg font-bold rounded-xl flex items-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
                    whileHover={{ scale: canAffordBid ? 1.05 : 1 }}
                    whileTap={{ scale: canAffordBid ? 0.95 : 1 }}
                    disabled={bidAmount <= auction.current_bid || bidAmount > myMoney}
                  >
                    <span className="text-2xl">⚡</span>
                    PLACE BID
                  </motion.button>
                </div>

                {/* Bid Increment Buttons */}
                <div className="flex gap-2 mt-4">
                  {bidIncrementOptions.map(increment => (
                    <motion.button
                      key={increment}
                      onClick={() => handleBidIncrement(increment)}
                      className="bg-surface/50 border border-primary-500/20 text-primary-300 px-4 py-2 rounded-lg hover:bg-primary-500/20 transition-colors text-sm"
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      +{formatMoney(increment)}
                    </motion.button>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-4 pt-6 border-t border-white/10">
                <motion.button
                  onClick={() => {
                    soundManager.playAuctionEnd();
                    endAuction();
                  }}
                  className="btn-ghost flex-1 py-3 rounded-xl"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  End Auction
                </motion.button>
                
                <motion.button
                  onClick={() => handleQuickBid(100)}
                  className="btn-accent flex-1 py-3 rounded-xl"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  disabled={auction.current_bid + 100 > myMoney}
                >
                  Auto Bid +100
                </motion.button>
              </div>
            </motion.div>
          ) : (
            <motion.div 
              className="text-center py-12"
              variants={animations.fadeIn}
            >
              <div className="text-6xl mb-4">👁️</div>
              <h3 className="text-2xl font-bold text-text-main mb-2">Spectator Mode</h3>
              <p className="text-text-muted text-lg mb-6">
                You are not participating in this auction. Watch the bidding unfold!
              </p>
              <div className="glass-panel p-6 rounded-2xl inline-block">
                <p className="text-sm text-text-muted">Current Participants</p>
                <div className="flex flex-wrap gap-2 mt-3 justify-center">
                  {auction.participants.map((pid: string) => (
                    <div 
                      key={pid}
                      className="px-3 py-1.5 rounded-full bg-surface border border-primary-500/30 text-sm"
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
          <div className="mt-8 pt-6 border-t border-white/10">
            <div className="flex justify-between items-center text-sm text-text-muted">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-primary-500 rounded-full animate-pulse"></div>
                <span>Active Auction • {auction.participants.length} Participants</span>
              </div>
              <div>
                <span className="font-cyber">AUTO-CLOSE: {timeLeft}s</span>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
