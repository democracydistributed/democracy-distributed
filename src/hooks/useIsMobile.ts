'use client';

import { useEffect, useState } from 'react';

/** Tracks whether the viewport is at or below `breakpoint` (default: 639px, matches the app's mobile CSS breakpoint). */
export function useIsMobile(breakpoint = 639): boolean {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${breakpoint}px)`);
    setIsMobile(mql.matches);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, [breakpoint]);

  return isMobile;
}
