import { InferSelectModel } from "drizzle-orm";
import { sqliteTable, text } from "drizzle-orm/sqlite-core";

////////////////////////////////////////
// Channels
////////////////////////////////////////

/**
 * Channels
 */
export const channels = sqliteTable("channels", {
  id: text("id").primaryKey(),
  url: text("url").notNull(),
  title: text("title").notNull(),
});

/**
 * Channels
 */
export type Channels = InferSelectModel<typeof channels>;

////////////////////////////////////////
// Videos
////////////////////////////////////////

/**
 * Videos from channels
 */
export const videos = sqliteTable("videos", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  img: text("img").notNull(),
  dateTime: text("dateTime").notNull(), // Store as ISO string
  channelId: text("channelId").references(() => channels.id),
});

/**
 * Videos from channels
 */
export type Videos = InferSelectModel<typeof videos>;
