import { ApiProperty } from '@nestjs/swagger';

/**
 * One BOOKED slot as returned by the scheduler query (issue #35 AC2).
 * Deliberately minimal/anonymized: only `slotStart`/`slotEnd` — no
 * `testDriveId`/`enquiryId`/`bookedBy`. No Story to date has established
 * cross-DSE visibility rules into another DSE's Enquiry (every existing
 * lookup — `EnquiriesRepository.findOwnedById`, `FollowupsRepository.
 * findByEnquiry` — is scoped to the caller's own bookings/Enquiries or a
 * single Enquiry the caller already has eligibility for), so this endpoint —
 * deliberately NOT owner-scoped, since any DSE at the location can call it —
 * takes the safer default of not exposing WHICH other booking a slot
 * belongs to, only THAT it is booked. The frontend needs nothing more: it
 * computes the full fixed-grid of possible slots itself and marks any
 * overlapping one of these as "booked" (see NOTES.md "derived, not
 * stored").
 */
export class SchedulerSlotDto {
  @ApiProperty() slotStart!: string;
  @ApiProperty() slotEnd!: string;
}
