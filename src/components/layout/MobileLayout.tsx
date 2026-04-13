import React from 'react';
import MapboxViewer from '../map/MapboxViewer';
import PjuBottomSheet from '../mobile/PjuBottomSheet';
import { MapPin } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import GlobalSearch from '../ui/GlobalSearch';

const MobileLayout: React.FC = () => {
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
            onClick={() => {
              if ("geolocation" in navigator) {
                navigator.geolocation.getCurrentPosition((pos) => {
                  useAppStore.getState().triggerFlyTo(
                    pos.coords.longitude,
                    pos.coords.latitude
                  );
                });
              }
            }}
            className="h-12 w-12 rounded-full bg-blue-600/90 backdrop-blur-md border border-blue-500 flex items-center justify-center text-white shadow-xl hover:bg-blue-500 transition-colors"
          >
            <MapPin size={20} />
          </button>
        </div>
      </div>

      <PjuBottomSheet />
    </div>
  );
};

export default MobileLayout;
