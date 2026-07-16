import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { FeatureFlagsService } from './feature-flags.service';

@ApiTags('config')
@Controller('api/v1/config')
export class ConfigController {
  constructor(private readonly featureFlags: FeatureFlagsService) {}

  @Get()
  getConfig(): { newLeadEnabled: boolean; convertLeadEnabled: boolean; directEnquiryEnabled: boolean } {
    return {
      newLeadEnabled: this.featureFlags.isNewLeadEnabled(),
      convertLeadEnabled: this.featureFlags.isConvertLeadEnabled(),
      directEnquiryEnabled: this.featureFlags.isDirectEnquiryEnabled(),
    };
  }
}
