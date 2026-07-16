import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client';

export function useVehicleModels() {
  return useQuery({ queryKey: ['vehicle-models'], queryFn: api.getVehicleModels });
}
