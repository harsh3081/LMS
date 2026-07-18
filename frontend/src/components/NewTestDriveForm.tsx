import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useEnquiries } from '../hooks/useEnquiries';
import { useDemoVehicles } from '../hooks/useDemoVehicles';
import { useVehicleModels } from '../hooks/useVehicleModels';
import { useBookTestDrive } from '../hooks/useTestDrives';
import { ApiError, CreateTestDriveInput, SchedulerSlot } from '../api/client';
import { isoDatePart, isoTimePart } from '../utils/schedulerGrid';
import { Button, FormField, Select, TextInput } from './ui';

/** issue #34 design decision: the booking form captures a single start
 * DATE + single start TIME, with a fixed 30-minute slot duration computed
 * client-side (slotEnd = slotStart + 30 min) — simpler than two separate
 * time pickers for this Story's scope, mirrors the parent issue's explicit
 * "single start time + fixed duration... your call, document it" guidance.
 * A richer variable-duration/slot-picker UI is #35's ("scheduler grid")
 * territory. See NOTES.md.
 *
 * The entered date+time is treated as UTC directly (an explicit `Z`-suffixed
 * ISO string, not run through the browser's local-timezone Date parsing) —
 * mirrors TestDrivesService's own "UTC as the fixed, deterministic stand-in
 * for dealership local time" decision (backend/src/test-drives/test-drives.service.ts),
 * so the hours the DSE sees on this form line up 1:1 with the hours the
 * server validates against (09:00-19:00).
 */
const FIXED_DURATION_MINUTES = 30;

function toIsoSlot(date: string, time: string): string {
  return `${date}T${time}:00.000Z`;
}

function computeSlotEnd(date: string, time: string): string {
  const start = new Date(toIsoSlot(date, time));
  return new Date(start.getTime() + FIXED_DURATION_MINUTES * 60000).toISOString();
}

type FormValues = {
  enquiryId: string;
  vehicleId: string;
  date: string;
  time: string;
};

export interface NewTestDriveFormProps {
  /** issue #35 AC4 pre-fill: initial vehicle/date/time when arriving from
   * the Scheduler grid's "Book" action (a click on an OPEN slot). Only
   * vehicle/date/time are ever pre-filled — `enquiryId` is deliberately
   * never part of this, since the DSE still selects which customer the
   * drive is for on this form regardless of entry point. Omitted/undefined
   * fields fall back to the normal empty defaults (arriving directly at
   * /test-drives/new, issue #34's original entry point, is unaffected). */
  initialValues?: Partial<Pick<FormValues, 'vehicleId' | 'date' | 'time'>>;
}

/**
 * "Book a Test Drive" form (issue #34 AC1-AC6) — mirrors NewEnquiryForm's
 * structure closely (a create-form with several selects/inputs, client-side
 * required validation, server 400 field-error mapping, success confirmation).
 * Fields: Enquiry (select, from the DSE's own Enquiries — reuses
 * useEnquiries, the same hook EnquiryQueue already uses), demo vehicle
 * (select, from the DSE's own location's active fleet — useDemoVehicles),
 * date, start time (AC1). AC3: on success, the created booking record (test
 * drive id + slot/vehicle/enquiry details) is shown as the confirmation —
 * this IS the "booking reference" (no separate confirmation-number scheme,
 * see TestDriveResponseDto's comment). MODIFIED (issue #35 AC4):
 * `initialValues` (see NewTestDriveFormProps) pre-fills vehicle/date/time
 * when the DSE arrives here via the Scheduler grid's "Book" link.
 */
export function NewTestDriveForm({ initialValues }: NewTestDriveFormProps = {}) {
  const { data: enquiries } = useEnquiries();
  const { data: vehicles } = useDemoVehicles();
  const { data: models } = useVehicleModels();
  const bookTestDrive = useBookTestDrive();
  const [confirmation, setConfirmation] = useState<{ testDriveId: string } | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  // issue #36 AC2: the nearest open slots suggested alongside a 409
  // double-booking conflict — null when there is no active conflict.
  const [suggestedSlots, setSuggestedSlots] = useState<SchedulerSlot[] | null>(null);

  const {
    register,
    handleSubmit,
    setError,
    setValue,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    defaultValues: {
      enquiryId: '',
      vehicleId: initialValues?.vehicleId ?? '',
      date: initialValues?.date ?? '',
      time: initialValues?.time ?? '',
    },
  });

  // issue #35 AC4: `vehicles` loads asynchronously (useDemoVehicles), so at
  // mount time the <select>'s matching <option> for a pre-filled vehicleId
  // does not exist yet — a native <select>'s value cannot "stick" to an
  // option that isn't rendered yet (it silently reverts to ""). Once the
  // vehicle list has loaded, re-apply the pre-fill via setValue so the
  // now-existing <option> is actually selected.
  useEffect(() => {
    if (initialValues?.vehicleId && vehicles?.some((v) => v.vehicleId === initialValues.vehicleId)) {
      setValue('vehicleId', initialValues.vehicleId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vehicles]);

  const modelNameById = new Map((models ?? []).map((m) => [m.modelId, m.name]));

  const onSubmit = handleSubmit(async (values) => {
    setConfirmation(null);
    setFormError(null);
    setSuggestedSlots(null);
    const input: CreateTestDriveInput = {
      enquiryId: values.enquiryId,
      vehicleId: values.vehicleId,
      slotStart: toIsoSlot(values.date, values.time),
      slotEnd: computeSlotEnd(values.date, values.time),
    };
    try {
      const created = await bookTestDrive.mutateAsync(input);
      setConfirmation({ testDriveId: created.testDriveId });
      reset();
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        // issue #36 AC1/AC2: double-booking conflict — surfaced as a
        // form-level message (not tied to one field, since the conflict is
        // a cross-field/vehicle+slot business rule, not a single bad
        // input) plus the server's suggested nearest open slots, if any.
        setFormError(err.fieldErrors?.[0]?.message ?? err.message);
        setSuggestedSlots(err.suggestedSlots ?? null);
      } else if (err instanceof ApiError && err.fieldErrors) {
        for (const fieldError of err.fieldErrors) {
          if (fieldError.field === 'enquiryId' || fieldError.field === 'vehicleId') {
            setError(fieldError.field, { type: 'server', message: fieldError.message });
          } else if (fieldError.field === 'slotStart' || fieldError.field === 'slotEnd') {
            // Both server-side slot fields map back onto the single "time"
            // control the DSE actually edited (see file comment).
            setError('time', { type: 'server', message: fieldError.message });
          }
        }
        if (!err.fieldErrors.length) {
          setFormError(err.message);
        }
      } else {
        setFormError(err instanceof Error ? err.message : 'Failed to book test drive.');
      }
    }
  });

  /** issue #36 AC2: clicking a suggested slot re-fills the date/time
   * controls with that slot (via react-hook-form's setValue, mirroring
   * NewTestDriveForm's own AC4 pre-fill re-application pattern above) and
   * clears the conflict message — the DSE reviews the now-filled form and
   * submits again, rather than the click silently auto-booking on their
   * behalf. Kept as a simple in-form re-fill (not a query-param
   * navigation, unlike #35's cross-page pre-fill) since the DSE is already
   * on this form. */
  function applySuggestedSlot(slot: SchedulerSlot) {
    setValue('date', isoDatePart(slot.slotStart));
    setValue('time', isoTimePart(slot.slotStart));
    setFormError(null);
    setSuggestedSlots(null);
  }

  return (
    <form onSubmit={onSubmit} noValidate aria-label="Book a Test Drive" className="space-y-1">
      <FormField label="Customer / Enquiry" htmlFor="enquiryId" error={errors.enquiryId?.message}>
        <Select id="enquiryId" {...register('enquiryId', { required: 'Customer is required' })}>
          <option value="">Select a customer</option>
          {(enquiries ?? []).map((enquiry) => (
            <option key={enquiry.enquiryId} value={enquiry.enquiryId}>
              {(enquiry.customerName ?? 'Unnamed Customer') + ' — ' + enquiry.variant}
            </option>
          ))}
        </Select>
      </FormField>

      <FormField label="Demo Vehicle" htmlFor="vehicleId" error={errors.vehicleId?.message}>
        <Select id="vehicleId" {...register('vehicleId', { required: 'Vehicle is required' })}>
          <option value="">Select a vehicle</option>
          {(vehicles ?? []).map((vehicle) => (
            <option key={vehicle.vehicleId} value={vehicle.vehicleId}>
              {(modelNameById.get(vehicle.modelId) ?? `Model ${vehicle.modelId}`) + ' — ' + vehicle.variant}
            </option>
          ))}
        </Select>
      </FormField>

      <FormField label="Date" htmlFor="date" error={errors.date?.message}>
        <TextInput id="date" type="date" {...register('date', { required: 'Date is required' })} />
      </FormField>

      <FormField label="Start Time" htmlFor="time" error={errors.time?.message}>
        <TextInput id="time" type="time" {...register('time', { required: 'Start time is required' })} />
      </FormField>

      {formError && (
        <div role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {formError}
        </div>
      )}
      {suggestedSlots && suggestedSlots.length > 0 && (
        <div className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">
          <p>Try one of the nearest open slots instead:</p>
          <ul className="mt-1 flex flex-wrap gap-2">
            {suggestedSlots.map((slot) => (
              <li key={slot.slotStart}>
                <button
                  type="button"
                  className="rounded-md border border-amber-300 bg-white px-2 py-1 text-xs font-medium text-amber-800 hover:bg-amber-100"
                  onClick={() => applySuggestedSlot(slot)}
                >
                  {isoDatePart(slot.slotStart)} {isoTimePart(slot.slotStart)}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
      {confirmation && (
        <div role="status" className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-700">
          Test drive booked successfully. Booking reference: {confirmation.testDriveId}
        </div>
      )}

      <div className="pt-3">
        <Button type="submit" disabled={bookTestDrive.isPending}>
          Book Test Drive
        </Button>
      </div>
    </form>
  );
}
