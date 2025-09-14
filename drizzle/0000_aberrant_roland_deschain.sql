CREATE TABLE `channels` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `videos` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`img` text NOT NULL,
	`dateTime` text NOT NULL,
	`channelId` text,
	`channelTitle` text NOT NULL,
	`createdAt` text NOT NULL,
	`updatedAt` text NOT NULL,
	FOREIGN KEY (`channelId`) REFERENCES `channels`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `videos_channel_date_idx` ON `videos` (`channelId`,`dateTime`);--> statement-breakpoint
CREATE INDEX `videos_date_idx` ON `videos` (`dateTime`);