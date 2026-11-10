import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * ScrollToTop
 * Automatically resets the browser viewport and main scroll containers
 * to the very top (0, 0) whenever navigation occurs to a new route.
 */
export const ScrollToTop: React.FC = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    // Window scroll reset
    try {
      window.scrollTo({
        top: 0,
        left: 0,
        behavior: 'instant',
      });
    } catch {
      window.scrollTo(0, 0);
    }

    // Reset document element & document body if scroll position is managed there
    if (document.documentElement) {
      document.documentElement.scrollTop = 0;
    }
    if (document.body) {
      document.body.scrollTop = 0;
    }
  }, [pathname]);

  return null;
};
