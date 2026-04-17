import React from 'react';
import { useAppStore } from '../../store/useAppStore';
import { Layers, Map as MapIcon, Box, SlidersHorizontal, Activity, Database, Calendar } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Sidebar: React.FC = () => {
  const {
    basemapStyle, setBasemapStyle,
    showBatasDesa, setShowBatasDesa,
    activeDataset, setActiveDataset,
    asetKategori, setAsetKategori,
    thpasangFilter, setThpasangFilter,
    globalSearchData,
    displayedCount
  } = useAppStore();

  const navigate = useNavigate();

  const availableYears = React.useMemo(() => {
    const years = new Set<string>();
    globalSearchData.points.forEach((p: any) => {
      const val = p.properties?.thpasang;
      if (val) years.add(val.toString());
    });
    return Array.from(years).sort((a,b) => Number(b) - Number(a));
  }, [globalSearchData.points]);

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
        <section>
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

        {/* Tahun Pasang Filter */}
        <section>
          <h2 className="text-sm font-semibold text-slate-400 mb-3 flex items-center gap-2">
            <Calendar size={16} />
            Tahun Pasang
          </h2>
          <select 
            value={thpasangFilter}
            onChange={(e) => setThpasangFilter(e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 text-slate-300 text-sm rounded-xl px-3 py-2.5 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 hover:bg-slate-700/50 transition-colors"
          >
            <option value="Semua">Semua Tahun</option>
            {availableYears.map(year => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
        </section>

      </div>

      {/* Editor Button */}
      <div className="px-4 py-2 bg-slate-900 border-t border-slate-800">
        <button
          onClick={() => navigate('/admin/database')}
          className="w-full flex items-center justify-center gap-2 py-2.5 bg-indigo-600/20 text-indigo-400 hover:bg-indigo-600 hover:text-white border border-indigo-500/30 hover:border-indigo-500 rounded-xl transition-all font-semibold text-sm shadow-sm"
        >
          <Database size={16} />
          Database Editor
        </button>
      </div>

      {/* Statistics Footer */}
      <div className="p-4 bg-slate-900 border-t border-slate-800">
        <div className="flex items-center gap-3 text-slate-400">
          <Activity size={18} className="text-emerald-500" />
          <div className="flex flex-col">
            <span className="text-xs uppercase tracking-wider font-semibold">Total Tampil</span>
            <span className="text-lg font-bold text-white leading-none mt-1">
              {displayedCount.toLocaleString('id-ID')} <span className="text-sm font-medium text-slate-500">titik</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
