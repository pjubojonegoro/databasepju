import React from 'react';
import MapboxViewer from '../map/MapboxViewer';
import Sidebar from './Sidebar';
import DesktopPopup from './DesktopPopup';

import GlobalSearch from '../ui/GlobalSearch';
import { MapPin, Loader2 } from 'lucide-react';
import { useAppStore, requestUserLocation } from '../../store/useAppStore';

const DesktopLayout: React.FC = () => {
  const { isLocating, userLocation } = useAppStore();

  return (
    <div className="h-screen w-full relative bg-slate-950 overflow-hidden">
      <Sidebar />
      <MapboxViewer />
      
      <div className="absolute top-4 left-[340px] z-10">
        <GlobalSearch isMobile={false} />
      </div>

      {/* Floating Action Button - Lokasi Terkini on Desktop */}
      <div className="absolute top-4 right-4 z-10">
        <button
          onClick={requestUserLocation}
          disabled={isLocating}
          title="Tampilkan Lokasi Terkini"
          className={`h-10 px-3.5 rounded-xl backdrop-blur-xl border flex items-center gap-2 text-xs font-semibold shadow-xl transition-all select-none active:scale-95 ${
            userLocation
              ? 'bg-blue-600/90 border-blue-400 text-white shadow-blue-500/30 ring-2 ring-blue-400/50'
              : 'bg-slate-900/90 hover:bg-slate-800 border-slate-700/50 text-slate-200 hover:text-white'
          }`}
        >
          {isLocating ? (
            <Loader2 className="animate-spin text-blue-400" size={16} />
          ) : (
            <MapPin size={16} className={userLocation ? 'text-white drop-shadow-[0_0_6px_rgba(255,255,255,0.8)]' : 'text-blue-400'} />
          )}
          <span>Lokasi Saya</span>
        </button>
      </div>

      <DesktopPopup />
    </div>
  );
};

export default DesktopLayout;
