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
}
