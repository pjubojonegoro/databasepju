import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../services/supabase';
import { ArrowLeft, Save, Camera, Image as ImageIcon, MapPin } from 'lucide-react';
import exifr from 'exifr';

const PaketDetail: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [paket, setPaket] = useState<any>(null);
  const [data, setData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [edits, setEdits] = useState<Record<string, Record<string, any>>>({});

  const fileInputRef = useRef<HTMLInputElement>(null);

  // We assume storing as lampu or panel. For now we use the same structure as lampu
  const columns = ['jenis', 'kode', 'kategori', 'jenis_lampu', 'tiang', 'desakel', 'kecamatan', 'latitude', 'longitude', 'foto'];

  const fetchDetail = async () => {
    setIsLoading(true);
    try {
      const { data: paketData, error: pktErr } = await supabase
        .from('paket_pekerjaan')
        .select('*')
        .eq('id', id)
        .single();

      if (pktErr) throw pktErr;
      setPaket(paketData);

      // Fetch related lampu. Assumes foreign key 'paket_id' or we just simulate if it doesn't exist.
      // Since it doesn't exist yet, we catch error and default to empty array.
      const { data: lampuData, error: lmpErr } = await supabase
        .from('lampu')
        .select('*')
        .eq('paket_id', id);

      if (lmpErr) {
        console.warn('paket_id might not exist in lampu table yet. Falling back to empty array.', lmpErr);
        setData([]);
      } else {
        setData(lampuData || []);
      }
      setEdits({});
    } catch (err: any) {
      console.error(err);
      alert('Gagal memuat detail paket: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (id) fetchDetail();
  }, [id]);

  const handleCellChange = (rowId: string, column: string, value: string) => {
    setEdits(prev => {
      const newEdits = { ...prev };

      // Helper to initialize row edit if not exist
      const initRow = (id: string) => {
        if (!newEdits[id]) newEdits[id] = {};
      };

      initRow(rowId);

      let finalValue: any = value === '' ? null : value;
      if (column === 'latitude' || column === 'longitude') {
        finalValue = value === '' ? null : Number(value);
      }

      newEdits[rowId][column] = finalValue;

      // 1. Cascade Kode (Auto Numbering)
      if (column === 'kode' && value) {
        const match = value.match(/^(.*?)(\d+)$/);
        if (match) {
          const prefix = match[1];
          const numStr = match[2];
          const startNum = parseInt(numStr, 10);

          const startIndex = data.findIndex(d => d.id.toString() === rowId);
          if (startIndex !== -1) {
            let currentNum = startNum + 1;
            for (let i = startIndex + 1; i < data.length; i++) {
              const nextRowId = data[i].id.toString();
              initRow(nextRowId);
              const nextNumStr = String(currentNum).padStart(numStr.length, '0');
              newEdits[nextRowId]['kode'] = `${prefix}${nextNumStr}`;
              currentNum++;
            }
          }
        }
      }

      // 2. Broadcast fields to all rows
      const broadcastColumns = ['tiang', 'kategori', 'jenis_lampu', 'desakel', 'kecamatan'];
      if (broadcastColumns.includes(column)) {
        for (let i = 0; i < data.length; i++) {
          const id = data[i].id.toString();
          initRow(id);
          newEdits[id][column] = finalValue;
        }
      }

      return newEdits;
    });
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const files = Array.from(e.target.files);

    const newEntries: any[] = [];
    const newEdits: Record<string, any> = {};

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      try {
        const exifData = await exifr.gps(file);

        let lat = null;
        let lng = null;

        if (exifData && exifData.latitude && exifData.longitude) {
          lat = exifData.latitude;
          lng = exifData.longitude;
        }

        const newId = `new_${Date.now()}_${i}`;
        const entry = {
          id: newId,
          jenis: 'Lampu',
          kode: '',
          kategori: '',
          jenis_lampu: '',
          tiang: '',
          desakel: '',
          kecamatan: '',
          latitude: lat,
          longitude: lng,
          foto: file.name
        };

        newEntries.push(entry);
        newEdits[newId] = {
          paket_id: Number(id),
          kode: entry.kode,
          kategori: entry.kategori,
          jenis_lampu: entry.jenis_lampu,
          tiang: entry.tiang,
          desakel: entry.desakel,
          kecamatan: entry.kecamatan,
          latitude: entry.latitude,
          longitude: entry.longitude,
          // usually we would upload 'file' to Storage and save URL to 'foto' column.
          // For now we just put the name.
        };

      } catch (err) {
        console.error('Failed processing EXIF for', file.name, err);
      }
    }

    if (newEntries.length > 0) {
      setData(prev => [...prev, ...newEntries]);
      setEdits(prev => ({ ...prev, ...newEdits }));
      alert(`Berhasil menambahkan ${newEntries.length} data dari foto!`);
    } else {
      alert('Tidak ada koordinat GPS ditemukan dalam foto tersebut.');
    }

    // reset input
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const saveChanges = async () => {
    const editedIds = Object.keys(edits);
    if (editedIds.length === 0) return;

    setIsSaving(true);
    try {
      for (const rowId of editedIds) {
        if (rowId.startsWith('new_')) {
          const insertData = { ...edits[rowId] };
          const { error } = await supabase.from('lampu').insert(insertData);
          if (error) throw error;
        } else {
          const { error } = await supabase.from('lampu').update(edits[rowId]).eq('id', rowId);
          if (error) throw error;
        }
      }
      alert('Perubahan berhasil disimpan!');
      fetchDetail();
    } catch (err: any) {
      alert('Terjadi kesalahan saat menyimpan: \nJika error terkait paket_id, pastikan Anda telah menambah relasi paket_id ke tabel Lampu!\n\n' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex flex-col h-full text-slate-800 font-sans bg-slate-50">
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between sticky top-0 z-20 shadow-sm shrink-0">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className="p-2 hover:bg-slate-100 rounded-lg text-slate-600 transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-xl font-bold text-slate-900">
              Isi Lampu / Panel
            </h1>
            <p className="text-sm text-slate-500">
              Paket: <span className="font-semibold text-slate-700">{paket?.nama_paket || 'Memuat...'}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <input
            type="file"
            accept="image/*"
            multiple
            capture="environment"
            className="hidden"
            ref={fileInputRef}
            onChange={handlePhotoUpload}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all shadow-sm bg-indigo-50 border border-indigo-200 text-indigo-700 hover:bg-indigo-100"
            title="Upload foto untuk mengekstrak GPS otomatis"
          >
            <Camera size={16} />
            <span className="hidden sm:inline">Upload Foto (Extract GPS)</span>
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
        {isLoading ? (
          <div className="flex justify-center items-center h-full text-slate-400">
            Memuat detail data...
          </div>
        ) : (
          <div className="border border-slate-300 shadow-sm rounded bg-white w-max min-w-full">
            <table className="w-full text-sm text-left border-collapse">
              <thead className="bg-slate-100 border-b border-slate-300 sticky top-0 z-10 shadow-sm">
                <tr>
                  <th className="w-10 border-r border-slate-300 p-0 text-center text-slate-400">#</th>
                  {columns.map(col => (
                    <th key={col} className={`border-r border-slate-300 font-semibold text-slate-600 px-3 py-2 whitespace-nowrap capitalize min-w-[120px]`}>
                      {col.replace(/_/g, ' ')}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.length === 0 ? (
                  <tr>
                    <td colSpan={columns.length + 1} className="p-8 text-center text-slate-500">
                      Belum ada titik lampu/panel di paket ini. Silakan Upload Foto.
                    </td>
                  </tr>
                ) : (
                  data.map((row, index) => {
                    const rowId = row.id.toString();
                    const isNew = rowId.startsWith('new_');
                    const isRowEdited = Object.keys(edits).includes(rowId);

                    return (
                      <tr key={rowId} className={`border-b border-slate-200 hover:bg-slate-50 relative group ${isNew ? 'bg-indigo-50/20' : ''}`}>
                        <td className="border-r border-slate-300 bg-slate-50 text-center text-xs text-slate-400 p-0 font-medium select-none sticky left-0 z-0">
                          {isRowEdited && <div className="absolute left-0 top-0 bottom-0 w-1 bg-indigo-500" />}
                          {isNew ? '*' : index + 1}
                        </td>
                        {columns.map(col => {
                          const value = row[col];
                          const editedValue = edits[rowId]?.[col];
                          const isCellEdited = editedValue !== undefined;
                          const displayValue = isCellEdited ? editedValue : value;

                          if (col === 'foto') {
                            return (
                              <td key={col} className="border-r border-slate-300 px-3 py-2 text-slate-500 bg-white">
                                {displayValue ? (
                                  <div className="flex items-center gap-2">
                                    <ImageIcon size={14} className="text-indigo-400" />
                                    <span className="truncate max-w-[150px]">{displayValue}</span>
                                  </div>
                                ) : '-'}
                              </td>
                            );
                          }

                          return (
                            <td key={col} className={`border-r border-slate-300 p-0 bg-white relative`}>
                              <div className="relative w-full h-full">
                                {col === 'latitude' || col === 'longitude' ? (
                                  <div className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 opacity-50">
                                    <MapPin size={12} />
                                  </div>
                                ) : null}
                                <input
                                  type={col === 'latitude' || col === 'longitude' ? 'number' : 'text'}
                                  step="any"
                                  value={displayValue || ''}
                                  onChange={(e) => handleCellChange(rowId, col, e.target.value)}
                                  className={`w-full h-full min-h-[36px] max-w-[200px] px-3 py-1 ${col === 'latitude' || col === 'longitude' ? 'pl-6' : ''} bg-transparent outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500 ${isCellEdited ? 'text-indigo-700 font-medium bg-indigo-50/30' : 'text-slate-700'}`}
                                  placeholder={col === 'latitude' || col === 'longitude' ? 'Tidak terbaca' : '-'}
                                />
                              </div>
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

export default PaketDetail;
