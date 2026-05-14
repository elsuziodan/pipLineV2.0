"use client";

import { useEffect, useState } from 'react';

export type ToastType = 'success' | 'info' | 'warning' | 'error';

interface ToastMessage {
  id: number;
  message: string;
  type: ToastType;
}

// Global emitter for toasts
type ToastListener = (toast: Omit<ToastMessage, 'id'>) => void;
const listeners = new Set<ToastListener>();

export const toast = {
  success: (message: string) => listeners.forEach(l => l({ message, type: 'success' })),
  info: (message: string) => listeners.forEach(l => l({ message, type: 'info' })),
  warning: (message: string) => listeners.forEach(l => l({ message, type: 'warning' })),
  error: (message: string) => listeners.forEach(l => l({ message, type: 'error' })),
};

export function Toaster() {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  useEffect(() => {
    let idCounter = 0;
    const listener: ToastListener = (toastMsg) => {
      const id = ++idCounter;
      setToasts(prev => [...prev, { ...toastMsg, id }]);
      
      // Auto dismiss after 3 seconds
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== id));
      }, 3000);
    };

    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-[80px] right-4 md:bottom-6 md:right-6 z-[100] flex flex-col gap-2 pointer-events-none">
      {toasts.map(t => (
        <div 
          key={t.id} 
          className="toast pointer-events-auto"
          style={{
            borderColor: 
              t.type === 'success' ? '#BBF7D0' : 
              t.type === 'warning' ? '#FDE68A' : 
              t.type === 'error' ? '#FECACA' : 
              '#BFDBFE',
            boxShadow: 'var(--shadow-elevated)'
          }}
        >
          <div className="flex items-center gap-2">
            <span style={{ 
              color: 
                t.type === 'success' ? 'var(--color-success)' : 
                t.type === 'warning' ? 'var(--color-warning)' : 
                t.type === 'error' ? 'var(--color-danger)' : 
                'var(--color-accent-aqua)'
            }}>
              {t.type === 'success' ? '✓' : t.type === 'warning' ? '⚠' : t.type === 'error' ? '✕' : 'ℹ'}
            </span>
            <span className="text-[13px] font-medium text-[var(--color-text-primary)]">
              {t.message}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
