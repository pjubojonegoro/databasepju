import React, { useState } from 'react';
import { BottomSheet } from 'react-spring-bottom-sheet';
import { useAppStore } from '../../store/useAppStore';
import { MapPin, Info, Settings, Calendar, Activity, X, Navigation2, Eye, Copy, Check } from 'lucide-react';
import PjuImage from '../ui/PjuImage';
import { copyToClipboard } from '../../utils/clipboard';
import 'react-spring-bottom-sheet/dist/style.css';

const PjuBottomSheet: React.FC = () => {
  const { selectedPoint, isMobileSheetOpen, setMobileSheetOpen } = useAppStore();
  const [copiedField, setCopiedField] = useState<string | null>(null);

  if (!selectedPoint) return null;

  const title = ('kode' in selectedPoint ? selectedPoint.kode : selectedPoint.id_pelanggan) || 'PJU Unnamed';
  const coordText = `${selectedPoint.latitude.toFixed(6)}, ${selectedPoint.longitude.toFixed(6)}`;
  const addressText = `${selectedPoint.kecamatan}, ${selectedPoint.desakel}`;

  const handleCopy = async (text: string, field: string) => {
    const ok = await copyToClipboard(text);
    if (ok) {
      setCopiedField(field);
      setTimeout(() => {
        setCopiedField((curr) => (curr === field ? null : curr));
      }, 2000);
    }
  };

  return (
    <BottomSheet
      open={isMobileSheetOpen}
      onDismiss={() => setMobileSheetOpen(false)}
      snapPoints={({ maxHeight }) => [
        maxHeight * 0.4,  // Initial height
        maxHeight * 0.85, // Fully expanded
      ]}
      header={
        <div className="flex justify-between items-center py-2 px-1">
          <div className="flex items-center gap-3 min-w-0 pr-2">
            <div className="bg-blue-100 dark:bg-blue-900/50 p-2 rounded-full flex-shrink-0">
              <MapPin className="text-blue-600 dark:text-blue-400" size={24} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="font-bold text-lg text-slate-800 dark:text-white leading-none truncate selectable-text select-text select-all">
                  {title}
                </h2>
                <button
                  onClick={() => handleCopy(title, 'title')}
                  className="p-1 rounded text-slate-400 hover:text-white active:scale-90 transition-transform flex-shrink-0"
                  title="Salin ID"
                  aria-label="Salin ID"
                >
                  {copiedField === 'title' ? (
                    <span className="text-emerald-400 flex items-center gap-1 text-[11px] font-bold">
                      <Check size={13} /> Tersalin
                    </span>
                  ) : (
                    <Copy size={14} />
                  )}
                </button>
              </div>
              <div className="flex items-center gap-1.5 mt-1">
                <span className="text-xs text-slate-500 dark:text-slate-400 font-medium truncate selectable-text select-text">
                  {addressText}
                </span>
                <button
                  onClick={() => handleCopy(addressText, 'address')}
                  className="text-slate-400 hover:text-white active:scale-90 transition-transform flex-shrink-0"
                  title="Salin Alamat"
                  aria-label="Salin Alamat"
                >
                  {copiedField === 'address' ? (
                    <span className="text-emerald-400 text-[10px] font-semibold flex items-center gap-0.5">
                      <Check size={11} /> Tersalin
                    </span>
                  ) : (
                    <Copy size={11} />
                  )}
                </button>
              </div>
            </div>
          </div>
          <button 
            onClick={() => setMobileSheetOpen(false)}
            className="p-2 bg-slate-100 dark:bg-slate-800 rounded-full text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-white flex-shrink-0 ml-1"
            aria-label="Tutup sheet"
          >
            <X size={20} />
          </button>
        </div>
      }
    >
      <div className="px-5 pb-8 pt-2">
        <div className="space-y-4">
          
          {/* Foto */}
          {selectedPoint.foto && (
            <div className="w-full h-48 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700/50 relative shadow-sm">
              <PjuImage 
                fotoId={selectedPoint.foto} 
                className="w-full h-full object-cover"
              />
            </div>
          )}

          {/* Status Banner */}
          <div className={`p-4 rounded-xl flex items-center gap-3 border ${
            selectedPoint.kategori === 'Aktif' 
              ? 'bg-emerald-50 border-emerald-200 dark:bg-emerald-500/10 dark:border-emerald-500/20 text-emerald-700 dark:text-emerald-400' 
              : selectedPoint.kategori === 'Rusak'
                ? 'bg-rose-50 border-rose-200 dark:bg-rose-500/10 dark:border-rose-500/20 text-rose-700 dark:text-rose-400'
                : 'bg-blue-50 border-blue-200 dark:bg-blue-500/10 dark:border-blue-500/20 text-blue-700 dark:text-blue-400'
          }`}>
            <Activity size={24} />
            <div>
              <p className="text-xs uppercase font-bold tracking-wider opacity-80">Status PJU</p>
              <p className="font-semibold text-lg selectable-text select-text">{selectedPoint.kategori || 'Tidak Diketahui'}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <InfoCard 
              icon={<Info size={18} />}
              label="Jenis Lampu"
              value={'jenis_lampu' in selectedPoint && selectedPoint.jenis_lampu ? selectedPoint.jenis_lampu : '-'}
            />
            <InfoCard 
              icon={<Settings size={18} />}
              label="Jenis Tiang"
              value={'tiang' in selectedPoint && selectedPoint.tiang ? `${selectedPoint.tiang}` : '-'}
            />
            <InfoCard 
              icon={<Calendar size={18} />}
              label="Tahun Pasang"
              value={selectedPoint.thpasang ? `${selectedPoint.thpasang}` : '-'}
            />
            <InfoCard 
              icon={<Activity size={18} />}
              label="Panel / Daya"
              value={'panel' in selectedPoint ? (selectedPoint.panel || '-') : (selectedPoint.daya || '-')}
            />
          </div>
          
          <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-800">
            <h3 className="text-sm font-semibold text-slate-800 dark:text-white mb-2">Koordinat Lokasi</h3>
            <div className="bg-slate-100 dark:bg-slate-900 rounded-lg p-3 font-mono text-xs text-slate-600 dark:text-slate-400 flex justify-between items-center border border-slate-700/40">
              <span className="selectable-text select-text select-all">{coordText}</span>
              <button 
                className="text-blue-600 dark:text-blue-400 font-semibold flex items-center gap-1 px-2.5 py-1 rounded-md bg-blue-500/10 hover:bg-blue-500/20 active:scale-95 transition-all"
                onClick={() => handleCopy(coordText, 'coords')}
                title="Salin Koordinat"
              >
                {copiedField === 'coords' ? (
                  <span className="text-emerald-500 dark:text-emerald-400 font-bold flex items-center gap-1">
                    <Check size={14} /> Tersalin!
                  </span>
                ) : (
                  <span className="flex items-center gap-1">
                    <Copy size={14} /> Salin
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 mt-4">
            <a
              href={`https://www.google.com/maps/dir/?api=1&destination=${selectedPoint.latitude},${selectedPoint.longitude}&travelmode=driving`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 flex-1 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold transition-colors"
            >
              <Navigation2 size={16} />
              Rute
            </a>
            <a
              href={`https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${selectedPoint.latitude},${selectedPoint.longitude}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 flex-1 py-3 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-sm font-semibold transition-colors"
            >
              <Eye size={16} />
              Street View
            </a>
          </div>

        </div>
      </div>
    </BottomSheet>
  );
};

const InfoCard = ({ icon, label, value }: { icon: React.ReactNode, label: string, value: string }) => (
  <div className="bg-white dark:bg-slate-800 p-3 rounded-xl border border-slate-100 dark:border-slate-700/50 shadow-sm">
    <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 mb-1">
      {icon}
      <span className="text-xs font-semibold selectable-text select-text">{label}</span>
    </div>
    <div className="font-medium text-slate-800 dark:text-slate-200 text-sm pl-6 selectable-text select-text">
      {value}
    </div>
  </div>
);

export default PjuBottomSheet;
