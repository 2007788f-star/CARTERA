CREATE TABLE `loans` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`name` text NOT NULL,
	`phone` text NOT NULL,
	`principal` real NOT NULL,
	`interest_mode` text NOT NULL,
	`rate` real NOT NULL,
	`installment` real NOT NULL,
	`first_due` text NOT NULL,
	`frequency_days` integer NOT NULL,
	`notes` text NOT NULL,
	`consent` integer NOT NULL,
	`reminder_days` integer NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `payments` (
	`id` text PRIMARY KEY NOT NULL,
	`loan_id` text NOT NULL,
	`owner` text NOT NULL,
	`amount` real NOT NULL,
	`paid_at` text NOT NULL,
	`note` text NOT NULL,
	FOREIGN KEY (`loan_id`) REFERENCES `loans`(`id`) ON UPDATE no action ON DELETE no action
);
