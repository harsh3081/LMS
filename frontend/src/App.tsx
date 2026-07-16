import { Route, Routes } from 'react-router-dom';
import { LandingPage } from './pages/LandingPage';
import { NewLeadPage } from './pages/NewLeadPage';

export function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/leads/new" element={<NewLeadPage />} />
    </Routes>
  );
}
