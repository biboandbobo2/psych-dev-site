import { useEffect } from 'react';
import { startPageVisit } from '../lib/pageVisits';

// PV-1: единая точка трекинга посещений страниц. Вызывается из AppShell
// ДО ветвления на StandaloneLandingShell — иначе лендинги (/vozrast,
// /academy/retraining-*) выпадут из подсчёта.
export function usePageVisitTracking(normalizedPath: string): void {
  useEffect(() => startPageVisit(normalizedPath), [normalizedPath]);
}
