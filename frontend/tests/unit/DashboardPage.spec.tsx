/**
 * RED->GREEN — issue #128: the new placeholder Dashboard at `/`, replacing
 * what used to be Lead Management content mislabeled as "Dashboard" (now
 * moved to `/leads`, see LeadManagementPage.spec.tsx). Deliberately minimal
 * — a real Dashboard will be designed in a later step.
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { DashboardPage } from '../../src/pages/DashboardPage';

function renderDashboard() {
  return render(
    <MemoryRouter>
      <DashboardPage />
    </MemoryRouter>,
  );
}

describe('DashboardPage (issue #128)', () => {
  it('renders a Dashboard heading and placeholder content', () => {
    renderDashboard();
    expect(screen.getByRole('heading', { name: /dashboard/i })).toBeInTheDocument();
    expect(screen.getByText(/coming soon/i)).toBeInTheDocument();
  });

  it('does not render Lead Management content (no My Leads table, no New Lead action)', () => {
    renderDashboard();
    expect(screen.queryByRole('table', { name: /my leads/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /new lead/i })).not.toBeInTheDocument();
  });
});
