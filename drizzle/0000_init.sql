CREATE TABLE `api_tokens` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`name` text NOT NULL,
	`prefix` text NOT NULL,
	`token_hash` text NOT NULL,
	`scopes` text DEFAULT '["read"]' NOT NULL,
	`last_used_at` integer,
	`expires_at` integer,
	`revoked_at` integer,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `api_tokens_hash_uq` ON `api_tokens` (`token_hash`);--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`expires_at` integer NOT NULL,
	`last_seen_at` integer,
	`ip` text,
	`user_agent` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `sessions_user_idx` ON `sessions` (`user_id`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`name` text NOT NULL,
	`password_hash` text,
	`role` text DEFAULT 'member' NOT NULL,
	`client_id` text,
	`title` text,
	`avatar_url` text,
	`locale` text DEFAULT 'fa' NOT NULL,
	`timezone` text,
	`disabled` integer DEFAULT false NOT NULL,
	`last_login_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_uq` ON `users` (`email`);--> statement-breakpoint
CREATE INDEX `users_client_idx` ON `users` (`client_id`);--> statement-breakpoint
CREATE TABLE `clients` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`kind` text DEFAULT 'company' NOT NULL,
	`email` text,
	`phone` text,
	`website` text,
	`address` text,
	`tax_id` text,
	`notes` text,
	`color` text,
	`logo_url` text,
	`default_currency` text DEFAULT 'IRT' NOT NULL,
	`tags` text DEFAULT '[]' NOT NULL,
	`archived_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `clients_name_idx` ON `clients` (`name`);--> statement-breakpoint
CREATE TABLE `milestones` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`status` text DEFAULT 'planned' NOT NULL,
	`due_date` integer,
	`weight` integer DEFAULT 1 NOT NULL,
	`completed_at` integer,
	`sort` real DEFAULT 0 NOT NULL,
	`visible_to_client` integer DEFAULT true NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `milestones_project_idx` ON `milestones` (`project_id`);--> statement-breakpoint
CREATE TABLE `project_members` (
	`project_id` text NOT NULL,
	`user_id` text NOT NULL,
	`role` text DEFAULT 'member' NOT NULL,
	`hourly_cost_minor` integer,
	`created_at` integer NOT NULL,
	PRIMARY KEY(`project_id`, `user_id`),
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `project_updates` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`kind` text DEFAULT 'update' NOT NULL,
	`title` text NOT NULL,
	`body_md` text,
	`visible_to_client` integer DEFAULT true NOT NULL,
	`created_by` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `project_updates_project_idx` ON `project_updates` (`project_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `projects` (
	`id` text PRIMARY KEY NOT NULL,
	`client_id` text,
	`name` text NOT NULL,
	`slug` text NOT NULL,
	`description` text,
	`status` text DEFAULT 'active' NOT NULL,
	`color` text DEFAULT '#00A76F' NOT NULL,
	`icon` text,
	`start_date` integer,
	`due_date` integer,
	`billing_type` text DEFAULT 'hourly' NOT NULL,
	`currency` text DEFAULT 'IRT' NOT NULL,
	`budget_minor` integer,
	`hourly_rate_minor` integer,
	`estimate_hours` real,
	`progress` integer DEFAULT 0 NOT NULL,
	`progress_mode` text DEFAULT 'milestones' NOT NULL,
	`website_url` text,
	`repo_url` text,
	`tags` text DEFAULT '[]' NOT NULL,
	`portal_enabled` integer DEFAULT false NOT NULL,
	`share_progress` integer DEFAULT true NOT NULL,
	`share_time` integer DEFAULT false NOT NULL,
	`share_tasks` integer DEFAULT false NOT NULL,
	`share_finance` integer DEFAULT false NOT NULL,
	`share_docs` integer DEFAULT false NOT NULL,
	`share_token` text,
	`archived_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `projects_slug_uq` ON `projects` (`slug`);--> statement-breakpoint
CREATE UNIQUE INDEX `projects_share_token_uq` ON `projects` (`share_token`);--> statement-breakpoint
CREATE INDEX `projects_client_idx` ON `projects` (`client_id`);--> statement-breakpoint
CREATE INDEX `projects_status_idx` ON `projects` (`status`);--> statement-breakpoint
CREATE TABLE `events` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`kind` text DEFAULT 'meeting' NOT NULL,
	`status` text DEFAULT 'confirmed' NOT NULL,
	`start_at` integer NOT NULL,
	`end_at` integer,
	`all_day` integer DEFAULT false NOT NULL,
	`location` text,
	`meeting_url` text,
	`project_id` text,
	`client_id` text,
	`task_id` text,
	`promised_at` integer,
	`color` text,
	`recurrence` text,
	`remind_minutes_before` integer,
	`reminded_at` integer,
	`attendees` text DEFAULT '[]' NOT NULL,
	`visible_to_client` integer DEFAULT false NOT NULL,
	`created_by` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`task_id`) REFERENCES `tasks`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `events_start_idx` ON `events` (`start_at`);--> statement-breakpoint
CREATE INDEX `events_kind_idx` ON `events` (`kind`);--> statement-breakpoint
CREATE INDEX `events_project_idx` ON `events` (`project_id`);--> statement-breakpoint
CREATE TABLE `tasks` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text,
	`parent_id` text,
	`title` text NOT NULL,
	`notes` text,
	`status` text DEFAULT 'inbox' NOT NULL,
	`priority` integer DEFAULT 0 NOT NULL,
	`due_at` integer,
	`due_all_day` integer DEFAULT true NOT NULL,
	`remind_at` integer,
	`reminded_at` integer,
	`completed_at` integer,
	`estimate_minutes` integer,
	`recurrence` text,
	`tags` text DEFAULT '[]' NOT NULL,
	`sort` real DEFAULT 0 NOT NULL,
	`assignee_id` text,
	`visible_to_client` integer DEFAULT false NOT NULL,
	`created_by` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`assignee_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `tasks_status_idx` ON `tasks` (`status`);--> statement-breakpoint
CREATE INDEX `tasks_project_idx` ON `tasks` (`project_id`);--> statement-breakpoint
CREATE INDEX `tasks_due_idx` ON `tasks` (`due_at`);--> statement-breakpoint
CREATE INDEX `tasks_remind_idx` ON `tasks` (`remind_at`);--> statement-breakpoint
CREATE TABLE `time_entries` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`project_id` text,
	`task_id` text,
	`description` text,
	`started_at` integer NOT NULL,
	`ended_at` integer,
	`billable` integer DEFAULT true NOT NULL,
	`hourly_rate_minor` integer,
	`currency` text,
	`invoice_id` text,
	`source` text DEFAULT 'timer' NOT NULL,
	`tags` text DEFAULT '[]' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`task_id`) REFERENCES `tasks`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `time_entries_user_started_idx` ON `time_entries` (`user_id`,`started_at`);--> statement-breakpoint
CREATE INDEX `time_entries_project_idx` ON `time_entries` (`project_id`,`started_at`);--> statement-breakpoint
CREATE INDEX `time_entries_running_idx` ON `time_entries` (`ended_at`);--> statement-breakpoint
CREATE TABLE `accounts` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`kind` text DEFAULT 'bank' NOT NULL,
	`currency` text DEFAULT 'IRT' NOT NULL,
	`opening_balance_minor` integer DEFAULT 0 NOT NULL,
	`color` text,
	`notes` text,
	`sort` real DEFAULT 0 NOT NULL,
	`archived` integer DEFAULT false NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `finance_categories` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`kind` text NOT NULL,
	`color` text,
	`icon` text,
	`parent_id` text,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `invoice_items` (
	`id` text PRIMARY KEY NOT NULL,
	`invoice_id` text NOT NULL,
	`description` text NOT NULL,
	`quantity` real DEFAULT 1 NOT NULL,
	`unit_price_minor` integer DEFAULT 0 NOT NULL,
	`amount_minor` integer DEFAULT 0 NOT NULL,
	`sort` real DEFAULT 0 NOT NULL,
	`time_entry_ids` text DEFAULT '[]' NOT NULL,
	FOREIGN KEY (`invoice_id`) REFERENCES `invoices`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `invoice_items_invoice_idx` ON `invoice_items` (`invoice_id`);--> statement-breakpoint
CREATE TABLE `invoices` (
	`id` text PRIMARY KEY NOT NULL,
	`number` text NOT NULL,
	`client_id` text,
	`project_id` text,
	`status` text DEFAULT 'draft' NOT NULL,
	`issue_date` integer NOT NULL,
	`due_date` integer,
	`currency` text DEFAULT 'IRT' NOT NULL,
	`subtotal_minor` integer DEFAULT 0 NOT NULL,
	`discount_minor` integer DEFAULT 0 NOT NULL,
	`tax_bps` integer DEFAULT 0 NOT NULL,
	`total_minor` integer DEFAULT 0 NOT NULL,
	`paid_minor` integer DEFAULT 0 NOT NULL,
	`notes` text,
	`terms` text,
	`share_token` text,
	`sent_at` integer,
	`viewed_at` integer,
	`paid_at` integer,
	`created_by` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `invoices_number_uq` ON `invoices` (`number`);--> statement-breakpoint
CREATE UNIQUE INDEX `invoices_share_token_uq` ON `invoices` (`share_token`);--> statement-breakpoint
CREATE INDEX `invoices_client_idx` ON `invoices` (`client_id`);--> statement-breakpoint
CREATE TABLE `transactions` (
	`id` text PRIMARY KEY NOT NULL,
	`kind` text NOT NULL,
	`account_id` text NOT NULL,
	`amount_minor` integer NOT NULL,
	`currency` text NOT NULL,
	`occurred_at` integer NOT NULL,
	`category_id` text,
	`project_id` text,
	`client_id` text,
	`counterparty` text,
	`description` text,
	`invoice_id` text,
	`transfer_account_id` text,
	`transfer_amount_minor` integer,
	`status` text DEFAULT 'cleared' NOT NULL,
	`tags` text DEFAULT '[]' NOT NULL,
	`attachment_id` text,
	`created_by` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`category_id`) REFERENCES `finance_categories`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`transfer_account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `tx_occurred_idx` ON `transactions` (`occurred_at`);--> statement-breakpoint
CREATE INDEX `tx_account_idx` ON `transactions` (`account_id`);--> statement-breakpoint
CREATE INDEX `tx_project_idx` ON `transactions` (`project_id`);--> statement-breakpoint
CREATE INDEX `tx_client_idx` ON `transactions` (`client_id`);--> statement-breakpoint
CREATE TABLE `contract_events` (
	`id` text PRIMARY KEY NOT NULL,
	`contract_id` text NOT NULL,
	`type` text NOT NULL,
	`ip` text,
	`user_agent` text,
	`meta` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`contract_id`) REFERENCES `contracts`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `contract_events_contract_idx` ON `contract_events` (`contract_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `contract_signatures` (
	`id` text PRIMARY KEY NOT NULL,
	`contract_id` text NOT NULL,
	`role` text DEFAULT 'client' NOT NULL,
	`name` text NOT NULL,
	`email` text,
	`signature_image` text,
	`typed_name` text,
	`content_hash` text NOT NULL,
	`version` integer NOT NULL,
	`ip` text,
	`user_agent` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`contract_id`) REFERENCES `contracts`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `contract_signatures_contract_idx` ON `contract_signatures` (`contract_id`);--> statement-breakpoint
CREATE TABLE `contracts` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`kind` text DEFAULT 'contract' NOT NULL,
	`client_id` text,
	`project_id` text,
	`body_md` text DEFAULT '' NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`require_signature` integer DEFAULT true NOT NULL,
	`share_token` text,
	`content_hash` text,
	`version` integer DEFAULT 1 NOT NULL,
	`signer_name` text,
	`signer_email` text,
	`sent_at` integer,
	`first_viewed_at` integer,
	`signed_at` integer,
	`declined_at` integer,
	`decline_reason` text,
	`expires_at` integer,
	`created_by` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `contracts_share_token_uq` ON `contracts` (`share_token`);--> statement-breakpoint
CREATE INDEX `contracts_client_idx` ON `contracts` (`client_id`);--> statement-breakpoint
CREATE TABLE `vault_items` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`type` text DEFAULT 'login' NOT NULL,
	`project_id` text,
	`client_id` text,
	`ciphertext` text NOT NULL,
	`iv` text NOT NULL,
	`favorite` integer DEFAULT false NOT NULL,
	`last_viewed_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `vault_items_user_idx` ON `vault_items` (`user_id`);--> statement-breakpoint
CREATE TABLE `vault_keys` (
	`user_id` text PRIMARY KEY NOT NULL,
	`kdf` text DEFAULT 'PBKDF2-SHA256' NOT NULL,
	`iterations` integer NOT NULL,
	`salt` text NOT NULL,
	`wrapped_key` text NOT NULL,
	`wrap_iv` text NOT NULL,
	`recovery_salt` text,
	`recovery_wrapped_key` text,
	`recovery_iv` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `docs` (
	`id` text PRIMARY KEY NOT NULL,
	`parent_id` text,
	`title` text NOT NULL,
	`icon` text,
	`content_md` text DEFAULT '' NOT NULL,
	`project_id` text,
	`client_id` text,
	`visibility` text DEFAULT 'private' NOT NULL,
	`sort` real DEFAULT 0 NOT NULL,
	`archived_at` integer,
	`created_by` text,
	`updated_by` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`updated_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `docs_parent_idx` ON `docs` (`parent_id`);--> statement-breakpoint
CREATE INDEX `docs_project_idx` ON `docs` (`project_id`);--> statement-breakpoint
CREATE TABLE `leads` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`phone` text,
	`company` text,
	`service` text,
	`budget` text,
	`message` text NOT NULL,
	`locale` text DEFAULT 'fa' NOT NULL,
	`source` text,
	`status` text DEFAULT 'new' NOT NULL,
	`client_id` text,
	`ip` text,
	`user_agent` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `leads_status_idx` ON `leads` (`status`,`created_at`);--> statement-breakpoint
CREATE TABLE `media` (
	`id` text PRIMARY KEY NOT NULL,
	`file_name` text NOT NULL,
	`original_name` text NOT NULL,
	`mime` text NOT NULL,
	`size` integer NOT NULL,
	`width` integer,
	`height` integer,
	`alt` text,
	`sha256` text NOT NULL,
	`is_public` integer DEFAULT true NOT NULL,
	`project_id` text,
	`uploaded_by` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`uploaded_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE TABLE `posts` (
	`id` text PRIMARY KEY NOT NULL,
	`type` text DEFAULT 'article' NOT NULL,
	`locale` text DEFAULT 'fa' NOT NULL,
	`translation_key` text,
	`slug` text NOT NULL,
	`title` text NOT NULL,
	`excerpt` text,
	`content_md` text DEFAULT '' NOT NULL,
	`cover_url` text,
	`cover_alt` text,
	`video_url` text,
	`status` text DEFAULT 'draft' NOT NULL,
	`published_at` integer,
	`featured` integer DEFAULT false NOT NULL,
	`series_id` text,
	`series_order` real,
	`project_id` text,
	`tags` text DEFAULT '[]' NOT NULL,
	`seo_title` text,
	`seo_description` text,
	`reading_minutes` integer,
	`meta` text DEFAULT '{}' NOT NULL,
	`sort` real DEFAULT 0 NOT NULL,
	`views` integer DEFAULT 0 NOT NULL,
	`author_id` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`author_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `posts_locale_type_slug_uq` ON `posts` (`locale`,`type`,`slug`);--> statement-breakpoint
CREATE INDEX `posts_status_published_idx` ON `posts` (`status`,`published_at`);--> statement-breakpoint
CREATE INDEX `posts_translation_idx` ON `posts` (`translation_key`);--> statement-breakpoint
CREATE TABLE `series` (
	`id` text PRIMARY KEY NOT NULL,
	`locale` text DEFAULT 'fa' NOT NULL,
	`slug` text NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`cover_url` text,
	`level` text,
	`status` text DEFAULT 'draft' NOT NULL,
	`sort` real DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `series_locale_slug_uq` ON `series` (`locale`,`slug`);--> statement-breakpoint
CREATE TABLE `syndications` (
	`id` text PRIMARY KEY NOT NULL,
	`post_id` text NOT NULL,
	`network` text NOT NULL,
	`direction` text DEFAULT 'outbound' NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`external_id` text,
	`external_url` text,
	`error` text,
	`posted_at` integer,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`post_id`) REFERENCES `posts`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `syndications_post_idx` ON `syndications` (`post_id`);--> statement-breakpoint
CREATE TABLE `testimonials` (
	`id` text PRIMARY KEY NOT NULL,
	`locale` text DEFAULT 'fa' NOT NULL,
	`author` text NOT NULL,
	`role` text,
	`company` text,
	`avatar_url` text,
	`quote` text NOT NULL,
	`rating` integer,
	`project_id` text,
	`client_id` text,
	`published` integer DEFAULT true NOT NULL,
	`sort` real DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE TABLE `activity_log` (
	`id` text PRIMARY KEY NOT NULL,
	`actor_id` text,
	`actor_type` text DEFAULT 'user' NOT NULL,
	`action` text NOT NULL,
	`entity_type` text NOT NULL,
	`entity_id` text,
	`summary` text,
	`meta` text,
	`ip` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`actor_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `activity_entity_idx` ON `activity_log` (`entity_type`,`entity_id`);--> statement-breakpoint
CREATE INDEX `activity_created_idx` ON `activity_log` (`created_at`);--> statement-breakpoint
CREATE TABLE `notifications` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`kind` text NOT NULL,
	`title` text NOT NULL,
	`body` text,
	`href` text,
	`read_at` integer,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `notifications_user_idx` ON `notifications` (`user_id`,`read_at`);--> statement-breakpoint
CREATE TABLE `settings` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL,
	`updated_at` integer NOT NULL
);
