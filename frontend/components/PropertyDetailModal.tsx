import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '../stores/gameStore';
import boardData from '../../shared/configs/board_config.json';
import { formatMoney } from '../utils/format';

interface PropertyDetailModalProps {
  tileId: number | null;
  onClose: () => void;
}

const COLOR_MAP: Record<string, string> = {
  brown: '#8B4513',
  light_blue: '#87CEFA',
  pink: '#FF69B4',
  orange: '#FFA500',
  red: '#FF0000',
  yellow: '#FFD700',
  green: '#008000',
  dark_blue: '#00008B',
};

// House prices by color group (matches GameRules.HOUSE_PRICES)
const HOUSE_PRICES: Record<string, number> = {
  brown: 50000,
  light_blue: 50000,
  pink: 100000,
  orange: 100000,
  red: 150000,
  yellow: 150000,
  green: 200000,
  dark_blue: 200000,
};

const HOTEL_PRICE_MULTIPLIER = 5;

const RENT_LABELS = ['Base', '1 House', '2 Houses', '3 Houses', '4 Houses', 'Hotel'];

export const PropertyDetailModal = ({ tileId, onClose }: PropertyDetailModalProps) => {
  const { game } = useGameStore();

  if (tileId === null || !game) return null;

  const tileConfig = boardData.tiles.find((t: any) => t.id === tileId);
  if (!tileConfig) return null;

  const propState = game.properties?.[tileId];
  const owner = propState?.owner_id ? game.room.players[propState.owner_id] : null;
  const isProperty = tileConfig.type === 'property';
  const isAirport = tileConfig.type === 'airport';
  const isUtility = tileConfig.type === 'utility';

  const colorHex = tileConfig.color ? COLOR_MAP[tileConfig.color] : null;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
        <motion.div
          className="relative bg-surface border-2 border-primary-500/30 rounded-2xl shadow-2xl max-w-md w-full overflow-hidden"
          initial={{ scale: 0.9, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.9, y: 20 }}
        >
          {/* Header */}
          <div
            className="p-6 text-center relative"
            style={{ background: colorHex ? `${colorHex}33` : undefined }}
          >
            {colorHex && (
              <div
                className="absolute top-0 left-0 right-0 h-2"
                style={{ backgroundColor: colorHex }}
              />
            )}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 text-text-muted hover:text-white transition-colors text-xl"
            >
              ✕
            </button>
            <h2 className="text-2xl font-bold text-white mb-1">{tileConfig.name}</h2>
            <p className="text-text-muted text-sm capitalize">{tileConfig.type}</p>
            {tileConfig.color && (
              <span
                className="inline-block mt-2 px-3 py-1 rounded-full text-xs font-bold text-white"
                style={{ backgroundColor: colorHex || '#666' }}
              >
                {tileConfig.color.replace('_', ' ').toUpperCase()}
              </span>
            )}
          </div>

          {/* Content */}
          <div className="p-6 space-y-4">
            {/* Price */}
            {tileConfig.price && (
              <div className="flex justify-between items-center p-3 bg-primary-500/10 rounded-xl">
                <span className="text-text-muted">Price</span>
                <span className="text-xl font-bold text-primary-300">{formatMoney(tileConfig.price)}</span>
              </div>
            )}

            {/* Mortgage */}
            {tileConfig.mortgage && (
              <div className="flex justify-between items-center p-3 bg-surface/50 rounded-xl">
                <span className="text-text-muted">Mortgage Value</span>
                <span className="text-lg font-bold text-accent-300">{formatMoney(tileConfig.mortgage)}</span>
              </div>
            )}

            {/* Tax */}
            {tileConfig.type === 'tax' && tileConfig.amount && (
              <div className="flex justify-between items-center p-3 bg-danger-500/10 rounded-xl">
                <span className="text-text-muted">Tax Amount</span>
                <span className="text-xl font-bold text-danger-300">{formatMoney(tileConfig.amount)}</span>
              </div>
            )}

            {/* Rent Tiers (for properties) */}
            {isProperty && tileConfig.rent && (
              <div>
                <h3 className="text-sm font-bold text-text-muted mb-3">RENT TIERS</h3>
                <div className="grid grid-cols-3 gap-2">
                  {tileConfig.rent.map((rent: number, index: number) => (
                    <div
                      key={index}
                      className={`p-3 rounded-xl text-center ${
                        propState?.houses === index || (index === 5 && propState?.hotels === 1)
                          ? 'bg-success-500/20 border border-success-500/30'
                          : 'bg-surface/50 border border-white/5'
                      }`}
                    >
                      <div className="text-xs text-text-muted mb-1">{RENT_LABELS[index]}</div>
                      <div className="text-sm font-bold text-white">{formatMoney(rent)}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Airport Rent */}
            {isAirport && (
              <div>
                <h3 className="text-sm font-bold text-text-muted mb-3">RENT (by airports owned)</h3>
                <div className="grid grid-cols-2 gap-2">
                  {[25000, 50000, 100000, 200000].map((rent, i) => (
                    <div key={i} className="p-3 rounded-xl text-center bg-surface/50 border border-white/5">
                      <div className="text-xs text-text-muted mb-1">{i + 1} Airport{i > 0 ? 's' : ''}</div>
                      <div className="text-sm font-bold text-white">{formatMoney(rent)}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Utility Rent */}
            {isUtility && (
              <div>
                <h3 className="text-sm font-bold text-text-muted mb-3">RENT</h3>
                <div className="grid grid-cols-2 gap-2">
                  <div className="p-3 rounded-xl text-center bg-surface/50 border border-white/5">
                    <div className="text-xs text-text-muted mb-1">1 Utility</div>
                    <div className="text-sm font-bold text-white">Dice x 4,000</div>
                  </div>
                  <div className="p-3 rounded-xl text-center bg-surface/50 border border-white/5">
                    <div className="text-xs text-text-muted mb-1">2 Utilities</div>
                    <div className="text-sm font-bold text-white">Dice x 10,000</div>
                  </div>
                </div>
              </div>
            )}

            {/* Owner Info */}
            {owner && (
              <div className="p-3 bg-success-500/10 rounded-xl">
                <div className="flex justify-between items-center">
                  <span className="text-text-muted">Owner</span>
                  <span className="font-bold text-success-300">{owner.name}</span>
                </div>
                {isProperty && propState && (
                  <div className="flex justify-between items-center mt-2">
                    <span className="text-text-muted">Development</span>
                    <span className="font-bold text-white">
                      {propState.hotels > 0
                        ? '🏨 Hotel'
                        : propState.houses > 0
                        ? `🏠 ${propState.houses} House${propState.houses > 1 ? 's' : ''}`
                        : 'No buildings'}
                    </span>
                  </div>
                )}
                {propState?.is_mortgaged && (
                  <div className="mt-2 text-center text-danger-300 text-sm font-bold">
                    MORTGAGED
                  </div>
                )}
              </div>
            )}

            {/* Building Cost */}
            {isProperty && tileConfig.color && (
              <div className="p-3 bg-surface/50 rounded-xl">
                <div className="flex justify-between items-center">
                  <span className="text-text-muted">House Cost</span>
                  <span className="font-bold text-white">
                    {formatMoney(HOUSE_PRICES[tileConfig.color] || 50000)}
                  </span>
                </div>
                <div className="flex justify-between items-center mt-1">
                  <span className="text-text-muted">Hotel Cost</span>
                  <span className="font-bold text-white">
                    {formatMoney((HOUSE_PRICES[tileConfig.color] || 50000) * HOTEL_PRICE_MULTIPLIER)}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-white/10">
            <button
              onClick={onClose}
              className="w-full py-3 bg-primary-500/20 border border-primary-500/30 rounded-xl text-primary-300 font-bold hover:bg-primary-500/30 transition-colors"
            >
              Close
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
