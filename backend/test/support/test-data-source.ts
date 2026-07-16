import 'reflect-metadata';
import { newDb, DataType } from 'pg-mem';
import { randomUUID } from 'crypto';
import { DataSource } from 'typeorm';
import { entities, migrations } from '../../src/data-source';

/**
 * Test database harness (todo.md Task 0.2.1) — an isolated, freshly-migrated
 * database per Jest test file.
 *
 * ENVIRONMENT NOTE (see evidence.md "Blockers"): the sandbox this Story was
 * implemented in has neither a local PostgreSQL install nor Docker available,
 * so a real Postgres 16 instance (as tech-design.md specifies) cannot be
 * started here. `pg-mem` (an in-memory Postgres-wire-compatible engine) is
 * used as a drop-in TypeORM driver substitute so the SAME entities and the
 * SAME TypeORM migrations that ship for real Postgres can be exercised end
 * to end (up-migration, inserts, down-migration) via actual execution rather
 * than mocks — satisfying the "prefer integration over mocked unit tests"
 * guidance as closely as this environment allows. Sets
 * `E2E_DB_DRIVER=pgmem` so `CreateLeads1700000000002` skips only the one DB
 * feature pg-mem's SQL engine cannot evaluate (the `~` regex CHECK operator);
 * every other constraint (FKs, NOT NULL, defaults, uniqueness, jsonb, the
 * owner-queue index) runs identically to real Postgres. Real dev/CI
 * environments should run this suite with `E2E_DB_DRIVER` unset against the
 * `docker-compose.yml` Postgres 16 service at the repo root.
 */
process.env.E2E_DB_DRIVER = 'pgmem';

export async function createTestDataSource(): Promise<DataSource> {
  const db = newDb({ autoCreateForeignKeyIndices: true });

  db.public.registerFunction({
    name: 'uuid_generate_v4',
    returns: DataType.uuid,
    implementation: () => randomUUID(),
    impure: true,
  });
  db.public.registerFunction({
    name: 'version',
    returns: DataType.text,
    implementation: () => 'PostgreSQL 16.0 (pg-mem test substitute)',
    impure: true,
  });
  db.public.registerFunction({
    name: 'current_database',
    returns: DataType.text,
    implementation: () => 'lms_test',
    impure: true,
  });

  const dataSource: DataSource = db.adapters.createTypeormDataSource({
    type: 'postgres',
    entities,
    migrations,
  });

  await dataSource.initialize();
  await dataSource.runMigrations();
  return dataSource;
}
