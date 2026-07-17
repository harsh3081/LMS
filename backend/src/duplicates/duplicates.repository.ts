import { Injectable } from '@nestjs/common';
import { DataSource, EntityManager, Not } from 'typeorm';
import { LeadEntity, LEAD_STATUS_CONVERTED } from '../leads/entities/lead.entity';
import { EnquiryEntity, ENQUIRY_ENTRY_TYPE_DIRECT } from '../enquiries/entities/enquiry.entity';

/**
 * Duplicate-detection reads (issue #29, AC1/AC4/AC6). Tenant-scoped by
 * `locationId` only (NOT owner-scoped like LeadsRepository.findOwnQueue) —
 * the whole point of this check is to surface a matching record regardless
 * of which DSE at the dealership currently owns it (NOTES.md "Design
 * decisions"). Mirrors LeadsRepository/EnquiriesRepository's optional-
 * transactional-manager convention even though the current callers
 * (DuplicatesService, LeadsService.create, EnquiriesService.createDirect)
 * all call this read-only outside a write transaction — kept for
 * consistency and so a future caller can read-inside-transaction for free.
 */
@Injectable()
export class DuplicatesRepository {
  constructor(private readonly dataSource: DataSource) {}

  /** "Open" Leads (AC4) — excludes Converted, mirrors LeadsRepository.findOwnQueue's
   * status filter exactly (issue #25 convention), scoped to the same location. */
  async findOpenLeadsByMobile(mobile: string, locationId: string, manager?: EntityManager): Promise<LeadEntity[]> {
    const repository = (manager ?? this.dataSource.manager).getRepository(LeadEntity);
    return repository.find({
      where: { mobile, locationId, status: Not(LEAD_STATUS_CONVERTED) },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * "Open" Enquiries (AC4), pragmatically scoped to Direct Enquiries only —
   * a Direct Enquiry carries its own `mobile` column, but an Enquiry
   * converted from a Lead does not (it is reachable only via its now-
   * Converted parent Lead, which findOpenLeadsByMobile above already
   * excludes). See NOTES.md "Known gaps" — extending this to also match a
   * Converted Enquiry via its linked Lead's mobile is a documented,
   * deliberately-deferred enhancement (issue explicitly allows either
   * design; this is the simpler, lower-risk option for a fast-tracked
   * Story). No status filter is applied because ENQUIRY_STATUS_NEW is the
   * only Enquiry status that exists in the product today (no "closed"
   * lifecycle yet) — every Direct Enquiry is "open" by definition until a
   * future Story introduces one. */
  async findOpenDirectEnquiriesByMobile(
    mobile: string,
    locationId: string,
    manager?: EntityManager,
  ): Promise<EnquiryEntity[]> {
    const repository = (manager ?? this.dataSource.manager).getRepository(EnquiryEntity);
    return repository.find({
      where: { mobile, locationId, entryType: ENQUIRY_ENTRY_TYPE_DIRECT },
      order: { convertedAt: 'DESC' },
    });
  }
}
