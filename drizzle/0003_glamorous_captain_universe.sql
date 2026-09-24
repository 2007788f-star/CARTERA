CREATE TABLE `import_batches` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`imported_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `source_entries` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`source` text NOT NULL,
	`source_cell` text NOT NULL,
	`loan_id` text,
	`kind` text NOT NULL,
	`value` text NOT NULL,
	FOREIGN KEY (`loan_id`) REFERENCES `loans`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
ALTER TABLE `loans` ADD `source_ref` text;--> statement-breakpoint
ALTER TABLE `loans` ADD `schedule_known` integer DEFAULT 1 NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX `loans_source_ref_unique` ON `loans` (`source_ref`);--> statement-breakpoint
ALTER TABLE `payments` ADD `source_ref` text;--> statement-breakpoint
CREATE UNIQUE INDEX `payments_source_ref_unique` ON `payments` (`source_ref`);