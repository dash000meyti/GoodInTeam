CREATE TABLE `fx_rates` (
	`id` text PRIMARY KEY NOT NULL,
	`currency` text NOT NULL,
	`base` text NOT NULL,
	`rate` real NOT NULL,
	`date` integer NOT NULL,
	`source` text DEFAULT 'manual' NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `fx_rates_pair_date_uq` ON `fx_rates` (`currency`,`base`,`date`);--> statement-breakpoint
ALTER TABLE `contracts` ADD `is_template` integer DEFAULT false NOT NULL;