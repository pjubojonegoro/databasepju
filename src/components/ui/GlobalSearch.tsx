import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Search, X } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';

const GlobalSearch: React.FC<{ isMobile?: boolean }> = ({ isMobile }) => {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const { globalSearchData, triggerFlyTo } = useAppStore();

  const results = useMemo(() => {
    if (!query || query.length < 2) return [];
    const lowerQuery = query.toLowerCase();

    // 1. Cari desa dari list desa yang sudah di-ekstrak tipis
    const desaFromPoints = globalSearchData.desaList
      .filter((d: any) => d.name.toLowerCase().includes(lowerQuery))
      .map((d: any) => ({
        type: 'desa_point',
        item: d,
        name: d.name,
        desc: `Desa${d.kecamatan ? `, Kec. ${d.kecamatan}` : ''}`
      })).slice(0, 5);

    // 2. Cari ruas jalan berdasarkan point tipis
    const ruas = globalSearchData.ruasJalan
      .filter((r: any) => r.name.toLowerCase().includes(lowerQuery))
      .slice(0, 5)
      .map((r: any) => ({
        type: 'ruas_light',
        item: r,
        name: r.name,
        desc: 'Ruas Jalan'
      }));

    // 3. Cari panel berdasarkan id atau nama pelanggan
    const panels = (globalSearchData.panelList || [])
      .filter((p: any) => 
        p.nama_pelanggan.toLowerCase().includes(lowerQuery) || 
        p.id_pelanggan.toLowerCase().includes(lowerQuery)
      )
      .slice(0, 5)
      .map((p: any) => ({
        type: 'panel_light',
        item: p,
        name: p.nama_pelanggan || p.id_pelanggan,
        desc: `Panel (ID: ${p.id_pelanggan})`
      }));

    return [...desaFromPoints, ...ruas, ...panels];
  }, [query, globalSearchData]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (result: any) => {
    if (result.type === 'desa_point' || result.type === 'ruas_light' || result.type === 'panel_light') {
      if (result.item.lng && result.item.lat) {
        triggerFlyTo(result.item.lng, result.item.lat);
      }
    }
    setIsOpen(false);
    setQuery('');
  };

  return (
    <div ref={containerRef} className={`relative flex-1 ${isMobile ? '' : 'w-80'}`}>
      <div className={`bg-slate-900/80 backdrop-blur-md px-4 py-3 border border-slate-700 shadow-xl flex items-center gap-3 ${isMobile ? 'rounded-2xl' : 'rounded-full'}`}>
        <Search size={18} className="text-slate-400" />
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          placeholder="Cari desa, jalan, atau panel..."
          className="bg-transparent border-none outline-none text-white w-full text-sm placeholder-slate-400 focus:ring-0"
        />
        {query && (
          <button onClick={() => setQuery('')} className="text-slate-400 hover:text-white">
            <X size={16} />
          </button>
        )}
      </div>

      {isOpen && query.length >= 2 && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-slate-900/95 backdrop-blur-xl border border-slate-700 rounded-xl shadow-2xl overflow-hidden z-50">
          {results.length === 0 ? (
            <div className="p-4 flex items-center justify-center text-sm text-slate-400">
              Tidak ada data yang ditemukan
            </div>
          ) : (
            <ul className="max-h-60 overflow-y-auto w-full py-2">
              {results.map((r, i) => (
                <li key={i}>
                  <button
                    onClick={() => handleSelect(r)}
                    className="w-full text-left px-4 py-2 hover:bg-slate-800 flex flex-col transition-colors border-b border-slate-800/50 last:border-none"
                  >
                    <span className="font-semibold text-sm text-white">{r.name}</span>
                    <span className="text-xs text-blue-400">{r.desc}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
};

export default GlobalSearch;
