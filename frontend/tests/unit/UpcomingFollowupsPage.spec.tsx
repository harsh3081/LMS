/**
 * RED->GREEN — issue #31 AC4. UpcomingFollowupsPage renders the list and a
 * "Back to Dashboard" link — mirrors LogFollowupPage.spec.tsx's structure.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { UpcomingFollowupsPage } from '../../src/pages/UpcomingFollowupsPage';
import { api } from '../../src/api/client';

vi.mock('../../src/api/client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/api/client')>();
  return {
    ...actual,
    api: { ...actual.api, getUpcomingFollowups: vi.fn() },
  };
});
const mockedApi = vi.mocked(api, true);

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/follow-ups/upcoming']}>
        <UpcomingFollowupsPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('UpcomingFollowupsPage (issue #31 AC4)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedApi.getUpcomingFollowups.mockResolvedValue([]);
  });

  it('renders the heading, the list, and a Back to Dashboard link', async () => {
    renderPage();
    expect(screen.getByRole('heading', { name: /my upcoming follow-ups/i })).toBeInTheDocument();
    const back = screen.getByRole('link', { name: /back to dashboard/i });
    expect(back).toHaveAttribute('href', '/');
    expect(await screen.findByText(/no upcoming follow-ups/i)).toBeInTheDocument();
  });
});
