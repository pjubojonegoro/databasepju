import React, { useState, useRef } from 'react';
import { supabase } from '../../services/supabase';
import { uploadFotoPJU } from '../../services/stor';
import { FolderUp, Play, CheckCircle, AlertCircle, Loader, HardDriveUpload, FastForward } from 'lucide-react';

interface MigrationJob {
  file: File;
  status: 'pending' | 'uploading' | 'db_updating' | 'success' | 'error' | 'not_found' | 'skipped';
  errorMsg?: string;
}

const normalizeName = (name: string): string => {
  // Buang ekstensi (.jpg, .jpeg, .png) di akhir
  const withoutExt = name.replace(/\.(jpg|jpeg|png)$/i, '');
  // Hanya ambil alphanumeric (buang spasi, -, _, dan titik) dan kecilkan
  return withoutExt.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
};

const MigrasiPage: React.FC = () => {
  const [jobs, setJobs] = useState<MigrationJob[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const files = Array.from(e.target.files).filter(file =>
      file.name.match(/\.(jpg|jpeg|png)$/i)
    );

    setJobs(files.map(file => ({
      file,
      status: 'pending'
    })));
  };

  const startMigration = async () => {
    if (jobs.length === 0 || isRunning) return;
    setIsRunning(true);
    setProgress(0);

    try {
      // 1. Ambil data pemetaan kode -> id dari tabel lampu
      const { data: lampuData, error: dbError } = await supabase
        .from('lampu')
        .select('id, kode, foto')
        .limit(50000);

      if (dbError) throw dbError;

      // Buat dictionary normalisasi
      const kodeMap = new Map<string, { id: number, foto: string | null }>();
      lampuData.forEach((l: any) => {
        if (l.kode) {
          kodeMap.set(normalizeName(l.kode), { id: l.id, foto: l.foto });
        }
      });

      // 2. Setup antrian (Queue) (Lebih kecil untuk Free Tier yg 100/min)
      const maxConcurrent = 5;
      let currentIndex = 0;
      let completedCount = 0;

      // Konversi state ke array mutable untuk prosesing background
      const currentJobs = [...jobs];

      const processNext = async (): Promise<void> => {
        if (currentIndex >= currentJobs.length) return;

        const jobIndex = currentIndex++;
        const job = currentJobs[jobIndex];

        // Update UI status to uploading
        updateJobStatus(jobIndex, 'uploading');

        const normalizedFileName = normalizeName(job.file.name);
        const lampuDataFound = kodeMap.get(normalizedFileName);

        if (!lampuDataFound) {
          updateJobStatus(jobIndex, 'not_found', 'Kode lampu tidak cocok di database');
        } else if (lampuDataFound.foto) {
          updateJobStatus(jobIndex, 'skipped');
        } else {
          const lampuId = lampuDataFound.id;
          try {
            const uploadRes = await uploadFotoPJU(job.file);

            // Extract the actual ID from the enhanced response
            const finalId = (uploadRes as any).id;

            if (!finalId) throw new Error('Format respon API Cloudinary tidak valid (ID tidak ditemukan)');

            // Update UI status to DB updating
            updateJobStatus(jobIndex, 'db_updating');

            // Update ke DB (Supabase)
            const { error: updateError } = await supabase
              .from('lampu')
              .update({ foto: finalId })
              .eq('id', lampuId);

            if (updateError) throw updateError;

            updateJobStatus(jobIndex, 'success');
          } catch (err: any) {
            updateJobStatus(jobIndex, 'error', err.message || 'Error occurred');
          }
        }

        completedCount++;
        setProgress(Math.round((completedCount / currentJobs.length) * 100));

        // Beri jeda ringan (optional) untuk Cloudinary
        await new Promise(r => setTimeout(r, 600));

        // Lanjut ke file berikutnya
        await processNext();
      };

      // Mulai beberapa worker
      const workers = [];
      for (let i = 0; i < Math.min(maxConcurrent, currentJobs.length); i++) {
        workers.push(processNext());
      }

      await Promise.all(workers);

      alert('Migrasi selesai!');
    } catch (error: any) {
      alert(`Gagal menyiapkan migrasi: ${error.message}`);
    } finally {
      setIsRunning(false);
    }
  };

  const updateJobStatus = (index: number, status: MigrationJob['status'], errorMsg?: string) => {
    setJobs(prev => {
      const newJobs = [...prev];
      newJobs[index] = { ...newJobs[index], status, errorMsg };
      return newJobs;
    });
  };

  const getStatusCounts = () => {
    return jobs.reduce((acc, job) => {
      acc[job.status] = (acc[job.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  };

  const stats = getStatusCounts();

  return (
    <div className="p-8 h-full flex flex-col overflow-hidden">
      <div className="flex items-center gap-3 mb-8">
        <div className="p-3 bg-indigo-500/10 text-indigo-500 rounded-xl">
          <HardDriveUpload size={24} />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Migrasi Foto ke Cloudinary</h1>
          <p className="text-slate-500">Upload batch ratusan/ribuan foto sekaligus untuk memetakan nama file dengan &quot;kode&quot; tiang/lampu</p>
        </div>
      </div>

      {/* Kontrol */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm mb-6 flex flex-wrap gap-4 items-center">
        <div className="flex-1">
          <input
            type="file"
            // @ts-ignore - webkitdirectory is non-standard but heavily supported
            webkitdirectory="true"
            directory="true"
            multiple
            className="hidden"
            ref={fileInputRef}
            onChange={handleFileSelect}
            disabled={isRunning}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isRunning}
            className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 px-5 py-3 rounded-xl font-medium transition-colors disabled:opacity-50"
          >
            <FolderUp size={18} />
            Pilih Folder Foto (.jpg, .png)
          </button>
        </div>

        <div className="flex items-center gap-4 text-sm font-medium">
          <div className="text-slate-500">Total: <span className="text-slate-900">{jobs.length}</span></div>
          <div className="text-emerald-500">Sukses: {stats['success'] || 0}</div>
          <div className="text-blue-500">Dilewati: {stats['skipped'] || 0}</div>
          <div className="text-rose-500">Error: {(stats['error'] || 0) + (stats['not_found'] || 0)}</div>
        </div>

        <button
          onClick={startMigration}
          disabled={isRunning || jobs.length === 0}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-8 py-3 rounded-xl font-bold transition-colors disabled:opacity-50"
        >
          {isRunning ? <Loader size={18} className="animate-spin" /> : <Play size={18} />}
          {isRunning ? 'Memproses...' : 'Mulai Migrasi'}
        </button>
      </div>

      {/* Progress */}
      {isRunning || progress > 0 ? (
        <div className="mb-6">
          <div className="flex justify-between text-sm mb-2 font-medium">
            <span className="text-slate-500">Progres Keseluruhan</span>
            <span className="text-indigo-600">{progress}%</span>
          </div>
          <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden">
            <div
              className="bg-indigo-500 h-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      ) : null}

      {/* List / Log */}
      <div className="flex-1 overflow-auto bg-white rounded-2xl border border-slate-200 shadow-sm p-4 custom-scrollbar">
        {jobs.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-400">
            <HardDriveUpload size={48} className="mb-4 opacity-20" />
            <p>Pilih folder berisi foto untuk memulai.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {jobs.map((job, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100 text-sm">
                <span className="font-medium text-slate-700 truncate max-w-[50%]">{job.file.name}</span>
                <span className="flex items-center gap-2">
                  {job.status === 'pending' && <span className="text-slate-400">Menunggu</span>}
                  {job.status === 'uploading' && <><Loader size={14} className="animate-spin text-blue-500" /> <span className="text-blue-500">Upload to Cloudinary...</span></>}
                  {job.status === 'db_updating' && <><Loader size={14} className="animate-spin text-amber-500" /> <span className="text-amber-500">Update Database...</span></>}
                  {job.status === 'success' && <><CheckCircle size={14} className="text-emerald-500" /> <span className="text-emerald-500">Berhasil</span></>}
                  {job.status === 'skipped' && <><FastForward size={14} className="text-blue-500" /> <span className="text-blue-500">Dilewati (Sudah ada foto)</span></>}
                  {(job.status === 'error' || job.status === 'not_found') && (
                    <>
                      <AlertCircle size={14} className="text-rose-500" />
                      <span className="text-rose-500 max-w-[400px] truncate" title={job.errorMsg}>{job.errorMsg}</span>
                    </>
                  )}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MigrasiPage;
