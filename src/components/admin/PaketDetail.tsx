import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../services/supabase';
import { ArrowLeft, Save, Camera, Image as ImageIcon, MapPin } from 'lucide-react';
import exifr from 'exifr';

const PaketDetail: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [paket, setPaket] = useState<any>(null);
  
  const [lampuData, setLampuData] = useState<any[]>([]);
  const [panelData, setPanelData] = useState<any[]>([]);
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  
  const [lampuEdits, setLampuEdits] = useState<Record<string, Record<string, any>>>({});
  const [panelEdits, setPanelEdits] = useState<Record<string, Record<string, any>>>({});

  const lampuFileInputRef = useRef<HTMLInputElement>(null);
  const panelFileInputRef = useRef<HTMLInputElement>(null);

  const lampuColumns = ['panel', 'kode', 'kategori', 'jenis_lampu', 'tiang', 'desakel', 'kecamatan', 'latitude', 'longitude', 'foto'];
  const panelColumns = ['id_pelanggan', 'nama_pelanggan', 'kategori', 'no_meter', 'daya', 'jml_lampu', 'total_daya', 'alamat', 'latitude', 'longitude', 'foto'];

  const availablePanels = React.useMemo(() => {
    const names = new Set<string>();
    panelData.forEach(p => {
      const name = panelEdits[p.id]?.nama_pelanggan ?? p.nama_pelanggan;
      if (name) names.add(name);
    });
    Object.values(panelEdits).forEach(edit => {
      if (edit.nama_pelanggan) names.add(edit.nama_pelanggan);
    });
    return Array.from(names);
  }, [panelData, panelEdits]);

  const computePanelDynamicData = React.useCallback((panelName: string) => {
    if (!panelName) return { jml: 0, daya: 0 };
    let count = 0;
    let totalDaya = 0;
    
    lampuData.forEach(l => {
      const lPanel = lampuEdits[l.id]?.panel ?? l.panel;
      if (lPanel === panelName) {
        count++;
        const lJenis = lampuEdits[l.id]?.jenis_lampu ?? l.jenis_lampu;
        if (lJenis) {
          const parsed = parseFloat(lJenis.toString().replace(/[^\d.]/g, ''));
          if (!isNaN(parsed)) {
            totalDaya += parsed;
          }
        }
      }
    });

    return { jml: count, daya: totalDaya };
  }, [lampuData, lampuEdits]);

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

      // Fetch related lampu
      const { data: lampuRes, error: lmpErr } = await supabase
        .from('lampu')
        .select('*')
        .eq('paket_id', id)
        .order('id', { ascending: true });

      if (lmpErr) {
        console.warn('paket_id might not exist in lampu table yet.', lmpErr);
        setLampuData([]);
      } else {
        setLampuData(lampuRes || []);
      }

      // Fetch related panel
      const { data: panelRes, error: pnlErr } = await supabase
        .from('panel')
        .select('*')
        .eq('paket_id', id)
        .order('id', { ascending: true });

      if (pnlErr) {
        console.warn('paket_id might not exist in panel table yet.', pnlErr);
        setPanelData([]);
      } else {
        setPanelData(panelRes || []);
      }

      setLampuEdits({});
      setPanelEdits({});
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

  const handleLampuCellChange = (rowId: string, column: string, value: string) => {
    setLampuEdits(prev => {
      const newEdits = { ...prev };
      const initRow = (id: string) => { if (!newEdits[id]) newEdits[id] = {}; };
      initRow(rowId);

      let finalValue: any = value === '' ? null : value;
      if (column === 'latitude' || column === 'longitude') {
        finalValue = value === '' ? null : Number(value);
      }
      newEdits[rowId][column] = finalValue;

      // Cascade Kode
      if (column === 'kode' && value) {
        const match = value.match(/^(.*?)(\d+)$/);
        if (match) {
          const prefix = match[1];
          const startNumStr = match[2];
          const startNum = parseInt(startNumStr, 10);
          const numStrLen = startNumStr.length;

          const startIndex = lampuData.findIndex(d => d.id.toString() === rowId);
          if (startIndex !== -1) {
            let currentNum = startNum + 1;
            for (let i = startIndex + 1; i < lampuData.length; i++) {
              const nextRowId = lampuData[i].id.toString();
              initRow(nextRowId);
              newEdits[nextRowId]['kode'] = `${prefix}${String(currentNum).padStart(numStrLen, '0')}`;
              currentNum++;
            }
          }
        }
      }

      // Broadcast
      const broadcastColumns = ['tiang', 'kategori', 'jenis_lampu', 'desakel', 'kecamatan'];
      if (broadcastColumns.includes(column)) {
        for (let i = 0; i < lampuData.length; i++) {
          const id = lampuData[i].id.toString();
          initRow(id);
          newEdits[id][column] = finalValue;
        }
      }

      return newEdits;
    });
  };

  const handlePanelCellChange = (rowId: string, column: string, value: string) => {
    setPanelEdits(prev => {
      const newEdits = { ...prev };
      const initRow = (id: string) => { if (!newEdits[id]) newEdits[id] = {}; };
      initRow(rowId);

      let finalValue: any = value === '' ? null : value;
      if (column === 'latitude' || column === 'longitude' || column === 'daya' || column === 'jml_lampu' || column === 'total_daya') {
        finalValue = value === '' ? null : Number(value);
      }
      newEdits[rowId][column] = finalValue;
      
      // Broadcast Panel
      const broadcastColumns = ['kategori', 'alamat'];
      if (broadcastColumns.includes(column)) {
        for (let i = 0; i < panelData.length; i++) {
          const id = panelData[i].id.toString();
          initRow(id);
          newEdits[id][column] = finalValue;
        }
      }

      return newEdits;
    });
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>, isLampu: boolean) => {
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

        const newId = `new_${isLampu ? 'lampu' : 'panel'}_${Date.now()}_${i}`;
        
        if (isLampu) {
          const entry = {
            id: newId,
            panel: '',
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
            panel: entry.panel,
            kode: entry.kode,
            kategori: entry.kategori,
            jenis_lampu: entry.jenis_lampu,
            tiang: entry.tiang,
            desakel: entry.desakel,
            kecamatan: entry.kecamatan,
            latitude: entry.latitude,
            longitude: entry.longitude,
          };
        } else {
          const entry = {
            id: newId,
            id_pelanggan: '',
            nama_pelanggan: '',
            kategori: '',
            no_meter: '',
            daya: null,
            jml_lampu: null,
            total_daya: null,
            alamat: '',
            latitude: lat,
            longitude: lng,
            foto: file.name
          };
          newEntries.push(entry);
          newEdits[newId] = {
            paket_id: Number(id),
            id_pelanggan: entry.id_pelanggan,
            nama_pelanggan: entry.nama_pelanggan,
            kategori: entry.kategori,
            no_meter: entry.no_meter,
            daya: entry.daya,
            jml_lampu: entry.jml_lampu,
            total_daya: entry.total_daya,
            alamat: entry.alamat,
            latitude: entry.latitude,
            longitude: entry.longitude,
          };
        }
      } catch (err) {
        console.error('Failed processing EXIF for', file.name, err);
      }
    }

    if (newEntries.length > 0) {
      if (isLampu) {
        setLampuData(prev => [...prev, ...newEntries]);
        setLampuEdits(prev => ({ ...prev, ...newEdits }));
      } else {
        setPanelData(prev => [...prev, ...newEntries]);
        setPanelEdits(prev => ({ ...prev, ...newEdits }));
      }
      alert(`Berhasil menambahkan ${newEntries.length} data dari foto!`);
    } else {
      alert('Tidak ada koordinat GPS ditemukan dalam foto tersebut.');
    }

    if (isLampu && lampuFileInputRef.current) lampuFileInputRef.current.value = '';
    if (!isLampu && panelFileInputRef.current) panelFileInputRef.current.value = '';
  };

  const saveChanges = async () => {
    const updatedPanelEdits = { ...panelEdits };
    const allPanelIds = new Set([...panelData.map(p => p.id.toString()), ...Object.keys(updatedPanelEdits)]);
    
    for (const rowId of allPanelIds) {
      const row = panelData.find(p => p.id.toString() === rowId) || {};
      const name = updatedPanelEdits[rowId]?.nama_pelanggan ?? row.nama_pelanggan;
      if (name) {
        const dynamic = computePanelDynamicData(name);
        const currentJml = updatedPanelEdits[rowId]?.jml_lampu ?? row.jml_lampu;
        const currentDaya = updatedPanelEdits[rowId]?.total_daya ?? row.total_daya;
        
        if (dynamic.jml !== currentJml || dynamic.daya !== currentDaya) {
          if (!updatedPanelEdits[rowId]) updatedPanelEdits[rowId] = {};
          updatedPanelEdits[rowId].jml_lampu = dynamic.jml;
          updatedPanelEdits[rowId].total_daya = dynamic.daya;
        }
      }
    }

    const editedLampuIds = Object.keys(lampuEdits);
    const editedPanelIds = Object.keys(updatedPanelEdits);
    
    if (editedLampuIds.length === 0 && editedPanelIds.length === 0) return;

    setIsSaving(true);
    try {
      // Save Lampu
      for (const rowId of editedLampuIds) {
        const payload = { ...lampuEdits[rowId] };
        if (paket?.thpasang) {
           payload.thpasang = paket.thpasang;
        }

        if (rowId.startsWith('new_')) {
          const { error } = await supabase.from('lampu').insert(payload);
          if (error) throw error;
        } else {
          const { error } = await supabase.from('lampu').update(payload).eq('id', rowId);
          if (error) throw error;
        }
      }

      // Save Panel
      for (const rowId of editedPanelIds) {
        const payload = { ...updatedPanelEdits[rowId] };
        if (paket?.thpasang) {
           payload.thpasang = paket.thpasang; // Ensure table schema is correct (string or number)
        }

        if (rowId.startsWith('new_')) {
          const { error } = await supabase.from('panel').insert(payload);
          if (error) throw error;
        } else {
          const { error } = await supabase.from('panel').update(payload).eq('id', rowId);
          if (error) throw error;
        }
      }

      alert('Perubahan berhasil disimpan!');
      fetchDetail();
    } catch (err: any) {
      alert('Terjadi kesalahan saat menyimpan: \nJika error terkait paket_id, pastikan Anda telah menambah relasi paket_id ke tabel bersangkutan!\n\n' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const totalEdits = Object.keys(lampuEdits).length + Object.keys(panelEdits).length;

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
            ref={lampuFileInputRef}
            onChange={(e) => handlePhotoUpload(e, true)}
          />
          <input
            type="file"
            accept="image/*"
            multiple
            capture="environment"
            className="hidden"
            ref={panelFileInputRef}
            onChange={(e) => handlePhotoUpload(e, false)}
          />
          
          <button
            onClick={saveChanges}
            disabled={totalEdits === 0 || isSaving}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all shadow-sm ${totalEdits > 0
              ? 'bg-indigo-600 text-white hover:bg-indigo-700'
              : 'bg-slate-200 text-slate-400 cursor-not-allowed'
              }`}
          >
            <Save size={16} />
            {isSaving ? 'Menyimpan...' : `Simpan (${totalEdits})`}
          </button>
        </div>
      </header>

      <main className="flex-1 overflow-auto bg-white p-6 flex flex-col gap-10">
        {isLoading ? (
          <div className="flex justify-center items-center h-full text-slate-400">
            Memuat detail data...
          </div>
        ) : (
          <>
            {/* Tabel Lampu */}
            <section className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-slate-800">Data Lampu</h2>
                  <p className="text-sm text-slate-500">Daftar titik lampu pada paket ini</p>
                </div>
                <button
                  onClick={() => lampuFileInputRef.current?.click()}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all shadow-sm bg-indigo-50 border border-indigo-200 text-indigo-700 hover:bg-indigo-100"
                  title="Upload foto untuk mengekstrak GPS otomatis ke data Lampu"
                >
                  <Camera size={14} />
                  <span>Upload Foto Lampu</span>
                </button>
              </div>

              <div className="border border-slate-300 shadow-sm rounded bg-white w-max min-w-full">
                <table className="w-full text-sm text-left border-collapse">
                  <thead className="bg-slate-100 border-b border-slate-300 shadow-sm">
                    <tr>
                      <th className="w-10 border-r border-slate-300 p-0 text-center text-slate-400 sticky top-0 z-10 bg-slate-100">#</th>
                      {lampuColumns.map(col => (
                        <th key={col} className={`border-r border-slate-300 font-semibold text-slate-600 px-3 py-2 whitespace-nowrap capitalize min-w-[120px] sticky top-0 z-10 bg-slate-100`}>
                          {col.replace(/_/g, ' ')}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {lampuData.length === 0 ? (
                      <tr>
                        <td colSpan={lampuColumns.length + 1} className="p-8 text-center text-slate-500">
                          Belum ada titik lampu. Silakan Upload Foto Lampu.
                        </td>
                      </tr>
                    ) : (
                      lampuData.map((row, index) => {
                        const rowId = row.id.toString();
                        const isNew = rowId.startsWith('new_');
                        const isRowEdited = Object.keys(lampuEdits).includes(rowId);

                        return (
                          <tr key={rowId} className={`border-b border-slate-200 hover:bg-slate-50 relative group ${isNew ? 'bg-indigo-50/20' : ''}`}>
                            <td className="border-r border-slate-300 bg-slate-50 text-center text-xs text-slate-400 p-0 font-medium select-none sticky left-0 z-0">
                              {isRowEdited && <div className="absolute left-0 top-0 bottom-0 w-1 bg-indigo-500" />}
                              {isNew ? '*' : index + 1}
                            </td>
                            {lampuColumns.map(col => {
                              const value = row[col];
                              const editedValue = lampuEdits[rowId]?.[col];
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

                              if (col === 'panel') {
                                return (
                                  <td key={col} className={`border-r border-slate-300 p-0 bg-white relative`}>
                                    <select
                                      value={displayValue || ''}
                                      onChange={(e) => handleLampuCellChange(rowId, col, e.target.value)}
                                      className={`w-full h-full min-h-[36px] max-w-[200px] flex-1 px-3 py-1 bg-transparent outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500 ${isCellEdited ? 'text-indigo-700 font-medium bg-indigo-50/30' : 'text-slate-700'}`}
                                    >
                                      <option value="">- Pilih Panel -</option>
                                      {availablePanels.map(p => (
                                        <option key={p} value={p}>{p}</option>
                                      ))}
                                    </select>
                                    {isCellEdited && !isNew && (
                                      <div className="absolute top-0 right-0 w-2 h-2 bg-indigo-500" style={{ clipPath: 'polygon(100% 0, 0 0, 100% 100%)' }} />
                                    )}
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
                                      onChange={(e) => handleLampuCellChange(rowId, col, e.target.value)}
                                      className={`w-full h-full min-h-[36px] max-w-[200px] flex-1 px-3 py-1 ${col === 'latitude' || col === 'longitude' ? 'pl-6' : ''} bg-transparent outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500 ${isCellEdited ? 'text-indigo-700 font-medium bg-indigo-50/30' : 'text-slate-700'}`}
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
            </section>

            <hr className="border-slate-200" />

            {/* Tabel Panel */}
            <section className="flex flex-col gap-3 pb-8">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-slate-800">Data Panel</h2>
                  <p className="text-sm text-slate-500">Daftar panel pada paket ini</p>
                </div>
                <button
                  onClick={() => panelFileInputRef.current?.click()}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all shadow-sm bg-blue-50 border border-blue-200 text-blue-700 hover:bg-blue-100"
                  title="Upload foto untuk mengekstrak GPS otomatis ke data Panel"
                >
                  <Camera size={14} />
                  <span>Upload Foto Panel</span>
                </button>
              </div>

              <div className="border border-slate-300 shadow-sm rounded bg-white w-max min-w-full">
                <table className="w-full text-sm text-left border-collapse">
                  <thead className="bg-slate-100 border-b border-slate-300 shadow-sm">
                    <tr>
                      <th className="w-10 border-r border-slate-300 p-0 text-center text-slate-400 sticky top-0 z-10 bg-slate-100">#</th>
                      {panelColumns.map(col => (
                        <th key={col} className={`border-r border-slate-300 font-semibold text-slate-600 px-3 py-2 whitespace-nowrap capitalize min-w-[120px] sticky top-0 z-10 bg-slate-100`}>
                          {col.replace(/_/g, ' ')}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {panelData.length === 0 ? (
                      <tr>
                        <td colSpan={panelColumns.length + 1} className="p-8 text-center text-slate-500">
                          Belum ada titik panel. Silakan Upload Foto Panel.
                        </td>
                      </tr>
                    ) : (
                      panelData.map((row, index) => {
                        const rowId = row.id.toString();
                        const isNew = rowId.startsWith('new_');
                        const isRowEdited = Object.keys(panelEdits).includes(rowId);

                        return (
                          <tr key={rowId} className={`border-b border-slate-200 hover:bg-slate-50 relative group ${isNew ? 'bg-blue-50/20' : ''}`}>
                            <td className="border-r border-slate-300 bg-slate-50 text-center text-xs text-slate-400 p-0 font-medium select-none sticky left-0 z-0">
                              {isRowEdited && <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500" />}
                              {isNew ? '*' : index + 1}
                            </td>
                            {panelColumns.map(col => {
                              const value = row[col];
                              const editedValue = panelEdits[rowId]?.[col];
                              const isCellEdited = editedValue !== undefined;
                              const displayValue = isCellEdited ? editedValue : value;

                              if (col === 'foto') {
                                return (
                                  <td key={col} className="border-r border-slate-300 px-3 py-2 text-slate-500 bg-white">
                                    {displayValue ? (
                                      <div className="flex items-center gap-2">
                                        <ImageIcon size={14} className="text-blue-400" />
                                        <span className="truncate max-w-[150px]">{displayValue}</span>
                                      </div>
                                    ) : '-'}
                                  </td>
                                );
                              }

                              if (col === 'jml_lampu' || col === 'total_daya') {
                                const name = panelEdits[rowId]?.nama_pelanggan ?? row['nama_pelanggan'];
                                const dynamic = computePanelDynamicData(name || '');
                                const isJml = col === 'jml_lampu';
                                const displayVal = isJml ? dynamic.jml : dynamic.daya;

                                return (
                                  <td key={col} className={`border-r border-slate-300 p-0 bg-slate-50 relative`}>
                                    <input
                                      type="number"
                                      value={displayVal}
                                      readOnly
                                      className={`w-full h-full min-h-[36px] max-w-[200px] flex-1 px-3 py-1 bg-transparent text-slate-500 cursor-not-allowed`}
                                    />
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
                                      type={(col === 'latitude' || col === 'longitude' || col === 'daya' || col === 'jml_lampu' || col === 'total_daya') ? 'number' : 'text'}
                                      step="any"
                                      value={displayValue || ''}
                                      onChange={(e) => handlePanelCellChange(rowId, col, e.target.value)}
                                      className={`w-full h-full min-h-[36px] max-w-[200px] flex-1 px-3 py-1 ${col === 'latitude' || col === 'longitude' ? 'pl-6' : ''} bg-transparent outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500 ${isCellEdited ? 'text-blue-700 font-medium bg-blue-50/30' : 'text-slate-700'}`}
                                      placeholder={col === 'latitude' || col === 'longitude' ? 'Tidak terbaca' : '-'}
                                    />
                                  </div>
                                  {isCellEdited && !isNew && (
                                    <div className="absolute top-0 right-0 w-2 h-2 bg-blue-500" style={{ clipPath: 'polygon(100% 0, 0 0, 100% 100%)' }} />
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
            </section>
          </>
        )}
      </main>
    </div>
  );
};

export default PaketDetail;
