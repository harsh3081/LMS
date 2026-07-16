/**
 * RED->GREEN (Inside-Out, Presentation Layer) — issue #27 Task 5.1.
 * Component tests for FieldConfigForm (AC1/AC2), with the api client mocked
 * (mirrors NewLeadForm.spec.tsx's conventions — the real HTTP path is proven
 * by the backend Supertest suite: field-config.controller.spec.ts).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { FieldConfigForm } from '../../src/components/FieldConfigForm';
import { api, ApiError } from '../../src/api/client';

vi.mock('../../src/api/client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/api/client')>();
  return {
    ...actual,
    api: {
      getFieldConfig: vi.fn(),
      updateFieldConfig: vi.fn(),
    },
  };
});

const mockedApi = vi.mocked(api, true);

const DEFAULT_CONFIG = [
  { fieldName: 'customerName', label: 'Customer Name', mandatory: true, updatedBy: null, updatedAt: null },
  { fieldName: 'mobile', label: 'Mobile Number', mandatory: true, updatedBy: null, updatedAt: null },
  { fieldName: 'sourceId', label: 'Source', mandatory: true, updatedBy: null, updatedAt: null },
  { fieldName: 'modelId', label: 'Model of Interest', mandatory: true, updatedBy: null, updatedAt: null },
];

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <FieldConfigForm />
    </QueryClientProvider>,
  );
}

describe('FieldConfigForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedApi.getFieldConfig.mockResolvedValue(DEFAULT_CONFIG);
  });

  it('AC1: lists every configurable field with a checked "Mandatory" toggle by default (AC6)', async () => {
    renderPage();
    await waitFor(() => expect(screen.getByLabelText('Mandatory', { selector: '#mandatory-customerName' })).toBeChecked());
    expect(screen.getByLabelText('Mandatory', { selector: '#mandatory-mobile' })).toBeChecked();
    expect(screen.getByLabelText('Mandatory', { selector: '#mandatory-sourceId' })).toBeChecked();
    expect(screen.getByLabelText('Mandatory', { selector: '#mandatory-modelId' })).toBeChecked();
    expect(screen.getByText('Customer Name')).toBeInTheDocument();
    expect(screen.getByText('Source')).toBeInTheDocument();
  });

  it('AC2: unchecking a field and saving calls updateFieldConfig with the full toggle set', async () => {
    mockedApi.updateFieldConfig.mockResolvedValue([
      { ...DEFAULT_CONFIG[0] },
      { ...DEFAULT_CONFIG[1] },
      { fieldName: 'sourceId', label: 'Source', mandatory: false, updatedBy: 'admin-1', updatedAt: '2026-01-01T00:00:00.000Z' },
      { ...DEFAULT_CONFIG[3] },
    ]);

    renderPage();
    const user = userEvent.setup();
    const sourceToggle = await screen.findByLabelText('Mandatory', { selector: '#mandatory-sourceId' });
    await user.click(sourceToggle);
    await user.click(screen.getByRole('button', { name: /save/i }));

    await waitFor(() =>
      expect(mockedApi.updateFieldConfig).toHaveBeenCalledWith({
        fields: expect.arrayContaining([{ fieldName: 'sourceId', mandatory: false }]),
      }),
    );
    expect(await screen.findByText(/saved/i)).toBeInTheDocument();
  });

  it('AC5 (client surface): a 403 response is shown as an explicit permission error', async () => {
    mockedApi.updateFieldConfig.mockRejectedValue(new ApiError(403, null, 'Forbidden'));

    renderPage();
    const user = userEvent.setup();
    await waitFor(() => expect(screen.getByLabelText('Mandatory', { selector: '#mandatory-sourceId' })).toBeInTheDocument());
    await user.click(screen.getByRole('button', { name: /save/i }));

    expect(await screen.findByText(/do not have permission/i)).toBeInTheDocument();
  });
});
