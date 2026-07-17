import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client';

/** GET /api/v1/demo-vehicles — the caller's own location's active demo
 * fleet, for the "Book a Test Drive" form's vehicle dropdown (issue #34,
 * AC1). Mirrors useVehicleModels' structure exactly. */
export function useDemoVehicles() {
  return useQuery({ queryKey: ['demo-vehicles'], queryFn: api.getDemoVehicles });
}
