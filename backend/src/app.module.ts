import { DynamicModule, Module } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { LeadsController } from './leads/leads.controller';
import { LeadsService } from './leads/leads.service';
import { LeadsRepository } from './leads/leads.repository';
import { AuditLogRepository } from './audit-log/audit-log.repository';
import { EnquiriesController } from './enquiries/enquiries.controller';
import { DirectEnquiryController } from './enquiries/direct-enquiry.controller';
import { EnquiriesService } from './enquiries/enquiries.service';
import { EnquiriesRepository } from './enquiries/enquiries.repository';
import { LeadSourcesController } from './lead-sources/lead-sources.controller';
import { VehicleModelsController } from './vehicle-models/vehicle-models.controller';
import { AuthController } from './auth/auth.controller';
import { AuthService } from './auth/auth.service';
import { SessionStore } from './auth/session-store';
import { SessionAuthGuard } from './auth/session-auth.guard';
import { ConfigController } from './config/config.controller';
import { FeatureFlagsService } from './config/feature-flags.service';
import { FieldConfigController } from './field-config/field-config.controller';
import { FieldConfigService } from './field-config/field-config.service';
import { FieldConfigRepository } from './field-config/field-config.repository';

/**
 * Built via `forRoot(dataSource)` rather than `TypeOrmModule.forRootAsync`
 * so both the real app (main.ts, real Postgres DataSource) and the Jest
 * integration suite (test-data-source.ts, pg-mem substitute) can construct
 * the exact same module graph from whichever already-initialized DataSource
 * they hand in — no repository classes use `@InjectRepository`; they all
 * take the plain `DataSource` token, which is all this module provides.
 */
@Module({})
export class AppModule {
  static forRoot(dataSource: DataSource): DynamicModule {
    return {
      module: AppModule,
      controllers: [
        AuthController,
        ConfigController,
        LeadsController,
        EnquiriesController,
        DirectEnquiryController,
        LeadSourcesController,
        VehicleModelsController,
        FieldConfigController,
      ],
      providers: [
        { provide: DataSource, useValue: dataSource },
        LeadsService,
        LeadsRepository,
        AuditLogRepository,
        EnquiriesService,
        EnquiriesRepository,
        AuthService,
        SessionStore,
        SessionAuthGuard,
        FeatureFlagsService,
        FieldConfigService,
        FieldConfigRepository,
      ],
    };
  }
}
