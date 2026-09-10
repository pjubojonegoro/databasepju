import { create } from 'zustand';
import type { PjuPoint, PanelPoint } from '../types';

interface AppState {
  selectedPoint: PjuPoint | PanelPoint | null;
  setSelectedPoint: (point: PjuPoint | PanelPoint | null) => void;
  flyToState: { lng: number; lat: number; timestamp: number } | null;
  triggerFlyTo: (lng: number, lat: number) => void;
  isMobileSheetOpen: boolean;
  setMobileSheetOpen: (isOpen: boolean) => void;

  userLocation: { lng: number; lat: number } | null;
  setUserLocation: (location: { lng: number; lat: number } | null) => void;
  isLocating: boolean;
  setIsLocating: (isLocating: boolean) => void;

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
  availableYears: string[];
  setAvailableYears: (years: string[]) => void;
  
  filterDesaKel: string;
  setFilterDesaKel: (desa: string) => void;
  filterKecamatan: string;
  setFilterKecamatan: (kecamatan: string) => void;
  availableDesaKel: string[];
  setAvailableDesaKel: (desas: string[]) => void;
  availableKecamatan: string[];
  setAvailableKecamatan: (kecamatans: string[]) => void;

  filterJenisLampu: string;
  setFilterJenisLampu: (jenis: string) => void;
  availableJenisLampu: string[];
  setAvailableJenisLampu: (list: string[]) => void;

  filterJenisTiang: string;
  setFilterJenisTiang: (tiang: string) => void;
  availableJenisTiang: string[];
  setAvailableJenisTiang: (list: string[]) => void;

  globalSearchData: { desaList: { name: string, kecamatan: string, lng: number, lat: number }[], ruasJalan: { name: string, lng: number, lat: number }[], panelList: { id_pelanggan: string, nama_pelanggan: string, lng: number, lat: number }[] };
  setGlobalSearchData: (data: { desaList: any[], ruasJalan: any[], panelList: any[] }) => void;
}

export const useAppStore = create<AppState>((set) => ({
  selectedPoint: null,
  setSelectedPoint: (point) => set({ selectedPoint: point, isMobileSheetOpen: !!point }),

  flyToState: null,
  triggerFlyTo: (lng, lat) => set({ flyToState: { lng, lat, timestamp: Date.now() } }),

  isMobileSheetOpen: false,
  setMobileSheetOpen: (isOpen) => set({ isMobileSheetOpen: isOpen }),

  userLocation: null,
  setUserLocation: (location) => set({ userLocation: location }),
  isLocating: false,
  setIsLocating: (isLocating) => set({ isLocating }),

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

  availableYears: [],
  setAvailableYears: (years) => set({ availableYears: years }),
  
  filterDesaKel: 'Semua',
  setFilterDesaKel: (desa) => set({ filterDesaKel: desa }),
  filterKecamatan: 'Semua',
  setFilterKecamatan: (kecamatan) => set({ filterKecamatan: kecamatan }),
  availableDesaKel: [],
  setAvailableDesaKel: (desas) => set({ availableDesaKel: desas }),
  availableKecamatan: [],
  setAvailableKecamatan: (kecamatans) => set({ availableKecamatan: kecamatans }),

  filterJenisLampu: 'Semua',
  setFilterJenisLampu: (jenis) => set({ filterJenisLampu: jenis }),
  availableJenisLampu: [],
  setAvailableJenisLampu: (list) => set({ availableJenisLampu: list }),

  filterJenisTiang: 'Semua',
  setFilterJenisTiang: (tiang) => set({ filterJenisTiang: tiang }),
  availableJenisTiang: [],
  setAvailableJenisTiang: (list) => set({ availableJenisTiang: list }),

  globalSearchData: { desaList: [], ruasJalan: [], panelList: [] },
  setGlobalSearchData: (data) => set({ globalSearchData: data }),
}));

let userLocationWatchId: number | null = null;

export const requestUserLocation = () => {
  if (!("geolocation" in navigator)) {
    alert("Geolocation tidak didukung oleh browser Anda.");
    return;
  }

  useAppStore.getState().setIsLocating(true);

  navigator.geolocation.getCurrentPosition(
    (pos) => {
      const { longitude, latitude } = pos.coords;
      useAppStore.getState().setUserLocation({ lng: longitude, lat: latitude });
      useAppStore.getState().triggerFlyTo(longitude, latitude);
      useAppStore.getState().setIsLocating(false);

      // Start background position tracking so marker tracks live movements
      if (userLocationWatchId === null) {
        userLocationWatchId = navigator.geolocation.watchPosition(
          (watchPos) => {
            useAppStore.getState().setUserLocation({
              lng: watchPos.coords.longitude,
              lat: watchPos.coords.latitude,
            });
          },
          (err) => console.warn('Gagal memperbarui watchPosition:', err),
          { enableHighAccuracy: true, maximumAge: 5000 }
        );
      }
    },
    (err) => {
      useAppStore.getState().setIsLocating(false);
      console.error("Gagal mendapatkan lokasi:", err);
      let msg = "Gagal mendeteksi lokasi saat ini.";
      if (err.code === 1) {
        msg = "Akses lokasi ditolak. Mohon aktifkan izin lokasi di browser Anda.";
      } else if (err.code === 2) {
        msg = "Informasi lokasi tidak tersedia saat ini.";
      } else if (err.code === 3) {
        msg = "Waktu permintaan lokasi habis (timeout). Silakan coba lagi.";
      }
      alert(msg);
    },
    {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0,
    }
  );
};

