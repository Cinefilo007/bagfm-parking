import { create } from 'zustand';

export const useUIStore = create((set) => ({
  hideSidebar: false,
  hideBottomNav: false,
  
  setHideSidebar: (val) => set({ hideSidebar: val }),
  setHideBottomNav: (val) => set({ hideBottomNav: val }),
  
  // Bloqueo total para relevos tácticos
  lockNavigation: (locked) => set({ 
    hideSidebar: locked, 
    hideBottomNav: locked 
  }),
}));
