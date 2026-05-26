import { motion } from 'framer-motion';
import { memo } from 'react';
import { animations } from '../animations';
import { formatMoneyShort } from '../utils/format';

export interface BoardTileProps {
  tile: any;
  pos: { gridRow: number; gridColumn: number };
  isCorner: boolean;
  isSide: boolean;
  ownerId: string | undefined;
  houses: number;
  hotels: number;
  isMortgaged: boolean;
  hasMonopolyOnTile: boolean;
  tileColor: string;
  tileIcon: string | null;
  playerColor: string | undefined;
  playerName: string | undefined;
  ownerIcon: string;
  isLandingTile: boolean;
  isMyTile: boolean;
  isMobile: boolean;
  onTileClick: (id: number) => void;
}

const MOBILE_TILE_ABBREVIATIONS: Record<string, string> = {
  'Guwahati': 'GUW', 'Goa': 'GOA', 'Ahmedabad': 'AMD', 'Pune': 'PUN',
  'Hyderabad': 'HYD', 'Jaipur': 'JAI', 'Chandigarh': 'CHD', 'Lucknow': 'LKO',
  'Kochi': 'KOC', 'Thiruvananthapuram': 'TVM', 'Bengaluru': 'BLR',
  'Mysuru': 'MYS', 'Delhi': 'DEL', 'Kolkata': 'KOL', 'Mumbai': 'MUM',
  'Chennai': 'CHN', 'Visakhapatnam': 'VIZ', 'Varanasi': 'VNS',
  'Amritsar': 'ASR', 'NTPC Power': 'NTPC', 'Delhi Airport': 'DEL✈',
  'Mumbai Airport': 'BOM✈', 'Chennai Airport': 'MAA✈',
  'Kolkata Airport': 'CCU✈', 'Income Tax': 'TAX', 'Luxury Tax': 'LUX',
  'Surprise': '❓', 'Treasury': '🏛️', 'Jail': 'JAIL',
  'Free Parking': 'PARK', 'Go to Jail': 'G2J', 'GO': 'GO',
};

const getMobileTileName = (name: string) => {
  return MOBILE_TILE_ABBREVIATIONS[name] || name.substring(0, 3).toUpperCase();
};

export const BoardTile = memo(({
  tile, pos, isCorner, isSide, ownerId, houses, hotels,
  isMortgaged, hasMonopolyOnTile, tileColor, tileIcon,
  playerColor, playerName, ownerIcon, isLandingTile, isMyTile, isMobile, onTileClick
}: BoardTileProps) => {
  return (
    <motion.div
      className={`flex flex-col relative overflow-hidden cursor-pointer ${
        isCorner ? 'p-1.5 justify-center items-center' : ''
      } ${hasMonopolyOnTile ? 'monopoly-glow' : ''}`}
      style={{
        ...pos,
        border: isCorner
          ? '2px solid rgba(34, 211, 238, 0.4)'
          : ownerId
          ? `2px solid ${playerColor ? playerColor + 'cc' : 'rgba(255, 255, 255, 0.15)'}`
          : isSide
          ? '1px solid rgba(255, 255, 255, 0.15)'
          : '1px solid rgba(255, 255, 255, 0.08)',
        background: isCorner
          ? 'linear-gradient(135deg, rgba(15, 23, 42, 0.9) 0%, rgba(30, 41, 59, 0.9) 100%)'
          : ownerId
          ? `linear-gradient(135deg, rgba(15, 23, 42, 0.85) 0%, rgba(30, 41, 59, 0.85) 100%)`
          : 'rgba(15, 23, 42, 0.85)',
        boxShadow: isLandingTile
          ? '0 0 15px rgba(34, 211, 238, 0.4), inset 0 0 10px rgba(34, 211, 238, 0.1)'
          : ownerId && playerColor
            ? `0 0 8px ${playerColor}40, inset 0 0 4px ${playerColor}15`
            : undefined,
        outline: ownerId && !isCorner
          ? `1px solid ${playerColor || 'rgba(255, 255, 255, 0.15)'}40`
          : undefined,
        outlineOffset: '-3px',
        transition: 'all 0.2s ease'
      }}
      variants={animations.fadeIn}
      whileTap={{ scale: 0.95, zIndex: 20 }}
      whileHover={{
        scale: 1.05,
        zIndex: 20,
        transition: { duration: 0.15 },
        boxShadow: ownerId
          ? `0 0 25px ${playerColor || 'rgba(34, 211, 238, 0.4)'}80, 0 0 10px ${playerColor || 'rgba(34, 211, 238, 0.2)'}`
          : '0 0 20px rgba(34, 211, 238, 0.2)',
        borderColor: ownerId ? `${playerColor || '#22d3ee'}` : 'rgba(34, 211, 238, 0.5)'
      }}
      transition={{ duration: 0.15 }}
      onClick={() => onTileClick(tile.id)}
    >
      {/* Landing glow effect */}
      {isLandingTile && (
        <motion.div
          className="absolute inset-0 z-10 pointer-events-none rounded-2xl"
          initial={{ boxShadow: '0 0 0px rgba(34, 211, 238, 0)' }}
          animate={{
            boxShadow: [
              '0 0 0px rgba(34, 211, 238, 0)',
              '0 0 30px rgba(34, 211, 238, 0.6), inset 0 0 20px rgba(34, 211, 238, 0.15)',
              '0 0 0px rgba(34, 211, 238, 0)'
            ]
          }}
          transition={{ duration: 1.2, ease: 'easeOut' }}
        />
      )}

      {/* Owned by me pulse */}
      {isMyTile && !isLandingTile && (
        <motion.div
          className="absolute inset-0 z-10 pointer-events-none rounded-2xl"
          animate={{
            boxShadow: [
              '0 0 0px rgba(34, 211, 238, 0)',
              '0 0 8px rgba(34, 211, 238, 0.2)',
              '0 0 0px rgba(34, 211, 238, 0)'
            ]
          }}
          transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
        />
      )}

      {/* Color bar for properties */}
      {!isCorner && tile.color && (
        <div
          className={`${isMobile ? 'h-3' : 'h-5'} w-full relative ${hasMonopolyOnTile ? 'border-b-2 border-yellow-400' : 'border-b border-white/10'}`}
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
          className={`${isMobile ? 'h-3' : 'h-4'} w-full border-b border-white/10 flex items-center justify-center`}
          style={{ backgroundColor: tileColor }}
        >
          {tileIcon && <span className="text-xs">{tileIcon}</span>}
        </div>
      )}

      <div className={`flex-1 flex flex-col items-center text-center px-0.5 ${isCorner ? '' : 'justify-between py-0.5'}`}>
        {isCorner && tileIcon && (
          <span className={`${isMobile ? 'text-base' : 'text-lg md:text-2xl'} mb-0.5`}>{tileIcon}</span>
        )}

        {!isCorner && tile.type === 'property' && !isMobile && (
          <span className="text-xs md:text-sm mb-0.5">🇮🇳</span>
        )}

        {/* Tile name: full on desktop, abbreviated on mobile */}
        {isCorner ? (
          <span className={`${isMobile ? 'text-[8px]' : 'text-xs md:text-sm'} font-bold leading-tight text-gold-500`}>
            {isMobile ? getMobileTileName(tile.name) : tile.name}
          </span>
        ) : (
          <span className={`${isMobile ? 'text-[7px] leading-[1.1] text-white/80' : 'text-[9px] md:text-[10px] leading-tight text-white/90 truncate mt-0.5'} font-medium`}>
            {isMobile ? getMobileTileName(tile.name) : tile.name}
          </span>
        )}

        {tile.price && (
          <span className={`${isMobile ? 'text-[6px] leading-none' : 'text-[8px] md:text-[9px] mt-0.5'} text-gold-500/80 font-bold`}>
            {isMobile ? `₹${tile.price}` : formatMoneyShort(tile.price)}
          </span>
        )}

        {/* House/Hotel indicators */}
        {(houses > 0 || hotels > 0) && (
          <motion.div
            className={`flex flex-wrap justify-center gap-0.5 ${isMobile ? '' : 'mt-0.5'}`}
            variants={animations.scaleIn}
          >
            {hotels > 0 ? (
              <div className="relative">
                <div className={`${isMobile ? 'w-2.5 h-2.5' : 'w-3 h-3 md:w-4 md:h-4'} bg-red-500 rounded-sm shadow-lg`}
                  style={{ boxShadow: '0 0 6px rgba(239, 68, 68, 0.6)' }}
                ></div>
              </div>
            ) : (
              Array.from({ length: Math.min(houses, 4) }).map((_, i) => (
                <div
                  key={i}
                  className={`${isMobile ? 'w-1.5 h-1.5' : 'w-2 h-2 md:w-2.5 md:h-2.5'} bg-green-500 rounded-sm shadow`}
                  style={{ boxShadow: '0 0 4px rgba(34, 197, 94, 0.5)' }}
                ></div>
              ))
            )}
          </motion.div>
        )}

        {/* Owner indicator */}
        {ownerId && ownerIcon && (
          <div className={`absolute ${isMobile ? 'top-0 right-0 text-sm' : 'top-0.5 right-0.5 text-[10px]'} z-20 drop-shadow-lg`}
            title={`Owned by ${playerName}`}>
            {ownerIcon}
          </div>
        )}

        {/* Mortgaged indicator */}
        {isMortgaged && (
          <motion.div
            className={`absolute top-0.5 left-0.5 ${isMobile ? 'w-2.5 h-2.5' : 'w-3 h-3 md:w-4 md:h-4'} bg-gray-700 rounded-full border border-white/50 shadow-lg z-20 flex items-center justify-center`}
            title="Mortgaged"
            variants={animations.scaleIn}
          >
            <span className={`text-white ${isMobile ? 'text-[8px]' : 'text-xs'} font-bold`}>M</span>
          </motion.div>
        )}

        {/* Monopoly crown indicator */}
        {hasMonopolyOnTile && (
          <motion.div
            className={`absolute ${isMobile ? '-top-0.5' : '-top-1'} left-1/2 transform -translate-x-1/2 z-30`}
            variants={animations.float}
            animate="visible"
          >
            <span className={`text-yellow-400 ${isMobile ? 'text-[8px]' : 'text-xs'} drop-shadow-lg`}>👑</span>
          </motion.div>
        )}

        {/* Monopoly gold glow overlay */}
        {hasMonopolyOnTile && (
          <div
            className="absolute inset-0 rounded-lg pointer-events-none z-10"
            style={{
              boxShadow: 'inset 0 0 8px rgba(212, 164, 55, 0.2)',
              border: '1px solid rgba(212, 164, 55, 0.2)',
            }}
          />
        )}
      </div>
    </motion.div>
  );
});
BoardTile.displayName = 'BoardTile';
