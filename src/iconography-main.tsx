import { StrictMode, Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import '@fontsource-variable/manrope';
import { IconographyPage } from './pages/lazy';
import { useScrollRestoration } from './hooks/useScrollRestoration';
import { PageLoader } from './components/ui/PageLoader';
import './styles/theme.css';
import './index.css';
export function StandaloneRoutes() {
  useScrollRestoration();
  return <Suspense fallback={<PageLoader label="Открываем коллекцию…" />}><Routes>
    <Route path="/" element={<Navigate to="/iconography" replace />} />
    <Route path="/iconography/*" element={<IconographyPage />} />
    <Route path="*" element={<main><h1>Страница не найдена</h1><a href="/iconography">Открыть Иконографию</a></main>} />
  </Routes></Suspense>;
}
// Standalone bootstrap reuses the canonical lazy page without Academy auth/course hooks.
createRoot(document.getElementById('root')!).render(
  <StrictMode><HelmetProvider><BrowserRouter>
    <StandaloneRoutes />
  </BrowserRouter></HelmetProvider></StrictMode>
);
