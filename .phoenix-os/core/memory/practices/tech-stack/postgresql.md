# PostgreSQL Tech Stack Guidelines

## Overview
Guidelines for using PostgreSQL in Phoenix OS projects.

## Best Practices

### Schema Design
- Normalize data to reduce redundancy
- Use appropriate data types
- Define proper constraints (NOT NULL, UNIQUE, CHECK)
- Use foreign keys for referential integrity
- Index frequently queried columns

### Query Optimization
- Use EXPLAIN ANALYZE to understand query performance
- Create indexes on columns used in WHERE, JOIN, ORDER BY
- Avoid SELECT * - specify columns needed
- Use prepared statements to prevent SQL injection
- Batch operations when possible

### Transactions
- Use transactions for multi-step operations
- Keep transactions short to avoid locks
- Set appropriate isolation levels
- Handle deadlocks gracefully

### Connection Management
- Use connection pooling (PgBouncer, application-level)
- Set max connections appropriately
- Close connections properly
- Monitor connection usage

### Security
- Use parameterized queries always
- Implement role-based access control
- Encrypt sensitive data
- Regular security patches
- Secure connection strings (no hardcoded credentials)

### Migrations
- Version all schema changes
- Use migration tools (Flyway, Liquibase, Prisma Migrate)
- Test migrations on staging first
- Keep migrations reversible when possible

### Performance
- Regular VACUUM and ANALYZE
- Monitor query performance
- Use partitioning for large tables
- Implement read replicas for scaling

## Recommended Tools
- **ORM**: Prisma, TypeORM, Sequelize
- **Migration**: Flyway, Liquibase, Prisma Migrate
- **Pooling**: PgBouncer, pg-pool
- **Monitoring**: pgAdmin, DataGrip, pganalyze

## Data Types Best Practices
- Use `BIGSERIAL` for auto-incrementing IDs
- `TIMESTAMP WITH TIME ZONE` for datetime
- `JSONB` for flexible schema data (not JSON)
- `UUID` for distributed systems
- `NUMERIC` for precise decimal values

## Naming Conventions
- Tables: plural snake_case (e.g., `user_accounts`)
- Columns: singular snake_case (e.g., `created_at`)
- Indexes: `idx_{table}_{column}`
- Foreign keys: `fk_{table}_{referenced_table}`

## References
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [PostgreSQL Performance Optimization](https://wiki.postgresql.org/wiki/Performance_Optimization)
