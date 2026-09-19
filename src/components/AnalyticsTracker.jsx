import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { startAnalytics, trackPageview } from '../utils/analytics';

// Renders nothing – just reports every route change to the analytics endpoint.
export default function AnalyticsTracker() {
  const { pathname } = useLocation();

  useEffect(() => {
    startAnalytics();
  }, []);

  useEffect(() => {
    trackPageview(pathname);
  }, [pathname]);

  return null;
}
