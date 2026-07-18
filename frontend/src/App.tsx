import { Route, Routes } from 'react-router-dom';
import { DashboardPage } from './pages/DashboardPage';
import { LeadManagementPage } from './pages/LeadManagementPage';
import { LeadDetailPage } from './pages/LeadDetailPage';
import { ConvertLeadPage } from './pages/ConvertLeadPage';
import { EnquiryManagementPage } from './pages/EnquiryManagementPage';
import { LoginPage } from './pages/LoginPage';
import { FieldConfigPage } from './pages/FieldConfigPage';
import { LogFollowupPage } from './pages/LogFollowupPage';
import { UpcomingFollowupsPage } from './pages/UpcomingFollowupsPage';
import { BookTestDrivePage } from './pages/BookTestDrivePage';
import { UpcomingTestDrivesPage } from './pages/UpcomingTestDrivesPage';
import { TestDriveSchedulerPage } from './pages/TestDriveSchedulerPage';

export function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/" element={<DashboardPage />} />
      <Route path="/leads" element={<LeadManagementPage />} />
      <Route path="/leads/:leadId" element={<LeadDetailPage />} />
      <Route path="/leads/:leadId/convert" element={<ConvertLeadPage />} />
      <Route path="/enquiries" element={<EnquiryManagementPage />} />
      <Route path="/enquiries/:enquiryId/follow-up" element={<LogFollowupPage />} />
      <Route path="/follow-ups/upcoming" element={<UpcomingFollowupsPage />} />
      <Route path="/test-drives/new" element={<BookTestDrivePage />} />
      <Route path="/test-drives/upcoming" element={<UpcomingTestDrivesPage />} />
      <Route path="/test-drives/scheduler" element={<TestDriveSchedulerPage />} />
      <Route path="/admin/field-config" element={<FieldConfigPage />} />
    </Routes>
  );
}
