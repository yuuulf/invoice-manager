CREATE TABLE `clients` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`code` text NOT NULL,
	`department` text,
	`contact_name` text,
	`payment_term_type` text DEFAULT 'next_month_end' NOT NULL,
	`payment_term_day` integer,
	`fee_bearer` text DEFAULT 'none' NOT NULL,
	`rounding` text DEFAULT 'floor' NOT NULL,
	`archived_at` integer,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `clients_code_unique` ON `clients` (`code`);