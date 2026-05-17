import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
  duration?: number;
}

let addToastFn: ((toast: Omit<Toast, 'id'>) => void) | null = null;

export const showToast = (message: string, type: Toast['type'] = 'info', duration = 3000) => {
  if (addToastFn) {
    addToastFn({ message, type, duration });
  }
};

export const ToastContainer = () => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((toast: Omit<Toast, 'id'>) => {
    const id = Math.random().toString(36).slice(2);
    setToasts(prev => [...prev, { ...toast, id }]);
  }, []);

  useEffect(() => {
    addToastFn = addToast;
    return () => {
      addToastFn = null;
    };
  }, [addToast]);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-3 max-w-sm">
      <AnimatePresence>
        {toasts.map(toast => (
          <ToastItem key={toast.id} toast={toast} onRemove={removeToast} />
        ))}
      </AnimatePresence>
    </div>
  );
};

const ToastItem = ({ toast, onRemove }: { toast: Toast; onRemove: (id: string) => void }) => {
  useEffect(() => {
    const timer = setTimeout(() => onRemove(toast.id), toast.duration || 3000);
    return () => clearTimeout(timer);
  }, [toast.id, toast.duration, onRemove]);

  const bgColors = {
    success: 'bg-success-500/90 border-success-400',
    error: 'bg-danger-500/90 border-danger-400',
    info: 'bg-primary-500/90 border-primary-400',
    warning: 'bg-accent-500/90 border-accent-400',
  };

  const icons = {
    success: '✓',
    error: '✕',
    info: 'ℹ',
    warning: '⚠',
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 100, scale: 0.9 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 100, scale: 0.9 }}
      transition={{ type: 'spring', damping: 20 }}
      className={`${bgColors[toast.type]} backdrop-blur-xl border rounded-xl p-4 shadow-2xl cursor-pointer`}
      onClick={() => onRemove(toast.id)}
    >
      <div className="flex items-center gap-3">
        <span className="text-xl font-bold">{icons[toast.type]}</span>
        <p className="text-sm font-medium text-white flex-1">{toast.message}</p>
      </div>
    </motion.div>
  );
};
