import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../services/supabase';
import { RefreshCw, Save, Plus, ClipboardPaste, ArrowRight, ChevronUp, ChevronDown, ArrowUpDown } from 'lucide-react';

const PaketPekerjaanPage: React.FC = () => {
  const { tahun } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [edits, setEdits] = useState<Record<string, Record<string, any>>>({});

  // Sorting and Filtering
  const [sortConfig, setSortConfig] = useState<{ column: string, ascending: boolean } | null>(null);
  const [columnFilters, setColumnFilters] = useState<Record<string, string>>({});
  const [debouncedFilters, setDebouncedFilters] = useState<Record<string, string>>({});
  const [filterOptions, setFilterOptions] = useState<Record<string, any[]>>({});

  const fetchFilterOptions = async () => {
    const { data } = await supabase.from('paket_pekerjaan').select();
    if (data) {
      const options: Record<string, any[]> = {};
      const cols = ['nama_paket', 'thpasang', 'jml_lampu', 'idpel', 'status', 'keterangan'];
      cols.forEach(col => {
        if (col === 'nama_paket') return;
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
    fetchFilterOptions();
  }, []);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedFilters(columnFilters);
    }, 300);
    return () => clearTimeout(handler);
  }, [columnFilters]);

  const columns = ['nama_paket', 'thpasang', 'jml_lampu', 'idpel', 'status', 'keterangan', 'aksi'];

  const getColumnWidthClass = (col: string) => {
    switch (col) {
      case 'nama_paket': return 'min-w-[250px] w-[35%]';
      case 'thpasang': return 'min-w-[80px] w-[80px] whitespace-nowrap text-center';
      case 'jml_lampu': return 'min-w-[60px] w-[60px] whitespace-nowrap';
      case 'idpel': return 'min-w-[80px] w-[80px] whitespace-nowrap';
      case 'status': return 'min-w-[100px] w-[100px] whitespace-nowrap';
      case 'keterangan': return 'min-w-[100px] w-[100px] whitespace-nowrap';
      case 'aksi': return 'w-10 whitespace-nowrap text-center';
      default: return 'min-w-[150px] whitespace-nowrap';
    }
  };

  const fetchTableData = async () => {
    setIsLoading(true);
    try {
      let query = supabase
        .from('paket_pekerjaan')
        .select('*');

      if (tahun) {
        query = query.eq('thpasang', Number(tahun));
      }

      // Apply column filters
      Object.entries(debouncedFilters).forEach(([col, val]) => {
        if (val !== '') {
           query = query.eq(col, val);
        }
      });

      if (sortConfig) {
        query = query.order(sortConfig.column, { ascending: sortConfig.ascending });
      } else {
        query = query.order('id', { ascending: true });
      }

      const { data: resultData, error } = await query;

      if (error) throw error;
      setData(resultData || []);
      setEdits({});
    } catch (err) {
      console.error(err);
      alert('Error fetching data paket pekerjaan');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTableData();
  }, [tahun, sortConfig, debouncedFilters]);

  const handleCellChange = (id: string, column: string, value: string) => {
    setEdits(prev => {
      const rowEdits = { ...(prev[id] || {}) };

      // Convert to proper types based on schema
      let finalValue: any = value === '' ? null : value;
      if (column === 'jml_lampu' || column === 'idpel' || column === 'thpasang') {
        finalValue = value === '' ? null : Number(value);
      }

      rowEdits[column] = finalValue;
      return { ...prev, [id]: rowEdits };
    });
  };

  const saveChanges = async () => {
    const editedIds = Object.keys(edits);
    if (editedIds.length === 0) return;

    setIsSaving(true);
    try {
      for (const id of editedIds) {
        // If it starts with 'new_', it's an insertion
        if (id.startsWith('new_')) {
          const insertData = { ...edits[id] };
          // Don't send the mock id
          const { error } = await supabase.from('paket_pekerjaan').insert(insertData);
          if (error) throw error;
        } else {
          // Update existing
          const { error } = await supabase
            .from('paket_pekerjaan')
            .update(edits[id])
            .eq('id', id);
          if (error) throw error;
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

  const addNewRow = () => {
    const newId = `new_${Date.now()}`;
    const newEntry = { id: newId, nama_paket: '', thpasang: tahun ? Number(tahun) : null, jml_lampu: null, idpel: null, status: '', keterangan: '' };
    setData([...data, newEntry]);
  };

  const handlePasteFromExcel = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (!text) return;

      const rows = text.split('\n').filter(r => r.trim() !== '');
      if (rows.length === 0) return;

      const newEntries: any[] = [];
      const newEdits: Record<string, any> = {};

      rows.forEach((row, index) => {
        const cells = row.split('\t');
        if (cells.length < 2) return; // Skip invalid rows roughly

        const newId = `new_${Date.now()}_${index}`;

        const entry = {
          id: newId,
          nama_paket: cells[0]?.trim() || '',
          thpasang: cells[1] ? Number(cells[1].trim()) : (tahun ? Number(tahun) : null), // support column index shift
          jml_lampu: cells[2] ? Number(cells[2].trim()) : null,
          idpel: cells[3] ? Number(cells[3].trim()) : null,
          status: cells[4]?.trim() || '',
          keterangan: cells[5]?.trim() || ''
        };

        newEntries.push(entry);

        newEdits[newId] = {
          nama_paket: entry.nama_paket,
          thpasang: entry.thpasang,
          jml_lampu: entry.jml_lampu,
          idpel: entry.idpel,
          status: entry.status,
          keterangan: entry.keterangan
        };
      });

      if (newEntries.length === 0) {
        alert('Tidak ada baris valid yang ditemukan di clipboard.');
        return;
      }

      setData(prev => [...prev, ...newEntries]);
      setEdits(prev => ({ ...prev, ...newEdits }));

      alert(`Berhasil memuat ${newEntries.length} baris dari clipboard!`);
    } catch (err) {
      console.error(err);
      alert('Gagal membaca clipboard. Pastikan site ini diizinkan untuk membaca Clipboard.');
    }
  };

  return (
    <div className="flex flex-col h-full text-slate-800 font-sans bg-slate-50">
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between sticky top-0 z-20 shadow-sm shrink-0">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            Paket Pekerjaan {tahun && <span className="text-indigo-600">({tahun})</span>}
          </h1>
          <p className="text-xs text-slate-500">Kelola dan update data paket pekerjaan</p>
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={fetchTableData}
            className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition"
            title="Refresh"
          >
            <RefreshCw size={18} className={isLoading ? "animate-spin" : ""} />
          </button>
          <button
            onClick={addNewRow}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all shadow-sm bg-white border border-slate-300 text-slate-700 hover:bg-slate-50"
          >
            <Plus size={16} />
            Tambah Paket
          </button>
          <button
            onClick={handlePasteFromExcel}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all shadow-sm bg-indigo-50 border border-indigo-200 text-indigo-700 hover:bg-indigo-100"
          >
            <ClipboardPaste size={16} />
            Paste dari Excel
          </button>
          <button
            onClick={saveChanges}
            disabled={Object.keys(edits).length === 0 || isSaving}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all shadow-sm ${Object.keys(edits).length > 0
              ? 'bg-indigo-600 text-white hover:bg-indigo-700'
              : 'bg-slate-200 text-slate-400 cursor-not-allowed'
              }`}
          >
            <Save size={16} />
            {isSaving ? 'Menyimpan...' : `Simpan (${Object.keys(edits).length})`}
          </button>
        </div>
      </header>

      <main className="flex-1 overflow-auto bg-white p-4">
        {isLoading && data.length === 0 ? (
          <div className="flex justify-center items-center h-full text-slate-400 gap-2">
            <RefreshCw className="animate-spin" size={20} />
            <span>Memuat tabel paket pekerjaan...</span>
          </div>
        ) : (
          <div className="border border-slate-300 shadow-sm rounded bg-white w-max min-w-full">
            <table className="w-full text-sm text-left border-collapse">
              <thead className="bg-slate-100 border-b border-slate-300 sticky top-0 z-10 shadow-sm">
                <tr>
                  <th className="w-10 border-r border-slate-300 p-0 text-center text-slate-400">#</th>
                  {columns.map(col => {
                    const isExcluded = col === 'nama_paket' || col === 'aksi';
                    return (
                    <th key={col} className={`border-r border-slate-300 font-semibold text-slate-600 px-3 py-2 capitalize ${getColumnWidthClass(col)} align-top`}>
                      <div className="flex flex-col gap-2">
                        <div 
                          className={`flex items-center justify-between select-none ${isExcluded ? '' : 'cursor-pointer hover:text-indigo-600'} group`}
                          onClick={() => {
                            if (isExcluded) return;
                            setSortConfig(prev => prev?.column === col ? { column: col, ascending: !prev.ascending } : { column: col, ascending: true });
                          }}
                        >
                          <span>{col.replace(/_/g, ' ')}</span>
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
                            className="w-full text-xs font-normal border border-slate-200 rounded px-1 py-1 outline-none focus:border-indigo-400 bg-white"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <option value="">Semua</option>
                            {(filterOptions[col] || []).map(opt => (
                              <option key={String(opt)} value={String(opt)}>{opt}</option>
                            ))}
                          </select>
                        )}
                      </div>
                    </th>
                  )})}
                </tr>
              </thead>
              <tbody>
                {data.length === 0 ? (
                  <tr>
                    <td colSpan={columns.length + 1} className="p-8 text-center text-slate-500">
                      Tidak ada data ditemukan. Anda bisa mendaftar paket baru.
                    </td>
                  </tr>
                ) : (
                  data.map((row, index) => {
                    const rowId = row.id.toString();
                    const isNew = rowId.startsWith('new_');
                    const isRowEdited = Object.keys(edits).includes(rowId);

                    return (
                      <tr key={row.id} className={`border-b border-slate-200 hover:bg-slate-50 relative group ${isNew ? 'bg-indigo-50/20' : ''}`}>
                        <td className="border-r border-slate-300 bg-slate-50 text-center text-xs text-slate-400 p-0 font-medium select-none sticky left-0 z-0">
                          {isRowEdited && <div className="absolute left-0 top-0 bottom-0 w-1 bg-indigo-500" />}
                          {isNew ? '*' : index + 1}
                        </td>
                        {columns.map(col => {
                          const value = row[col];
                          const editedValue = edits[rowId]?.[col];
                          const isCellEdited = editedValue !== undefined;
                          const displayValue = isCellEdited ? editedValue : value;

                          if (col === 'aksi') {
                            return (
                              <td key={col} className="border-r border-slate-300 p-2 bg-slate-50 text-center align-middle">
                                <button
                                  onClick={() => !isNew && navigate(`/admin/paket/${row.id}`)}
                                  disabled={isNew}
                                  title="Isi Lampu/Panel"
                                  className={`p-1.5 rounded-lg transition-colors ${isNew ? 'text-slate-300 cursor-not-allowed' : 'text-indigo-600 bg-indigo-100 hover:bg-indigo-200'}`}
                                >
                                  <ArrowRight size={18} />
                                </button>
                              </td>
                            );
                          }

                          return (
                            <td key={col} className={`border-r border-slate-300 p-0 bg-white relative align-top`}>
                              {col === 'nama_paket' ? (
                                <textarea
                                  value={displayValue || ''}
                                  onChange={(e) => handleCellChange(rowId, col, e.target.value)}
                                  className={`w-full h-full min-h-[40px] px-3 py-2 bg-transparent outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500 resize-y leading-tight ${isCellEdited ? 'text-indigo-700 font-medium bg-indigo-50/30' : 'text-slate-700'}`}
                                  placeholder="-"
                                  rows={2}
                                />
                              ) : (
                                <input
                                  type={col === 'jml_lampu' || col === 'idpel' || col === 'thpasang' ? 'number' : 'text'}
                                  value={displayValue || ''}
                                  onChange={(e) => handleCellChange(rowId, col, e.target.value)}
                                  className={`w-full h-full min-h-[40px] px-3 py-2 bg-transparent outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500 ${isCellEdited ? 'text-indigo-700 font-medium bg-indigo-50/30' : 'text-slate-700'}`}
                                  placeholder="-"
                                />
                              )}
                              {isCellEdited && !isNew && (
                                <div className="absolute top-0 right-0 w-2 h-2 bg-indigo-500" style={{ clipPath: 'polygon(100% 0, 0 0, 100% 100%)' }} />
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
};

export default PaketPekerjaanPage;
