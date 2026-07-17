/**
 * RED->GREEN — issue #34 AC5. UpcomingTestDrivesPage renders the list and a
 * "Back to Dashboard" link — mirrors UpcomingFollowupsPage.spec.tsx's
 * structure.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { UpcomingTestDrivesPage } from '../../src/pages/UpcomingTestDrivesPage';
import { api } from '../../src/api/client';

vi.mock('../../src/api/client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/api/client')>();
  return {
    ...actual,
    api: { ...actual.api, getUpcomingTestDrives: vi.fn() },
  };
});
const mockedApi = vi.mocked(api, true);

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/test-drives/upcoming']}>
        <UpcomingTestDrivesPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('UpcomingTestDrivesPage (issue #34 AC5)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedApi.getUpcomingTestDrives.mockResolvedValue([]);
  });

  it('renders the heading, the list, and a Back to Dashboard link', async () => {
    renderPage();
    expect(screen.getByRole('heading', { name: /my upcoming test drives/i })).toBeInTheDocument();
    const back = screen.getByRole('link', { name: /back to dashboard/i });
    expect(back).toHaveAttribute('href', '/');
    expect(await screen.findByText(/no upcoming test drives/i)).toBeInTheDocument();
  });
});
