import { ReactNode } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useLead } from '../hooks/useLeads';
import { ApiError, Lead } from '../api/client';
import { AppShell } from '../components/layout/AppShell';
import { Card, StatusPill, DetailField, buttonStyles } from '../components/ui';

const NOT_PROVIDED = 'Not provided';

function formatText(value: string | null | undefined): string {
  return value && value.trim().length > 0 ? value : NOT_PROVIDED;
}

function formatBoolean(value: boolean | null | undefined): string {
  if (value === null || value === undefined) return NOT_PROVIDED;
  return value ? 'Yes' : 'No';
}

function formatCurrency(value: number | null | undefined): string {
  if (value === null || value === undefined) return NOT_PROVIDED;
  return `₹${value.toLocaleString('en-IN')}`;
}

function formatDateTime(value: string | null | undefined): string {
  if (!value) return NOT_PROVIDED;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleString();
}

/** Shared grid so every section's fields line up the same way, regardless
 * of how many fields that section has. */
function SectionGrid({ children }: { children: ReactNode }) {
  return <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">{children}</div>;
}

function SectionCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Card>
      <h2 className="mb-4 text-lg font-semibold text-slate-900">{title}</h2>
      {children}
    </Card>
  );
}

/** Renders the full read-only detail for one Lead, grouped into the same 6
 * sections issue #114's New Lead form used to capture the data (Customer
 * Details / Vehicle Interest / Exchange Vehicle / Finance / Source &
 * Assignment / Follow-up & Consent) — read-only display groups here rather
 * than a flat list of 25+ fields. */
function LeadDetailSections({ lead }: { lead: Lead }) {
  return (
    <div className="space-y-6">
      <SectionCard title="Customer Details">
        <SectionGrid>
          <DetailField label="Name">{formatText(lead.customerName)}</DetailField>
          <DetailField label="Mobile">{formatText(lead.mobile)}</DetailField>
          <DetailField label="Email">{formatText(lead.email)}</DetailField>
          <DetailField label="Customer Type">{formatText(lead.customerType)}</DetailField>
          <DetailField label="City">{formatText(lead.city)}</DetailField>
          <DetailField label="Pin Code">{formatText(lead.pinCode)}</DetailField>
          <DetailField label="Preferred Language">{formatText(lead.preferredLanguage)}</DetailField>
        </SectionGrid>
      </SectionCard>

      <SectionCard title="Vehicle Interest">
        <SectionGrid>
          <DetailField label="Model of Interest">{formatText(lead.modelName)}</DetailField>
          <DetailField label="Variant">{formatText(lead.variant)}</DetailField>
          <DetailField label="Fuel Type">{formatText(lead.fuelType)}</DetailField>
          <DetailField label="Transmission">{formatText(lead.transmission)}</DetailField>
          <DetailField label="Budget Min">{formatCurrency(lead.budgetMin)}</DetailField>
          <DetailField label="Budget Max">{formatCurrency(lead.budgetMax)}</DetailField>
          <DetailField label="Buying Timeline">{formatText(lead.buyingTimeline)}</DetailField>
        </SectionGrid>
      </SectionCard>

      <SectionCard title="Exchange Vehicle">
        <SectionGrid>
          <DetailField label="Exchange Interest">{formatBoolean(lead.exchangeInterest)}</DetailField>
          <DetailField label="Current Vehicle">{formatText(lead.currentVehicle)}</DetailField>
          <DetailField label="Kms Driven">{lead.kmsDriven != null ? lead.kmsDriven.toLocaleString('en-IN') : NOT_PROVIDED}</DetailField>
          <DetailField label="Registration Number">{formatText(lead.registrationNumber)}</DetailField>
          <DetailField label="Expected Value">{formatCurrency(lead.expectedValue)}</DetailField>
        </SectionGrid>
      </SectionCard>

      <SectionCard title="Finance">
        <SectionGrid>
          <DetailField label="Payment Mode">{formatText(lead.paymentMode)}</DetailField>
          <DetailField label="Preferred Financer">{formatText(lead.preferredFinancer)}</DetailField>
          <DetailField label="Down Payment Capacity">{formatCurrency(lead.downPaymentCapacity)}</DetailField>
        </SectionGrid>
      </SectionCard>

      <SectionCard title="Source & Assignment">
        <SectionGrid>
          <DetailField label="Source">{formatText(lead.sourceName)}</DetailField>
          <DetailField label="Referrer Name">{formatText(lead.referrerName)}</DetailField>
          <DetailField label="Assigned To">{formatText(lead.ownerName)}</DetailField>
        </SectionGrid>
      </SectionCard>

      <SectionCard title="Follow-up & Consent">
        <SectionGrid>
          <DetailField label="First Follow-up">{formatDateTime(lead.firstFollowUpAt)}</DetailField>
          <DetailField label="Remarks">{formatText(lead.remarks)}</DetailField>
          <DetailField label="Communication Consent Verified">
            {formatBoolean(lead.communicationConsentVerified)}
          </DetailField>
        </SectionGrid>
      </SectionCard>
    </div>
  );
}

function LeadDetailSkeleton() {
  return (
    <div className="space-y-6" aria-hidden="true">
      {Array.from({ length: 3 }).map((_, i) => (
        <Card key={i}>
          <div className="mb-4 h-5 w-40 animate-pulse rounded bg-slate-200" />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
            {Array.from({ length: 6 }).map((__, j) => (
              <div key={j} className="h-8 w-full animate-pulse rounded bg-slate-100" />
            ))}
          </div>
        </Card>
      ))}
    </div>
  );
}

const BACK_LINK = (
  <Link to="/" role="link" className={`${buttonStyles.base} ${buttonStyles.secondary}`}>
    Back to Leads
  </Link>
);

/** Rendered at /leads/:leadId (issue #116, AC2) — the new Lead Detail page,
 * reached from LeadQueue's "View" action. Owner-scoped read
 * (GET /api/v1/leads/:leadId, LeadsController.findOne): a Lead the caller
 * doesn't own 404s server-side, surfaced here as a plain "not found"
 * message rather than a silent blank page. Mirrors NewLeadPage/
 * FieldConfigPage's AppShell + Card page-shell convention; the 6 read-only
 * section groups mirror issue #114's New Lead form sections exactly. */
export function LeadDetailPage() {
  const { leadId } = useParams<{ leadId: string }>();
  const { data: lead, isLoading, isError, error } = useLead(leadId);

  if (!leadId) {
    return (
      <AppShell>
        <main>
          <p role="alert" className="text-sm text-red-700">
            No lead specified.
          </p>
        </main>
      </AppShell>
    );
  }

  const notFound = isError && error instanceof ApiError && error.status === 404;

  return (
    <AppShell>
      <main>
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-slate-900">{lead ? formatText(lead.customerName) : 'Lead Detail'}</h1>
            {lead && <StatusPill status={lead.status} />}
          </div>
          {BACK_LINK}
        </div>

        {isLoading && <LeadDetailSkeleton />}

        {notFound && (
          <p role="alert" className="text-sm text-red-700">
            Lead not found.
          </p>
        )}

        {isError && !notFound && (
          <p role="alert" className="text-sm text-red-700">
            Failed to load this lead. Please try again.
          </p>
        )}

        {lead && <LeadDetailSections lead={lead} />}
      </main>
    </AppShell>
  );
}
