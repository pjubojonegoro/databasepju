import React from 'react';
import { BottomSheet } from 'react-spring-bottom-sheet';
import { useAppStore } from '../../store/useAppStore';
import { MapPin, Info, Settings, Calendar, Activity, X } from 'lucide-react';
import 'react-spring-bottom-sheet/dist/style.css';

const PjuBottomSheet: React.FC = () => {
  const { selectedPoint, isMobileSheetOpen, setMobileSheetOpen } = useAppStore();

  if (!selectedPoint) return null;

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
          <div className="flex items-center gap-3">
            <div className="bg-blue-100 dark:bg-blue-900/50 p-2 rounded-full">
              <MapPin className="text-blue-600 dark:text-blue-400" size={24} />
            </div>
            <div>
              <h2 className="font-bold text-lg text-slate-800 dark:text-white leading-none">
                {('kode' in selectedPoint ? selectedPoint.kode : selectedPoint.id_pelanggan) || 'PJU Unnamed'}
              </h2>
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                {selectedPoint.kecamatan}, {selectedPoint.desakel}
              </span>
            </div>
          </div>
          <button 
            onClick={() => setMobileSheetOpen(false)}
            className="p-2 bg-slate-100 dark:bg-slate-800 rounded-full text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-white"
          >
            <X size={20} />
          </button>
        </div>
      }
    >
      <div className="px-5 pb-8 pt-2">
        <div className="space-y-4">
          
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
              <p className="font-semibold text-lg">{selectedPoint.kategori || 'Tidak Diketahui'}</p>
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
              label="Tinggi Tiang"
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
            <div className="bg-slate-100 dark:bg-slate-900 rounded-lg p-3 font-mono text-xs text-slate-600 dark:text-slate-400 flex justify-between items-center">
              <span>{selectedPoint.latitude.toFixed(6)}, {selectedPoint.longitude.toFixed(6)}</span>
              <button 
                className="text-blue-600 dark:text-blue-400 font-semibold"
                onClick={() => navigator.clipboard.writeText(`${selectedPoint.latitude}, ${selectedPoint.longitude}`)}
              >
                Copy
              </button>
            </div>
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
      <span className="text-xs font-semibold">{label}</span>
    </div>
    <div className="font-medium text-slate-800 dark:text-slate-200 text-sm pl-6">
      {value}
    </div>
  </div>
);

export default PjuBottomSheet;
