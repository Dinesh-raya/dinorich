import { motion } from 'framer-motion';
import { useEffect, useRef } from 'react';

// Activity feed — shows all game events with categorized icons
const ACTIVITY_ICONS: [RegExp, string][] = [
  [/bought/i, '🏪'],
  [/sold/i, '💸'],
  [/paid.*rent/i, '💵'],
  [/collected.*rent/i, '💰'],
  [/passed GO/i, '🏁'],
  [/landed on.*tax/i, '🧾'],
  [/paid.*tax/i, '🧾'],
  [/bankrupt/i, '💀'],
  [/won/i, '🏆'],
  [/jail/i, '🔒'],
  [/escaped.*jail|released.*jail/i, '🔓'],
  [/built|hotel/i, '🏗️'],
  [/mortgaged/i, '🏦'],
  [/unmortgaged/i, '🏧'],
  [/traded?/i, '🤝'],
  [/card|treasury|surprise/i, '🃏'],
  [/dice/i, '🎲'],
  [/auction/i, '🔨'],
  [/started/i, '▶️'],
  [/ended|game over/i, '⏹️'],
];

const getActivityIcon = (log: string): string => {
  for (const [pattern, icon] of ACTIVITY_ICONS) {
    if (pattern.test(log)) return icon;
  }
  return '📌';
};

export const CenterGameLog = ({ historyLog }: { historyLog: string[] }) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [historyLog.length]);

  if (historyLog.length === 0) return null;

  return (
    <div className="absolute bottom-[42%] left-1/2 transform -translate-x-1/2 w-[85%] max-w-xs z-[5] pointer-events-none">
      <div className="text-[9px] text-gold-500/40 font-cyber tracking-widest uppercase mb-1 px-2">
        Activity
      </div>
      <div className="rounded-lg overflow-hidden"
        style={{
          background: 'linear-gradient(180deg, rgba(15, 23, 42, 0.6) 0%, rgba(15, 23, 42, 0.3) 100%)',
          backdropFilter: 'blur(4px)',
          border: '1px solid rgba(212, 164, 55, 0.06)',
        }}
      >
      <div
        ref={scrollRef}
        className="flex flex-col gap-1 max-h-40 overflow-y-auto scrollbar-hide px-1 py-1"
        style={{ maskImage: 'linear-gradient(to bottom, transparent 0%, black 12%, black 85%, transparent 100%)' }}
      >
        {historyLog.map((log, i) => {
          const isLatest = i === historyLog.length - 1;
          if (historyLog.length > 15 && i < historyLog.length - 15) return null;
          return (
            <motion.div
              key={`${i}-${log.slice(0, 20)}`}
              initial={isLatest ? { opacity: 0, x: -8 } : false}
              animate={{ opacity: isLatest ? 1 : 0.55, x: 0, y: 0 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
            >
              <div
                className={`flex items-start gap-2 py-1 px-2 rounded text-xs ${isLatest ? 'text-white/90' : 'text-white/50'}`}
                style={isLatest ? {
                  background: 'rgba(212, 164, 55, 0.05)',
                  borderLeft: '2px solid rgba(212, 164, 55, 0.3)',
                } : {
                  borderLeft: '2px solid transparent',
                }}
              >
                <span className="text-sm flex-shrink-0 mt-0.5">
                  {getActivityIcon(log)}
                </span>
                <p className="leading-relaxed">
                  {log}
                </p>
              </div>
            </motion.div>
          );
        })}
      </div>
      </div>
    </div>
  );
};
