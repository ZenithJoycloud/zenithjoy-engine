---
id: platform-monitoring-database-schema
version: 1.0.0
created: 2026-02-06
updated: 2026-02-06
author: ZenithJoy Engine Team
changelog:
  - 1.0.0: Initial database schema design for platform monitoring
---

# Platform Monitoring Database Schema Design

## Table of Contents

1. [Overview](#overview)
2. [Database Architecture](#database-architecture)
3. [TimescaleDB Schema](#timescaledb-schema)
4. [PostgreSQL Metadata Schema](#postgresql-metadata-schema)
5. [Index Design](#index-design)
6. [Partitioning Strategy](#partitioning-strategy)
7. [Data Lifecycle Management](#data-lifecycle-management)
8. [Performance Optimization](#performance-optimization)
9. [Migration Scripts](#migration-scripts)
10. [References](#references)

## Overview

This document defines the database schema for the Platform Monitoring System, utilizing a hybrid approach with TimescaleDB for time-series data and PostgreSQL for metadata and configuration.

### Database Systems

1. **TimescaleDB**: Time-series metrics data (extends PostgreSQL)
2. **PostgreSQL**: Platform configurations, baselines, reports
3. **Redis**: Real-time cache and rate limiting (schema-less)

### Design Principles

- **Hypertables**: Automatic time-based partitioning for metrics
- **Compression**: Aggressive compression for historical data
- **Indexes**: Optimized for time-range and platform-based queries
- **Retention**: Automated data lifecycle with tiered storage

## Database Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     Application Layer                     │
└───────────────┬────────────────────────┬────────────────┘
                │                        │
    ┌───────────▼──────────┐ ┌──────────▼──────────┐
    │     TimescaleDB      │ │     PostgreSQL      │
    │   (Time-Series)      │ │    (Metadata)       │
    ├──────────────────────┤ ├────────────────────┤
    │ • platform_metrics   │ │ • platforms        │
    │ • baseline_history   │ │ • baseline_configs │
    │ • anomaly_events     │ │ • reports          │
    │ • aggregated_metrics │ │ • users            │
    └──────────────────────┘ └────────────────────┘
              │                        │
    ┌─────────▼────────────────────────▼─────────┐
    │           Shared Connection Pool            │
    └─────────────────────────────────────────────┘
```

## TimescaleDB Schema

### 1. Platform Metrics Table (Hypertable)

```sql
-- Main metrics storage table
CREATE TABLE platform_metrics (
    time            TIMESTAMPTZ NOT NULL,
    platform        VARCHAR(50) NOT NULL,
    metric_type     VARCHAR(100) NOT NULL,
    value           DOUBLE PRECISION NOT NULL,
    content_id      VARCHAR(255),
    content_type    VARCHAR(50),
    author_id       VARCHAR(255),
    tags            JSONB,
    metadata        JSONB,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Convert to TimescaleDB hypertable
SELECT create_hypertable('platform_metrics', 'time',
    chunk_time_interval => INTERVAL '1 day',
    if_not_exists => TRUE
);

-- Enable compression after 7 days
ALTER TABLE platform_metrics SET (
    timescaledb.compress,
    timescaledb.compress_segmentby = 'platform, metric_type',
    timescaledb.compress_orderby = 'time DESC'
);

SELECT add_compression_policy('platform_metrics', INTERVAL '7 days');

-- Create continuous aggregate for hourly data
CREATE MATERIALIZED VIEW platform_metrics_hourly
WITH (timescaledb.continuous) AS
SELECT
    time_bucket('1 hour', time) AS bucket,
    platform,
    metric_type,
    AVG(value) as avg_value,
    MIN(value) as min_value,
    MAX(value) as max_value,
    COUNT(*) as data_points,
    PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY value) as median_value,
    PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY value) as p95_value
FROM platform_metrics
GROUP BY bucket, platform, metric_type
WITH NO DATA;

-- Refresh policy for continuous aggregate
SELECT add_continuous_aggregate_policy('platform_metrics_hourly',
    start_offset => INTERVAL '3 hours',
    end_offset => INTERVAL '1 hour',
    schedule_interval => INTERVAL '1 hour'
);
```

### 2. Baseline History Table

```sql
CREATE TABLE baseline_history (
    time            TIMESTAMPTZ NOT NULL,
    platform        VARCHAR(50) NOT NULL,
    metric_type     VARCHAR(100) NOT NULL,
    baseline_value  DOUBLE PRECISION NOT NULL,
    upper_bound     DOUBLE PRECISION NOT NULL,
    lower_bound     DOUBLE PRECISION NOT NULL,
    std_deviation   DOUBLE PRECISION,
    sample_size     INTEGER,
    confidence      DOUBLE PRECISION,
    algorithm       VARCHAR(50),
    parameters      JSONB,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

SELECT create_hypertable('baseline_history', 'time',
    chunk_time_interval => INTERVAL '7 days',
    if_not_exists => TRUE
);

-- Compression for baseline history
ALTER TABLE baseline_history SET (
    timescaledb.compress,
    timescaledb.compress_segmentby = 'platform, metric_type',
    timescaledb.compress_orderby = 'time DESC'
);

SELECT add_compression_policy('baseline_history', INTERVAL '30 days');
```

### 3. Anomaly Events Table

```sql
CREATE TABLE anomaly_events (
    time            TIMESTAMPTZ NOT NULL,
    anomaly_id      UUID DEFAULT gen_random_uuid(),
    platform        VARCHAR(50) NOT NULL,
    metric_type     VARCHAR(100) NOT NULL,
    severity        VARCHAR(20) CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    anomaly_type    VARCHAR(50),
    actual_value    DOUBLE PRECISION,
    expected_value  DOUBLE PRECISION,
    deviation       DOUBLE PRECISION,
    duration_ms     INTEGER,
    detection_method VARCHAR(100),
    details         JSONB,
    resolved_at     TIMESTAMPTZ,
    resolved_by     VARCHAR(100),
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

SELECT create_hypertable('anomaly_events', 'time',
    chunk_time_interval => INTERVAL '7 days',
    if_not_exists => TRUE
);

-- Index for unresolved anomalies
CREATE INDEX idx_unresolved_anomalies
ON anomaly_events (platform, severity, time DESC)
WHERE resolved_at IS NULL;
```

### 4. Aggregated Metrics Table (Pre-computed)

```sql
CREATE TABLE aggregated_metrics (
    time            TIMESTAMPTZ NOT NULL,
    platform        VARCHAR(50) NOT NULL,
    metric_type     VARCHAR(100) NOT NULL,
    aggregation     VARCHAR(20) NOT NULL, -- 'daily', 'weekly', 'monthly'
    avg_value       DOUBLE PRECISION,
    min_value       DOUBLE PRECISION,
    max_value       DOUBLE PRECISION,
    sum_value       DOUBLE PRECISION,
    count_value     BIGINT,
    p50_value       DOUBLE PRECISION,
    p95_value       DOUBLE PRECISION,
    p99_value       DOUBLE PRECISION,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(time, platform, metric_type, aggregation)
);

SELECT create_hypertable('aggregated_metrics', 'time',
    chunk_time_interval => INTERVAL '1 month',
    if_not_exists => TRUE
);
```

## PostgreSQL Metadata Schema

### 1. Platforms Configuration

```sql
CREATE TABLE platforms (
    platform_id     SERIAL PRIMARY KEY,
    platform_name   VARCHAR(50) UNIQUE NOT NULL,
    display_name    VARCHAR(100) NOT NULL,
    category        VARCHAR(50),
    api_endpoint    VARCHAR(500),
    api_version     VARCHAR(20),
    auth_method     VARCHAR(50),
    credentials     JSONB, -- Encrypted
    rate_limits     JSONB,
    collection_config JSONB,
    is_active       BOOLEAN DEFAULT true,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_platforms_updated_at BEFORE UPDATE
    ON platforms FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
```

### 2. Baseline Configurations

```sql
CREATE TABLE baseline_configs (
    config_id       SERIAL PRIMARY KEY,
    platform        VARCHAR(50) NOT NULL,
    metric_type     VARCHAR(100) NOT NULL,
    algorithm       VARCHAR(50) NOT NULL DEFAULT 'ewma',
    window_days     INTEGER DEFAULT 30,
    parameters      JSONB,
    schedule_cron   VARCHAR(100),
    is_active       BOOLEAN DEFAULT true,
    last_calculated TIMESTAMPTZ,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(platform, metric_type)
);

CREATE TRIGGER update_baseline_configs_updated_at BEFORE UPDATE
    ON baseline_configs FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
```

### 3. Reports Table

```sql
CREATE TABLE reports (
    report_id       UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    report_type     VARCHAR(50) NOT NULL,
    period_start    TIMESTAMPTZ NOT NULL,
    period_end      TIMESTAMPTZ NOT NULL,
    platforms       TEXT[] NOT NULL,
    status          VARCHAR(20) DEFAULT 'pending',
    file_path       VARCHAR(500),
    file_size_bytes BIGINT,
    generation_time_ms INTEGER,
    sections        JSONB,
    metadata        JSONB,
    created_by      VARCHAR(100),
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    completed_at    TIMESTAMPTZ
);

CREATE INDEX idx_reports_period ON reports (period_start, period_end);
CREATE INDEX idx_reports_status ON reports (status) WHERE status != 'completed';
```

### 4. Metric Definitions

```sql
CREATE TABLE metric_definitions (
    metric_id       SERIAL PRIMARY KEY,
    platform        VARCHAR(50) NOT NULL,
    metric_type     VARCHAR(100) NOT NULL,
    display_name    VARCHAR(200),
    unit            VARCHAR(50),
    data_type       VARCHAR(20) CHECK (data_type IN ('counter', 'gauge', 'histogram')),
    description     TEXT,
    calculation_formula TEXT,
    tags            TEXT[],
    is_active       BOOLEAN DEFAULT true,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(platform, metric_type)
);
```

### 5. Alert Rules

```sql
CREATE TABLE alert_rules (
    rule_id         SERIAL PRIMARY KEY,
    rule_name       VARCHAR(200) NOT NULL,
    platform        VARCHAR(50),
    metric_type     VARCHAR(100),
    condition_type  VARCHAR(50), -- 'threshold', 'anomaly', 'trend'
    condition_config JSONB,
    severity        VARCHAR(20),
    notification_channels TEXT[],
    is_active       BOOLEAN DEFAULT true,
    last_triggered  TIMESTAMPTZ,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER update_alert_rules_updated_at BEFORE UPDATE
    ON alert_rules FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
```

## Index Design

### TimescaleDB Indexes

```sql
-- Primary query pattern: platform + metric_type + time range
CREATE INDEX idx_platform_metrics_lookup
ON platform_metrics (platform, metric_type, time DESC);

-- Content-based queries
CREATE INDEX idx_platform_metrics_content
ON platform_metrics (content_id, time DESC)
WHERE content_id IS NOT NULL;

-- Tag-based queries (GIN index for JSONB)
CREATE INDEX idx_platform_metrics_tags
ON platform_metrics USING GIN (tags);

-- Baseline lookup
CREATE INDEX idx_baseline_history_lookup
ON baseline_history (platform, metric_type, time DESC);

-- Anomaly severity queries
CREATE INDEX idx_anomaly_events_severity
ON anomaly_events (severity, time DESC);
```

### PostgreSQL Indexes

```sql
-- Platform lookup
CREATE INDEX idx_platforms_active
ON platforms (platform_name)
WHERE is_active = true;

-- Baseline config lookup
CREATE INDEX idx_baseline_configs_active
ON baseline_configs (platform, metric_type)
WHERE is_active = true;

-- Report search
CREATE INDEX idx_reports_search
ON reports (report_type, created_at DESC);

-- Alert rules by platform
CREATE INDEX idx_alert_rules_platform
ON alert_rules (platform, is_active);
```

## Partitioning Strategy

### Time-based Partitioning (Automatic via TimescaleDB)

```sql
-- Chunk size optimization based on data volume
ALTER TABLE platform_metrics SET (
    timescaledb.chunk_time_interval = '1 day'  -- For high-volume data
);

ALTER TABLE baseline_history SET (
    timescaledb.chunk_time_interval = '7 days'  -- For lower-volume data
);

-- View chunk information
SELECT
    hypertable_name,
    chunk_name,
    range_start,
    range_end,
    table_bytes,
    index_bytes,
    total_bytes
FROM timescaledb_information.chunks
WHERE hypertable_name = 'platform_metrics'
ORDER BY range_start DESC
LIMIT 10;
```

### Manual Partitioning for Reports (by year)

```sql
-- Parent table
CREATE TABLE reports_partitioned (
    LIKE reports INCLUDING ALL
) PARTITION BY RANGE (created_at);

-- Create yearly partitions
CREATE TABLE reports_2026 PARTITION OF reports_partitioned
    FOR VALUES FROM ('2026-01-01') TO ('2027-01-01');

CREATE TABLE reports_2027 PARTITION OF reports_partitioned
    FOR VALUES FROM ('2027-01-01') TO ('2028-01-01');
```

## Data Lifecycle Management

### Retention Policies

```sql
-- Hot data: Full resolution for 30 days
-- Warm data: Hourly aggregates for 31-90 days
-- Cold data: Daily aggregates for >90 days

-- Drop old raw data
SELECT add_retention_policy('platform_metrics', INTERVAL '30 days');

-- Drop old hourly aggregates
SELECT add_retention_policy('platform_metrics_hourly', INTERVAL '90 days');

-- Move old data to cold storage (S3)
CREATE OR REPLACE FUNCTION archive_old_data()
RETURNS void AS $$
DECLARE
    archive_date DATE := CURRENT_DATE - INTERVAL '90 days';
BEGIN
    -- Export to S3 (using aws_s3 extension)
    PERFORM aws_s3.export_query(
        'SELECT * FROM platform_metrics WHERE time < $1',
        aws_commons.create_s3_uri(
            'platform-monitoring-archive',
            format('metrics/%s.parquet', archive_date::text),
            'us-east-1'
        ),
        options := 'format parquet',
        query_params := ARRAY[archive_date]
    );

    -- Delete exported data
    DELETE FROM platform_metrics WHERE time < archive_date;
END;
$$ LANGUAGE plpgsql;

-- Schedule archive job
SELECT cron.schedule('archive-old-data', '0 2 * * *', 'SELECT archive_old_data()');
```

### Data Compression

```sql
-- Compression settings
ALTER TABLE platform_metrics SET (
    timescaledb.compress,
    timescaledb.compress_segmentby = 'platform, metric_type',
    timescaledb.compress_orderby = 'time DESC',
    timescaledb.compress_chunk_time_interval = '1 day'
);

-- Add compression policy
SELECT add_compression_policy('platform_metrics',
    compress_after => INTERVAL '7 days',
    if_not_exists => true
);

-- View compression statistics
SELECT
    hypertable_name,
    compression_status,
    uncompressed_heap_size,
    compressed_heap_size,
    compression_ratio
FROM timescaledb_information.hypertables
WHERE hypertable_name = 'platform_metrics';
```

### Data Cleanup Rules

```sql
-- Cleanup resolved anomalies older than 180 days
CREATE OR REPLACE FUNCTION cleanup_old_anomalies()
RETURNS void AS $$
BEGIN
    DELETE FROM anomaly_events
    WHERE resolved_at IS NOT NULL
    AND time < CURRENT_DATE - INTERVAL '180 days';
END;
$$ LANGUAGE plpgsql;

-- Cleanup old reports
CREATE OR REPLACE FUNCTION cleanup_old_reports()
RETURNS void AS $$
BEGIN
    -- Archive report metadata
    INSERT INTO reports_archive
    SELECT * FROM reports
    WHERE created_at < CURRENT_DATE - INTERVAL '1 year';

    -- Delete old reports
    DELETE FROM reports
    WHERE created_at < CURRENT_DATE - INTERVAL '1 year';
END;
$$ LANGUAGE plpgsql;

-- Schedule cleanup jobs
SELECT cron.schedule('cleanup-anomalies', '0 3 * * 0', 'SELECT cleanup_old_anomalies()');
SELECT cron.schedule('cleanup-reports', '0 3 1 * *', 'SELECT cleanup_old_reports()');
```

## Performance Optimization

### Query Optimization

```sql
-- Optimize time-range queries
SET timescaledb.optimize_query_planning = on;
SET timescaledb.enable_chunk_skipping = on;

-- Parallel query execution
SET max_parallel_workers_per_gather = 4;
SET parallel_setup_cost = 100;
SET parallel_tuple_cost = 0.01;

-- Memory settings for aggregations
SET work_mem = '256MB';
SET maintenance_work_mem = '1GB';
```

### Statistics and Vacuum

```sql
-- Update statistics regularly
ANALYZE platform_metrics;
ANALYZE baseline_history;

-- Aggressive autovacuum for high-update tables
ALTER TABLE platform_metrics SET (
    autovacuum_vacuum_scale_factor = 0.05,
    autovacuum_analyze_scale_factor = 0.02
);
```

### Connection Pooling Configuration

```sql
-- PgBouncer configuration (pgbouncer.ini)
-- [databases]
-- monitoring = host=localhost port=5432 dbname=monitoring
--
-- [pgbouncer]
-- pool_mode = transaction
-- max_client_conn = 1000
-- default_pool_size = 25
-- reserve_pool_size = 5
-- reserve_pool_timeout = 3
```

## Migration Scripts

### Initial Setup

```sql
-- 001_initial_setup.sql
CREATE DATABASE monitoring;
\c monitoring;
CREATE EXTENSION IF NOT EXISTS timescaledb;
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS aws_s3;
```

### Version Migrations

```sql
-- 002_add_data_quality_metrics.sql
ALTER TABLE platform_metrics
ADD COLUMN quality_score DOUBLE PRECISION,
ADD COLUMN validation_errors JSONB;

-- 003_add_platform_categories.sql
ALTER TABLE platforms
ADD COLUMN category VARCHAR(50),
ADD COLUMN priority INTEGER DEFAULT 1;
```

## References

- [TimescaleDB Documentation](https://docs.timescale.com/)
- [PostgreSQL Performance Tuning](https://www.postgresql.org/docs/current/performance-tips.html)
- [TimescaleDB Best Practices](https://docs.timescale.com/timescaledb/latest/how-to-guides/best-practices/)
- [Database Indexing Strategies](https://use-the-index-luke.com/)

---

*This document is version 1.0.0 and defines the database schema for the Platform Monitoring System.*