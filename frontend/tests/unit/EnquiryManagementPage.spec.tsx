/**
 * RED->GREEN — issue #130. EnquiryManagementPage mirrors
 * LeadManagementPage.spec.tsx's coverage exactly: renders the heading + "My
 * Enquiries" table, gates its own "New Enquiry" quick action behind the
 * `directEnquiryEnabled` feature flag, opens/closes a slide-over panel
 * containing NewEnquiryForm, and the panel's form works end-to-end through
 * to a successful creation with the queue reflecting it via cache (no
 * refetch) and the panel auto-closing (issue #130's NewEnquiryForm
 * `onSuccess` addition).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { EnquiryManagementPage } from '../../src/pages/EnquiryManagementPage';
import { SUCCESS_AUTO_CLOSE_MS } from '../../src/components/NewEnquiryForm';
import { api } from '../../src/api/client';

vi.mock('../../src/api/client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/api/client')>();
  return {
    ...actual,
    api: {
      getConfig: vi.fn(),
      getMyEnquiries: vi.fn(),
      getLeadSources: vi.fn(),
      getVehicleModels: vi.fn(),
      createDirectEnquiry: vi.fn(),
      getFieldConfig: vi.fn(),
      checkDuplicates: vi.fn(),
    },
  };
});
const mockedApi = vi.mocked(api, true);

const ALL_MANDATORY_FIELD_CONFIG = [
  { fieldName: 'customerName', label: 'Customer Name', mandatory: true, updatedBy: null, updatedAt: null },
  { fieldName: 'mobile', label: 'Mobile Number', mandatory: true, updatedBy: null, updatedAt: null },
  { fieldName: 'sourceId', label: 'Source', mandatory: true, updatedBy: null, updatedAt: null },
  { fieldName: 'modelId', label: 'Model of Interest', mandatory: true, updatedBy: null, updatedAt: null },
];

function renderEnquiryManagement() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <EnquiryManagementPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('EnquiryManagementPage (issue #130)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedApi.getMyEnquiries.mockResolvedValue([]);
    mockedApi.getFieldConfig.mockResolvedValue(ALL_MANDATORY_FIELD_CONFIG);
    mockedApi.getLeadSources.mockResolvedValue([{ sourceId: 1, name: 'Walk-in' }]);
    mockedApi.getVehicleModels.mockResolvedValue([{ modelId: 101, name: 'Compact Hatchback LX' }]);
    mockedApi.checkDuplicates.mockResolvedValue([]);
  });

  it('renders the "Enquiry Management" heading and the "My Enquiries" table', async () => {
    mockedApi.getConfig.mockResolvedValue({ newLeadEnabled: true, convertLeadEnabled: true, directEnquiryEnabled: true });
    renderEnquiryManagement();
    expect(await screen.findByRole('heading', { name: /enquiry management/i })).toBeInTheDocument();
    expect(await screen.findByRole('table', { name: /my enquiries/i })).toBeInTheDocument();
  });

  it('shows the New Enquiry entry point when directEnquiryEnabled is true', async () => {
    mockedApi.getConfig.mockResolvedValue({ newLeadEnabled: true, convertLeadEnabled: true, directEnquiryEnabled: true });
    renderEnquiryManagement();
    // The entry point is a <button> that opens a slide-over panel, not a
    // <Link> that navigates away — mirrors LeadManagementPage's "New Lead".
    const entry = await screen.findByRole('button', { name: /new enquiry/i });
    expect(entry).not.toHaveAttribute('href');
  });

  it('hides the New Enquiry entry point when directEnquiryEnabled is false', async () => {
    mockedApi.getConfig.mockResolvedValue({ newLeadEnabled: true, convertLeadEnabled: true, directEnquiryEnabled: false });
    renderEnquiryManagement();
    await waitFor(() => expect(mockedApi.getConfig).toHaveBeenCalled());
    await waitFor(() => expect(screen.queryByRole('button', { name: /new enquiry/i })).not.toBeInTheDocument());
  });

  describe('New Enquiry slide-over panel', () => {
    beforeEach(() => {
      mockedApi.getConfig.mockResolvedValue({ newLeadEnabled: true, convertLeadEnabled: true, directEnquiryEnabled: true });
    });

    it('clicking "New Enquiry" opens the panel without navigating away — the page stays mounted underneath', async () => {
      renderEnquiryManagement();
      const user = userEvent.setup();

      expect(await screen.findByRole('heading', { name: /enquiry management/i })).toBeInTheDocument();
      expect(await screen.findByRole('table', { name: /my enquiries/i })).toBeInTheDocument();
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: /new enquiry/i }));

      const dialog = await screen.findByRole('dialog', { name: /new enquiry/i });
      expect(dialog).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: /enquiry management/i })).toBeInTheDocument();
      expect(screen.getByRole('table', { name: /my enquiries/i })).toBeInTheDocument();

      await waitFor(() => expect(screen.getByRole('option', { name: 'Walk-in' })).toBeInTheDocument());
      expect(screen.getByLabelText(/customer name/i)).toBeInTheDocument();
    });

    it('closing via the close button removes the panel and leaves the page intact', async () => {
      renderEnquiryManagement();
      const user = userEvent.setup();
      await user.click(screen.getByRole('button', { name: /new enquiry/i }));
      await screen.findByRole('dialog', { name: /new enquiry/i });

      await user.click(screen.getByRole('button', { name: /close/i }));

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect(screen.getByRole('heading', { name: /enquiry management/i })).toBeInTheDocument();
    });

    it('the form inside the panel works end-to-end through to a successful creation, the queue reflects it without a refetch, and the panel auto-closes', async () => {
      mockedApi.createDirectEnquiry.mockResolvedValue({
        enquiryId: 'enq-panel-e2e',
        leadId: null,
        entryType: 'DIRECT',
        customerName: 'Panel E2E Enquiry',
        mobile: '9876543210',
        sourceId: 1,
        modelId: 101,
        budget: 300000,
        variant: 'LX',
        exchangeInterest: false,
        financeInterest: true,
        convertedBy: 'owner-1',
        convertedAt: new Date().toISOString(),
        status: 'New',
        ownerId: 'owner-1',
        locationId: 'loc-1',
      });

      // Same targeted setTimeout spy as NewEnquiryForm.spec.tsx's /
      // LeadManagementPage.spec.tsx's "onSuccess auto-close" tests.
      const originalSetTimeout = window.setTimeout;
      let capturedCallback: (() => void) | null = null;
      const setTimeoutSpy = vi
        .spyOn(window, 'setTimeout')
        .mockImplementation(((fn: TimerHandler, delay?: number, ...args: unknown[]) => {
          if (delay === SUCCESS_AUTO_CLOSE_MS) {
            capturedCallback = fn as () => void;
            return 0 as unknown as ReturnType<typeof setTimeout>;
          }
          return originalSetTimeout(fn as TimerHandler, delay, ...args);
        }) as typeof setTimeout);

      renderEnquiryManagement();
      const user = userEvent.setup();
      await user.click(screen.getByRole('button', { name: /new enquiry/i }));
      const dialog = await screen.findByRole('dialog', { name: /new enquiry/i });
      await waitFor(() => expect(screen.getByRole('option', { name: 'Walk-in' })).toBeInTheDocument());

      await user.type(within(dialog).getByLabelText(/customer name/i), 'Panel E2E Enquiry');
      await user.type(within(dialog).getByLabelText(/mobile/i), '9876543210');
      await user.selectOptions(within(dialog).getByLabelText(/source/i), '1');
      await user.selectOptions(within(dialog).getByLabelText(/model/i), '101');
      await user.type(within(dialog).getByLabelText(/budget/i), '300000');
      await user.type(within(dialog).getByLabelText(/variant/i), 'LX');
      await user.selectOptions(within(dialog).getByLabelText(/exchange interest/i), 'false');
      await user.selectOptions(within(dialog).getByLabelText(/finance interest/i), 'true');
      await user.click(within(dialog).getByRole('button', { name: /submit|create|save/i }));

      expect(await within(dialog).findByText(/enquiry created|success/i)).toBeInTheDocument();
      expect(mockedApi.createDirectEnquiry).toHaveBeenCalledTimes(1);

      // The already-visible "My Enquiries" table reflects the new Enquiry —
      // proven by useCreateDirectEnquiry's existing cache write (issue #26),
      // not by a second network read: getMyEnquiries was only ever called
      // once, on the initial page mount.
      expect(await screen.findByText('Panel E2E Enquiry')).toBeInTheDocument();
      expect(mockedApi.getMyEnquiries).toHaveBeenCalledTimes(1);

      // The panel auto-closes shortly after showing the success message.
      expect(capturedCallback).not.toBeNull();
      await act(async () => capturedCallback!());
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

      setTimeoutSpy.mockRestore();
    });
  });
});
