import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

interface ContentSearchState {
  isOpen: boolean;
  initialQuery: string;
  openSearch: (query?: string) => void;
  closeSearch: () => void;
  clearInitialQuery: () => void;
}

export const useContentSearchStore = create<ContentSearchState>()(
  devtools(
    (set) => ({
      isOpen: false,
      initialQuery: '',
      openSearch: (query = '') => set({ isOpen: true, initialQuery: query }),
      closeSearch: () => set({ isOpen: false }),
      clearInitialQuery: () => set({ initialQuery: '' }),
    }),
    { name: 'ContentSearchStore' }
  )
);
