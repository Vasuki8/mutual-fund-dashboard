import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const fundscopeState = sqliteTable('fundscope_state', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const fundscopeArchives = sqliteTable('fundscope_archives', {
  schemeCode: integer('scheme_code').primaryKey(),
  schemeName: text('scheme_name').notNull(),
  objectKey: text('object_key').notNull(),
  version: integer('version').notNull(),
  fetchedAt: text('fetched_at').notNull(),
  archivedAt: text('archived_at').notNull(),
  coverageStart: text('coverage_start').notNull(),
  coverageEnd: text('coverage_end').notNull(),
  observationCount: integer('observation_count').notNull(),
  unresolved: integer('unresolved').notNull().default(0),
});

export const fundscopeRuns = sqliteTable('fundscope_runs', {
  id: text('id').primaryKey(),
  status: text('status').notNull(),
  startedAt: text('started_at').notNull(),
  finishedAt: text('finished_at'),
  processed: integer('processed').notNull().default(0),
  failed: integer('failed').notNull().default(0),
  cursor: integer('cursor').notNull().default(0),
  total: integer('total').notNull(),
  catalogueCount: integer('catalogue_count').notNull(),
  queueKey: text('queue_key').notNull(),
  error: text('error'),
}, table => [index('fundscope_runs_started_at').on(table.startedAt)]);

export const fundscopeRequests = sqliteTable('fundscope_requests', {
  key: text('key').primaryKey(),
  runId: text('run_id').notNull(),
  createdAt: text('created_at').notNull(),
});

export const fundscopeFailures = sqliteTable('fundscope_failures', {
  schemeCode: integer('scheme_code').primaryKey(),
  runId: text('run_id'),
  attempts: integer('attempts').notNull(),
  error: text('error').notNull(),
  lastAttemptAt: text('last_attempt_at').notNull(),
  nextRetryAt: integer('next_retry_at').notNull(),
}, table => [index('fundscope_failures_run_id').on(table.runId)]);

export const fundscopeLeases = sqliteTable('fundscope_leases', {
  key: text('key').primaryKey(),
  owner: text('owner').notNull(),
  expiresAt: integer('expires_at').notNull(),
});
