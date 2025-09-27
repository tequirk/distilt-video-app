import { InferSelectModel } from "drizzle-orm";
import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

////////////////////////////////////////
// Channels
////////////////////////////////////////

/**
 * Channels
 */
export const channels = sqliteTable("channels", {
  id: text("id").primaryKey(),
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
export const videos = sqliteTable(
  "videos",
  {
    id: text("id").primaryKey(),
    title: text("title").notNull(),
    img: text("img").notNull(),
    dateTime: text("dateTime").notNull(), // Store as ISO string
    channelId: text("channelId").references(() => channels.id),
    channelTitle: text("channelTitle").notNull(), // Denormalized for easier queries
    watchProgress: integer("watchProgress").notNull().default(0), // Store watch progress in seconds as string (can be null)
    duration: integer("duration").notNull().default(0), // Store video duration in seconds
    createdAt: text("createdAt")
      .notNull()
      .$defaultFn(() => new Date().toISOString()), // When we first stored this video
    updatedAt: text("updatedAt")
      .notNull()
      .$defaultFn(() => new Date().toISOString()), // Last time we updated this record
  },
  (table) => [
    // Index for fast queries by channel and date
    index("videos_channel_date_idx").on(table.channelId, table.dateTime),
    // Index for fast queries by date across all channels
    index("videos_date_idx").on(table.dateTime),
  ]
);

/**
 * Videos from channels
 */
export type Videos = InferSelectModel<typeof videos>;
