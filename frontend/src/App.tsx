import { Route, Routes } from 'react-router-dom';
import { LandingPage } from './pages/LandingPage';
import { NewLeadPage } from './pages/NewLeadPage';
import { NewEnquiryPage } from './pages/NewEnquiryPage';
import { LoginPage } from './pages/LoginPage';
import { FieldConfigPage } from './pages/FieldConfigPage';
import { LogFollowupPage } from './pages/LogFollowupPage';
import { UpcomingFollowupsPage } from './pages/UpcomingFollowupsPage';

export function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/" element={<LandingPage />} />
      <Route path="/leads/new" element={<NewLeadPage />} />
      <Route path="/enquiries/new" element={<NewEnquiryPage />} />
      <Route path="/enquiries/:enquiryId/follow-up" element={<LogFollowupPage />} />
      <Route path="/follow-ups/upcoming" element={<UpcomingFollowupsPage />} />
      <Route path="/admin/field-config" element={<FieldConfigPage />} />
    </Routes>
  );
}
