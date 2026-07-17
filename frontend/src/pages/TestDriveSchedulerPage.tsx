import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useDemoVehicles } from '../hooks/useDemoVehicles';
import { useVehicleModels } from '../hooks/useVehicleModels';
import { useSchedulerSlots } from '../hooks/useTestDrives';
import { TestDriveSchedulerGrid } from '../components/TestDriveSchedulerGrid';
import { AppShell } from '../components/layout/AppShell';
import { Button, Card, FormField, Select, TextInput, buttonStyles } from '../components/ui';

/** `YYYY-MM-DD`, treated as UTC — mirrors NewTestDriveForm.tsx's/
 * schedulerGrid.ts's "UTC as the fixed, deterministic stand-in for
 * dealership local time" convention exactly, so "today" here lines up with
 * the same day the backend's operating-hours check evaluates against. */
function todayUtcDate(): string {
  return new Date().toISOString().slice(0, 10);
}

function shiftDate(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/**
 * Rendered at /test-drives/scheduler (issue #35, "Real-Time Test Drive
 * Scheduler View"). issue #35 design decision: a SINGLE-DAY view with a
 * date-picker + Previous/Next Day control (AC1) — a reasonable, simpler
 * scope than a full multi-week calendar for this Story; see NOTES.md. A
 * vehicle switcher (AC5, reuses useDemoVehicles/useVehicleModels exactly
 * like NewTestDriveForm's dropdown) auto-selects the first available
 * vehicle once loaded so the grid is never blank on first render. The grid
 * itself (open vs. booked, AC2) and the AC4 pre-fill-on-click behavior live
 * in TestDriveSchedulerGrid; AC3's "near real time without manual refresh"
 * lives in useSchedulerSlots' polling (see that hook's comment).
 */
export function TestDriveSchedulerPage() {
  const { data: vehicles } = useDemoVehicles();
  const { data: models } = useVehicleModels();
  const [vehicleId, setVehicleId] = useState('');
  const [date, setDate] = useState(todayUtcDate);

  useEffect(() => {
    if (!vehicleId && vehicles && vehicles.length > 0) {
      setVehicleId(vehicles[0].vehicleId);
    }
  }, [vehicles, vehicleId]);

  const query = vehicleId ? { vehicleId, from: `${date}T00:00:00.000Z`, to: `${date}T23:59:59.999Z` } : null;
  const { data: bookedSlots, isLoading } = useSchedulerSlots(query);

  const modelNameById = new Map((models ?? []).map((m) => [m.modelId, m.name]));

  return (
    <AppShell>
      <main>
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-slate-900">Test Drive Scheduler</h1>
          <Link to="/" role="link" className={`${buttonStyles.base} ${buttonStyles.secondary}`}>
            Back to Dashboard
          </Link>
        </div>

        <Card className="mb-6">
          <div className="flex flex-wrap items-end gap-4">
            <div className="min-w-[16rem]">
              <FormField label="Demo Vehicle" htmlFor="scheduler-vehicle">
                <Select id="scheduler-vehicle" value={vehicleId} onChange={(e) => setVehicleId(e.target.value)}>
                  <option value="">Select a vehicle</option>
                  {(vehicles ?? []).map((vehicle) => (
                    <option key={vehicle.vehicleId} value={vehicle.vehicleId}>
                      {(modelNameById.get(vehicle.modelId) ?? `Model ${vehicle.modelId}`) + ' — ' + vehicle.variant}
                    </option>
                  ))}
                </Select>
              </FormField>
            </div>
            <div>
              <FormField label="Date" htmlFor="scheduler-date">
                <TextInput id="scheduler-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
              </FormField>
            </div>
            <div className="mb-4 flex gap-2">
              <Button type="button" variant="secondary" onClick={() => setDate((d) => shiftDate(d, -1))}>
                Previous Day
              </Button>
              <Button type="button" variant="secondary" onClick={() => setDate((d) => shiftDate(d, 1))}>
                Next Day
              </Button>
            </div>
          </div>
        </Card>

        {vehicleId ? (
          <TestDriveSchedulerGrid vehicleId={vehicleId} date={date} bookedSlots={bookedSlots ?? []} isLoading={isLoading} />
        ) : (
          <p className="text-sm text-slate-500">Select a demo vehicle to view its scheduler.</p>
        )}
      </main>
    </AppShell>
  );
}
