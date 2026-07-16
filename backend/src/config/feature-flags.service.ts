import { Injectable } from '@nestjs/common';

/**
 * Simple config/env feature-toggle mechanism (tech-design.md Clarifications,
 * resolved). `NEW_LEAD_ENABLED` gates the "New Lead" entry point
 * (eval-criteria.md CC-10 assumption). Exposed via GET /api/v1/config so the
 * SPA can read it without a full env-injection build step.
 */
@Injectable()
export class FeatureFlagsService {
  isNewLeadEnabled(): boolean {
    return process.env.NEW_LEAD_ENABLED !== 'false';
  }

  /** `CONVERT_LEAD_ENABLED` gates the "Convert to Enquiry" entry point
   * (issue #25 tech-design.md Component 4, mirrors isNewLeadEnabled). */
  isConvertLeadEnabled(): boolean {
    return process.env.CONVERT_LEAD_ENABLED !== 'false';
  }

  /** `DIRECT_ENQUIRY_ENABLED` gates the "New Enquiry" entry point (issue
   * #26, mirrors isNewLeadEnabled/isConvertLeadEnabled precedent). */
  isDirectEnquiryEnabled(): boolean {
    return process.env.DIRECT_ENQUIRY_ENABLED !== 'false';
  }
}
