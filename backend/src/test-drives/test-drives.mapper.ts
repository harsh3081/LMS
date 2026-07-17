import { TestDriveEntity } from './entities/test-drive.entity';
import { TestDriveResponseDto } from './dto/test-drive-response.dto';
import { SchedulerSlotDto } from './dto/scheduler-slot.dto';

function toIso(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : value;
}

/** Shared entity->response mapping (mirrors followups.mapper.ts's
 * toFollowupResponse convention). */
export function toTestDriveResponse(testDrive: TestDriveEntity): TestDriveResponseDto {
  return {
    testDriveId: testDrive.testDriveId,
    enquiryId: testDrive.enquiryId,
    vehicleId: testDrive.vehicleId,
    slotStart: toIso(testDrive.slotStart),
    slotEnd: toIso(testDrive.slotEnd),
    status: testDrive.status,
    remarks: testDrive.remarks ?? null,
    bookedBy: testDrive.bookedBy,
    locationId: testDrive.locationId,
    createdAt: toIso(testDrive.createdAt),
    updatedAt: toIso(testDrive.updatedAt),
  };
}

/** issue #35 AC2 — maps a booked TestDriveEntity onto the deliberately
 * minimal/anonymized SchedulerSlotDto (see that DTO's comment). */
export function toSchedulerSlot(testDrive: TestDriveEntity): SchedulerSlotDto {
  return {
    slotStart: toIso(testDrive.slotStart),
    slotEnd: toIso(testDrive.slotEnd),
  };
}
