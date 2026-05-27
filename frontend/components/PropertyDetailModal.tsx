import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '../stores/gameStore';
import { soundManager } from '../utils/audio';
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
  brown: 500,
  light_blue: 600,
  pink: 1000,
  orange: 1000,
  red: 1500,
  yellow: 1500,
  green: 2000,
  dark_blue: 2000,
};

const HOTEL_PRICE_MULTIPLIER = 5;

const RENT_LABELS = ['Base', '1 House', '2 Houses', '3 Houses', '4 Houses', 'Hotel'];

export const PropertyDetailModal = ({ tileId, onClose }: PropertyDetailModalProps) => {
  const { game, myId } = useGameStore();

  const tileConfig = tileId !== null && game ? boardData.tiles.find((t: any) => t.id === tileId) : null;
  const propState = tileId !== null && game ? game.properties?.[tileId] : null;
  const owner = propState?.owner_id && game ? game.room.players[propState.owner_id] : null;
  const isProperty = tileConfig?.type === 'property';
  const isAirport = tileConfig?.type === 'airport';
  const isUtility = tileConfig?.type === 'utility';
  const colorHex = tileConfig?.color ? COLOR_MAP[tileConfig.color] : null;

  return (
    <AnimatePresence>
      {tileId !== null && game && tileConfig && (
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <motion.div
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          onClick={onClose}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        />
        <motion.div
          className="relative bg-surface border-2 border-gold-500/30 rounded-2xl shadow-2xl w-[95vw] max-w-lg max-h-[90vh] overflow-y-auto overflow-hidden"
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
              aria-label="Close"
              className="absolute top-4 right-4 w-10 h-10 flex items-center justify-center rounded-lg text-text-muted hover:text-white hover:bg-white/10 transition-colors text-xl"
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
                <span className="text-xl font-bold text-gold-500">{formatMoney(tileConfig.price)}</span>
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
                  {[250, 500, 1000, 2000].map((rent, i) => (
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
                    <div className="text-sm font-bold text-white">Dice x 40</div>
                  </div>
                  <div className="p-3 rounded-xl text-center bg-surface/50 border border-white/5">
                    <div className="text-xs text-text-muted mb-1">2 Utilities</div>
                    <div className="text-sm font-bold text-white">Dice x 100</div>
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
                    {formatMoney(HOUSE_PRICES[tileConfig.color] || 500)}
                  </span>
                </div>
                <div className="flex justify-between items-center mt-1">
                  <span className="text-text-muted">Hotel Cost</span>
                  <span className="font-bold text-white">
                    {formatMoney((HOUSE_PRICES[tileConfig.color] || 500) * HOTEL_PRICE_MULTIPLIER)}
                  </span>
                </div>
              </div>
            )}

            {/* Action Buttons - Only show if current user owns the property */}
            {myId && propState?.owner_id === myId && (isProperty || isAirport || isUtility) && (
              <div className="space-y-2">
                {/* Mortgage/Unmortgage */}
                {game.room?.settings?.mortgage_enabled && (
                  propState.is_mortgaged ? (
                    <motion.button
                      className="w-full py-2 px-4 bg-gold-500/20 border border-gold-500/30 rounded-xl text-accent-300 font-bold text-sm hover:bg-accent-500/30 transition-colors"
                      onClick={() => {
                        soundManager.playButtonClick();
                        useGameStore.getState().unmortgageProperty(tileId);
                      }}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      UNMORTGAGE ({formatMoney(Math.floor((tileConfig.mortgage || 0) * 1.1))})
                    </motion.button>
                  ) : (
                    <motion.button
                      className="w-full py-2 px-4 bg-warning-500/20 border border-warning-500/30 rounded-xl text-warning-300 font-bold text-sm hover:bg-warning-500/30 transition-colors"
                      onClick={() => {
                        soundManager.playButtonClick();
                        useGameStore.getState().mortgageProperty(tileId);
                      }}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      MORTGAGE ({formatMoney(tileConfig.mortgage || 0)})
                    </motion.button>
                  )
                )}

                {/* Build/Sell - Only for properties with color group */}
                {isProperty && tileConfig.color && !propState.is_mortgaged && (() => {
                  const colorGroup = boardData.tiles.filter((t: any) => t.color === tileConfig.color && t.type === 'property');
                  const hasMonopoly = colorGroup.every((t: any) => game.properties?.[t.id]?.owner_id === myId);
                  const housePrice = HOUSE_PRICES[tileConfig.color] || 500;
                  const hotelPrice = housePrice * HOTEL_PRICE_MULTIPLIER;

                  if (!hasMonopoly) return null;

                  return (
                    <div className="flex gap-2">
                      {/* Build House */}
                      {propState.hotels === 0 && propState.houses < 4 && (
                        <motion.button
                          className="flex-1 py-2 px-3 bg-success-500/20 border border-success-500/30 rounded-xl text-success-300 font-bold text-xs hover:bg-success-500/30 transition-colors"
                          onClick={() => {
                            soundManager.playButtonClick();
                            useGameStore.getState().buildHouse(tileId);
                          }}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                        >
                          BUILD HOUSE ({formatMoney(housePrice)})
                        </motion.button>
                      )}

                      {/* Build Hotel */}
                      {propState.houses === 4 && propState.hotels === 0 && (
                        <motion.button
                          className="flex-1 py-2 px-3 bg-danger-500/20 border border-danger-500/30 rounded-xl text-danger-300 font-bold text-xs hover:bg-danger-500/30 transition-colors"
                          onClick={() => {
                            soundManager.playButtonClick();
                            useGameStore.getState().buildHotel(tileId);
                          }}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                        >
                          BUILD HOTEL ({formatMoney(hotelPrice)})
                        </motion.button>
                      )}

                      {/* Sell Hotel */}
                      {propState.hotels > 0 && (
                        <motion.button
                          className="flex-1 py-2 px-3 bg-warning-500/20 border border-warning-500/30 rounded-xl text-warning-300 font-bold text-xs hover:bg-warning-500/30 transition-colors"
                          onClick={() => {
                            soundManager.playButtonClick();
                            useGameStore.getState().sellHotel(tileId);
                          }}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                        >
                          SELL HOTEL ({formatMoney(Math.floor(hotelPrice / 2))})
                        </motion.button>
                      )}

                      {/* Sell House */}
                      {propState.hotels === 0 && propState.houses > 0 && (
                        <motion.button
                          className="flex-1 py-2 px-3 bg-warning-500/20 border border-warning-500/30 rounded-xl text-warning-300 font-bold text-xs hover:bg-warning-500/30 transition-colors"
                          onClick={() => {
                            soundManager.playButtonClick();
                            useGameStore.getState().sellHouse(tileId);
                          }}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                        >
                          SELL HOUSE ({formatMoney(Math.floor(housePrice / 2))})
                        </motion.button>
                      )}
                    </div>
                  );
                })()}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-white/10">
            <button
              onClick={onClose}
              className="w-full py-3 bg-gold-500/20 border border-gold-500/30 rounded-xl text-gold-500 font-bold hover:bg-primary-500/30 transition-colors"
            >
              Close
            </button>
          </div>
        </motion.div>
      </motion.div>
      )}
    </AnimatePresence>
  );
};
