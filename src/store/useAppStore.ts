import { create } from 'zustand';
import type { PjuPoint, PanelPoint } from '../types';

interface AppState {
  selectedPoint: PjuPoint | PanelPoint | null;
  setSelectedPoint: (point: PjuPoint | PanelPoint | null) => void;
  flyToState: { lng: number; lat: number; timestamp: number } | null;
  triggerFlyTo: (lng: number, lat: number) => void;
  isMobileSheetOpen: boolean;
  setMobileSheetOpen: (isOpen: boolean) => void;

  // New States for Map Filters
  isEditMode: boolean;
  setEditMode: (mode: boolean) => void;
  basemapStyle: string;
  setBasemapStyle: (styleUrl: string) => void;
  showBatasDesa: boolean;
  setShowBatasDesa: (show: boolean) => void;
  activeDataset: 'Lampu' | 'Panel' | 'Keduanya';
  setActiveDataset: (dataset: 'Lampu' | 'Panel' | 'Keduanya') => void;
  asetKategori: 'Semua' | 'PJU' | 'PJL';
  setAsetKategori: (kategori: 'Semua' | 'PJU' | 'PJL') => void;
  tahunPasang: string;
  setTahunPasang: (th: string) => void;
  displayedCount: number;
  setDisplayedCount: (count: number) => void;

  globalSearchData: { points: any[], batasDesa: any[], ruasJalan: any[] };
  setGlobalSearchData: (data: { points: any[], batasDesa: any[], ruasJalan: any[] }) => void;
}

export const useAppStore = create<AppState>((set) => ({
  selectedPoint: null,
  setSelectedPoint: (point) => set({ selectedPoint: point, isMobileSheetOpen: !!point }),

  flyToState: null,
  triggerFlyTo: (lng, lat) => set({ flyToState: { lng, lat, timestamp: Date.now() } }),

  isMobileSheetOpen: false,
  setMobileSheetOpen: (isOpen) => set({ isMobileSheetOpen: isOpen }),

  isEditMode: false,
  setEditMode: (mode) => set({ isEditMode: mode, selectedPoint: null }),

  basemapStyle: 'mapbox://styles/dhamarar/clocbtfsj016901pfgucqgix6',
  setBasemapStyle: (styleUrl) => set({ basemapStyle: styleUrl }),

  showBatasDesa: false,
  setShowBatasDesa: (show) => set({ showBatasDesa: show }),

  activeDataset: 'Keduanya', // Changed default to Keduanya if the user wants to see 2 tabel
  setActiveDataset: (dataset) => set({ activeDataset: dataset }),

  asetKategori: 'Semua',
  setAsetKategori: (kategori) => set({ asetKategori: kategori }),

  tahunPasang: 'Semua',
  setTahunPasang: (th) => set({ tahunPasang: th }),

  displayedCount: 0,
  setDisplayedCount: (count) => set({ displayedCount: count }),

  globalSearchData: { points: [], batasDesa: [], ruasJalan: [] },
  setGlobalSearchData: (data) => set({ globalSearchData: data }),
}));
