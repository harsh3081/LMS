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
}
