import React, { useState, useEffect } from 'react';
import { supabase } from '../../services/supabase';
import { Save, Search, RefreshCw, Trash2, ChevronUp, ChevronDown, ArrowUpDown } from 'lucide-react';

type TableMode = 'lampu' | 'panel';

const DatabaseEditor: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TableMode>('lampu');
  const [data, setData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [search, setSearch] = useState('');
  
  // Track changes: { [id]: { column: value } }
  const [edits, setEdits] = useState<Record<string, Record<string, any>>>({});
  
  // Pagination
  const [page, setPage] = useState(0);
  const rowsPerPage = 50;
  const [totalCount, setTotalCount] = useState(0);

  // Sorting and Filtering
  const [sortConfig, setSortConfig] = useState<{ column: string, ascending: boolean } | null>(null);
  const [columnFilters, setColumnFilters] = useState<Record<string, string>>({});
  const [debouncedFilters, setDebouncedFilters] = useState<Record<string, string>>({});
  const [filterOptions, setFilterOptions] = useState<Record<string, any[]>>({});

  const fetchFilterOptions = async (tab: TableMode) => {
    const { data } = await supabase.from(tab).select();
    if (data) {
      const options: Record<string, any[]> = {};
      const cols = tab === 'lampu' 
        ? ['kode', 'panel', 'kategori', 'jenis_lampu', 'tiang', 'thpasang', 'desakel', 'latitude', 'longitude']
        : ['id_pelanggan', 'nama_pelanggan', 'kategori', 'no_meter', 'daya', 'jml_lampu', 'total_daya', 'alamat', 'thpasang', 'desakel', 'latitude', 'longitude'];
        
      cols.forEach(col => {
        if (col === 'kode' || col === 'panel') return;
        const unique = Array.from(new Set(data.map(d => d[col]).filter(v => v !== null && v !== '')));
        options[col] = unique.sort((a, b) => {
          if (typeof a === 'number' && typeof b === 'number') return a - b;
          return String(a).localeCompare(String(b));
        });
      });
      setFilterOptions(options);
    }
  };

  useEffect(() => {
    fetchFilterOptions(activeTab);
  }, [activeTab]);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedFilters(columnFilters);
      setPage(0);
    }, 300);
    return () => clearTimeout(handler);
  }, [columnFilters]);

  const fetchTableData = async () => {
    setIsLoading(true);
    try {
      let query = supabase
        .from(activeTab)
        .select('*', { count: 'exact' });

      // Search functionality (simple search on id or panel/kode based on dataset)
      if (search) {
        if (activeTab === 'lampu') {
          query = query.or(`kode.ilike.%${search}%,panel.ilike.%${search}%,desakel.ilike.%${search}%`);
        } else {
          query = query.or(`nama_pelanggan.ilike.%${search}%,id_pelanggan.ilike.%${search}%,desakel.ilike.%${search}%`);
        }
      }

      // Apply column filters
      Object.entries(debouncedFilters).forEach(([col, val]) => {
        if (val !== '') {
          query = query.eq(col, val);
        }
      });

      query = query.range(page * rowsPerPage, (page + 1) * rowsPerPage - 1);

      if (sortConfig) {
        query = query.order(sortConfig.column, { ascending: sortConfig.ascending });
      } else {
        query = query.order('id', { ascending: true });
      }

      const { data: resultData, error, count } = await query;

      if (error) throw error;
      
      setData(resultData || []);
      if (count !== null) setTotalCount(count);
      setEdits({});
    } catch (err) {
      console.error(err);
      alert('Error fetching data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTableData();
  }, [activeTab, page, sortConfig, debouncedFilters]);

  // Triggers when search is submitted
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(0);
    fetchTableData();
  };

  const handleCellChange = (id: string, column: string, value: string) => {
    setEdits(prev => {
      const rowEdits = { ...(prev[id] || {}) };
      rowEdits[column] = value === '' ? null : value;
      return { ...prev, [id]: rowEdits };
    });
  };

  const saveChanges = async () => {
    const editedIds = Object.keys(edits);
    if (editedIds.length === 0) return;

    setIsSaving(true);
    try {
      for (const id of editedIds) {
        const changes = edits[id];
        const { error } = await supabase
          .from(activeTab)
          .update(changes)
          .eq('id', id);
        
        if (error) {
          console.error(`Error updating record ${id}:`, error);
          throw new Error(`Gagal menyimpan data ID ${id}`);
        }
      }
      alert('Perubahan berhasil disimpan!');
      setEdits({});
      fetchTableData();
    } catch (err: any) {
      alert(err.message || 'Terjadi kesalahan saat menyimpan');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteRow = async (id: number) => {
    if (!window.confirm('Yakin ingin menghapus baris data ini secara permanen?')) return;
    try {
      const { error } = await supabase.from(activeTab).delete().eq('id', id);
      if (error) throw error;
      fetchTableData();
    } catch (err: any) {
      alert('Gagal menghapus data: ' + err.message);
    }
  };

  // Define columns dynamically to render excel-like cells
  const lampuCols = ['kode', 'panel', 'kategori', 'jenis_lampu', 'tiang', 'thpasang', 'desakel', 'latitude', 'longitude'];
  const panelCols = ['id_pelanggan', 'nama_pelanggan', 'kategori', 'no_meter', 'daya', 'jml_lampu', 'total_daya', 'alamat', 'thpasang', 'desakel', 'latitude', 'longitude'];

  const columns = activeTab === 'lampu' ? lampuCols : panelCols;

  return (
    <div className="flex flex-col h-full text-slate-800 font-sans bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between sticky top-0 z-20 shadow-sm shrink-0">
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-xl font-bold text-slate-900">Database Editor</h1>
            <p className="text-xs text-slate-500">Edit data PJU mirip Excel</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="bg-slate-100 p-1 rounded-lg flex text-sm font-medium">
            <button
              onClick={() => { setActiveTab('lampu'); setPage(0); }}
              className={`px-4 py-1.5 rounded-md transition-all ${activeTab === 'lampu' ? 'bg-white shadow text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Lampu
            </button>
            <button
              onClick={() => { setActiveTab('panel'); setPage(0); }}
              className={`px-4 py-1.5 rounded-md transition-all ${activeTab === 'panel' ? 'bg-white shadow text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Panel
            </button>
          </div>

          <form onSubmit={handleSearchSubmit} className="relative hidden md:block">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Cari data..."
              className="pl-9 pr-4 py-2 bg-slate-100 border-none rounded-lg text-sm w-64 focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </form>

          <button 
            onClick={fetchTableData}
            className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition"
            title="Refresh"
          >
            <RefreshCw size={18} className={isLoading ? "animate-spin" : ""} />
          </button>

          <button
            onClick={saveChanges}
            disabled={Object.keys(edits).length === 0 || isSaving}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all shadow-sm ${
              Object.keys(edits).length > 0 
                ? 'bg-blue-600 text-white hover:bg-blue-700' 
                : 'bg-slate-200 text-slate-400 cursor-not-allowed'
            }`}
          >
            <Save size={16} />
            {isSaving ? 'Menyimpan...' : `Simpan (${Object.keys(edits).length})`}
          </button>
        </div>
      </header>

      {/* Editor Grid Container */}
      <main className="flex-1 overflow-hidden bg-white p-4 flex flex-col">
        {isLoading && data.length === 0 ? (
          <div className="flex justify-center items-center h-full text-slate-400 gap-2">
            <RefreshCw className="animate-spin" size={20} />
            <span>Memuat tabel...</span>
          </div>
        ) : (
          <div className="border border-slate-300 shadow-sm rounded bg-slate-50 overflow-auto flex-1 outline-none">
            <table className="w-max text-sm text-left border-collapse bg-white">
              <thead className="bg-slate-100 border-b border-slate-300 sticky top-0 z-10 shadow-sm">
                <tr>
                  <th className="w-10 border-r border-slate-300 p-0">
                    <div className="h-8 flex items-center justify-center text-slate-400">#</div>
                  </th>
                  {columns.map(col => {
                    const isExcluded = col === 'kode' || col === 'panel';
                    return (
                    <th key={col} className="border-r border-slate-300 font-semibold text-slate-600 p-0 align-middle">
                      <div className="px-3 py-2 resize-x overflow-hidden min-w-[20px] w-[180px] h-full flex flex-col gap-2">
                        <div 
                          className={`flex items-center justify-between select-none ${isExcluded ? '' : 'cursor-pointer hover:text-blue-600'} group`}
                          onClick={() => {
                            if (isExcluded) return;
                            setSortConfig(prev => prev?.column === col ? { column: col, ascending: !prev.ascending } : { column: col, ascending: true });
                            setPage(0);
                          }}
                        >
                          <span className="capitalize whitespace-nowrap">{col.replace(/_/g, ' ')}</span>
                          {!isExcluded && (
                            <span className="text-slate-400">
                              {sortConfig?.column === col ? (sortConfig.ascending ? <ChevronUp size={14}/> : <ChevronDown size={14}/>) : <ArrowUpDown size={12} className="opacity-0 group-hover:opacity-50"/>}
                            </span>
                          )}
                        </div>
                        {!isExcluded && (
                          <select
                            value={columnFilters[col] || ''}
                            onChange={(e) => setColumnFilters({...columnFilters, [col]: e.target.value})}
                            className="w-full text-xs font-normal border border-slate-200 rounded px-1 py-1 outline-none focus:border-blue-400 bg-white"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <option value="">Semua (Filter...)</option>
                            {(filterOptions[col] || []).map(opt => (
                              <option key={String(opt)} value={String(opt)}>{opt}</option>
                            ))}
                          </select>
                        )}
                      </div>
                    </th>
                  )})}
                  <th className="w-14 border-l border-slate-300 p-0 text-center sticky right-0 bg-slate-200 z-10 shadow-[-2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                    <div className="px-3 py-2 font-semibold text-slate-700">Aksi</div>
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.length === 0 ? (
                  <tr>
                    <td colSpan={columns.length + 1} className="p-8 text-center text-slate-500">
                      Tidak ada data ditemukan.
                    </td>
                  </tr>
                ) : (
                  data.map((row, index) => {
                    const rowId = row.id.toString();
                    const isRowEdited = Object.keys(edits).includes(rowId);
                    
                    return (
                      <tr key={row.id} className="border-b border-slate-200 hover:bg-slate-50 relative group">
                        <td className="border-r border-slate-300 bg-slate-50 text-center text-xs text-slate-400 p-0 font-medium select-none sticky left-0 z-0">
                          {isRowEdited && <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500" />}
                          {page * rowsPerPage + index + 1}
                        </td>
                        {columns.map(col => {
                          const value = row[col];
                          const editedValue = edits[rowId]?.[col];
                          const isCellEdited = editedValue !== undefined;
                          const displayValue = isCellEdited ? editedValue : value;

                          return (
                            <td key={col} className={`border-r border-slate-300 p-0 bg-white relative`}>
                              <div className="relative w-full h-full min-h-[36px] overflow-hidden">
                                <input
                                  type={col === 'latitude' || col === 'longitude' ? 'number' : 'text'}
                                  step={col === 'latitude' || col === 'longitude' ? 'any' : undefined}
                                  value={displayValue || ''}
                                  onChange={(e) => handleCellChange(rowId, col, e.target.value)}
                                  className={`absolute inset-0 w-full h-full min-w-0 px-3 py-1 bg-transparent outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500 max-w-none ${isCellEdited ? 'text-blue-700 font-medium bg-blue-50/30' : 'text-slate-700'}`}
                                  placeholder="-"
                                />
                              </div>
                              {isCellEdited && (
                                <div className="absolute top-0 right-0 w-2 h-2 bg-blue-500 z-10" style={{ clipPath: 'polygon(100% 0, 0 0, 100% 100%)' }} />
                              )}
                            </td>
                          );
                        })}
                        <td className="border-l border-slate-300 p-0 bg-slate-100 text-center align-middle sticky right-0 z-0 shadow-[-2px_0_5px_-2px_rgba(0,0,0,0.05)] border-b">
                          <button 
                            onClick={() => handleDeleteRow(row.id)} 
                            className="bg-white text-red-500 hover:bg-red-50 hover:text-red-700 border border-slate-200 p-1.5 rounded transition-colors inline-flex justify-center items-center shadow-sm my-1 mx-2"
                            title="Hapus baris"
                          >
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </main>

      {/* Footer Pagination */}
      <footer className="bg-white border-t border-slate-200 p-3 flex items-center justify-between text-sm sticky bottom-0 z-20">
        <div className="text-slate-500">
          Total Data: <span className="font-semibold text-slate-800">{totalCount.toLocaleString()}</span>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            disabled={page === 0}
            onClick={() => setPage(p => Math.max(0, p - 1))}
            className="px-3 py-1.5 border border-slate-300 rounded hover:bg-slate-50 disabled:opacity-50 transition"
          >
            Sebelumnya
          </button>
          <span className="px-3 text-slate-600 font-medium">
            Halaman {page + 1}
          </span>
          <button
            disabled={(page + 1) * rowsPerPage >= totalCount}
            onClick={() => setPage(p => p + 1)}
            className="px-3 py-1.5 border border-slate-300 rounded hover:bg-slate-50 disabled:opacity-50 transition"
          >
            Selanjutnya
          </button>
        </div>
      </footer>
    </div>
  );
};

export default DatabaseEditor;
