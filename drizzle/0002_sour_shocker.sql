PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_videos` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`img` text NOT NULL,
	`dateTime` text NOT NULL,
	`channelId` text,
	`channelTitle` text NOT NULL,
	`watchProgress` integer DEFAULT 0 NOT NULL,
	`createdAt` text NOT NULL,
	`updatedAt` text NOT NULL,
	FOREIGN KEY (`channelId`) REFERENCES `channels`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_videos`("id", "title", "img", "dateTime", "channelId", "channelTitle", "watchProgress", "createdAt", "updatedAt") SELECT "id", "title", "img", "dateTime", "channelId", "channelTitle", "watchProgress", "createdAt", "updatedAt" FROM `videos`;--> statement-breakpoint
DROP TABLE `videos`;--> statement-breakpoint
ALTER TABLE `__new_videos` RENAME TO `videos`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE INDEX `videos_channel_date_idx` ON `videos` (`channelId`,`dateTime`);--> statement-breakpoint
CREATE INDEX `videos_date_idx` ON `videos` (`dateTime`);