/**
 * Simple toast hook for notifications
 */
import { useState } from 'react';

export interface ToastProps {
  title: string;
  description?: string;
  variant?: 'default' | 'destructive';
}

export function useToast() {
  const [toasts, setToasts] = useState<ToastProps[]>([]);

  const toast = (props: ToastProps) => {
    // For now, just use console and browser notifications
    console.log(`[Toast] ${props.title}: ${props.description || ''}`);
    
    // Try to use browser notifications if available
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(props.title, {
        body: props.description,
        icon: '/favicon.ico',
      });
    } else if ('Notification' in window && Notification.permission !== 'denied') {
      Notification.requestPermission().then(permission => {
        if (permission === 'granted') {
          new Notification(props.title, {
            body: props.description,
            icon: '/favicon.ico',
          });
        }
      });
    }

    // Add to state for potential UI rendering
    setToasts(prev => [...prev, props]);
    
    // Remove after delay
    setTimeout(() => {
      setToasts(prev => prev.slice(1));
    }, 5000);
  };

  return { toast, toasts };
}