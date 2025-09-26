import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import NProgress from 'nprogress';

NProgress.configure({ showSpinner: false, trickleSpeed: 100, minimum: 0.15 });

export function NavigationProgress() {
  const location = useLocation();

  useEffect(() => {
    NProgress.start();
    const timer = setTimeout(() => {
      NProgress.done();
    }, 350);

    return () => {
      clearTimeout(timer);
      NProgress.done();
    };
  }, [location.key]);

  return null;
}
