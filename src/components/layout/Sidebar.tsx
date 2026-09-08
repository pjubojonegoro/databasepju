import React from 'react';
import { useAppStore } from '../../store/useAppStore';
import { Layers, Map as MapIcon, Box, SlidersHorizontal, Activity, MapPin, Lightbulb, UtilityPole, RefreshCw } from 'lucide-react';
import { fetchLampuDataGeoJSON, fetchPanelDataGeoJSON } from '../../services/supabase';

const Sidebar: React.FC = () => {
  const {
    basemapStyle, setBasemapStyle,
    showBatasDesa, setShowBatasDesa,
    activeDataset, setActiveDataset,
    asetKategori, setAsetKategori,
    filterDesaKel, setFilterDesaKel,
    filterKecamatan, setFilterKecamatan,
    filterJenisLampu, setFilterJenisLampu,
    availableJenisLampu,
    filterJenisTiang, setFilterJenisTiang,
    availableJenisTiang,
    displayedCount,
    availableDesaKel, availableKecamatan
  } = useAppStore();

  const [isRefreshing, setIsRefreshing] = React.useState(false);

  const handleSyncData = async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([
        fetchLampuDataGeoJSON(true),
        fetchPanelDataGeoJSON(true)
      ]);
      window.location.reload();
    } catch (err) {
      console.error('Failed to refresh data:', err);
    } finally {
      setIsRefreshing(false);
    }
  };

  const basemaps = [
    { id: 'default', label: 'Default', url: 'mapbox://styles/dhamarar/clocbtfsj016901pfgucqgix6' },
    { id: 'satellite', label: 'Satellite', url: 'mapbox://styles/mapbox/satellite-streets-v12' },
    { id: 'dark', label: 'Dark', url: 'mapbox://styles/mapbox/dark-v11' },
    { id: 'light', label: 'Light', url: 'mapbox://styles/mapbox/light-v11' }
  ];

  return (
    <div className="absolute top-4 left-4 z-10 w-72 bg-slate-900/90 backdrop-blur-xl border border-slate-700/50 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[calc(100vh-2rem)]">
      {/* Header */}
      <div className="p-4 border-b border-slate-800 bg-slate-900 flex items-center justify-between">
        <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
          <MapIcon size={20} className="text-blue-500" />
          WebGIS PJU
        </h1>
      </div>

      {/* Scrollable Content */}
      <div className="p-4 flex-1 overflow-y-auto custom-scrollbar space-y-6">

        {/* Basemap Selection */}
        <section className="hidden">
          <h2 className="text-sm font-semibold text-slate-400 mb-3 flex items-center gap-2">
            <Layers size={16} />
            Basemap
          </h2>
          <div className="grid grid-cols-2 gap-2">
            {basemaps.map(b => (
              <label
                key={b.id}
                className={`flex items-center justify-center p-2 rounded-lg cursor-pointer border text-xs font-semibold select-none transition-colors
                  ${basemapStyle === b.url
                    ? 'bg-blue-500/20 text-blue-400 border-blue-500/50'
                    : 'bg-slate-800/50 text-slate-400 border-slate-700 hover:bg-slate-800'}`}
              >
                <input
                  type="radio"
                  name="basemap"
                  className="hidden"
                  checked={basemapStyle === b.url}
                  onChange={() => setBasemapStyle(b.url)}
                />
                {b.label}
              </label>
            ))}
          </div>
        </section>

        {/* Batas Desa Toggle */}
        <section>
          <div className="flex items-center justify-between p-3 bg-slate-800/40 rounded-xl border border-slate-700/50">
            <span className="text-sm font-semibold text-slate-300">Batas Desa</span>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={showBatasDesa}
                onChange={(e) => setShowBatasDesa(e.target.checked)}
              />
              <div className="w-11 h-6 bg-slate-700 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-500"></div>
            </label>
          </div>
        </section>

        {/* Dataset Tabel */}
        <section>
          <h2 className="text-sm font-semibold text-slate-400 mb-3 flex items-center gap-2">
            <Box size={16} />
            Dataset Peta
          </h2>
          <div className="flex flex-col gap-2">
            {(['Keduanya', 'Lampu', 'Panel'] as const).map(dataset => (
              <label key={dataset} className="flex items-center gap-3 cursor-pointer group">
                <input
                  type="radio"
                  name="dataset"
                  className="hidden"
                  checked={activeDataset === dataset}
                  onChange={() => setActiveDataset(dataset)}
                />
                <div className={`w-4 h-4 rounded-full border flex items-center justify-center
                  ${activeDataset === dataset ? 'border-blue-500' : 'border-slate-600 group-hover:border-slate-400'}`}>
                  {activeDataset === dataset && <div className="w-2 h-2 rounded-full bg-blue-500" />}
                </div>
                <span className="text-sm text-slate-300 font-medium">{dataset}</span>
              </label>
            ))}
          </div>
        </section>

        {/* Kategori Filters */}
        <section>
          <h2 className="text-sm font-semibold text-slate-400 mb-3 flex items-center gap-2">
            <SlidersHorizontal size={16} />
            Kategori Aset
          </h2>
          <div className="flex flex-col gap-2">
            {(['Semua', 'PJU', 'PJL'] as const).map(kat => (
              <label key={kat} className="flex items-center gap-3 cursor-pointer group">
                <input
                  type="radio"
                  name="kategori"
                  className="hidden"
                  checked={asetKategori === kat}
                  onChange={() => setAsetKategori(kat)}
                />
                <div className={`w-4 h-4 rounded-full border flex items-center justify-center
                  ${asetKategori === kat ? 'border-amber-500' : 'border-slate-600 group-hover:border-slate-400'}`}>
                  {asetKategori === kat && <div className="w-2 h-2 rounded-full bg-amber-500" />}
                </div>
                <span className="text-sm text-slate-300 font-medium">{kat}</span>
              </label>
            ))}
          </div>
        </section>

        {/* Kecamatan Filter */}
        <section>
          <h2 className="text-sm font-semibold text-slate-400 mb-3 flex items-center gap-2">
            <MapPin size={16} />
            Kecamatan
          </h2>
          <div className="bg-slate-800/40 rounded-xl border border-slate-700/50 overflow-hidden relative">
            <select
              value={filterKecamatan}
              onChange={(e) => setFilterKecamatan(e.target.value)}
              className="w-full bg-transparent text-slate-300 text-sm font-medium p-3 outline-none appearance-none cursor-pointer z-10 relative"
            >
              <option value="Semua" className="bg-slate-800">Semua Kecamatan</option>
              {availableKecamatan.map(kec => (
                <option key={kec} value={kec} className="bg-slate-800">{kec}</option>
              ))}
            </select>
            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
            </div>
          </div>
        </section>

        {/* Desa/Kelurahan Filter */}
        <section>
          <h2 className="text-sm font-semibold text-slate-400 mb-3 flex items-center gap-2">
            <MapPin size={16} />
            Desa / Kelurahan
          </h2>
          <div className="bg-slate-800/40 rounded-xl border border-slate-700/50 overflow-hidden relative">
            <select
              value={filterDesaKel}
              onChange={(e) => setFilterDesaKel(e.target.value)}
              className="w-full bg-transparent text-slate-300 text-sm font-medium p-3 outline-none appearance-none cursor-pointer z-10 relative"
            >
              <option value="Semua" className="bg-slate-800">Semua Desa/Kelurahan</option>
              {availableDesaKel.map(desa => (
                <option key={desa} value={desa} className="bg-slate-800">{desa}</option>
              ))}
            </select>
            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
            </div>
          </div>
        </section>

        {/* Jenis Lampu Filter (Khusus data Lampu) */}
        {activeDataset !== 'Panel' && (
          <section>
            <h2 className="text-sm font-semibold text-slate-400 mb-3 flex items-center gap-2">
              <Lightbulb size={16} />
              Jenis Lampu
            </h2>
            <div className="bg-slate-800/40 rounded-xl border border-slate-700/50 overflow-hidden relative">
              <select
                value={filterJenisLampu}
                onChange={(e) => setFilterJenisLampu(e.target.value)}
                className="w-full bg-transparent text-slate-300 text-sm font-medium p-3 outline-none appearance-none cursor-pointer z-10 relative"
              >
                <option value="Semua" className="bg-slate-800">Semua Jenis Lampu</option>
                {availableJenisLampu.map(jenis => (
                  <option key={jenis} value={jenis} className="bg-slate-800">{jenis}</option>
                ))}
              </select>
              <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
              </div>
            </div>
          </section>
        )}

        {/* Jenis Tiang Filter (Khusus data Lampu) */}
        {activeDataset !== 'Panel' && (
          <section>
            <h2 className="text-sm font-semibold text-slate-400 mb-3 flex items-center gap-2">
              <UtilityPole size={16} />
              Jenis Tiang
            </h2>
            <div className="bg-slate-800/40 rounded-xl border border-slate-700/50 overflow-hidden relative">
              <select
                value={filterJenisTiang}
                onChange={(e) => setFilterJenisTiang(e.target.value)}
                className="w-full bg-transparent text-slate-300 text-sm font-medium p-3 outline-none appearance-none cursor-pointer z-10 relative"
              >
                <option value="Semua" className="bg-slate-800">Semua Jenis Tiang</option>
                {availableJenisTiang.map(tiang => (
                  <option key={tiang} value={tiang} className="bg-slate-800">{tiang}</option>
                ))}
              </select>
              <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
              </div>
            </div>
          </section>
        )}

      </div>

      {/* Statistics & Cache Sync Footer */}
      <div className="p-4 bg-slate-900 border-t border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-3 text-slate-400">
          <Activity size={18} className="text-emerald-500" />
          <div className="flex flex-col">
            <span className="text-xs uppercase tracking-wider font-semibold">Total Tampil</span>
            <span className="text-lg font-bold text-white leading-none mt-1">
              {displayedCount.toLocaleString('id-ID')} <span className="text-sm font-medium text-slate-500">titik</span>
            </span>
          </div>
        </div>
        <button
          onClick={handleSyncData}
          disabled={isRefreshing}
          className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors border border-slate-700/50"
          title="Sinkronkan & Muat Ulang Data dari Database"
        >
          <RefreshCw size={16} className={isRefreshing ? "animate-spin text-blue-400" : ""} />
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
