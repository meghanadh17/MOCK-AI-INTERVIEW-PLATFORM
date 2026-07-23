import * as React from "react"

export interface Toast {
  id: string;
  title?: string;
  description?: string;
  type?: 'default' | 'success' | 'error' | 'warning' | 'info';
  duration?: number;
}

type ToastListener = (toasts: Toast[]) => void;
let listeners: ToastListener[] = [];
let toasts: Toast[] = [];

const notifyListeners = () => {
  listeners.forEach((listener) => listener([...toasts]));
};

export const toast = (props: Omit<Toast, 'id'>) => {
  const id = Math.random().toString(36).substring(2, 9);
  const newToast: Toast = { id, ...props };
  toasts = [...toasts, newToast];
  notifyListeners();

  if (newToast.duration !== Infinity) {
    setTimeout(() => {
      toasts = toasts.filter((t) => t.id !== id);
      notifyListeners();
    }, newToast.duration || 4000);
  }

  return {
    id,
    dismiss: () => {
      toasts = toasts.filter((t) => t.id !== id);
      notifyListeners();
    }
  };
};

export function useToast() {
  const [activeToasts, setActiveToasts] = React.useState<Toast[]>(toasts);

  React.useEffect(() => {
    const listener = (newToasts: Toast[]) => {
      setActiveToasts(newToasts);
    };
    listeners.push(listener);
    return () => {
      listeners = listeners.filter((l) => l !== listener);
    };
  }, []);

  return {
    toasts: activeToasts,
    toast,
    dismiss: (id: string) => {
      toasts = toasts.filter((t) => t.id !== id);
      notifyListeners();
    }
  };
}
