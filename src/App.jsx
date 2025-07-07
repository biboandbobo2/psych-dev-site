import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import DefaultLayout from './layouts/DefaultLayout';
import PeriodPage from './pages/PeriodPage';
import { usePeriods } from './hooks/usePeriods';

export default function App() {
  const periods = usePeriods();
  if (!periods.length) return <p className="p-4">Loading…</p>;

  return (
    <Router>
      <DefaultLayout>
        <Routes>
          <Route path="/" element={<Navigate to={`/${periods[0].slug}`} />} />
          <Route path="/:slug" element={<PeriodPage />} />
          <Route path="*" element={<p className="p-4">Not found</p>} />
        </Routes>
      </DefaultLayout>
    </Router>
  );
}
