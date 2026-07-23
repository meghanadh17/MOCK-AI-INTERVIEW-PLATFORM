import { create } from 'zustand';
interface UIState {
  theme: 'dark' | 'light';
  sidebarCollapsed: boolean;
  setTheme: (theme: 'dark' | 'light') => void;
  toggleSidebar: () => void;
}
export const useUIStore = create<UIState>((set) => ({
  theme: 'dark',
  sidebarCollapsed: false,
  setTheme: (theme) => set({ theme }),
  toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
}));