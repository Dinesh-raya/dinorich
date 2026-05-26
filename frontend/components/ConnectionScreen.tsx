import { motion } from 'framer-motion';
import { Globe } from 'lucide-react';

// Connection Loading Screen
export function ConnectionScreen({ error }: { error: string | null }) {
  return (
    <div className="flex h-screen items-center justify-center bg-background">
      <motion.div
        className="text-center"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
      >
        <motion.div
          className="text-7xl mb-6"
          animate={{ rotate: [0, 10, -10, 0], scale: [1, 1.1, 1] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        >
          <Globe className="w-6 h-6 mx-auto text-gold-500" />
        </motion.div>
        <h1 className="text-3xl font-bold text-gold-500 mb-3 font-cyber">Connecting to Server</h1>
        {error ? (
          <p className="text-danger-400 font-cyber mb-2">{error}</p>
        ) : (
          <p className="text-text-muted font-cyber">Establishing secure connection...</p>
        )}
        <div className="mt-6 flex justify-center">
          <div className="w-48 h-1 bg-surface rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-gold-500 to-gold-700 rounded-full"
              animate={{ x: ['-100%', '100%'] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
              style={{ width: '50%' }}
            />
          </div>
        </div>
      </motion.div>
    </div>
  );
}
