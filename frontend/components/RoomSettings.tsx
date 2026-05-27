import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '../stores/gameStore';
import { animations } from '../animations';
import { formatMoneyShort } from '../utils/format';
import type { QAMode } from '../stores/slices/types';

interface RoomSettingsProps {
  isOpen: boolean;
  onClose: () => void;
}

// Define settings interface based on backend schema
interface RoomSettingsType {
  max_players: number;
  starting_cash: number;
  auction_enabled: boolean;
  double_rent_enabled: boolean;
  mortgage_enabled: boolean;
  free_parking_jackpot: boolean;
  turn_timer_seconds: number;
  random_turn_order: boolean;
  jail_strict_mode: boolean;
  board_theme: string;
  mode: string;
  qa_mode?: QAMode;
}

export const RoomSettings = ({ isOpen, onClose }: RoomSettingsProps) => {
  const { room, myId, updateRoomSettings, kickPlayer } = useGameStore();
  const [saving, setSaving] = useState(false);

  // Default settings
  const defaultSettings: RoomSettingsType = {
    max_players: 6,
    starting_cash: 15000,
    auction_enabled: true,
    double_rent_enabled: true,
    mortgage_enabled: true,
    free_parking_jackpot: false,
    turn_timer_seconds: 60,
    random_turn_order: true,
    jail_strict_mode: true,
    board_theme: 'pan_india',
    mode: 'classic',
    qa_mode: {
      enabled: false,
      dice_mode: 'random',
      dice_sequence: [],
      fixed_dice: [3, 4],
      card_mode: 'random',
      card_index: 0,
      turn_timer_seconds: 0,
      auto_buy_disabled: false,
    },
  };

  // Use room settings if available, otherwise use defaults
  const [settings, setSettings] = useState<RoomSettingsType>(
    room?.settings ? { ...defaultSettings, ...room.settings } : defaultSettings
  );

  // Sync settings when room settings change
  useEffect(() => {
    if (room?.settings) {
      setSettings(prev => ({ ...prev, ...room.settings }));
    }
  }, [room?.settings]);

  const isHost = room?.host_id === myId;
  const isLocked = room?.status === 'playing';

  const MODE_PRESETS: Record<string, Partial<RoomSettingsType>> = {
    classic: {},
    casual: { double_rent_enabled: false, free_parking_jackpot: true, jail_strict_mode: false, turn_timer_seconds: 90 },
    competitive: { double_rent_enabled: true, turn_timer_seconds: 45 },
    turbo: { starting_cash: 10000, turn_timer_seconds: 30 },
    chaos: { starting_cash: 50000, free_parking_jackpot: true, double_rent_enabled: false, turn_timer_seconds: 120, auction_enabled: false, jail_strict_mode: false },
  };

  const handleSettingChange = (key: keyof RoomSettingsType, value: any) => {
    if (!isHost || isLocked) return;
    if (key === 'mode') {
      const preset = MODE_PRESETS[value as string] || {};
      setSettings({ ...defaultSettings, ...preset, mode: value as string });
    } else {
      setSettings(prev => ({ ...prev, [key]: value }));
    }
  };

  const handleSave = async () => {
    if (!isHost || isLocked || saving) return;
    setSaving(true);
    try {
      const success = await updateRoomSettings(settings);
      if (success) {
        onClose();
      }
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    if (isLocked) return;
    setSettings(defaultSettings);
  };

  const formatCurrency = (amount: number) => {
    return formatMoneyShort(amount);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-xl p-4"
        >
          <motion.div
            initial={{ scale: 0.9, y: 30, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.9, y: 30, opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="w-[95vw] max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl border-2 border-purple-500/30 shadow-2xl"
            style={{
              background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.98) 0%, rgba(30, 20, 60, 0.98) 100%)',
              boxShadow: '0 0 60px rgba(168, 85, 247, 0.15), 0 0 120px rgba(168, 85, 247, 0.05)'
            }}
          >
            {/* Header */}
            <div className="flex justify-between items-center p-4 sm:p-6 border-b border-gold-800/20">
              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-purple-300 mb-1 font-cyber">
                  ROOM SETTINGS
                </h2>
                <p className="text-text-muted text-xs sm:text-sm font-cyber">
                  Room Code: <span className="text-purple-400 font-bold tracking-widest font-mono">{room?.room_id}</span>
                </p>
              </div>

              <div className="flex items-center gap-3">
                {isHost ? (
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-purple-500/20 border border-purple-500/30">
                    <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse"></div>
                    <span className="text-purple-300 text-xs font-bold">HOST</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-surface/50 border border-white/10">
                    <span className="text-text-muted text-xs font-bold">PLAYER</span>
                  </div>
                )}

                <motion.button
                  onClick={onClose}
                  className="w-10 h-10 rounded-lg bg-surface/50 border border-white/10 text-text-muted hover:text-danger-400 hover:border-danger-500/30 transition-all flex items-center justify-center"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                >
                  ✕
                </motion.button>
              </div>
            </div>

            {isLocked ? (
              <motion.div
                className="mx-6 mt-4 p-4 rounded-xl border border-danger-500/20 bg-danger-500/5 animate-pulse"
                variants={animations.fadeIn}
              >
                <div className="flex items-center gap-3">
                  <span className="text-xl">🔒</span>
                  <div>
                    <p className="text-danger-400 font-bold text-sm font-cyber">Settings Locked — Game In Progress</p>
                    <p className="text-text-muted text-xs font-cyber">Settings cannot be modified while a game is active.</p>
                  </div>
                </div>
              </motion.div>
            ) : !isHost ? (
              <motion.div
                className="mx-6 mt-4 p-4 rounded-xl border border-warning-500/20 bg-warning-500/5"
                variants={animations.fadeIn}
              >
                <div className="flex items-center gap-3">
                  <span className="text-xl">🔒</span>
                  <div>
                    <p className="text-warning-400 font-bold text-sm font-cyber">Settings Locked</p>
                    <p className="text-text-muted text-xs font-cyber">Only the room host can modify game settings.</p>
                  </div>
                </div>
              </motion.div>
            ) : null}

            {/* Settings Grid */}
            <div className="p-4 sm:p-6 space-y-4">
              {/* Game Mode Section */}
              <motion.div
                className="panel-dark p-4 sm:p-6 rounded-2xl border border-gold-800/20"
                variants={animations.fadeIn}
                style={{
                  background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.08) 0%, rgba(15, 23, 42, 0.9) 100%)',
                  boxShadow: '0 0 30px rgba(168, 85, 247, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.05)'
                }}
              >
                <h3 className="text-base sm:text-lg font-bold text-purple-300 mb-4 sm:mb-5 flex items-center gap-2 font-cyber">
                  <span className="text-lg sm:text-xl">🎯</span>
                  GAME MODE
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 sm:gap-3">
                  {[
                    { id: 'classic', label: 'Classic', icon: '🎲', desc: 'Standard' },
                    { id: 'casual', label: 'Casual', icon: '🌴', desc: 'Relaxed rules' },
                    { id: 'competitive', label: 'Competitive', icon: '⚔️', desc: 'Fast & fierce' },
                    { id: 'turbo', label: 'Turbo', icon: '⚡', desc: 'Quick matches' },
                    { id: 'chaos', label: 'Chaos', icon: '💥', desc: 'Crazy mode' },
                  ].map(({ id, label, icon, desc }) => (
                    <motion.button
                      key={id}
                      onClick={() => handleSettingChange('mode', id)}
                      className={`relative p-3 rounded-xl border-2 transition-all ${
                        settings.mode === id
                          ? 'border-purple-500 bg-purple-500/20 shadow-lg shadow-purple-500/20'
                          : 'border-white/10 bg-surface/30 hover:border-purple-500/30'
                      }`}
                      whileHover={isHost && !isLocked ? { scale: 1.05 } : undefined}
                      whileTap={isHost && !isLocked ? { scale: 0.95 } : undefined}
                      disabled={!isHost || isLocked}
                    >
                      <div className="text-2xl mb-1">{icon}</div>
                      <div className="text-sm font-bold text-text-main">{label}</div>
                      <div className="text-[10px] text-text-muted">{desc}</div>
                    </motion.button>
                  ))}
                </div>
              </motion.div>

              {/* Game Rules Section */}
              <motion.div
                className="panel-dark p-4 sm:p-6 rounded-2xl border border-gold-800/20"
                variants={animations.fadeIn}
                style={{
                  background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.08) 0%, rgba(15, 23, 42, 0.9) 100%)',
                  boxShadow: '0 0 30px rgba(168, 85, 247, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.05)'
                }}
              >
                <h3 className="text-base sm:text-lg font-bold text-purple-300 mb-4 sm:mb-5 flex items-center gap-2 font-cyber">
                  <span className="text-lg sm:text-xl">⚙️</span>
                  GAME RULES
                </h3>

                <div className="space-y-0 divide-y divide-white/5">
                  {/* Max Players */}
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0 py-4 first:pt-0 last:pb-0">
                    <div className="flex items-center gap-3">
                      <span className="text-lg">👥</span>
                      <div>
                        <p className="font-medium text-text-main">Max Players</p>
                        <p className="text-xs text-text-muted">Maximum number of players in room</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {[2, 3, 4, 5, 6].map(num => (
                        <motion.button
                          key={num}
                          onClick={() => handleSettingChange('max_players', num)}
                          className={`w-10 h-10 sm:w-11 sm:h-11 rounded-lg font-bold text-sm transition-all ${
                            settings.max_players === num
                              ? 'bg-purple-500/30 border border-purple-500 text-purple-300 shadow-lg shadow-purple-500/20'
                              : 'bg-surface/50 border border-white/10 text-text-muted hover:border-purple-500/30'
                          }`}
                          whileHover={isHost && !isLocked ? { scale: 1.05 } : undefined}
                          whileTap={isHost && !isLocked ? { scale: 0.95 } : undefined}
                          disabled={!isHost || isLocked}
                        >
                          {num}
                        </motion.button>
                      ))}
                    </div>
                  </div>

                  {/* Starting Cash */}
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0 py-4">
                    <div className="flex items-center gap-3">
                      <span className="text-lg">💰</span>
                      <div>
                        <p className="font-medium text-text-main">Starting Cash</p>
                        <p className="text-xs text-text-muted">Initial money for each player</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <motion.button
                        onClick={() => handleSettingChange('starting_cash', Math.max(5000, settings.starting_cash - 500))}
                        className="w-10 h-10 rounded-lg bg-surface/50 border border-white/10 text-purple-300 hover:bg-purple-500/20 hover:border-purple-500/30 transition-all"
                        whileHover={isHost && !isLocked ? { scale: 1.1 } : undefined}
                        whileTap={isHost && !isLocked ? { scale: 0.9 } : undefined}
                        disabled={!isHost || isLocked || settings.starting_cash <= 5000}
                      >
                        −
                      </motion.button>

                      <div className="min-w-[80px] sm:min-w-[100px] text-center">
                        <p className="text-lg sm:text-xl font-bold text-success-400">{formatCurrency(settings.starting_cash)}</p>
                      </div>

                      <motion.button
                        onClick={() => handleSettingChange('starting_cash', Math.min(100000, settings.starting_cash + 500))}
                        className="w-10 h-10 rounded-lg bg-surface/50 border border-white/10 text-purple-300 hover:bg-purple-500/20 hover:border-purple-500/30 transition-all"
                        whileHover={isHost && !isLocked ? { scale: 1.1 } : undefined}
                        whileTap={isHost && !isLocked ? { scale: 0.9 } : undefined}
                        disabled={!isHost || isLocked || settings.starting_cash >= 100000}
                      >
                        +
                      </motion.button>
                    </div>
                  </div>

                  {/* Turn Timer */}
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0 py-4 last:pb-0">
                    <div className="flex items-center gap-3">
                      <span className="text-lg">⏱️</span>
                      <div>
                        <p className="font-medium text-text-main">Turn Timer</p>
                        <p className="text-xs text-text-muted">Seconds per turn before timeout</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {[30, 45, 60, 90, 120].map(seconds => (
                        <motion.button
                          key={seconds}
                          onClick={() => handleSettingChange('turn_timer_seconds', seconds)}
                          className={`px-2.5 py-1.5 sm:px-3 rounded-lg text-xs sm:text-sm font-medium transition-all ${
                            settings.turn_timer_seconds === seconds
                              ? 'bg-purple-500/30 border border-purple-500 text-purple-300 shadow-lg shadow-purple-500/20'
                              : 'bg-surface/50 border border-white/10 text-text-muted hover:border-purple-500/30'
                          }`}
                          whileHover={isHost && !isLocked ? { scale: 1.05 } : undefined}
                          whileTap={isHost && !isLocked ? { scale: 0.95 } : undefined}
                          disabled={!isHost || isLocked}
                        >
                          {seconds}s
                        </motion.button>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>

              {/* Game Features Section */}
              <motion.div
                className="panel-dark p-4 sm:p-6 rounded-2xl border border-gold-800/20"
                variants={animations.fadeIn}
                style={{
                  background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.08) 0%, rgba(15, 23, 42, 0.9) 100%)',
                  boxShadow: '0 0 30px rgba(168, 85, 247, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.05)'
                }}
              >
                <h3 className="text-base sm:text-lg font-bold text-purple-300 mb-4 sm:mb-5 flex items-center gap-2 font-cyber">
                  <span className="text-lg sm:text-xl">🎮</span>
                  GAMEPLAY RULES
                </h3>

                <div className="space-y-0 divide-y divide-white/5">
                  {[
                    { key: 'auction_enabled' as const, label: 'Auctions', description: 'Enable property auctions', icon: '🔨' },
                    { key: 'double_rent_enabled' as const, label: 'x2 Rent on Full Set', description: 'Double rent on monopoly properties', icon: '💎' },
                    { key: 'mortgage_enabled' as const, label: 'Mortgage', description: 'Allow property mortgaging', icon: '🏦' },
                    { key: 'free_parking_jackpot' as const, label: 'Vacation Cash', description: 'Taxes go to free parking', icon: '🏖️' },
                    { key: 'random_turn_order' as const, label: 'Randomize Order', description: 'Shuffle player order at start', icon: '🎲' },
                    { key: 'jail_strict_mode' as const, label: 'Prison Rent Rule', description: 'Enforce strict jail handling', icon: '👮' },
                  ].map(({ key, label, description, icon }) => (
                    <div key={key} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-0 py-4 first:pt-0 last:pb-0">
                      <div className="flex items-center gap-3">
                        <span className="text-lg">{icon}</span>
                        <div>
                          <p className="font-medium text-text-main">{label}</p>
                          <p className="text-xs text-text-muted">{description}</p>
                        </div>
                      </div>
                      <motion.button
                        onClick={() => handleSettingChange(key, !settings[key])}
                        role="switch"
                        aria-checked={settings[key]}
                        aria-label={label}
                        className={`relative inline-flex h-9 w-14 items-center rounded-full transition-all ${
                          settings[key]
                            ? 'bg-purple-500 shadow-lg shadow-purple-500/30'
                            : 'bg-surface border border-white/20'
                        }`}
                        whileTap={isHost && !isLocked ? { scale: 0.95 } : undefined}
                        disabled={!isHost || isLocked}
                      >
                        <span
                          className={`inline-block h-7 w-7 rounded-full bg-white shadow-md transition-transform duration-200 ${
                            settings[key] ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </motion.button>
                    </div>
                  ))}
                </div>
              </motion.div>

              {/* QA Testing Mode */}
              <motion.div
                className="panel-dark p-4 sm:p-6 rounded-2xl border border-purple-500/30"
                variants={animations.fadeIn}
                style={{
                  background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.12) 0%, rgba(15, 23, 42, 0.9) 100%)',
                  boxShadow: '0 0 30px rgba(168, 85, 247, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.05)'
                }}
              >
                <h3 className="text-base sm:text-lg font-bold text-purple-300 mb-4 sm:mb-5 flex items-center gap-2 font-cyber">
                  <span className="text-lg sm:text-xl">🧪</span>
                  QA TESTING MODE
                </h3>

                <div className="space-y-0 divide-y divide-white/5">
                  {/* QA Mode Toggle */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-0 py-4 first:pt-0 last:pb-0">
                    <div className="flex items-center gap-3">
                      <span className="text-lg">🐛</span>
                      <div>
                        <p className="font-medium text-text-main">Enable QA Mode</p>
                        <p className="text-xs text-text-muted">Deterministic testing with dice/card overrides</p>
                      </div>
                    </div>
                    <motion.button
                      onClick={() => {
                        const currentQa = settings.qa_mode || {
                          enabled: false,
                          dice_mode: 'random',
                          dice_sequence: [],
                          fixed_dice: [3, 4] as [number, number],
                          card_mode: 'random',
                          card_index: 0,
                          turn_timer_seconds: 0,
                          auto_buy_disabled: false,
                        };
                        handleSettingChange('qa_mode', { ...currentQa, enabled: !currentQa.enabled });
                      }}
                      role="switch"
                      aria-checked={settings.qa_mode?.enabled ?? false}
                      aria-label="Enable QA Mode"
                      className={`relative inline-flex h-9 w-14 items-center rounded-full transition-all ${
                        settings.qa_mode?.enabled ?? false
                          ? 'bg-purple-500 shadow-lg shadow-purple-500/30'
                          : 'bg-surface border border-white/20'
                      }`}
                      whileTap={isHost && !isLocked ? { scale: 0.95 } : undefined}
                      disabled={!isHost || isLocked}
                    >
                      <span
                        className={`inline-block h-7 w-7 rounded-full bg-white shadow-md transition-transform duration-200 ${
                          (settings.qa_mode?.enabled ?? false) ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </motion.button>
                  </div>
                </div>

                {(settings.qa_mode?.enabled ?? false) && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    className="mt-4 p-3 rounded-xl bg-purple-500/10 border border-purple-500/20"
                  >
                    <p className="text-xs text-purple-300 font-bold mb-2">QA Controls (during game):</p>
                    <ul className="text-[10px] text-text-muted space-y-1">
                      <li>- Override dice rolls (fixed values or sequence)</li>
                      <li>- Jump players to any tile</li>
                      <li>- Add/remove money from players</li>
                      <li>- Assign properties to players</li>
                      <li>- Force auctions on any property</li>
                      <li>- Send players to jail</li>
                    </ul>
                    <p className="text-[10px] text-purple-400 mt-2">
                      The QA panel button appears in-game for the host.
                    </p>
                  </motion.div>
                )}
              </motion.div>

              {/* Player Management */}
              {isHost && room?.players && (
                <motion.div
                  className="panel-dark p-4 sm:p-6 rounded-2xl border border-gold-800/20"
                  variants={animations.fadeIn}
                  style={{
                    background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.08) 0%, rgba(15, 23, 42, 0.9) 100%)',
                    boxShadow: '0 0 30px rgba(168, 85, 247, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.05)'
                  }}
                >
                  <h3 className="text-base sm:text-lg font-bold text-purple-300 mb-4 sm:mb-5 flex items-center gap-2 font-cyber">
                    <span className="text-lg sm:text-xl">👥</span>
                    PLAYER MANAGEMENT
                  </h3>

                  <div className="space-y-2">
                    {Object.values(room.players).map((player: any) => (
                      <div key={player.id} className="flex items-center justify-between p-3 rounded-xl bg-surface/30 border border-white/5 hover:border-gold-800/20 transition-all">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-9 h-9 rounded-full border-2 shadow-lg"
                            style={{
                              backgroundColor: player.color,
                              borderColor: player.color,
                              boxShadow: `0 0 12px ${player.color}40`
                            }}
                          ></div>
                          <div>
                            <p className="font-medium text-text-main">{player.name}</p>
                            <p className="text-[10px] text-text-muted font-mono">ID: {player.id.slice(0, 8)}...</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {player.id === room.host_id ? (
                            <span className="px-2.5 py-1 bg-purple-500/20 text-purple-300 text-xs rounded-full font-medium border border-purple-500/30">
                              👑 Host
                            </span>
                          ) : (
                            <motion.button
                              onClick={() => kickPlayer(player.id)}
                              className="px-3 py-1.5 bg-danger-500/10 text-danger-400 text-xs rounded-lg hover:bg-danger-500/20 transition-colors border border-danger-500/20"
                              whileHover={!isLocked ? { scale: 1.05 } : undefined}
                              whileTap={!isLocked ? { scale: 0.95 } : undefined}
                              disabled={isLocked}
                            >
                              Kick
                            </motion.button>
                          )}

                          <div className={`w-2.5 h-2.5 rounded-full ${player.connected ? 'bg-success-500 animate-pulse' : 'bg-danger-500'}`}
                            style={{ boxShadow: player.connected ? '0 0 8px rgba(34, 197, 94, 0.5)' : '0 0 8px rgba(239, 68, 68, 0.5)' }}
                          ></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-0 p-4 sm:p-6 border-t border-gold-800/20">
              <p className="text-[10px] sm:text-xs text-text-muted order-2 sm:order-1">
                {isLocked ? 'Settings are read-only during gameplay.' : 'Settings affect all players. Changes take effect immediately.'}
              </p>

              <div className="flex gap-2 sm:gap-3 w-full sm:w-auto order-1 sm:order-2">
                {!isLocked && (
                  <>
                    <motion.button
                      onClick={handleReset}
                      className="flex-1 sm:flex-none px-4 sm:px-5 py-2.5 rounded-xl bg-surface/50 border border-white/10 text-text-muted hover:bg-white/10 hover:border-white/20 transition-all text-sm"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      disabled={!isHost}
                    >
                      Reset
                    </motion.button>

                    <motion.button
                      onClick={handleSave}
                      className="flex-1 sm:flex-none px-5 sm:px-6 py-2.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                      style={{
                        background: 'linear-gradient(135deg, #a855f7 0%, #7c3aed 100%)',
                        boxShadow: '0 4px 14px rgba(168, 85, 247, 0.3)'
                      }}
                      whileHover={!saving ? { scale: 1.02, boxShadow: '0 6px 20px rgba(168, 85, 247, 0.4)' } : undefined}
                      whileTap={!saving ? { scale: 0.98 } : undefined}
                      disabled={!isHost || saving}
                    >
                      {saving ? '⏳ Saving...' : '💾 Save'}
                    </motion.button>
                  </>
                )}
                {isLocked && (
                  <motion.button
                    onClick={onClose}
                    className="flex-1 sm:flex-none px-5 sm:px-6 py-2.5 rounded-xl font-bold text-sm transition-all bg-purple-500/20 border border-purple-500 text-purple-300 shadow-lg shadow-purple-500/20"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    Close
                  </motion.button>
                )}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};