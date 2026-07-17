/**
 * RED->GREEN — issue #34 AC1. BookTestDrivePage renders the heading and the
 * booking form — mirrors NewEnquiryPage's smoke-test convention.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { BookTestDrivePage } from '../../src/pages/BookTestDrivePage';
import { api } from '../../src/api/client';

vi.mock('../../src/api/client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/api/client')>();
  return {
    ...actual,
    api: {
      ...actual.api,
      getMyEnquiries: vi.fn(),
      getDemoVehicles: vi.fn(),
      getVehicleModels: vi.fn(),
      bookTestDrive: vi.fn(),
    },
  };
});
const mockedApi = vi.mocked(api, true);

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/test-drives/new']}>
        <BookTestDrivePage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('BookTestDrivePage (issue #34 AC1)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedApi.getMyEnquiries.mockResolvedValue([]);
    mockedApi.getDemoVehicles.mockResolvedValue([]);
    mockedApi.getVehicleModels.mockResolvedValue([]);
  });

  it('renders the heading and the booking form', async () => {
    renderPage();
    expect(screen.getByRole('heading', { name: /book a test drive/i })).toBeInTheDocument();
    await waitFor(() => expect(mockedApi.getMyEnquiries).toHaveBeenCalled());
    expect(screen.getByRole('form', { name: /book a test drive/i })).toBeInTheDocument();
  });
});
