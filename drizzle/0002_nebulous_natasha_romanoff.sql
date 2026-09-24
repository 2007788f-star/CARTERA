ALTER TABLE `loans` ADD `due_mode` text DEFAULT 'interval' NOT NULL;--> statement-breakpoint
ALTER TABLE `loans` ADD `monthly_charge` real DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `payments` ADD `allocation` text DEFAULT 'combined' NOT NULL;