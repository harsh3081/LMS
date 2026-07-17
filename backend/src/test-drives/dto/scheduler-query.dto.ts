import { ApiProperty } from '@nestjs/swagger';
import { IsISO8601, IsNotEmpty, IsUUID } from 'class-validator';

/**
 * GET /api/v1/test-drives?vehicleId=&from=&to= query contract (issue #35,
 * "Real-Time Test Drive Scheduler View" AC1/AC5). Deliberately a filtered
 * GET on the SAME flat top-level resource as POST /api/v1/test-drives (a
 * REST-idiomatic "collection GET with query filters"), not a new dedicated
 * `/api/v1/scheduler` path — mirrors DuplicateQueryDto's `@Query() dto`
 * convention (backend/src/duplicates/dto/duplicate-query.dto.ts). See
 * NOTES.md for the full rationale.
 *
 * All three fields are required — this endpoint deliberately does not
 * support an open-ended "all vehicles, all time" query; the scheduler
 * frontend always scopes to one selected vehicle and one day (AC1/AC5).
 */
export class SchedulerQueryDto {
  @ApiProperty({ description: 'The demo vehicle to query bookings for' })
  @IsNotEmpty({ message: 'vehicleId is required' })
  @IsUUID('4', { message: 'vehicleId must be a valid id' })
  vehicleId!: string;

  @ApiProperty({ example: '2026-08-01T00:00:00.000Z', description: 'ISO 8601 date-time; range start (inclusive)' })
  @IsNotEmpty({ message: 'from is required' })
  @IsISO8601({}, { message: 'from must be a valid ISO 8601 date-time' })
  from!: string;

  @ApiProperty({ example: '2026-08-02T00:00:00.000Z', description: 'ISO 8601 date-time; range end (exclusive)' })
  @IsNotEmpty({ message: 'to is required' })
  @IsISO8601({}, { message: 'to must be a valid ISO 8601 date-time' })
  to!: string;
}
