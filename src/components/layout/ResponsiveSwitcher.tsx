import React, { useEffect, useState } from 'react';
import DesktopLayout from './DesktopLayout';
import MobileLayout from './MobileLayout';

const ResponsiveSwitcher: React.FC = () => {
  const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 1024); // lg breakpoint in tailwind

  useEffect(() => {
    const handleResize = () => {
      setIsDesktop(window.innerWidth >= 1024);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return isDesktop ? <DesktopLayout /> : <MobileLayout />;
};

export default ResponsiveSwitcher;
