import { BrowserRouter as Router } from 'react-router-dom';
import { AuthInitializer } from './auth/AuthInitializer';
import { AppShell } from './app/AppShell';

export default function App() {
  return (
    <Router>
      <AuthInitializer>
        <AppShell />
      </AuthInitializer>
    </Router>
  );
}
