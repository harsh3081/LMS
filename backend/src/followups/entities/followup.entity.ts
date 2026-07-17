import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

export const FOLLOWUP_TYPE_HOME_VISIT = 'Home Visit';
export const FOLLOWUP_TYPE_SHOWROOM_VISIT = 'Showroom Visit';
export const FOLLOWUP_TYPE_CALL = 'Call';

/** AC1/AC4: the closed set of selectable follow-up types. */
export const FOLLOWUP_TYPES = [FOLLOWUP_TYPE_HOME_VISIT, FOLLOWUP_TYPE_SHOWROOM_VISIT, FOLLOWUP_TYPE_CALL] as const;

/**
 * `followups` table (issue #30, migration 1700000000010-CreateFollowups —
 * see that file's "Schema decisions" for the full rationale). Mirrors
 * EnquiryEntity/LeadEntity conventions exactly (uuid PK, snake_case columns).
 * `enquiryId`/`type`/`remarks`/`loggedBy`/`locationId`/`dealerGroupId` are
 * server-derived-or-validated only (ADR-003/009): `enquiryId` comes from the
 * route param (validated against the caller's own scope,
 * FollowupsService.logFollowup), `loggedBy`/`locationId`/`dealerGroupId` come
 * from the authenticated Principal — never from the client body.
 */
@Entity({ name: 'followups' })
@Index('idx_followups_enquiry_logged', ['enquiryId', 'loggedAt'])
export class FollowupEntity {
  @PrimaryGeneratedColumn('uuid', { name: 'followup_id' })
  followupId!: string;

  @Column({ name: 'enquiry_id', type: 'uuid' })
  enquiryId!: string;

  @Column({ type: 'varchar' })
  type!: string;

  @Column({ type: 'text' })
  remarks!: string;

  /** The DSE who logged this Follow-up (AC5) — immutable audit column,
   * mirrors `leads.created_by`/`enquiries.converted_by` naming; not a
   * reassignable "owner" (a Follow-up log entry is never reassigned). */
  @Column({ name: 'logged_by', type: 'uuid' })
  loggedBy!: string;

  @Column({ name: 'location_id', type: 'uuid' })
  locationId!: string;

  @Column({ name: 'dealer_group_id', type: 'uuid' })
  dealerGroupId!: string;

  /** AC5: "Logged follow-up is timestamped". No `updatedAt` — a Follow-up is
   * an immutable, append-only log entry once created (mirrors `audit_log`'s
   * single-timestamp convention, not the mutable leads/enquiries pair). */
  @CreateDateColumn({ name: 'logged_at', type: 'timestamptz' })
  loggedAt!: Date;

  /** NEW (issue #31, AC1-AC4): the DSE's confirmed Next Follow-up Date —
   * this value IS the reminder (no separate Reminder entity; see
   * .phoenix-os/project/specs/31/NOTES.md for the AC3-AC5 design
   * reasoning). Nullable additive column (migration
   * 1700000000011-AddNextFollowUpAt), exactly as anticipated by #30's
   * migration comment. NULL only when this Follow-up was logged against an
   * Enquiry closed to a terminal status in the same request (AC2's
   * exception — see FollowupsService.assertNextFollowUpOrTerminalStatus). */
  @Column({ name: 'next_follow_up_at', type: 'timestamptz', nullable: true })
  nextFollowUpAt!: Date | null;

  /** NEW (issue #32, AC2): "any status change" — the terminal Enquiry status
   * (Lost/Booked) this specific Follow-up entry applied, if any. Persists
   * `LogFollowupDto.enquiryStatus` (already validated/applied to
   * `Enquiry.status` by FollowupsService.logFollowup since issue #31) onto
   * the Follow-up row itself so the history timeline can show which entry
   * changed the Enquiry's status. Nullable additive column (migration
   * 1700000000012-AddResultingStatusToFollowups), NULL for every Follow-up
   * that did not carry a terminal enquiryStatus (the overwhelming majority).
   * Deliberately reuses the same varchar convention as `Enquiry.status`
   * rather than a DB enum, mirroring `type`'s precedent above. */
  @Column({ name: 'resulting_status', type: 'varchar', nullable: true })
  resultingStatus!: string | null;
}
