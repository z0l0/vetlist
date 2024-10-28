// src/components/ScrollToTop.tsx

import { useLayoutEffect } from 'react';
import { useLocation } from 'react-router-dom';

const ScrollToTop: React.FC = () => {
  const { pathname } = useLocation();

  useLayoutEffect(() => {
    console.log('Scrolling to top for route:', pathname); // Debug log
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
};

export default ScrollToTop;
