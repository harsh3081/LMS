import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

/** The only status this Story ever writes (AC1-AC6). Defined now as a named
 * constant — mirroring FOLLOWUP_TYPE_*'s precedent — so issue #39 ("Log Test
 * Drive Outcome") has something to extend with
 * TEST_DRIVE_STATUS_COMPLETED/NO_SHOW/CANCELLED once it widens the DB CHECK
 * constraint (migration 1700000000013's comment point 2). */
export const TEST_DRIVE_STATUS_BOOKED = 'Booked';

/** The full status vocabulary anticipated by the tech-design ("Test Drive":
 * status Booked/Completed/No-show/Cancelled) — NOT all legal at the DB layer
 * yet (only 'Booked' passes the CHECK constraint until #39 widens it).
 * Exported so #39 can import a single source of truth for the eventual full
 * set rather than re-deriving it. */
export const TEST_DRIVE_STATUS_COMPLETED = 'Completed';
export const TEST_DRIVE_STATUS_NO_SHOW = 'No-show';
export const TEST_DRIVE_STATUS_CANCELLED = 'Cancelled';

/**
 * `test_drives` table (issue #34, "Book a Test Drive Slot" — first Story
 * under Epic #2, Test Drive Management; migration
 * 1700000000013-CreateTestDrives — see that file's "Schema decisions" for
 * the full rationale). Mirrors FollowupEntity's conventions (uuid PK,
 * snake_case columns, server-derived audit columns) with one deliberate
 * difference: `updatedAt` IS present (unlike Follow-up's immutable-log
 * design) because `status`/`remarks` are expected to change later (#36/#39).
 * `enquiryId`/`vehicleId`/`slotStart`/`slotEnd` come from the validated
 * client DTO; `status`/`bookedBy`/`locationId`/`dealerGroupId` are
 * server-derived only — never accepted from the client (ADR-003/009),
 * enforced in TestDrivesService.book.
 */
@Entity({ name: 'test_drives' })
@Index('idx_test_drives_vehicle_slot', ['vehicleId', 'slotStart'])
@Index('idx_test_drives_booked_by_slot', ['bookedBy', 'slotStart'])
export class TestDriveEntity {
  @PrimaryGeneratedColumn('uuid', { name: 'test_drive_id' })
  testDriveId!: string;

  @Column({ name: 'enquiry_id', type: 'uuid' })
  enquiryId!: string;

  @Column({ name: 'vehicle_id', type: 'uuid' })
  vehicleId!: string;

  @Column({ name: 'slot_start', type: 'timestamptz' })
  slotStart!: Date;

  @Column({ name: 'slot_end', type: 'timestamptz' })
  slotEnd!: Date;

  @Column({ type: 'varchar', default: TEST_DRIVE_STATUS_BOOKED })
  status!: string;

  /** Outcome remarks — reserved for issue #39 ("Log Test Drive Outcome");
   * this Story never writes it. */
  @Column({ type: 'text', nullable: true })
  remarks!: string | null;

  /** The DSE who made this booking (AC5) — immutable audit column, mirrors
   * `followups.logged_by` naming exactly (not a reassignable "owner"). */
  @Column({ name: 'booked_by', type: 'uuid' })
  bookedBy!: string;

  @Column({ name: 'location_id', type: 'uuid' })
  locationId!: string;

  @Column({ name: 'dealer_group_id', type: 'uuid' })
  dealerGroupId!: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
