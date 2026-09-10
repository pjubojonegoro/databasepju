import React, { useState } from 'react';
import MapboxViewer from '../map/MapboxViewer';
import PjuBottomSheet from '../mobile/PjuBottomSheet';
import FilterBottomSheet from '../mobile/FilterBottomSheet';
import { MapPin, SlidersHorizontal, Loader2 } from 'lucide-react';
import { useAppStore, requestUserLocation } from '../../store/useAppStore';
import GlobalSearch from '../ui/GlobalSearch';

const MobileLayout: React.FC = () => {
  const [isFilterOpen, setFilterOpen] = useState(false);
  const { isLocating, userLocation } = useAppStore();

  return (
    <div className="h-screen w-full relative">
      <MapboxViewer />

      {/* Floating Action Buttons */}
      <div className="absolute top-12 left-4 right-4 z-10 pointer-events-none flex justify-between items-start">
        <div className="pointer-events-auto flex-1 mr-4">
          <GlobalSearch isMobile={true} />
        </div>
        <div className="flex flex-col gap-2 pointer-events-auto">
          <button
            onClick={requestUserLocation}
            disabled={isLocating}
            title="Lokasi Terkini"
            className={`h-12 w-12 rounded-full backdrop-blur-md border flex items-center justify-center text-white shadow-xl transition-all ${
              userLocation
                ? 'bg-blue-600 border-blue-400 shadow-blue-500/50 ring-2 ring-blue-400/60'
                : 'bg-blue-600/90 border-blue-500 hover:bg-blue-500 active:scale-95'
            }`}
          >
            {isLocating ? (
              <Loader2 size={20} className="animate-spin" />
            ) : (
              <MapPin size={20} className={userLocation ? 'drop-shadow-[0_0_8px_rgba(255,255,255,0.8)]' : ''} />
            )}
          </button>
          <button
            onClick={() => setFilterOpen(true)}
            className="h-12 w-12 rounded-full bg-slate-800/90 backdrop-blur-md border border-slate-600 flex items-center justify-center text-white shadow-xl hover:bg-slate-700 transition-colors"
          >
            <SlidersHorizontal size={20} />
          </button>
        </div>
      </div>

      <PjuBottomSheet />
      <FilterBottomSheet open={isFilterOpen} onDismiss={() => setFilterOpen(false)} />
    </div>
  );
};

export default MobileLayout;
