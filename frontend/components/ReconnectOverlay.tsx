import { motion } from 'framer-motion';

interface ReconnectOverlayProps {
  connected: boolean;
  hasRoom: boolean;
}

export function ReconnectOverlay({ connected, hasRoom }: ReconnectOverlayProps) {
  if (connected || !hasRoom) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-md">
      <motion.div
        className="glass-panel-dark p-8 rounded-3xl border-2 border-danger-500/30 max-w-sm w-full text-center shadow-2xl mx-4"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
      >
        <motion.div
          className="text-6xl mb-6 flex justify-center"
          animate={{
            scale: [1, 1.2, 1],
            rotate: [0, 15, -15, 0]
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        >
          ⚡
        </motion.div>
        
        <h2 className="heading-cyber text-2xl font-bold text-danger-400 neon-glow-danger mb-3 font-cyber">
          CONNECTION LOST
        </h2>
        
        <p className="text-text-muted text-sm mb-6 leading-relaxed font-cyber">
          Hang tight! Reconnecting you to your Dino-Richup game lobby...
        </p>

        <div className="flex justify-center items-center gap-2 mb-4">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="w-3.5 h-3.5 bg-danger-500 rounded-full"
              animate={{
                scale: [1, 1.6, 1],
                opacity: [0.4, 1, 0.4]
              }}
              transition={{
                duration: 1,
                repeat: Infinity,
                delay: i * 0.2,
                ease: "easeInOut"
              }}
            />
          ))}
        </div>

        <span className="text-[10px] text-text-muted font-cyber uppercase tracking-widest animate-pulse">
          Attempting to reconnect...
        </span>
      </motion.div>
    </div>
  );
}
