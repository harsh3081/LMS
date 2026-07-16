/**
 * RED->GREEN (Inside-Out, Presentation Layer) — Task 4.4.1 (issue #25).
 * Component tests mirroring the frozen Playwright tests/convert-lead-form.spec.ts
 * assertions (AC1, AC3, AC4/AC5), with the api client mocked (the real HTTP
 * path is proven by the backend Supertest suite + the Playwright E2E run).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ConvertLeadForm } from '../../src/components/ConvertLeadForm';
import { api, ApiError } from '../../src/api/client';

vi.mock('../../src/api/client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/api/client')>();
  return {
    ...actual,
    api: {
      ...actual.api,
      convertLead: vi.fn(),
    },
  };
});

const mockedApi = vi.mocked(api, true);

function renderForm(onConverted?: () => void) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <ConvertLeadForm leadId="lead-1" onConverted={onConverted} />
    </QueryClientProvider>,
  );
}

describe('ConvertLeadForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('EVAL-AC1-03: renders all 4 qualifying fields and a submit control', () => {
    renderForm();
    expect(screen.getByLabelText(/budget/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/variant/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/exchange interest/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/finance interest/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /submit|convert|save/i })).toBeInTheDocument();
  });

  it('EVAL-AC3-01..04: submitting all 4 fields empty shows inline errors and does not call convertLead', async () => {
    renderForm();
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: /submit|convert|save/i }));

    expect(await screen.findByText(/budget.*required|required.*budget/i)).toBeInTheDocument();
    expect(screen.getByText(/variant.*required|required.*variant/i)).toBeInTheDocument();
    expect(screen.getByText(/exchange interest.*required|required.*exchange interest/i)).toBeInTheDocument();
    expect(screen.getByText(/finance interest.*required|required.*finance interest/i)).toBeInTheDocument();
    expect(mockedApi.convertLead).not.toHaveBeenCalled();
  });

  const invalidBudgetCases = [
    { label: 'zero', value: '0' },
    { label: 'negative', value: '-50000' },
    { label: 'decimal', value: '500000.5' },
  ];
  for (const { label, value } of invalidBudgetCases) {
    it(`EVAL-AC3 client: rejects invalid budget — ${label}`, async () => {
      renderForm();
      const user = userEvent.setup();

      await user.type(screen.getByLabelText(/budget/i), value);
      await user.type(screen.getByLabelText(/variant/i), 'VXi (O) CVT');
      await user.selectOptions(screen.getByLabelText(/exchange interest/i), 'true');
      await user.selectOptions(screen.getByLabelText(/finance interest/i), 'false');
      await user.click(screen.getByRole('button', { name: /submit|convert|save/i }));

      expect(await screen.findByText(/budget.*positive|positive.*budget|valid.*budget/i)).toBeInTheDocument();
      expect(mockedApi.convertLead).not.toHaveBeenCalled();
    });
  }

  it('EVAL-AC4/AC5: submitting valid data calls convertLead, shows success, and fires onConverted', async () => {
    const onConverted = vi.fn();
    mockedApi.convertLead.mockResolvedValue({
      enquiryId: 'enq-1',
      leadId: 'lead-1',
      entryType: 'CONVERTED',
      customerName: null,
      mobile: null,
      sourceId: null,
      modelId: null,
      budget: 500000,
      variant: 'VXi (O) CVT',
      exchangeInterest: true,
      financeInterest: false,
      convertedBy: 'owner-1',
      convertedAt: new Date().toISOString(),
      status: 'New',
      ownerId: 'owner-1',
      locationId: 'loc-1',
    });

    renderForm(onConverted);
    const user = userEvent.setup();

    await user.type(screen.getByLabelText(/budget/i), '500000');
    await user.type(screen.getByLabelText(/variant/i), 'VXi (O) CVT');
    await user.selectOptions(screen.getByLabelText(/exchange interest/i), 'true');
    await user.selectOptions(screen.getByLabelText(/finance interest/i), 'false');
    await user.click(screen.getByRole('button', { name: /submit|convert|save/i }));

    expect(await screen.findByText(/converted|enquiry created|success/i)).toBeInTheDocument();
    expect(mockedApi.convertLead).toHaveBeenCalledWith('lead-1', {
      budget: 500000,
      variant: 'VXi (O) CVT',
      exchangeInterest: true,
      financeInterest: false,
    });
    await waitFor(() => expect(onConverted).toHaveBeenCalled());
  });

  it('EVAL-AC3-07: maps a server 400 field error onto the matching form field', async () => {
    mockedApi.convertLead.mockRejectedValue(
      new ApiError(400, [{ field: 'budget', message: 'budget must be a positive integer' }], 'Bad request'),
    );

    renderForm();
    const user = userEvent.setup();

    await user.type(screen.getByLabelText(/budget/i), '500000');
    await user.type(screen.getByLabelText(/variant/i), 'VXi (O) CVT');
    await user.selectOptions(screen.getByLabelText(/exchange interest/i), 'true');
    await user.selectOptions(screen.getByLabelText(/finance interest/i), 'false');
    await user.click(screen.getByRole('button', { name: /submit|convert|save/i }));

    expect(await screen.findByText(/budget must be a positive integer/i)).toBeInTheDocument();
  });
});
