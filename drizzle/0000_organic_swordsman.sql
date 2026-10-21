CREATE TABLE `fundscope_archives` (
	`scheme_code` integer PRIMARY KEY NOT NULL,
	`scheme_name` text NOT NULL,
	`object_key` text NOT NULL,
	`version` integer NOT NULL,
	`fetched_at` text NOT NULL,
	`archived_at` text NOT NULL,
	`coverage_start` text NOT NULL,
	`coverage_end` text NOT NULL,
	`observation_count` integer NOT NULL,
	`unresolved` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `fundscope_failures` (
	`scheme_code` integer PRIMARY KEY NOT NULL,
	`run_id` text,
	`attempts` integer NOT NULL,
	`error` text NOT NULL,
	`last_attempt_at` text NOT NULL,
	`next_retry_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `fundscope_failures_run_id` ON `fundscope_failures` (`run_id`);--> statement-breakpoint
CREATE TABLE `fundscope_leases` (
	`key` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`expires_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `fundscope_requests` (
	`key` text PRIMARY KEY NOT NULL,
	`run_id` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `fundscope_runs` (
	`id` text PRIMARY KEY NOT NULL,
	`status` text NOT NULL,
	`started_at` text NOT NULL,
	`finished_at` text,
	`processed` integer DEFAULT 0 NOT NULL,
	`failed` integer DEFAULT 0 NOT NULL,
	`cursor` integer DEFAULT 0 NOT NULL,
	`total` integer NOT NULL,
	`catalogue_count` integer NOT NULL,
	`queue_key` text NOT NULL,
	`error` text
);
--> statement-breakpoint
CREATE INDEX `fundscope_runs_started_at` ON `fundscope_runs` (`started_at`);--> statement-breakpoint
CREATE TABLE `fundscope_state` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL,
	`updated_at` text NOT NULL
);
