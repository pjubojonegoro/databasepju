import React from 'react';
import { BottomSheet } from 'react-spring-bottom-sheet';
import { useAppStore } from '../../store/useAppStore';
import { Layers, Box, SlidersHorizontal, Activity, X } from 'lucide-react';
import 'react-spring-bottom-sheet/dist/style.css';

interface FilterBottomSheetProps {
  open: boolean;
  onDismiss: () => void;
}

const FilterBottomSheet: React.FC<FilterBottomSheetProps> = ({ open, onDismiss }) => {
  const {
    basemapStyle, setBasemapStyle,
    showBatasDesa, setShowBatasDesa,
    activeDataset, setActiveDataset,
    asetKategori, setAsetKategori,
    displayedCount
  } = useAppStore();

  const basemaps = [
    { id: 'default', label: 'Default', url: 'mapbox://styles/dhamarar/clocbtfsj016901pfgucqgix6' },
    { id: 'satellite', label: 'Satellite', url: 'mapbox://styles/mapbox/satellite-streets-v12' },
    { id: 'dark', label: 'Dark', url: 'mapbox://styles/mapbox/dark-v11' },
    { id: 'light', label: 'Light', url: 'mapbox://styles/mapbox/light-v11' }
  ];

  return (
    <BottomSheet
      open={open}
      onDismiss={onDismiss}
      snapPoints={({ maxHeight }) => [
        maxHeight * 0.65,
        maxHeight * 0.9,
      ]}
      header={
        <div className="flex justify-between items-center py-2 px-1">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-100 dark:bg-indigo-900/50 p-2 rounded-full">
              <SlidersHorizontal className="text-indigo-600 dark:text-indigo-400" size={22} />
            </div>
            <div>
              <h2 className="font-bold text-lg text-slate-800 dark:text-white leading-none">
                Filter Peta
              </h2>
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                Atur tampilan dan data peta
              </span>
            </div>
          </div>
          <button 
            onClick={onDismiss}
            className="p-2 bg-slate-100 dark:bg-slate-800 rounded-full text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-white"
          >
            <X size={20} />
          </button>
        </div>
      }
    >
      <div className="px-5 pb-8 pt-2 space-y-6">

        {/* Basemap Selection */}
        <section>
          <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-400 mb-3 flex items-center gap-2">
            <Layers size={16} />
            Basemap
          </h3>
          <div className="grid grid-cols-2 gap-2">
            {basemaps.map(b => (
              <button
                key={b.id}
                onClick={() => setBasemapStyle(b.url)}
                className={`flex items-center justify-center p-3 rounded-xl text-sm font-semibold transition-all
                  ${basemapStyle === b.url
                    ? 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border-2 border-blue-500/50 shadow-sm'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-2 border-transparent'
                  }`}
              >
                {b.label}
              </button>
            ))}
          </div>
        </section>

        {/* Batas Desa Toggle */}
        <section>
          <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700/50">
            <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">Batas Desa</span>
            <label className="relative inline-flex items-center cursor-pointer">
              <input 
                type="checkbox" 
                className="sr-only peer" 
                checked={showBatasDesa}
                onChange={(e) => setShowBatasDesa(e.target.checked)}
              />
              <div className="w-11 h-6 bg-slate-300 dark:bg-slate-700 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-500"></div>
            </label>
          </div>
        </section>

        {/* Dataset Selection */}
        <section>
          <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-400 mb-3 flex items-center gap-2">
            <Box size={16} />
            Dataset Peta
          </h3>
          <div className="flex gap-2">
            {(['Keduanya', 'Lampu', 'Panel'] as const).map(dataset => (
              <button
                key={dataset}
                onClick={() => setActiveDataset(dataset)}
                className={`flex-1 py-3 rounded-xl text-sm font-semibold transition-all
                  ${activeDataset === dataset
                    ? 'bg-blue-500 text-white shadow-md shadow-blue-500/30'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                  }`}
              >
                {dataset}
              </button>
            ))}
          </div>
        </section>

        {/* Kategori Filters */}
        <section>
          <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-400 mb-3 flex items-center gap-2">
            <SlidersHorizontal size={16} />
            Kategori Aset
          </h3>
          <div className="flex gap-2">
            {(['Semua', 'PJU', 'PJL'] as const).map(kat => (
              <button
                key={kat}
                onClick={() => setAsetKategori(kat)}
                className={`flex-1 py-3 rounded-xl text-sm font-semibold transition-all
                  ${asetKategori === kat
                    ? 'bg-amber-500 text-white shadow-md shadow-amber-500/30'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                  }`}
              >
                {kat}
              </button>
            ))}
          </div>
        </section>

        {/* Statistics */}
        <section className="p-4 bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-800/60 dark:to-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-700/50">
          <div className="flex items-center gap-3">
            <div className="bg-emerald-100 dark:bg-emerald-900/40 p-2 rounded-full">
              <Activity size={20} className="text-emerald-600 dark:text-emerald-400" />
            </div>
            <div className="flex flex-col">
              <span className="text-xs uppercase tracking-wider font-semibold text-slate-500 dark:text-slate-400">Total Tampil</span>
              <span className="text-xl font-bold text-slate-800 dark:text-white leading-none mt-1">
                {displayedCount.toLocaleString('id-ID')} <span className="text-sm font-medium text-slate-500">titik</span>
              </span>
            </div>
          </div>
        </section>

      </div>
    </BottomSheet>
  );
};

export default FilterBottomSheet;
