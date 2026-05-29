import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '../stores/gameStore';
import { soundManager } from '../utils/audio';
import { socket } from '../services/socket';
import { showToast } from './Toast';
import { formatMoney } from '../utils/format';
import boardData from '../../shared/configs/board_config.json';
import type { TradeOffer } from '../stores/slices/types';

interface TradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  counterOffer?: TradeOffer | null;
  onClearCounterOffer?: () => void;
}

const getPropertySubInfo = (tile: any) => {
  if (!tile) return '';
  if (tile.type === 'property' && tile.rent) {
    return `Rent: ₹${tile.rent[0]}`;
  }
  if (tile.type === 'airport') {
    return 'Airport';
  }
  if (tile.type === 'utility') {
    return 'Utility';
  }
  return '';
};

export const TradeModal = ({ isOpen, onClose, counterOffer, onClearCounterOffer }: TradeModalProps) => {
  const { game, myId, outgoingTradeId, cancelTrade } = useGameStore();
  const [selectedPlayer, setSelectedPlayer] = useState<string | null>(null);
  const [offeringMoney, setOfferingMoney] = useState(0);
  const [requestingMoney, setRequestingMoney] = useState(0);
  const [offeringProperties, setOfferingProperties] = useState<number[]>([]);
  const [requestingProperties, setRequestingProperties] = useState<number[]>([]);
  const [offeringJailCards, setOfferingJailCards] = useState(0);
  const [requestingJailCards, setRequestingJailCards] = useState(0);
  const [step, setStep] = useState<'select-player' | 'configure-trade'>('select-player');

  const myPlayer = myId ? game?.room.players[myId] : null;
  const otherPlayers = game ? Object.values(game.room.players).filter(p => p.id !== myId && !p.is_bankrupt) : [];

  // Close on Escape key
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') onClose();
  }, [onClose]);

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, handleKeyDown]);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      if (counterOffer) {
        // Validate that the current user still owns the properties being offered in the counter
        const ownedPropIds = new Set(myPlayer?.properties_owned || []);
        const validOfferingProps = (counterOffer.requesting_properties || []).filter(
          (propId) => ownedPropIds.has(propId)
        );

        setSelectedPlayer(counterOffer.from_player_id);
        setOfferingMoney(counterOffer.requesting_money);
        setRequestingMoney(counterOffer.offering_money);
        setOfferingProperties(validOfferingProps);
        setRequestingProperties(counterOffer.offering_properties || []);
        setOfferingJailCards(counterOffer.requesting_get_out_of_jail_cards || 0);
        setRequestingJailCards(counterOffer.offering_get_out_of_jail_cards || 0);
        setStep('configure-trade');
      } else {
        setSelectedPlayer(null);
        setOfferingMoney(0);
        setRequestingMoney(0);
        setOfferingProperties([]);
        setRequestingProperties([]);
        setOfferingJailCards(0);
        setRequestingJailCards(0);
        setStep('select-player');
      }
    }
  }, [isOpen, counterOffer]);

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

    if (counterOffer) {
      socket.emit('trade:counter', {
        trade_id: counterOffer.trade_id,
        offering_money: offeringMoney,
        requesting_money: requestingMoney,
        offering_properties: offeringProperties,
        requesting_properties: requestingProperties,
        offering_get_out_of_jail_cards: offeringJailCards,
        requesting_get_out_of_jail_cards: requestingJailCards
      }, (response: any) => {
        if (response.status === 'success') {
          if (onClearCounterOffer) onClearCounterOffer();
          onClose();
        } else {
          showToast(response.message || 'Failed to counter trade', 'error');
        }
      });
    } else {
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
    }
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

  // Compute total property values for summary
  const offeringPropertiesValue = offeringProperties.reduce((sum, propId) => {
    const tile = boardData.tiles.find((t: any) => t.id === propId);
    return sum + (tile?.price || 0);
  }, 0);

  const requestingPropertiesValue = requestingProperties.reduce((sum, propId) => {
    const tile = boardData.tiles.find((t: any) => t.id === propId);
    return sum + (tile?.price || 0);
  }, 0);

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
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />

          {/* Modal */}
          <motion.div
            className="relative w-[95vw] max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl border-2 border-gold-500/30"
            role="dialog"
            aria-modal="true"
            aria-label="Trade with player"
            style={{
              background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.98) 0%, rgba(30, 20, 60, 0.98) 100%)',
              boxShadow: '0 0 60px rgba(168, 85, 247, 0.15), 0 0 120px rgba(168, 85, 247, 0.05)'
            }}
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={0.2}
            onDragEnd={(_e, info) => {
              if (info.offset.y > 100) onClose();
            }}
          >
            {/* Header */}
            <div className="flex justify-between items-center p-3 sm:p-6 border-b border-gold-800/20">
              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-accent-300 font-cyber">TRADE</h2>
                <p className="text-text-muted text-xs sm:text-sm">Exchange properties and money with other players</p>
              </div>
              <motion.button
                onClick={onClose}
                aria-label="Close trade dialog"
                className="min-w-[44px] min-h-[44px] rounded-lg bg-surface/50 border border-white/10 text-text-muted hover:text-danger-400 hover:border-danger-500/30 transition-all flex items-center justify-center text-sm"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
              >
                ✕
              </motion.button>
            </div>

            {/* Content */}
            <div className="p-3 sm:p-6">
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
                        className="p-3 sm:p-4 rounded-xl border border-white/10 bg-surface/30 hover:border-gold-500/30 hover:bg-accent-500/5 transition-all text-left"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className="w-10 h-10 sm:w-11 sm:h-11 rounded-full border-2"
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
                          className="w-10 h-10 sm:w-11 sm:h-11 rounded-full border-2 mx-auto mb-1"
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
                          className="w-10 h-10 sm:w-11 sm:h-11 rounded-full border-2 mx-auto mb-1"
                          style={{
                            backgroundColor: selectedPlayerData.color,
                            borderColor: selectedPlayerData.color
                          }}
                        />
                        <p className="text-[10px] sm:text-xs text-text-muted">{selectedPlayerData.name}</p>
                      </div>
                    </div>
                    <motion.button
                      onClick={() => {
                        setSelectedPlayer(null);
                        setOfferingMoney(0);
                        setRequestingMoney(0);
                        setOfferingProperties([]);
                        setRequestingProperties([]);
                        setOfferingJailCards(0);
                        setRequestingJailCards(0);
                        setStep('select-player');
                      }}
                      className="text-xs text-text-muted hover:text-accent-400 min-h-[44px] px-3"
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
                      
                      {/* Money input (typed + click adjusts) */}
                      <div className="flex items-center justify-between p-3 rounded-lg bg-surface/30 border border-white/10">
                        <span className="text-xs sm:text-sm text-text-main">Money</span>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => setOfferingMoney(Math.max(0, offeringMoney - 1000))}
                            className="min-w-[44px] min-h-[44px] rounded-lg bg-surface/50 border border-white/10 text-text-muted hover:text-text-main flex items-center justify-center font-bold"
                          >
                            -
                          </button>
                          <input
                            type="number"
                            value={offeringMoney || ''}
                            onChange={(e) => setOfferingMoney(Math.min(myPlayer.money, Math.max(0, Number(e.target.value))))}
                            onKeyDown={(e) => { if (e.key === '-' || e.key === 'e') e.preventDefault(); }}
                            className="w-20 sm:w-24 bg-surface/50 border border-white/10 rounded px-2 py-1 text-center font-bold text-success-400 text-xs sm:text-sm focus:border-success-500 focus:outline-none"
                            min={0}
                            max={myPlayer.money}
                          />
                          <button
                            type="button"
                            onClick={() => setOfferingMoney(Math.min(myPlayer.money, offeringMoney + 1000))}
                            className="min-w-[44px] min-h-[44px] rounded-lg bg-surface/50 border border-white/10 text-text-muted hover:text-text-main flex items-center justify-center font-bold"
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
                          <div className="grid grid-cols-1 gap-2 max-h-40 overflow-y-auto pr-1">
                            {myPlayer.properties_owned.map(propId => {
                              const prop = game.properties[propId];
                              if (!prop) return null;
                              const boardTile = boardData.tiles.find((t: any) => t.id === propId);
                              return (
                                <button
                                  key={propId}
                                  onClick={() => handleToggleOfferingProperty(propId)}
                                  className={`p-2.5 rounded-lg border text-left text-[11px] transition-all flex flex-col justify-between ${
                                    offeringProperties.includes(propId)
                                      ? 'border-success-500 bg-success-500/10'
                                      : 'border-white/10 bg-surface/30 hover:border-white/20'
                                  }`}
                                >
                                  <div className="flex items-center gap-1.5 min-w-0">
                                    <div
                                      className="w-2.5 h-2.5 rounded-sm shrink-0"
                                      style={{ backgroundColor: getPropertyColor(boardTile?.color || boardTile?.type || '') }}
                                    />
                                    <span className="text-text-main truncate font-bold">{boardTile?.name}</span>
                                  </div>
                                  <div className="text-[10px] text-text-muted mt-1 flex justify-between items-center w-full">
                                    <span>₹{boardTile?.price || 0}</span>
                                    <span>{getPropertySubInfo(boardTile)}</span>
                                  </div>
                                  {prop.is_mortgaged && (
                                    <div className="text-[9px] text-danger-400 font-bold mt-0.5">⚠ MORTGAGED</div>
                                  )}
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
                              className="min-w-[44px] min-h-[44px] rounded-lg bg-surface/50 border border-white/10 text-text-muted hover:text-text-main flex items-center justify-center font-bold"
                            >
                              -
                            </button>
                            <span className="w-8 text-center font-bold text-success-400 text-xs sm:text-sm">
                              {offeringJailCards}
                            </span>
                            <button
                              onClick={() => setOfferingJailCards(Math.min(myPlayer.get_out_of_jail_cards, offeringJailCards + 1))}
                              className="min-w-[44px] min-h-[44px] rounded-lg bg-surface/50 border border-white/10 text-text-muted hover:text-text-main flex items-center justify-center font-bold"
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
                      
                      {/* Money input (typed + click adjusts) */}
                      <div className="flex items-center justify-between p-3 rounded-lg bg-surface/30 border border-white/10">
                        <span className="text-xs sm:text-sm text-text-main">Money</span>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => setRequestingMoney(Math.max(0, requestingMoney - 1000))}
                            className="min-w-[44px] min-h-[44px] rounded-lg bg-surface/50 border border-white/10 text-text-muted hover:text-text-main flex items-center justify-center font-bold"
                          >
                            -
                          </button>
                          <input
                            type="number"
                            value={requestingMoney || ''}
                            onChange={(e) => setRequestingMoney(Math.min(selectedPlayerData.money, Math.max(0, Number(e.target.value))))}
                            onKeyDown={(e) => { if (e.key === '-' || e.key === 'e') e.preventDefault(); }}
                            className="w-20 sm:w-24 bg-surface/50 border border-white/10 rounded px-2 py-1 text-center font-bold text-accent-400 text-xs sm:text-sm focus:border-gold-500 focus:outline-none"
                            min={0}
                            max={selectedPlayerData.money}
                          />
                          <button
                            type="button"
                            onClick={() => setRequestingMoney(Math.min(selectedPlayerData.money, requestingMoney + 1000))}
                            className="min-w-[44px] min-h-[44px] rounded-lg bg-surface/50 border border-white/10 text-text-muted hover:text-text-main flex items-center justify-center font-bold"
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
                          <div className="grid grid-cols-1 gap-2 max-h-40 overflow-y-auto pr-1">
                            {selectedPlayerData.properties_owned.map(propId => {
                              const prop = game.properties[propId];
                              if (!prop) return null;
                              const boardTile = boardData.tiles.find((t: any) => t.id === propId);
                              return (
                                <button
                                  key={propId}
                                  onClick={() => handleToggleRequestingProperty(propId)}
                                  className={`p-2.5 rounded-lg border text-left text-[11px] transition-all flex flex-col justify-between ${
                                    requestingProperties.includes(propId)
                                      ? 'border-gold-500 bg-accent-500/10'
                                      : 'border-white/10 bg-surface/30 hover:border-white/20'
                                  }`}
                                >
                                  <div className="flex items-center gap-1.5 min-w-0">
                                    <div
                                      className="w-2.5 h-2.5 rounded-sm shrink-0"
                                      style={{ backgroundColor: getPropertyColor(boardTile?.color || boardTile?.type || '') }}
                                    />
                                    <span className="text-text-main truncate font-bold">{boardTile?.name}</span>
                                  </div>
                                  <div className="text-[10px] text-text-muted mt-1 flex justify-between items-center w-full">
                                    <span>₹{boardTile?.price || 0}</span>
                                    <span>{getPropertySubInfo(boardTile)}</span>
                                  </div>
                                  {prop.is_mortgaged && (
                                    <div className="text-[9px] text-danger-400 font-bold mt-0.5">⚠ MORTGAGED</div>
                                  )}
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
                              className="min-w-[44px] min-h-[44px] rounded-lg bg-surface/50 border border-white/10 text-text-muted hover:text-text-main flex items-center justify-center font-bold"
                            >
                              -
                            </button>
                            <span className="w-8 text-center font-bold text-accent-400 text-xs sm:text-sm">
                              {requestingJailCards}
                            </span>
                            <button
                              onClick={() => setRequestingJailCards(Math.min(selectedPlayerData.get_out_of_jail_cards, requestingJailCards + 1))}
                              className="min-w-[44px] min-h-[44px] rounded-lg bg-surface/50 border border-white/10 text-text-muted hover:text-text-main flex items-center justify-center font-bold"
                            >
                              +
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Trade Valuation Summary */}
                  <div className="grid grid-cols-2 gap-2 sm:gap-4 p-3 sm:p-4 rounded-xl bg-surface/20 border border-white/10">
                    <div className="text-center">
                      <p className="text-[9px] sm:text-[10px] text-text-muted font-cyber">TOTAL OFFER VALUE</p>
                      <p className="text-sm sm:text-lg font-bold text-success-400">
                        {formatMoney(offeringMoney + offeringPropertiesValue)}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-[9px] sm:text-[10px] text-text-muted font-cyber">TOTAL REQUEST VALUE</p>
                      <p className="text-sm sm:text-lg font-bold text-accent-400">
                        {formatMoney(requestingMoney + requestingPropertiesValue)}
                      </p>
                    </div>
                  </div>

                  {/* Validation warnings */}
                  {offeringMoney > myPlayer.money && (
                    <div className="p-2 rounded-lg bg-danger-500/10 border border-danger-500/30 text-danger-400 text-xs text-center">
                      Offering more money than you have!
                    </div>
                  )}
                  {requestingMoney > selectedPlayerData.money && (
                    <div className="p-2 rounded-lg bg-warning-500/10 border border-warning-500/30 text-warning-400 text-xs text-center">
                      Requesting more money than {selectedPlayerData.name} has!
                    </div>
                  )}

                  {/* Actions */}
                  <div className="space-y-3 pt-4 border-t border-white/10">
                    {(() => {
                      const isEmpty = offeringMoney === 0 && requestingMoney === 0 &&
                        offeringProperties.length === 0 && requestingProperties.length === 0 &&
                        offeringJailCards === 0 && requestingJailCards === 0;
                      const isInvalid = offeringMoney > myPlayer.money || requestingMoney > selectedPlayerData.money;
                      const buttonDisabled = isEmpty || isInvalid;
                      return (
                        <motion.button
                          onClick={handleSubmitTrade}
                          disabled={buttonDisabled}
                          aria-label={isEmpty ? 'Add items to trade' : isInvalid ? 'Fix invalid amounts' : 'Send trade offer'}
                          className="w-full py-3 rounded-xl font-cyber font-bold text-base sm:text-lg text-white transition-opacity min-h-[44px]"
                          style={{
                            background: buttonDisabled ? 'rgba(168, 85, 247, 0.2)' : 'linear-gradient(135deg, #a855f7 0%, #7c3aed 100%)',
                            boxShadow: buttonDisabled ? 'none' : '0 4px 20px rgba(168, 85, 247, 0.3)'
                          }}
                          whileHover={buttonDisabled ? {} : { scale: 1.02, boxShadow: '0 6px 30px rgba(168, 85, 247, 0.4)' }}
                          whileTap={buttonDisabled ? {} : { scale: 0.98 }}
                        >
                          {isEmpty ? 'Add items to trade' : isInvalid ? 'Fix invalid amounts' : 'Send Trade Offer'}
                        </motion.button>
                      );
                    })()}

                    {/* Cancel outgoing trade */}
                    {outgoingTradeId && (
                      <motion.button
                        onClick={() => cancelTrade(outgoingTradeId)}
                        className="w-full py-2 rounded-lg text-xs sm:text-sm text-danger-400 border border-danger-500/30 hover:bg-danger-500/10 transition-all font-semibold font-cyber min-h-[44px]"
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
  trade: TradeOffer;
  onAccept: () => void;
  onReject: () => void;
  onCounter: () => void;
}

export const TradeNotification = ({ trade, onAccept, onReject, onCounter }: TradeNotificationProps) => {
  const { game } = useGameStore();
  const fromPlayer = game?.room.players[trade.from_player_id];

  if (!fromPlayer || !game) return null;

  // Resolve property names and total values for the notification card
  const offeringPropNames = trade.offering_properties.map(propId => {
    const tile = boardData.tiles.find((t: any) => t.id === propId);
    return tile?.name || `#${propId}`;
  });

  const requestingPropNames = trade.requesting_properties.map(propId => {
    const tile = boardData.tiles.find((t: any) => t.id === propId);
    return tile?.name || `#${propId}`;
  });

  const offeringPropsValue = trade.offering_properties.reduce((sum, propId) => {
    const tile = boardData.tiles.find((t: any) => t.id === propId);
    return sum + (tile?.price || 0);
  }, 0);

  const requestingPropsValue = trade.requesting_properties.reduce((sum, propId) => {
    const tile = boardData.tiles.find((t: any) => t.id === propId);
    return sum + (tile?.price || 0);
  }, 0);

  const totalOffer = trade.offering_money + offeringPropsValue;
  const totalRequest = trade.requesting_money + requestingPropsValue;

  return (
    <motion.div
      className="fixed bottom-[calc(64px+env(safe-area-inset-bottom)+8px)] right-2 sm:right-4 z-40 w-[calc(100vw-1rem)] sm:w-80 max-w-80"
      initial={{ x: 320, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 320, opacity: 0 }}
      transition={{ type: "spring", damping: 25 }}
    >
      <div className="panel-dark rounded-xl border border-gold-500/30 p-4"
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

        <div className="text-xs text-text-muted mb-3 space-y-1.5">
          {trade.offering_money > 0 && (
            <p>Offers Cash: <span className="text-success-400 font-bold">{formatMoney(trade.offering_money)}</span></p>
          )}
          {offeringPropNames.length > 0 && (
            <p>Offers Properties: <span className="text-text-main font-semibold">{offeringPropNames.join(', ')}</span></p>
          )}
          {trade.offering_get_out_of_jail_cards > 0 && (
            <p>Offers Jail Cards: <span className="text-success-400 font-bold">{trade.offering_get_out_of_jail_cards}</span></p>
          )}
          <div className="h-px bg-white/5 my-1" />
          {trade.requesting_money > 0 && (
            <p>Wants Cash: <span className="text-accent-400 font-bold">{formatMoney(trade.requesting_money)}</span></p>
          )}
          {requestingPropNames.length > 0 && (
            <p>Wants Properties: <span className="text-text-main font-semibold">{requestingPropNames.join(', ')}</span></p>
          )}
          {trade.requesting_get_out_of_jail_cards > 0 && (
            <p>Wants Jail Cards: <span className="text-accent-400 font-bold">{trade.requesting_get_out_of_jail_cards}</span></p>
          )}
          <div className="h-px bg-white/10 my-1 pt-1.5 flex flex-col sm:flex-row sm:justify-between font-bold gap-0.5">
            <span className="text-success-400">Total Offer: {formatMoney(totalOffer)}</span>
            <span className="text-accent-400">Total Request: {formatMoney(totalRequest)}</span>
          </div>
        </div>

        <div className="flex gap-2 mt-4">
          <motion.button
            onClick={onAccept}
            aria-label="Accept trade offer"
            className="flex-1 py-2 rounded-lg bg-success-500/20 text-success-400 font-bold text-sm border border-success-500/30 min-h-[44px]"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            Accept
          </motion.button>
          <motion.button
            onClick={onCounter}
            aria-label="Counter trade offer"
            className="flex-1 py-2 rounded-lg bg-purple-500/20 text-purple-400 font-bold text-sm border border-purple-500/30 min-h-[44px]"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            Counter
          </motion.button>
          <motion.button
            onClick={onReject}
            aria-label="Reject trade offer"
            className="flex-1 py-2 rounded-lg bg-danger-500/20 text-danger-400 font-bold text-sm border border-danger-500/30 min-h-[44px]"
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
