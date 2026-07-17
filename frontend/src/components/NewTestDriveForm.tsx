import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useEnquiries } from '../hooks/useEnquiries';
import { useDemoVehicles } from '../hooks/useDemoVehicles';
import { useVehicleModels } from '../hooks/useVehicleModels';
import { useBookTestDrive } from '../hooks/useTestDrives';
import { ApiError, CreateTestDriveInput } from '../api/client';
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
 * see TestDriveResponseDto's comment).
 */
export function NewTestDriveForm() {
  const { data: enquiries } = useEnquiries();
  const { data: vehicles } = useDemoVehicles();
  const { data: models } = useVehicleModels();
  const bookTestDrive = useBookTestDrive();
  const [confirmation, setConfirmation] = useState<{ testDriveId: string } | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setError,
    reset,
    formState: { errors },
  } = useForm<FormValues>({ defaultValues: { enquiryId: '', vehicleId: '', date: '', time: '' } });

  const modelNameById = new Map((models ?? []).map((m) => [m.modelId, m.name]));

  const onSubmit = handleSubmit(async (values) => {
    setConfirmation(null);
    setFormError(null);
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
      if (err instanceof ApiError && err.fieldErrors) {
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
