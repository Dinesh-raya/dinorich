import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Dice5, MapPin, Building2, Layers, Bug } from 'lucide-react';
import { useGameStore } from '../stores/gameStore';
import type { GameState, RoomState } from '../stores/slices/types';

// Board tiles data (matching shared/configs/board_config.json)
const BOARD_TILES = [
  { id: 0, name: 'GO', type: 'corner' },
  { id: 1, name: 'Guwahati', type: 'property' },
  { id: 2, name: 'Treasury Card', type: 'treasury' },
  { id: 3, name: 'Goa', type: 'property' },
  { id: 4, name: 'Income Tax', type: 'tax' },
  { id: 5, name: 'Delhi Airport', type: 'airport' },
  { id: 6, name: 'Ahmedabad', type: 'property' },
  { id: 7, name: 'Surprise Card', type: 'surprise' },
  { id: 8, name: 'Pune', type: 'property' },
  { id: 9, name: 'Hyderabad', type: 'property' },
  { id: 10, name: 'Traffic Police Jail', type: 'corner' },
  { id: 11, name: 'Jaipur', type: 'property' },
  { id: 12, name: 'NTPC Power', type: 'utility' },
  { id: 13, name: 'Chandigarh', type: 'property' },
  { id: 14, name: 'Lucknow', type: 'property' },
  { id: 15, name: 'Mumbai Airport', type: 'airport' },
  { id: 16, name: 'Kochi', type: 'property' },
  { id: 17, name: 'Treasury Card', type: 'treasury' },
  { id: 18, name: 'Thiruvananthapuram', type: 'property' },
  { id: 19, name: 'Chennai', type: 'property' },
  { id: 20, name: 'Free Parking', type: 'corner' },
  { id: 21, name: 'Surat', type: 'property' },
  { id: 22, name: 'Surprise Card', type: 'surprise' },
  { id: 23, name: 'Indore', type: 'property' },
  { id: 24, name: 'Bhopal', type: 'property' },
  { id: 25, name: 'Chennai Airport', type: 'airport' },
  { id: 26, name: 'Kolkata', type: 'property' },
  { id: 27, name: 'Patna', type: 'property' },
  { id: 28, name: 'Jal Jeevan Water', type: 'utility' },
  { id: 29, name: 'Bengaluru', type: 'property' },
  { id: 30, name: 'Go To Jail', type: 'corner' },
  { id: 31, name: 'Noida', type: 'property' },
  { id: 32, name: 'Gurugram', type: 'property' },
  { id: 33, name: 'Treasury Card', type: 'treasury' },
  { id: 34, name: 'Agra', type: 'property' },
  { id: 35, name: 'Kolkata Airport', type: 'airport' },
  { id: 36, name: 'Surprise Card', type: 'surprise' },
  { id: 37, name: 'Mumbai', type: 'property' },
  { id: 38, name: 'Luxury Tax', type: 'tax' },
  { id: 39, name: 'Delhi', type: 'property' },
];

const OWNABLE_TILES = BOARD_TILES.filter(t =>
  t.type === 'property' || t.type === 'airport' || t.type === 'utility'
);

interface QAPanelProps {
  isOpen: boolean;
  onClose: () => void;
  game: GameState;
  room: RoomState;
}

export function QAPanel({ isOpen, onClose, game, room: _room }: QAPanelProps) {
  const { qaSetDice, qaJumpToTile, qaForceJail, qaSeedProperty, qaForceAuction, qaAddMoney } = useGameStore();

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Dice override state
  const [die1, setDie1] = useState(1);
  const [die2, setDie2] = useState(1);

  // Player action state
  const [selectedPlayer, setSelectedPlayer] = useState('');
  const [jumpTile, setJumpTile] = useState(0);
  const [moneyAmount, setMoneyAmount] = useState(1000);

  // Property state
  const [selectedProperty, setSelectedProperty] = useState<number | ''>('');
  const [propertyOwner, setPropertyOwner] = useState('');

  // Active section for mobile accordion
  const [activeSection, setActiveSection] = useState<string>('dice');

  const players = Object.values(game.room.players);
  const nonBankruptPlayers = players.filter(p => !p.is_bankrupt);

  const handleQueueDice = () => {
    qaSetDice(die1, die2);
  };

  const handleJumpToTile = () => {
    if (!selectedPlayer) return;
    qaJumpToTile(selectedPlayer, jumpTile);
  };

  const handleForceJail = () => {
    if (!selectedPlayer) return;
    qaForceJail(selectedPlayer);
  };

  const handleAddMoney = () => {
    if (!selectedPlayer) return;
    qaAddMoney(selectedPlayer, moneyAmount);
  };

  const handleRemoveMoney = () => {
    if (!selectedPlayer) return;
    qaAddMoney(selectedPlayer, -moneyAmount);
  };

  const handleSeedProperty = () => {
    if (selectedProperty === '' || !propertyOwner) return;
    qaSeedProperty(propertyOwner, selectedProperty as number);
  };

  const handleForceAuction = () => {
    if (selectedProperty === '') return;
    qaForceAuction(selectedProperty as number);
  };

  const SectionHeader = ({ id, icon, label }: { id: string; icon: React.ReactNode; label: string }) => (
    <button
      onClick={() => setActiveSection(activeSection === id ? '' : id)}
      className="w-full flex items-center justify-between p-3 rounded-xl bg-purple-500/10 border border-purple-500/20 hover:border-purple-500/40 transition-colors"
    >
      <div className="flex items-center gap-2">
        {icon}
        <span className="text-sm font-bold text-purple-300 font-cyber">{label}</span>
      </div>
      <span className="text-text-muted text-xs">{activeSection === id ? '−' : '+'}</span>
    </button>
  );

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-xl p-4"
        >
          <motion.div
            initial={{ scale: 0.9, y: 30, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.9, y: 30, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="w-[95vw] max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl border-2 border-purple-500/30 shadow-2xl"
            style={{
              background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.98) 0%, rgba(30, 20, 60, 0.98) 100%)',
              boxShadow: '0 0 60px rgba(168, 85, 247, 0.15), 0 0 120px rgba(168, 85, 247, 0.05)',
            }}
          >
            {/* Header */}
            <div className="flex justify-between items-center p-4 border-b border-purple-500/20">
              <div className="flex items-center gap-2">
                <Bug className="w-5 h-5 text-purple-400" />
                <h2 className="text-lg font-bold text-purple-300 font-cyber">QA PANEL</h2>
                <span className="px-2 py-0.5 rounded-full bg-purple-500/20 border border-purple-500/30 text-purple-300 text-[10px] font-bold">
                  TESTING MODE
                </span>
              </div>
              <motion.button
                onClick={onClose}
                className="w-10 h-10 rounded-lg bg-surface/50 border border-white/10 text-text-muted hover:text-danger-400 hover:border-danger-500/30 transition-all flex items-center justify-center"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
              >
                <X className="w-4 h-4" />
              </motion.button>
            </div>

            {/* Content */}
            <div className="p-4 space-y-3">
              {/* Dice Override */}
              <div className="space-y-2">
                <SectionHeader
                  id="dice"
                  icon={<Dice5 className="w-4 h-4 text-purple-400" />}
                  label="DICE OVERRIDE"
                />
                {activeSection === 'dice' && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="p-3 rounded-xl bg-surface/30 border border-white/5 space-y-3"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex-1">
                        <label className="text-[10px] text-text-muted uppercase tracking-wider">Die 1</label>
                        <div className="flex gap-1 mt-1">
                          {[1, 2, 3, 4, 5, 6].map(v => (
                            <button
                              key={v}
                              onClick={() => setDie1(v)}
                              className={`w-11 h-11 min-h-[44px] min-w-[44px] rounded-lg text-sm font-bold transition-all ${
                                die1 === v
                                  ? 'bg-purple-500/30 border border-purple-500 text-purple-300'
                                  : 'bg-surface/50 border border-white/10 text-text-muted hover:border-purple-500/30'
                              }`}
                            >
                              {v}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="flex-1">
                        <label className="text-[10px] text-text-muted uppercase tracking-wider">Die 2</label>
                        <div className="flex gap-1 mt-1">
                          {[1, 2, 3, 4, 5, 6].map(v => (
                            <button
                              key={v}
                              onClick={() => setDie2(v)}
                              className={`w-11 h-11 min-h-[44px] min-w-[44px] rounded-lg text-sm font-bold transition-all ${
                                die2 === v
                                  ? 'bg-purple-500/30 border border-purple-500 text-purple-300'
                                  : 'bg-surface/50 border border-white/10 text-text-muted hover:border-purple-500/30'
                              }`}
                            >
                              {v}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={handleQueueDice}
                      className="w-full py-2 min-h-[44px] rounded-xl bg-purple-500/20 border border-purple-500/30 text-purple-300 text-sm font-bold hover:bg-purple-500/30 transition-colors"
                    >
                      Queue [{die1}, {die2}]
                    </button>
                    <p className="text-[10px] text-text-muted text-center">
                      Queued dice are consumed on the next roll.
                    </p>
                  </motion.div>
                )}
              </div>

              {/* Player Actions */}
              <div className="space-y-2">
                <SectionHeader
                  id="players"
                  icon={<MapPin className="w-4 h-4 text-purple-400" />}
                  label="PLAYER ACTIONS"
                />
                {activeSection === 'players' && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="p-3 rounded-xl bg-surface/30 border border-white/5 space-y-3"
                  >
                    {/* Player select */}
                    <div>
                      <label className="text-[10px] text-text-muted uppercase tracking-wider">Target Player</label>
                      <select
                        value={selectedPlayer}
                        onChange={e => setSelectedPlayer(e.target.value)}
                        className="w-full mt-1 p-2 rounded-lg bg-surface/50 border border-white/10 text-text-main text-sm focus:border-purple-500/50 focus:outline-none"
                      >
                        <option value="">Select player...</option>
                        {nonBankruptPlayers.map(p => (
                          <option key={p.id} value={p.id}>{p.name} (₹{p.money})</option>
                        ))}
                      </select>
                    </div>

                    {/* Jump to tile */}
                    <div>
                      <label className="text-[10px] text-text-muted uppercase tracking-wider">Jump to Tile</label>
                      <div className="flex gap-2 mt-1">
                        <select
                          value={jumpTile}
                          onChange={e => setJumpTile(Number(e.target.value))}
                          className="flex-1 p-2 rounded-lg bg-surface/50 border border-white/10 text-text-main text-sm focus:border-purple-500/50 focus:outline-none"
                        >
                          {BOARD_TILES.map(t => (
                            <option key={t.id} value={t.id}>{t.id}: {t.name}</option>
                          ))}
                        </select>
                        <button
                          onClick={handleJumpToTile}
                          disabled={!selectedPlayer}
                          className="px-3 py-2 min-h-[44px] rounded-lg bg-purple-500/20 border border-purple-500/30 text-purple-300 text-xs font-bold hover:bg-purple-500/30 transition-colors disabled:opacity-40"
                        >
                          Jump
                        </button>
                      </div>
                    </div>

                    {/* Add/Remove money */}
                    <div>
                      <label className="text-[10px] text-text-muted uppercase tracking-wider">Money Amount</label>
                      <div className="flex gap-2 mt-1">
                        <input
                          type="number"
                          value={moneyAmount}
                          onChange={e => setMoneyAmount(Number(e.target.value))}
                          className="flex-1 p-2 rounded-lg bg-surface/50 border border-white/10 text-text-main text-sm focus:border-purple-500/50 focus:outline-none"
                          min={1}
                          step={100}
                        />
                        <button
                          onClick={handleAddMoney}
                          disabled={!selectedPlayer}
                          className="px-3 py-2 min-h-[44px] rounded-lg bg-success-500/20 border border-success-500/30 text-success-400 text-xs font-bold hover:bg-success-500/30 transition-colors disabled:opacity-40"
                        >
                          + Add
                        </button>
                        <button
                          onClick={handleRemoveMoney}
                          disabled={!selectedPlayer}
                          className="px-3 py-2 min-h-[44px] rounded-lg bg-danger-500/20 border border-danger-500/30 text-danger-400 text-xs font-bold hover:bg-danger-500/30 transition-colors disabled:opacity-40"
                        >
                          - Remove
                        </button>
                      </div>
                    </div>

                    {/* Send to jail */}
                    <button
                      onClick={handleForceJail}
                      disabled={!selectedPlayer}
                      className="w-full py-2 min-h-[44px] rounded-xl bg-danger-500/20 border border-danger-500/30 text-danger-400 text-sm font-bold hover:bg-danger-500/30 transition-colors disabled:opacity-40"
                    >
                      Send to Jail
                    </button>
                  </motion.div>
                )}
              </div>

              {/* Property Control */}
              <div className="space-y-2">
                <SectionHeader
                  id="property"
                  icon={<Building2 className="w-4 h-4 text-purple-400" />}
                  label="PROPERTY CONTROL"
                />
                {activeSection === 'property' && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="p-3 rounded-xl bg-surface/30 border border-white/5 space-y-3"
                  >
                    {/* Property select */}
                    <div>
                      <label className="text-[10px] text-text-muted uppercase tracking-wider">Property</label>
                      <select
                        value={selectedProperty}
                        onChange={e => setSelectedProperty(e.target.value === '' ? '' : Number(e.target.value))}
                        className="w-full mt-1 p-2 rounded-lg bg-surface/50 border border-white/10 text-text-main text-sm focus:border-purple-500/50 focus:outline-none"
                      >
                        <option value="">Select property...</option>
                        {OWNABLE_TILES.map(t => (
                          <option key={t.id} value={t.id}>{t.id}: {t.name} ({t.type})</option>
                        ))}
                      </select>
                    </div>

                    {/* Assign to player */}
                    <div>
                      <label className="text-[10px] text-text-muted uppercase tracking-wider">Assign to Player</label>
                      <div className="flex gap-2 mt-1">
                        <select
                          value={propertyOwner}
                          onChange={e => setPropertyOwner(e.target.value)}
                          className="flex-1 p-2 rounded-lg bg-surface/50 border border-white/10 text-text-main text-sm focus:border-purple-500/50 focus:outline-none"
                        >
                          <option value="">Select player...</option>
                          {nonBankruptPlayers.map(p => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                          ))}
                        </select>
                        <button
                          onClick={handleSeedProperty}
                          disabled={selectedProperty === '' || !propertyOwner}
                          className="px-3 py-2 min-h-[44px] rounded-lg bg-purple-500/20 border border-purple-500/30 text-purple-300 text-xs font-bold hover:bg-purple-500/30 transition-colors disabled:opacity-40"
                        >
                          Assign
                        </button>
                      </div>
                    </div>

                    {/* Force auction */}
                    <button
                      onClick={handleForceAuction}
                      disabled={selectedProperty === ''}
                      className="w-full py-2 min-h-[44px] rounded-xl bg-warning-500/20 border border-warning-500/30 text-warning-400 text-sm font-bold hover:bg-warning-500/30 transition-colors disabled:opacity-40"
                    >
                      Force Auction
                    </button>
                  </motion.div>
                )}
              </div>

              {/* Card Override (informational) */}
              <div className="space-y-2">
                <SectionHeader
                  id="cards"
                  icon={<Layers className="w-4 h-4 text-purple-400" />}
                  label="CARD OVERRIDE"
                />
                {activeSection === 'cards' && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="p-3 rounded-xl bg-surface/30 border border-white/5 space-y-3"
                  >
                    <p className="text-xs text-text-muted">
                      Card overrides are configured in room settings before the game starts. Use the{' '}
                      <span className="text-purple-300 font-bold">card_mode</span> and{' '}
                      <span className="text-purple-300 font-bold">card_index</span> settings in the QA mode configuration.
                    </p>
                    <div className="p-3 rounded-lg bg-purple-500/5 border border-purple-500/10">
                      <p className="text-[10px] text-text-muted">
                        <span className="text-purple-300">random</span> = normal behavior<br/>
                        <span className="text-purple-300">top</span> = always draw top card<br/>
                        <span className="text-purple-300">index</span> = draw specific card by index
                      </p>
                    </div>
                  </motion.div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-purple-500/20">
              <p className="text-[10px] text-text-muted text-center">
                QA controls are only visible to the host. All actions are logged in the game history.
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
