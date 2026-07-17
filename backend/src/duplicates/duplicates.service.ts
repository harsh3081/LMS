import { Injectable } from '@nestjs/common';
import { DuplicatesRepository } from './duplicates.repository';
import { DuplicateMatchDto } from './dto/duplicate-match.dto';
import { normalizeIndiaMobile } from '../common/mobile.util';

/**
 * Duplicate-detection use case (issue #29, AC1/AC4/AC6). Exposed both via
 * DuplicatesController (GET /api/v1/duplicates, the DSE-facing real-time
 * check, AC1/AC5) and injected directly into LeadsService.create /
 * EnquiriesService.createDirect (server-side advisory check backing the
 * AC3 audit note — see those services' `assertMandatoryFieldsPresent`-
 * adjacent duplicate-audit block) so both call sites share one exact-match
 * query implementation rather than duplicating the mobile-normalization +
 * two-table lookup twice.
 */
@Injectable()
export class DuplicatesService {
  constructor(private readonly duplicatesRepository: DuplicatesRepository) {}

  async findMatches(mobile: string, locationId: string): Promise<DuplicateMatchDto[]> {
    const normalized = normalizeIndiaMobile(mobile);

    const [leads, enquiries] = await Promise.all([
      this.duplicatesRepository.findOpenLeadsByMobile(normalized, locationId),
      this.duplicatesRepository.findOpenDirectEnquiriesByMobile(normalized, locationId),
    ]);

    return [
      ...leads.map((lead) => ({
        id: lead.leadId,
        type: 'LEAD' as const,
        label: lead.customerName,
        status: lead.status,
      })),
      ...enquiries.map((enquiry) => ({
        id: enquiry.enquiryId,
        type: 'ENQUIRY' as const,
        label: enquiry.customerName,
        status: enquiry.status,
      })),
    ];
  }
}
