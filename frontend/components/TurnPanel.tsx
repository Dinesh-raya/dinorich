import { motion, AnimatePresence } from 'framer-motion';
import { animations } from '../animations';
import { soundManager } from '../utils/audio';
import { formatMoney } from '../utils/format';
import { DiceAnim } from './DiceAnim';
import { useGameStore } from '../stores/gameStore';

export interface TurnPanelProps {
  isMobile: boolean;
  turn: any;
  myId: string | null;
  game: any;
  isRolling: boolean;
  diceValues: { die1: number; die2: number };
  moneyChange: { amount: number; timestamp: number } | null;
  pendingAction: string | null;
  handleRollDice: () => void;
  setIsRolling: (rolling: boolean) => void;
}

export const TurnPanel = ({
  isMobile,
  turn,
  myId,
  game,
  isRolling,
  diceValues,
  moneyChange,
  pendingAction,
  handleRollDice,
  setIsRolling,
}: TurnPanelProps) => {
  const currentDice = diceValues;

  return (
    <div
      className={
        isMobile
          ? "absolute bottom-[76px] left-1/2 transform -translate-x-1/2 w-[92%] max-w-md z-30"
          : "absolute bottom-4 left-1/2 transform -translate-x-1/2 w-[92%] max-w-md mx-auto z-10"
      }
    >
      {turn?.active_player_id === myId ? (
        <motion.div
          key={`${isMobile ? 'mobile-' : ''}turn-${turn?.active_player_id}`}
          className={`panel-dark rounded-xl shadow-2xl border border-gold-500/10 ${isMobile ? 'p-3 md:p-4' : 'p-3 md:p-4'}`}
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
        >
          <div className={`flex flex-col items-center ${isMobile ? 'gap-2' : 'gap-3'}`}>
            <div className="text-center mb-2">
              <motion.div
                className="inline-block px-4 py-1 rounded-full mb-1"
                style={{
                  background: 'linear-gradient(135deg, rgba(212, 164, 55, 0.2), rgba(212, 164, 55, 0.05))',
                  border: '1px solid rgba(212, 164, 55, 0.3)',
                }}
                animate={{
                  boxShadow: [
                    '0 0 10px rgba(212, 164, 55, 0.1)',
                    '0 0 20px rgba(212, 164, 55, 0.2)',
                    '0 0 10px rgba(212, 164, 55, 0.1)',
                  ]
                }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <span className="text-gold-500 text-xs font-cyber font-bold tracking-[0.2em]">YOUR TURN</span>
              </motion.div>
            </div>

            {/* Turn timer bar */}
            {turn?.time_remaining != null && game?.room?.settings?.turn_timer_seconds && (
              <div className="w-full max-w-xs">
                <div className="flex justify-between items-center text-xs mb-1">
                  <span className="text-text-muted">Time</span>
                  <span className={`font-mono font-bold ${
                    turn.time_remaining <= 10 ? 'text-danger-400' :
                    turn.time_remaining <= 20 ? 'text-warning-400' :
                    'text-gold-500'
                  }`}>
                    {Math.floor(turn.time_remaining / 60)}:{(turn.time_remaining % 60).toString().padStart(2, '0')}
                  </span>
                </div>
                <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full rounded-full"
                    style={{
                      background: turn.time_remaining <= 10
                        ? 'linear-gradient(90deg, #ef4444, #f87171)'
                        : turn.time_remaining <= 20
                        ? 'linear-gradient(90deg, #f59e0b, #fbbf24)'
                        : 'linear-gradient(90deg, #22d3ee, #a855f7)'
                    }}
                    initial={{ width: '100%' }}
                    animate={{ width: `${(turn.time_remaining / game.room.settings.turn_timer_seconds) * 100}%` }}
                    transition={{ duration: 0.5 }}
                  />
                </div>
              </div>
            )}

            {/* Enhanced Dice Display */}
            <div className="my-1">
              <DiceAnim
                die1={currentDice.die1}
                die2={currentDice.die2}
                isRolling={isRolling}
                onRollComplete={() => setIsRolling(false)}
                size={isMobile ? "sm" : "md"}
                showTotal={!isRolling}
              />
            </div>

            {/* Floating money change indicator */}
            <AnimatePresence>
              {moneyChange && (
                <motion.div
                  key={moneyChange.timestamp}
                  className="text-center"
                  initial={{ opacity: 0, y: 10, scale: 0.8 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -30, scale: 1.2 }}
                  transition={{ type: 'spring', damping: 15, stiffness: 200 }}
                >
                  <span className={`text-2xl md:text-3xl font-black drop-shadow-lg ${
                    moneyChange.amount > 0 ? 'text-green-400' : 'text-red-400'
                  }`}>
                    {moneyChange.amount > 0 ? '+' : ''}{formatMoney(moneyChange.amount)}
                  </span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Debt warning — player must resolve or bankrupt */}
            {turn.in_debt && (
              <motion.div
                className="flex flex-col items-center gap-2 w-full"
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
              >
                <div className="px-4 py-2 rounded-xl border border-red-500/40 bg-red-500/10 text-center w-full">
                  <p className="text-red-400 text-sm font-bold">IN DEBT — ₹{Math.abs(game.room.players[myId!]?.money || 0)} owed</p>
                  <p className="text-red-300/70 text-xs mt-1">Trade, mortgage, or sell to resolve. Or declare bankruptcy.</p>
                </div>
                <motion.button
                  className="btn-gold py-2.5 px-5 text-xs md:text-sm font-bold rounded-full bg-red-600 hover:bg-red-500 border-red-500 w-full"
                  onClick={() => {
                    soundManager.playButtonClick();
                    useGameStore.getState().declareBankruptcy();
                  }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  disabled={!!pendingAction}
                >
                  {pendingAction === 'declareBankruptcy' ? 'PROCESSING...' : 'DECLARE BANKRUPTCY'}
                </motion.button>
              </motion.div>
            )}

            {/* Jail actions */}
            {myId && game.room.players[myId]?.is_in_jail && turn.can_roll && !turn.in_debt && (
              <motion.div
                className="flex flex-col items-center gap-2"
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
              >
                <div className="px-4 py-1.5 rounded-xl border border-warning-500/40 bg-warning-500/10 text-center">
                  <p className="text-warning-400 text-xs md:text-sm font-bold">IN JAIL</p>
                  <p className="text-warning-300/70 text-xs mt-0.5">Pay fine, use card, or roll for doubles</p>
                </div>
                <div className="flex gap-2 flex-wrap justify-center">
                  <motion.button
                    className="flex-1 py-2.5 btn-danger-action font-bold text-sm rounded-xl min-h-[44px]"
                    onClick={() => {
                      soundManager.playButtonClick();
                      useGameStore.getState().payJailFine();
                    }}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    disabled={!!pendingAction}
                  >
                    {pendingAction === 'payJailFine' ? 'PAYING...' : 'PAY FINE (₹500)'}
                  </motion.button>
                  {(game.room.players[myId]?.get_out_of_jail_cards ?? 0) > 0 && (
                    <motion.button
                      className="flex-1 py-2.5 btn-gold-ghost font-bold text-sm rounded-xl border border-gold-500/20 min-h-[44px]"
                      onClick={() => {
                        soundManager.playButtonClick();
                        useGameStore.getState().useJailCard();
                      }}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      disabled={!!pendingAction}
                    >
                      {pendingAction === 'useJailCard' ? 'USING...' : `USE CARD (${game.room.players[myId]?.get_out_of_jail_cards})`}
                    </motion.button>
                  )}
                </div>
              </motion.div>
            )}

            {turn.can_roll && !isRolling && !turn.in_debt && (
              <motion.button
                className="w-full py-3 md:py-4 font-bold text-sm md:text-base rounded-xl min-h-[44px] relative overflow-hidden transition-all duration-300 flex items-center justify-center gap-2"
                style={{
                  background: 'linear-gradient(135deg, #d4a437 0%, #b8892e 50%, #d4a437 100%)',
                  color: '#0a0e1a',
                  boxShadow: '0 0 20px rgba(212, 164, 55, 0.3), 0 4px 12px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.15)',
                  textShadow: '0 1px 0 rgba(255,255,255,0.1)',
                  letterSpacing: '0.1em',
                }}
                onClick={handleRollDice}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                disabled={isRolling || !!pendingAction}
              >
                <span className="text-sm md:text-lg">🎲</span>
                {myId && game.room.players[myId]?.is_in_jail ? 'ROLL FOR DOUBLES' : 'ROLL DICE'}
              </motion.button>
            )}

            {turn.can_end_turn && !turn.in_debt && (
              <motion.button
                className="w-full py-2.5 btn-gold-ghost font-bold text-sm rounded-xl border border-gold-500/30 min-h-[44px]"
                onClick={() => {
                  soundManager.playButtonClick();
                  useGameStore.getState().endTurn();
                }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                disabled={!!pendingAction}
              >
                {pendingAction === 'endTurn' ? 'ENDING...' : 'END TURN'}
              </motion.button>
            )}

            {/* Tax choice */}
            {turn.pending_tax && myId && (
              <motion.div
                className="flex flex-col items-center gap-2"
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
              >
                <div className="px-4 py-1.5 rounded-xl border border-danger-500/40 bg-danger-500/10 text-center">
                  <p className="text-danger-400 text-xs md:text-sm font-bold">{turn.pending_tax.name}</p>
                  <p className="text-danger-300/70 text-xs md:text-sm mt-0.5">Choose payment method</p>
                </div>
                <div className="flex gap-2 flex-wrap justify-center">
                  <motion.button
                    className="btn-gold-ghost py-2 px-4 text-xs md:text-sm border-danger-500/30 text-danger-400"
                    onClick={() => {
                      soundManager.playButtonClick();
                      useGameStore.getState().payTax(false);
                    }}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    PAY ₹{turn.pending_tax.amount?.toLocaleString()}
                  </motion.button>
                  <motion.button
                    className="btn-gold-ghost py-2 px-4 text-xs md:text-sm border-warning-500/30 text-warning-400"
                    onClick={() => {
                      soundManager.playButtonClick();
                      useGameStore.getState().payTax(true);
                    }}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    PAY 10% OF WORTH
                  </motion.button>
                </div>
              </motion.div>
            )}

            {turn.phase === 'buy' && (
              <motion.div
                className="mt-1 text-center"
                variants={animations.fadeIn}
              >
                <p className="text-text-muted text-xs md:text-sm mb-2">Buy this property?</p>
                <div className="flex gap-2">
                  <motion.button
                    className="flex-1 py-2.5 font-bold text-sm rounded-xl min-h-[44px] relative overflow-hidden disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{
                      background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.2) 0%, rgba(22, 163, 74, 0.15) 100%)',
                      border: '1px solid rgba(34, 197, 94, 0.3)',
                      color: '#86efac',
                    }}
                    onClick={() => {
                      const me = game.room.players[myId!];
                      useGameStore.getState().buyProperty(me.position);
                    }}
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    disabled={!!pendingAction}
                  >
                    {pendingAction === 'buyProperty' ? 'BUYING...' : 'BUY'}
                  </motion.button>
                  {game.room.settings?.auction_enabled !== false && (
                    <motion.button
                      className="flex-1 py-2.5 btn-gold-ghost font-bold text-sm rounded-xl min-h-[44px] border border-gold-500/20"
                      onClick={() => {
                        const me = game.room.players[myId!];
                        soundManager.playAuctionBid();
                        useGameStore.getState().startAuction(me.position);
                      }}
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.97 }}
                      disabled={!!pendingAction}
                    >
                      {pendingAction === 'startAuction' ? 'STARTING...' : 'AUCTION'}
                    </motion.button>
                  )}
                </div>
              </motion.div>
            )}
          </div>
        </motion.div>
      ) : (
        <motion.div
          key={`${isMobile ? 'mobile-' : ''}waiting-${turn?.active_player_id}`}
          className={`panel-dark rounded-xl text-center border border-white/10 ${isMobile ? 'p-3' : 'p-4'}`}
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          <div className="text-center text-sm font-cyber">
            <div className="text-gold-500/40 text-xs tracking-wider uppercase mb-1">Waiting</div>
            <div className="text-text-muted">
              <span className="text-gold-500/70 font-medium">{game.room.players[turn?.active_player_id || '']?.name}</span> is playing...
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
};
