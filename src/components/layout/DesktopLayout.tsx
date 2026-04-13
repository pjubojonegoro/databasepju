import React from 'react';
import MapboxViewer from '../map/MapboxViewer';
import Sidebar from './Sidebar';
import DesktopPopup from './DesktopPopup';

import GlobalSearch from '../ui/GlobalSearch';

const DesktopLayout: React.FC = () => {
  return (
    <div className="h-screen w-full relative bg-slate-950 overflow-hidden">
      <Sidebar />
      <MapboxViewer />
      
      <div className="absolute top-4 left-[340px] z-10">
        <GlobalSearch isMobile={false} />
      </div>

      <DesktopPopup />
    </div>
  );
};

export default DesktopLayout;
