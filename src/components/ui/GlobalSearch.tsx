import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Search, X } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';

const GlobalSearch: React.FC<{ isMobile?: boolean }> = ({ isMobile }) => {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const { globalSearchData, triggerFlyTo, setSelectedPoint } = useAppStore();

  const results = useMemo(() => {
    if (!query || query.length < 2) return [];
    const lowerQuery = query.toLowerCase();

    // Search desa
    const desa = globalSearchData.batasDesa.filter((d: any) => {
      const name = String(d.properties.NAME_4 || '').toLowerCase();
      return name.includes(lowerQuery);
    }).slice(0, 5).map((d: any) => ({ type: 'desa', item: d, name: d.properties.NAME_4 || 'Desa', desc: 'Desa' }));

    // Search ruas jalan
    const ruas = globalSearchData.ruasJalan.filter((r: any) => {
      const name = String(r.properties.NAMAJALAN || '').toLowerCase();
      return name.includes(lowerQuery);
    }).slice(0, 5).map((r: any) => ({ type: 'ruas', item: r, name: r.properties.NAMAJALAN || 'Ruas Jalan', desc: 'Ruas Jalan' }));

    return [...desa, ...ruas];
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
    // fly to coordinate based on type
    if (result.type === 'point') {
      triggerFlyTo(result.item.geometry.coordinates[0], result.item.geometry.coordinates[1]);
      setSelectedPoint(result.item.properties);
    } else if (result.type === 'desa' || result.type === 'ruas') {
      // Just take the first coordinate of the polygon/line ring
      const coords = result.item.geometry.coordinates;
      let target = null;
      // Quick deep coordinate extraction
      if (result.item.geometry.type === 'LineString') target = coords[0];
      else if (result.item.geometry.type === 'MultiLineString') target = coords[0][0];
      else if (result.item.geometry.type === 'Polygon') target = coords[0][0];
      else if (result.item.geometry.type === 'MultiPolygon') target = coords[0][0][0];

      if (target && target.length >= 2) {
        triggerFlyTo(target[0], target[1]);
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
          placeholder="Cari desa atau ruas jalan..."
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
