import { useState, useEffect } from 'react';

const DESKTOP_BREAKPOINT = 1024;

export function useDeviceCheck() {
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < DESKTOP_BREAKPOINT);

  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < DESKTOP_BREAKPOINT);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);

  return { isMobile };
}
