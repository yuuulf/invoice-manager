CREATE TABLE `ledger_entries` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`invoice_number` text NOT NULL,
	`issue_date` text NOT NULL,
	`client_name` text NOT NULL,
	`subject` text NOT NULL,
	`total` integer NOT NULL,
	`snapshot` text NOT NULL,
	`seal` blob,
	`confirmed_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `ledger_entries_invoice_number_unique` ON `ledger_entries` (`invoice_number`);