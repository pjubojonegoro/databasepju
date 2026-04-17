import React from 'react';
import { useAppStore } from '../../store/useAppStore';
import { MapPin, Info, Settings, Calendar, Activity, X, Clipboard, Navigation2, Eye } from 'lucide-react';

const DesktopPopup: React.FC = () => {
  const { selectedPoint, setSelectedPoint } = useAppStore();

  if (!selectedPoint) return null;

  const title = ('kode' in selectedPoint ? selectedPoint.kode : selectedPoint.id_pelanggan) || 'PJU Unnamed';
  const isLampu = 'jenis_lampu' in selectedPoint;

  const statusColor =
    selectedPoint.kategori === 'Aktif'
      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
      : selectedPoint.kategori === 'Rusak'
      ? 'bg-rose-500/10 border-rose-500/30 text-rose-400'
      : 'bg-blue-500/10 border-blue-500/30 text-blue-400';

  const gmapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${selectedPoint.latitude},${selectedPoint.longitude}&travelmode=driving`;

  return (
    <div
      className="absolute bottom-8 right-6 z-20 w-80 bg-slate-900/95 backdrop-blur-xl border border-slate-700/60 rounded-2xl shadow-2xl overflow-hidden"
      style={{ animation: 'slideUpFade 0.25s ease-out' }}
    >
      {/* Header */}
      <div className="flex items-start justify-between p-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="bg-blue-500/20 p-2 rounded-full flex-shrink-0">
            <MapPin size={18} className="text-blue-400" />
          </div>
          <div className="min-w-0">
            <h2 className="font-bold text-white text-sm leading-tight truncate">{title}</h2>
            <p className="text-xs text-slate-400 mt-0.5 truncate">
              {selectedPoint.kecamatan}, {selectedPoint.desakel}
            </p>
          </div>
        </div>
        <button
          onClick={() => setSelectedPoint(null)}
          className="p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-slate-700 transition-colors flex-shrink-0 ml-2"
          aria-label="Tutup popup"
        >
          <X size={16} />
        </button>
      </div>

      {/* Body */}
      <div className="p-4 space-y-3">
        {/* Status */}
        <div className={`flex items-center gap-2.5 p-3 rounded-xl border text-sm font-semibold ${statusColor}`}>
          <Activity size={16} />
          <span>{selectedPoint.kategori || 'Tidak Diketahui'}</span>
          <span className="text-xs font-normal ml-auto opacity-70">{isLampu ? 'Lampu' : 'Panel'}</span>
        </div>

        {/* Info Grid */}
        <div className="grid grid-cols-2 gap-2">
          <InfoRow
            icon={<Info size={14} />}
            label="Jenis Lampu"
            value={isLampu && (selectedPoint as any).jenis_lampu ? (selectedPoint as any).jenis_lampu : '-'}
          />
          <InfoRow
            icon={<Settings size={14} />}
            label="Tinggi Tiang"
            value={(selectedPoint as any).tiang ? `${(selectedPoint as any).tiang} m` : '-'}
          />
          <InfoRow
            icon={<Calendar size={14} />}
            label="Tahun Pasang"
            value={selectedPoint.thpasang ? `${selectedPoint.thpasang}` : '-'}
          />
          <InfoRow
            icon={<Activity size={14} />}
            label={isLampu ? 'Panel' : 'Daya'}
            value={isLampu ? ((selectedPoint as any).panel || '-') : ((selectedPoint as any).daya || '-')}
          />
        </div>

        {/* Koordinat */}
        <div className="bg-slate-800/60 rounded-xl p-3 border border-slate-700/40">
          <p className="text-xs text-slate-500 font-semibold mb-1.5 uppercase tracking-wider">Koordinat</p>
          <div className="flex items-center justify-between gap-2">
            <span className="font-mono text-xs text-slate-300">
              {selectedPoint.latitude.toFixed(6)}, {selectedPoint.longitude.toFixed(6)}
            </span>
            <button
              onClick={() => navigator.clipboard.writeText(`${selectedPoint.latitude}, ${selectedPoint.longitude}`)}
              className="text-blue-400 hover:text-blue-300 transition-colors flex-shrink-0"
              title="Salin koordinat"
            >
              <Clipboard size={14} />
            </button>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex gap-2">
          <a
            href={gmapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-1.5 flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold transition-colors"
          >
            <Navigation2 size={14} />
            Rute
          </a>
          <a
            href={`https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${selectedPoint.latitude},${selectedPoint.longitude}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-1.5 flex-1 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-sm font-semibold transition-colors"
          >
            <Eye size={14} />
            Street View
          </a>
        </div>
      </div>

      <style>{`
        @keyframes slideUpFade {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};

const InfoRow = ({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) => (
  <div className="bg-slate-800/50 rounded-lg p-2.5 border border-slate-700/30">
    <div className="flex items-center gap-1.5 text-slate-500 mb-1">
      {icon}
      <span className="text-xs font-semibold">{label}</span>
    </div>
    <div className="text-sm text-slate-200 font-medium pl-5 truncate">{value}</div>
  </div>
);

export default DesktopPopup;
