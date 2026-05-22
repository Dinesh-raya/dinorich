import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '../stores/gameStore';
import { soundManager } from '../utils/audio';
import { socket } from '../services/socket';
import { showToast } from './Toast';
import { animations } from '../animations';
import { formatMoney } from '../utils/format';
import boardData from '../../shared/configs/board_config.json';

interface TradeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const TradeModal = ({ isOpen, onClose }: TradeModalProps) => {
  const { game, myId, outgoingTradeId, cancelTrade } = useGameStore();
  const [selectedPlayer, setSelectedPlayer] = useState<string | null>(null);
  const [offeringMoney, setOfferingMoney] = useState(0);
  const [requestingMoney, setRequestingMoney] = useState(0);
  const [offeringProperties, setOfferingProperties] = useState<number[]>([]);
  const [requestingProperties, setRequestingProperties] = useState<number[]>([]);
  const [offeringJailCards, setOfferingJailCards] = useState(0);
  const [requestingJailCards, setRequestingJailCards] = useState(0);
  const [step, setStep] = useState<'select-player' | 'configure-trade' | 'review'>('select-player');

  const myPlayer = myId ? game?.room.players[myId] : null;
  const otherPlayers = game ? Object.values(game.room.players).filter(p => p.id !== myId && !p.is_bankrupt) : [];

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setSelectedPlayer(null);
      setOfferingMoney(0);
      setRequestingMoney(0);
      setOfferingProperties([]);
      setRequestingProperties([]);
      setOfferingJailCards(0);
      setRequestingJailCards(0);
      setStep('select-player');
    }
  }, [isOpen]);

  const selectedPlayerData = selectedPlayer ? game?.room.players[selectedPlayer] : null;

  const handleToggleOfferingProperty = (propId: number) => {
    setOfferingProperties(prev =>
      prev.includes(propId) ? prev.filter(id => id !== propId) : [...prev, propId]
    );
  };

  const handleToggleRequestingProperty = (propId: number) => {
    setRequestingProperties(prev =>
      prev.includes(propId) ? prev.filter(id => id !== propId) : [...prev, propId]
    );
  };

  const handleSubmitTrade = () => {
    if (!selectedPlayer || !myId) return;

    soundManager.playButtonClick();

    socket.emit('trade:create', {
      to_player_id: selectedPlayer,
      offering_money: offeringMoney,
      requesting_money: requestingMoney,
      offering_properties: offeringProperties,
      requesting_properties: requestingProperties,
      offering_get_out_of_jail_cards: offeringJailCards,
      requesting_get_out_of_jail_cards: requestingJailCards
    }, (response: any) => {
      if (response.status === 'success') {
        onClose();
      } else {
        showToast(response.message || 'Failed to create trade', 'error');
      }
    });
  };

  const getPropertyColor = (color: string) => {
    const colors: Record<string, string> = {
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
    };
    return colors[color] || '#475569';
  };

  if (!game || !myPlayer) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={onClose}
            variants={animations.modalBackdrop}
            initial="hidden"
            animate="visible"
            exit="hidden"
          />

          {/* Modal */}
          <motion.div
            className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border-2 border-accent-500/30"
            style={{
              background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.98) 0%, rgba(30, 20, 60, 0.98) 100%)',
              boxShadow: '0 0 60px rgba(168, 85, 247, 0.15), 0 0 120px rgba(168, 85, 247, 0.05)'
            }}
            variants={animations.modalContent}
            initial="hidden"
            animate="visible"
            exit="hidden"
          >
            {/* Header */}
            <div className="flex justify-between items-center p-4 sm:p-6 border-b border-accent-500/20">
              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-accent-300 font-cyber">TRADE</h2>
                <p className="text-text-muted text-xs sm:text-sm">Exchange properties and money with other players</p>
              </div>
              <motion.button
                onClick={onClose}
                className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-surface/50 border border-white/10 text-text-muted hover:text-danger-400 hover:border-danger-500/30 transition-all flex items-center justify-center text-sm"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
              >
                ✕
              </motion.button>
            </div>

            {/* Content */}
            <div className="p-4 sm:p-6">
              {/* Step 1: Select Player */}
              {step === 'select-player' && (
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-text-main mb-4">Select Player to Trade With</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {otherPlayers.map(player => (
                      <motion.button
                        key={player.id}
                        onClick={() => {
                          setSelectedPlayer(player.id);
                          setStep('configure-trade');
                        }}
                        className="p-3 sm:p-4 rounded-xl border border-white/10 bg-surface/30 hover:border-accent-500/30 hover:bg-accent-500/5 transition-all text-left"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className="w-8 h-8 sm:w-10 sm:h-10 rounded-full border-2"
                            style={{
                              backgroundColor: player.color,
                              borderColor: player.color,
                              boxShadow: `0 0 12px ${player.color}40`
                            }}
                          />
                          <div>
                            <p className="font-bold text-text-main text-sm sm:text-base">{player.name}</p>
                            <p className="text-xs text-text-muted">{formatMoney(player.money)}</p>
                          </div>
                        </div>
                      </motion.button>
                    ))}
                  </div>
                </div>
              )}

              {/* Step 2: Configure Trade */}
              {step === 'configure-trade' && selectedPlayerData && (
                <div className="space-y-6">
                  {/* Trade Partner */}
                  <div className="flex items-center justify-between p-3 sm:p-4 rounded-xl bg-surface/30 border border-white/10">
                    <div className="flex items-center gap-3">
                      <div className="text-center">
                        <div
                          className="w-8 h-8 sm:w-10 sm:h-10 rounded-full border-2 mx-auto mb-1"
                          style={{
                            backgroundColor: myPlayer.color,
                            borderColor: myPlayer.color
                          }}
                        />
                        <p className="text-[10px] sm:text-xs text-text-muted">You</p>
                      </div>
                      <span className="text-xl sm:text-2xl text-accent-400">⇄</span>
                      <div className="text-center">
                        <div
                          className="w-8 h-8 sm:w-10 sm:h-10 rounded-full border-2 mx-auto mb-1"
                          style={{
                            backgroundColor: selectedPlayerData.color,
                            borderColor: selectedPlayerData.color
                          }}
                        />
                        <p className="text-[10px] sm:text-xs text-text-muted">{selectedPlayerData.name}</p>
                      </div>
                    </div>
                    <motion.button
                      onClick={() => setStep('select-player')}
                      className="text-xs text-text-muted hover:text-accent-400"
                      whileHover={{ scale: 1.05 }}
                    >
                      Change
                    </motion.button>
                  </div>

                  {/* You Offer and You Request side-by-side on desktop, stacked on mobile */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* You Offer */}
                    <div className="space-y-3">
                      <h4 className="text-sm font-bold text-success-400 pb-1 border-b border-white/5 font-cyber">You Offer</h4>
                      
                      {/* Money */}
                      <div className="flex items-center justify-between p-3 rounded-lg bg-surface/30 border border-white/10">
                        <span className="text-xs sm:text-sm text-text-main">Money</span>
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => setOfferingMoney(Math.max(0, offeringMoney - 1000))}
                            className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-surface/50 border border-white/10 text-text-muted hover:text-text-main flex items-center justify-center font-bold"
                          >
                            -
                          </button>
                          <span className="w-16 sm:w-20 text-center font-bold text-success-400 text-xs sm:text-sm">
                            {formatMoney(offeringMoney)}
                          </span>
                          <button
                            onClick={() => setOfferingMoney(Math.min(myPlayer.money, offeringMoney + 1000))}
                            className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-surface/50 border border-white/10 text-text-muted hover:text-text-main flex items-center justify-center font-bold"
                          >
                            +
                          </button>
                        </div>
                      </div>

                      {/* Properties */}
                      <div>
                        <p className="text-[10px] text-text-muted mb-1.5 font-cyber">Properties</p>
                        {myPlayer.properties_owned.length === 0 ? (
                          <div className="p-3 text-center rounded-lg bg-surface/10 border border-white/5 text-[11px] text-text-muted italic">
                            No properties owned
                          </div>
                        ) : (
                          <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto pr-1">
                            {myPlayer.properties_owned.map(propId => {
                              const prop = game.properties[propId];
                              if (!prop) return null;
                              const boardTile = boardData.tiles.find((t: any) => t.id === propId);
                              return (
                                <button
                                  key={propId}
                                  onClick={() => handleToggleOfferingProperty(propId)}
                                  className={`p-2 rounded-lg border text-left text-[11px] transition-all ${
                                    offeringProperties.includes(propId)
                                      ? 'border-success-500 bg-success-500/10'
                                      : 'border-white/10 bg-surface/30 hover:border-white/20'
                                  }`}
                                >
                                  <div className="flex items-center gap-1.5 min-w-0">
                                    <div
                                      className="w-2.5 h-2.5 rounded-sm shrink-0"
                                      style={{ backgroundColor: getPropertyColor(boardTile?.color || '') }}
                                    />
                                    <span className="text-text-main truncate">{boardTile?.name || `Property ${propId}`}</span>
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      {/* Get Out of Jail Cards */}
                      {myPlayer.get_out_of_jail_cards > 0 && (
                        <div className="flex items-center justify-between p-3 rounded-lg bg-surface/30 border border-white/10">
                          <span className="text-xs sm:text-sm text-text-main">Jail Cards</span>
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => setOfferingJailCards(Math.max(0, offeringJailCards - 1))}
                              className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-surface/50 border border-white/10 text-text-muted hover:text-text-main flex items-center justify-center font-bold"
                            >
                              -
                            </button>
                            <span className="w-8 text-center font-bold text-success-400 text-xs sm:text-sm">
                              {offeringJailCards}
                            </span>
                            <button
                              onClick={() => setOfferingJailCards(Math.min(myPlayer.get_out_of_jail_cards, offeringJailCards + 1))}
                              className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-surface/50 border border-white/10 text-text-muted hover:text-text-main flex items-center justify-center font-bold"
                            >
                              +
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* You Request */}
                    <div className="space-y-3">
                      <h4 className="text-sm font-bold text-accent-400 pb-1 border-b border-white/5 font-cyber">You Request</h4>
                      
                      {/* Money */}
                      <div className="flex items-center justify-between p-3 rounded-lg bg-surface/30 border border-white/10">
                        <span className="text-xs sm:text-sm text-text-main">Money</span>
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => setRequestingMoney(Math.max(0, requestingMoney - 1000))}
                            className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-surface/50 border border-white/10 text-text-muted hover:text-text-main flex items-center justify-center font-bold"
                          >
                            -
                          </button>
                          <span className="w-16 sm:w-20 text-center font-bold text-accent-400 text-xs sm:text-sm">
                            {formatMoney(requestingMoney)}
                          </span>
                          <button
                            onClick={() => setRequestingMoney(Math.min(selectedPlayerData.money, requestingMoney + 1000))}
                            className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-surface/50 border border-white/10 text-text-muted hover:text-text-main flex items-center justify-center font-bold"
                          >
                            +
                          </button>
                        </div>
                      </div>

                      {/* Properties */}
                      <div>
                        <p className="text-[10px] text-text-muted mb-1.5 font-cyber">Properties</p>
                        {selectedPlayerData.properties_owned.length === 0 ? (
                          <div className="p-3 text-center rounded-lg bg-surface/10 border border-white/5 text-[11px] text-text-muted italic">
                            No properties owned
                          </div>
                        ) : (
                          <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto pr-1">
                            {selectedPlayerData.properties_owned.map(propId => {
                              const prop = game.properties[propId];
                              if (!prop) return null;
                              const boardTile = boardData.tiles.find((t: any) => t.id === propId);
                              return (
                                <button
                                  key={propId}
                                  onClick={() => handleToggleRequestingProperty(propId)}
                                  className={`p-2 rounded-lg border text-left text-[11px] transition-all ${
                                    requestingProperties.includes(propId)
                                      ? 'border-accent-500 bg-accent-500/10'
                                      : 'border-white/10 bg-surface/30 hover:border-white/20'
                                  }`}
                                >
                                  <div className="flex items-center gap-1.5 min-w-0">
                                    <div
                                      className="w-2.5 h-2.5 rounded-sm shrink-0"
                                      style={{ backgroundColor: getPropertyColor(boardTile?.color || '') }}
                                    />
                                    <span className="text-text-main truncate">{boardTile?.name || `Property ${propId}`}</span>
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      {/* Get Out of Jail Cards */}
                      {selectedPlayerData.get_out_of_jail_cards > 0 && (
                        <div className="flex items-center justify-between p-3 rounded-lg bg-surface/30 border border-white/10">
                          <span className="text-xs sm:text-sm text-text-main">Jail Cards</span>
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => setRequestingJailCards(Math.max(0, requestingJailCards - 1))}
                              className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-surface/50 border border-white/10 text-text-muted hover:text-text-main flex items-center justify-center font-bold"
                            >
                              -
                            </button>
                            <span className="w-8 text-center font-bold text-accent-400 text-xs sm:text-sm">
                              {requestingJailCards}
                            </span>
                            <button
                              onClick={() => setRequestingJailCards(Math.min(selectedPlayerData.get_out_of_jail_cards, requestingJailCards + 1))}
                              className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-surface/50 border border-white/10 text-text-muted hover:text-text-main flex items-center justify-center font-bold"
                            >
                              +
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="space-y-3 pt-4 border-t border-white/10">
                    <motion.button
                      onClick={handleSubmitTrade}
                      className="w-full py-3 rounded-xl font-cyber font-bold text-base sm:text-lg text-white"
                      style={{
                        background: 'linear-gradient(135deg, #a855f7 0%, #7c3aed 100%)',
                        boxShadow: '0 4px 20px rgba(168, 85, 247, 0.3)'
                      }}
                      whileHover={{ scale: 1.02, boxShadow: '0 6px 30px rgba(168, 85, 247, 0.4)' }}
                      whileTap={{ scale: 0.98 }}
                    >
                      Send Trade Offer
                    </motion.button>

                    {/* Cancel outgoing trade */}
                    {outgoingTradeId && (
                      <motion.button
                        onClick={() => cancelTrade(outgoingTradeId)}
                        className="w-full py-2 rounded-lg text-xs sm:text-sm text-danger-400 border border-danger-500/30 hover:bg-danger-500/10 transition-all font-semibold font-cyber"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        Cancel Pending Trade
                      </motion.button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// Incoming Trade Notification
interface TradeNotificationProps {
  trade: {
    trade_id: string;
    from_player_id: string;
    offering_money: number;
    requesting_money: number;
    offering_properties: number[];
    requesting_properties: number[];
  };
  onAccept: () => void;
  onReject: () => void;
}

export const TradeNotification = ({ trade, onAccept, onReject }: TradeNotificationProps) => {
  const { game } = useGameStore();
  const fromPlayer = game?.room.players[trade.from_player_id];

  if (!fromPlayer || !game) return null;

  return (
    <motion.div
      className="fixed bottom-24 right-4 z-40 w-80"
      initial={{ x: 320, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 320, opacity: 0 }}
      transition={{ type: "spring", damping: 25 }}
    >
      <div className="glass-panel-dark rounded-xl border border-accent-500/30 p-4"
        style={{
          background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.95) 0%, rgba(30, 20, 60, 0.95) 100%)',
          boxShadow: '0 8px 32px rgba(168, 85, 247, 0.2)'
        }}
      >
        <div className="flex items-center gap-3 mb-3">
          <div
            className="w-8 h-8 rounded-full border-2"
            style={{
              backgroundColor: fromPlayer.color,
              borderColor: fromPlayer.color
            }}
          />
          <div>
            <p className="font-bold text-text-main text-sm">{fromPlayer.name}</p>
            <p className="text-xs text-accent-400">Wants to trade</p>
          </div>
        </div>

        <div className="text-xs text-text-muted mb-3 space-y-1">
          {trade.offering_money > 0 && (
            <p>Offers: <span className="text-success-400">{formatMoney(trade.offering_money)}</span></p>
          )}
          {trade.offering_properties.length > 0 && (
            <p>Properties: <span className="text-text-main">{trade.offering_properties.length} properties</span></p>
          )}
          {trade.requesting_money > 0 && (
            <p>Wants: <span className="text-accent-400">{formatMoney(trade.requesting_money)}</span></p>
          )}
          {trade.requesting_properties.length > 0 && (
            <p>Your properties: <span className="text-text-main">{trade.requesting_properties.length} properties</span></p>
          )}
        </div>

        <div className="flex gap-2">
          <motion.button
            onClick={onAccept}
            className="flex-1 py-2 rounded-lg bg-success-500/20 text-success-400 font-bold text-sm border border-success-500/30"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            Accept
          </motion.button>
          <motion.button
            onClick={onReject}
            className="flex-1 py-2 rounded-lg bg-danger-500/20 text-danger-400 font-bold text-sm border border-danger-500/30"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            Reject
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
};
