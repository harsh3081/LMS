import 'reflect-metadata';
import { DataSource, DataSourceOptions } from 'typeorm';
import { UserEntity } from './users/entities/user.entity';
import { LocationEntity } from './locations/entities/location.entity';
import { DealerGroupEntity } from './dealer-groups/entities/dealer-group.entity';
import { LeadSourceEntity } from './lead-sources/entities/lead-source.entity';
import { VehicleModelEntity } from './vehicle-models/entities/vehicle-model.entity';
import { AuditLogEntity } from './audit-log/entities/audit-log.entity';
import { LeadEntity } from './leads/entities/lead.entity';
import { EnquiryEntity } from './enquiries/entities/enquiry.entity';
import { CreateFoundationalTables1700000000001 } from './migrations/1700000000001-CreateFoundationalTables';
import { CreateLeads1700000000002 } from './migrations/1700000000002-CreateLeads';
import { CreateEnquiries1700000000003 } from './migrations/1700000000003-CreateEnquiries';
import { SeedMasterData1700000000004 } from './migrations/1700000000004-SeedMasterData';
import { DirectEnquiry1700000000005 } from './migrations/1700000000005-DirectEnquiry';

/**
 * Real PostgreSQL 16 DataSource (tech-design.md: TypeORM, resolved) — used by
 * the running app (`AppModule`) and the TypeORM migration CLI
 * (`npm run migration:run` / `migration:revert`) against a real dev/CI/prod
 * Postgres instance. See `docker-compose.yml` at the repo root to stand one
 * up locally. Do NOT import this file from Jest tests — those use
 * `test/support/test-data-source.ts` (pg-mem substitute) so the suite can run
 * without a Postgres/Docker install in the sandbox that authored this Story;
 * both share the exact same entities/migrations, so schema fidelity holds.
 */
export const entities = [
  UserEntity,
  LocationEntity,
  DealerGroupEntity,
  LeadSourceEntity,
  VehicleModelEntity,
  AuditLogEntity,
  LeadEntity,
  EnquiryEntity,
];

export const migrations = [
  CreateFoundationalTables1700000000001,
  CreateLeads1700000000002,
  CreateEnquiries1700000000003,
  SeedMasterData1700000000004,
  DirectEnquiry1700000000005,
];

export const dataSourceOptions: DataSourceOptions = {
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 5432),
  username: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'lms',
  entities,
  migrations,
  synchronize: false,
  logging: process.env.DB_LOGGING === 'true',
};

const AppDataSource = new DataSource(dataSourceOptions);

export default AppDataSource;
