import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Search, History, Filter } from 'lucide-react';

const EVENT_PATTERNS: { category: string; pattern: RegExp; icon: string }[] = [
  { category: 'purchase', pattern: /bought/i, icon: '🏪' },
  { category: 'purchase', pattern: /sold/i, icon: '💸' },
  { category: 'rent', pattern: /paid.*rent|collected.*rent/i, icon: '💵' },
  { category: 'tax', pattern: /landed on.*tax|paid.*tax/i, icon: '🧾' },
  { category: 'movement', pattern: /passed GO/i, icon: '🏁' },
  { category: 'movement', pattern: /moved to|landed on/i, icon: '📍' },
  { category: 'jail', pattern: /jail|escaped.*jail|released.*jail/i, icon: '🔒' },
  { category: 'building', pattern: /built|hotel/i, icon: '🏗️' },
  { category: 'mortgage', pattern: /mortgaged|unmortgaged/i, icon: '🏦' },
  { category: 'trade', pattern: /traded?/i, icon: '🤝' },
  { category: 'card', pattern: /card|treasury|surprise/i, icon: '🃏' },
  { category: 'dice', pattern: /rolled|dice/i, icon: '🎲' },
  { category: 'auction', pattern: /auction/i, icon: '🔨' },
  { category: 'bankruptcy', pattern: /bankrupt/i, icon: '💀' },
  { category: 'game', pattern: /won|game over|started|ended/i, icon: '🏆' },
];

const CATEGORIES = [
  { key: 'all', label: 'All' },
  { key: 'purchase', label: 'Purchases' },
  { key: 'rent', label: 'Rent' },
  { key: 'trade', label: 'Trades' },
  { key: 'card', label: 'Cards' },
  { key: 'dice', label: 'Dice' },
  { key: 'jail', label: 'Jail' },
  { key: 'building', label: 'Building' },
  { key: 'auction', label: 'Auction' },
  { category: 'bankruptcy', label: 'Bankruptcy', key: 'bankruptcy' },
] as const;

function categorizeEvent(log: string): string {
  for (const { category, pattern } of EVENT_PATTERNS) {
    if (pattern.test(log)) return category;
  }
  return 'other';
}

function getEventIcon(log: string): string {
  for (const { pattern, icon } of EVENT_PATTERNS) {
    if (pattern.test(log)) return icon;
  }
  return '📌';
}

function extractPlayerName(log: string): string {
  const match = log.match(/^(\S+(?:\s\S+)?(?:'s)?)\s/);
  return match ? match[1].replace(/'s$/, '') : '';
}

export function GameHistory({
  historyLog,
  isOpen,
  onClose,
}: {
  historyLog: string[];
  isOpen: boolean;
  onClose: () => void;
}) {
  const [activeCategory, setActiveCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const prevLengthRef = useRef(historyLog.length);

  const filteredLogs = useMemo(() => {
    return historyLog
      .map((log, originalIndex) => ({ log, originalIndex, category: categorizeEvent(log) }))
      .filter(({ log, category }) => {
        if (activeCategory !== 'all' && category !== activeCategory) return false;
        if (searchQuery) {
          const q = searchQuery.toLowerCase();
          return log.toLowerCase().includes(q);
        }
        return true;
      })
      .reverse();
  }, [historyLog, activeCategory, searchQuery]);

  const scrollToLatest = useCallback(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = 0;
    }
  }, []);

  useEffect(() => {
    if (historyLog.length > prevLengthRef.current) {
      scrollToLatest();
    }
    prevLengthRef.current = historyLog.length;
  }, [historyLog.length, scrollToLatest]);

  useEffect(() => {
    if (isOpen && searchRef.current) {
      searchRef.current.focus();
    }
  }, [isOpen]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') onClose();
  }, [onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            aria-hidden="true"
          />
          <motion.div
            className="fixed inset-y-0 right-0 w-full sm:w-96 max-w-[90vw] z-50 flex flex-col"
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          onKeyDown={handleKeyDown}
          role="dialog"
          aria-label="Game History"
          aria-modal="true"
        >
          <div
            className="flex flex-col h-full"
            style={{
              background: 'linear-gradient(180deg, rgba(15, 23, 42, 0.97) 0%, rgba(15, 23, 42, 0.95) 100%)',
              backdropFilter: 'blur(16px)',
              borderLeft: '1px solid rgba(212, 164, 55, 0.15)',
              boxShadow: '-8px 0 32px rgba(0, 0, 0, 0.5)',
            }}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-white/10">
              <div className="flex items-center gap-2">
                <History className="w-5 h-5 text-gold-500" />
                <h2 className="font-cyber text-lg font-bold text-gold-500">Game History</h2>
                <span className="text-xs text-text-muted/60 font-cyber ml-1">{historyLog.length}</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className={`p-2 rounded-lg transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center ${
                    showFilters || activeCategory !== 'all' || searchQuery
                      ? 'bg-gold-500/10 text-gold-500'
                      : 'text-text-muted hover:text-gold-500'
                  }`}
                  aria-label="Toggle filters"
                  aria-expanded={showFilters}
                >
                  <Filter className="w-4 h-4" />
                </button>
                <button
                  onClick={onClose}
                  className="p-2 rounded-lg text-text-muted hover:text-white hover:bg-white/10 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
                  aria-label="Close game history"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Filters */}
            <AnimatePresence>
              {showFilters && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden border-b border-white/10"
                >
                  <div className="p-3 space-y-3">
                    {/* Search */}
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted/50" />
                      <input
                        ref={searchRef}
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search events..."
                        className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder:text-text-muted/50 focus:outline-none focus:border-gold-500/50 focus:ring-1 focus:ring-gold-500/20"
                        aria-label="Search game events"
                      />
                      {searchQuery && (
                        <button
                          onClick={() => setSearchQuery('')}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted/50 hover:text-white"
                          aria-label="Clear search"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    {/* Category chips */}
                    <div className="flex flex-wrap gap-1.5">
                      {CATEGORIES.map((cat) => (
                        <button
                          key={cat.key}
                          onClick={() => setActiveCategory(cat.key)}
                          className={`px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors min-h-[32px] ${
                            activeCategory === cat.key
                              ? 'bg-gold-500/20 text-gold-400 border border-gold-500/30'
                              : 'bg-white/5 text-text-muted hover:text-white border border-transparent'
                          }`}
                          aria-pressed={activeCategory === cat.key}
                        >
                          {cat.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Log entries */}
            <div
              ref={scrollRef}
              className="flex-1 overflow-y-auto p-3 space-y-1"
              role="log"
              aria-label="Game event history"
              aria-live="polite"
            >
              {filteredLogs.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-32 text-text-muted/50">
                  <History className="w-8 h-8 mb-2" />
                  <p className="text-sm">
                    {searchQuery || activeCategory !== 'all'
                      ? 'No matching events'
                      : 'No events yet'}
                  </p>
                </div>
              ) : (
                filteredLogs.map(({ log, originalIndex, category }) => {
                  const isLatest = originalIndex === historyLog.length - 1;
                  const icon = getEventIcon(log);
                  const playerName = extractPlayerName(log);

                  return (
                    <motion.div
                      key={`${originalIndex}-${log.slice(0, 20)}`}
                      initial={isLatest ? { opacity: 0, x: 8 } : false}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.15 }}
                      className={`flex items-start gap-2.5 py-2 px-3 rounded-lg text-xs transition-colors ${
                        isLatest
                          ? 'bg-gold-500/5 border border-gold-500/15 text-white/90'
                          : 'hover:bg-white/5 text-white/60 border border-transparent'
                      }`}
                      role="listitem"
                    >
                      <span className="text-sm flex-shrink-0 mt-0.5" aria-hidden="true">
                        {icon}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="leading-relaxed break-words">{log}</p>
                        {playerName && (
                          <span className="inline-block mt-0.5 px-1.5 py-0.5 rounded text-[10px] bg-white/5 text-text-muted/70">
                            {category}
                          </span>
                        )}
                      </div>
                    </motion.div>
                  );
                })
              )}
            </div>

            {/* Footer */}
            <div className="p-3 border-t border-white/10 text-center">
              <p className="text-[10px] text-text-muted/40 font-cyber">
                {filteredLogs.length === historyLog.length
                  ? `${historyLog.length} events`
                  : `${filteredLogs.length} of ${historyLog.length} events`}
              </p>
            </div>
          </div>
        </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

export function GameHistoryButton({
  historyLog,
  onClick,
}: {
  historyLog: string[];
  onClick: () => void;
}) {
  return (
    <motion.button
      onClick={onClick}
      className="btn-gold-ghost px-3 py-2 rounded-xl text-xs flex items-center gap-1.5 min-h-[36px] relative"
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      title="Game History"
      aria-label={`Open game history, ${historyLog.length} events`}
    >
      <History className="w-4 h-4" />
      <span className="text-text-muted hidden sm:inline">History</span>
      {historyLog.length > 0 && (
        <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-gold-500 text-[9px] text-background font-bold flex items-center justify-center">
          {historyLog.length > 99 ? '99+' : historyLog.length}
        </span>
      )}
    </motion.button>
  );
}
