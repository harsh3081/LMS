/**
 * RED->GREEN (Inside-Out, Presentation Layer) — issue #34 AC5. Mirrors
 * UpcomingFollowupsList.spec.tsx's structure exactly.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClientProvider, QueryClient } from '@tanstack/react-query';
import { UpcomingTestDrivesList } from '../../src/components/UpcomingTestDrivesList';
import { api } from '../../src/api/client';
import type { TestDrive } from '../../src/api/client';

vi.mock('../../src/api/client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/api/client')>();
  return {
    ...actual,
    api: { ...actual.api, getUpcomingTestDrives: vi.fn() },
  };
});
const mockedApi = vi.mocked(api, true);

function makeTestDrive(overrides: Partial<TestDrive>): TestDrive {
  return {
    testDriveId: 'td-1',
    enquiryId: 'enq-1',
    vehicleId: 'v-1',
    slotStart: '2099-01-01T10:00:00.000Z',
    slotEnd: '2099-01-01T10:30:00.000Z',
    status: 'Booked',
    remarks: null,
    bookedBy: 'dse-1',
    locationId: 'loc-1',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

function renderList() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <UpcomingTestDrivesList />
    </QueryClientProvider>,
  );
}

describe('UpcomingTestDrivesList (issue #34 AC5)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders an empty state when there are no upcoming test drives', async () => {
    mockedApi.getUpcomingTestDrives.mockResolvedValue([]);
    renderList();
    expect(await screen.findByText(/no upcoming test drives/i)).toBeInTheDocument();
  });

  it('renders each Test Drive with its status and booking reference', async () => {
    mockedApi.getUpcomingTestDrives.mockResolvedValue([makeTestDrive({ testDriveId: 'td-42' })]);
    renderList();

    expect(await screen.findByText('td-42')).toBeInTheDocument();
    expect(screen.getByText('Booked')).toBeInTheDocument();
  });
});
