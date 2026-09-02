import { create } from 'zustand';

export type ToastTone = 'success' | 'danger' | 'info';

export interface Toast {
  readonly id: string;
  readonly message: string;
  readonly tone: ToastTone;
}

interface UiState {
  readonly toasts: readonly Toast[];
  readonly showToast: (message: string, tone?: ToastTone) => void;
  readonly dismissToast: (id: string) => void;
}

export const useUiStore = create<UiState>((set, get) => ({
  toasts: [],
  showToast: (message, tone = 'info') => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    set({ toasts: [...get().toasts, { id, message, tone }] });
    setTimeout(() => get().dismissToast(id), 3500);
  },
  dismissToast: (id) => set({ toasts: get().toasts.filter((toast) => toast.id !== id) }),
}));
