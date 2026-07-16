/**
 * RED->GREEN — Task 5.5: entry point + feature toggle (CC-10).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { LandingPage } from '../../src/pages/LandingPage';
import { api } from '../../src/api/client';

vi.mock('../../src/api/client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/api/client')>();
  return {
    ...actual,
    api: { getConfig: vi.fn(), getMyLeads: vi.fn() },
  };
});
const mockedApi = vi.mocked(api, true);

function renderLanding() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <LandingPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('LandingPage entry point / feature toggle (CC-10)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedApi.getMyLeads.mockResolvedValue([]);
  });

  it('EVAL-CC-10: shows the New Lead entry point when the toggle is enabled', async () => {
    mockedApi.getConfig.mockResolvedValue({ newLeadEnabled: true, convertLeadEnabled: true });
    renderLanding();
    const entry = await screen.findByRole('link', { name: /new lead/i });
    expect(entry).toHaveAttribute('href', '/leads/new');
  });

  it('hides the New Lead entry point when the toggle is disabled', async () => {
    mockedApi.getConfig.mockResolvedValue({ newLeadEnabled: false, convertLeadEnabled: true });
    renderLanding();
    await waitFor(() => expect(mockedApi.getConfig).toHaveBeenCalled());
    await waitFor(() => expect(screen.queryByRole('link', { name: /new lead/i })).not.toBeInTheDocument());
  });
});
