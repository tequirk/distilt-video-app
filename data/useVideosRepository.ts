import { desc, eq, inArray } from "drizzle-orm";
import { useCallback } from "react";
import { YouTubeVideo } from "../services/youtubeService";
import { videos } from "./schema";
import { useDb } from "./useDb";

/**
 * Hook for video database operations
 */
export function useVideosRepository() {
  const { db } = useDb();

  /**
   * Get all videos from database, sorted by date (newest first)
   */
  const getAllVideos = useCallback(async (): Promise<YouTubeVideo[]> => {
    try {
      const result = await db
        .select()
        .from(videos)
        .orderBy(desc(videos.dateTime));

      return result.map((videoFromDb) => ({
        id: videoFromDb.id,
        title: videoFromDb.title,
        img: videoFromDb.img,
        dateTime: new Date(videoFromDb.dateTime),
        channelTitle: videoFromDb.channelTitle,
        channelId: videoFromDb.channelId || "unknown",
        watchProgress: videoFromDb.watchProgress,
        duration: videoFromDb.duration,
      }));
    } catch (error) {
      console.error("Error fetching videos from database:", error);
      return [];
    }
  }, [db]);

  /**
   * Get the most recent video date for a channel (for incremental sync)
   */
  const getLatestVideoDateForChannel = useCallback(
    async (channelId: string): Promise<Date | null> => {
      try {
        const result = await db
          .select({ dateTime: videos.dateTime })
          .from(videos)
          .where(eq(videos.channelId, channelId))
          .orderBy(desc(videos.dateTime))
          .limit(1);

        return result.length > 0 ? new Date(result[0].dateTime) : null;
      } catch (error) {
        console.error(
          `Error getting latest video date for channel ${channelId}:`,
          error
        );
        return null;
      }
    },
    [db]
  );

  /**
   * Insert or update videos (upsert operation)
   */
  const upsertVideos = useCallback(
    async (videosToSave: YouTubeVideo[]): Promise<void> => {
      try {
        if (videosToSave.length === 0) return;

        // First, check which videos already exist by ID
        const existingVideoIds = await db
          .select({ id: videos.id })
          .from(videos)
          .where(
            inArray(
              videos.id,
              videosToSave.map((v) => v.id)
            )
          );

        const existingIds = new Set(existingVideoIds.map((v) => v.id));

        // Also check for videos with the same title (potential duplicates)
        const existingVideoTitles = await db
          .select({ title: videos.title, dateTime: videos.dateTime })
          .from(videos)
          .where(
            inArray(
              videos.title,
              videosToSave.map((v) => v.title)
            )
          );

        const existingTitles = new Map(
          existingVideoTitles.map((v) => [v.title, new Date(v.dateTime)])
        );

        const now = new Date().toISOString();

        // Separate new videos from updates, and filter out title duplicates
        const newVideos = videosToSave.filter((v) => {
          if (existingIds.has(v.id)) return false;

          const existingDate = existingTitles.get(v.title);
          if (existingDate && v.dateTime >= existingDate) {
            // Skip if we already have this title and the existing one is older or same age
            console.log(`Skipping duplicate video with title: "${v.title}"`);
            return false;
          }

          return true;
        });

        const updatedVideos = videosToSave.filter((v) => existingIds.has(v.id));

        // Insert new videos
        if (newVideos.length > 0) {
          await db.insert(videos).values(
            newVideos.map((video) => ({
              id: video.id,
              title: video.title,
              img: video.img,
              dateTime: video.dateTime.toISOString(),
              channelId: video.channelId,
              channelTitle: video.channelTitle,
              duration: video.duration || 0,
              createdAt: now,
              updatedAt: now,
            }))
          );
          console.log(`Inserted ${newVideos.length} new videos`);
        }

        // Update existing videos if needed
        if (updatedVideos.length > 0) {
          for (const video of updatedVideos) {
            await db
              .update(videos)
              .set({
                title: video.title,
                img: video.img,
                dateTime: video.dateTime.toISOString(),
                channelTitle: video.channelTitle,
                duration: video.duration || 0,
                updatedAt: now,
              })
              .where(eq(videos.id, video.id));
          }
          console.log(`Updated ${updatedVideos.length} existing videos`);
        }
      } catch (error) {
        console.error("Error upserting videos:", error);
        throw error;
      }
    },
    [db]
  );

  /**
   * Get video count by channel
   */
  const updateVideoProgress = useCallback(
    async (videoId: string, progressSeconds: number): Promise<void> => {
      try {
        console.log(
          `Updating video ${videoId} progress to ${progressSeconds}s`
        );
        await db
          .update(videos)
          .set({
            watchProgress: progressSeconds,
          })
          .where(eq(videos.id, videoId));

        console.log(`Updated video ${videoId} progress to ${progressSeconds}s`);
      } catch (error) {
        console.error(`Error updating video progress for ${videoId}:`, error);
      }
    },
    [db]
  );

  /**
   * Update video duration
   */
  const updateVideoDuration = useCallback(
    async (videoId: string, durationSeconds: number): Promise<void> => {
      try {
        console.log(
          `Updating video ${videoId} duration to ${durationSeconds}s`
        );
        await db
          .update(videos)
          .set({
            duration: durationSeconds,
          })
          .where(eq(videos.id, videoId));

        console.log(`Updated video ${videoId} duration to ${durationSeconds}s`);
      } catch (error) {
        console.error(`Error updating video duration for ${videoId}:`, error);
      }
    },
    [db]
  );

  /**
   * Get video watch progress
   */
  const markVideoAsWatched = useCallback(
    async (videoId: string): Promise<void> => {
      try {
        // First get the video's current duration
        const result = await db
          .select({ duration: videos.duration })
          .from(videos)
          .where(eq(videos.id, videoId))
          .limit(1);

        if (result.length === 0) {
          console.error(`Video ${videoId} not found`);
          return;
        }

        const duration = result[0].duration;

        // If duration is 0 or null, set a reasonable default (assume it's watched)
        const watchProgress = duration > 0 ? duration : 1;

        console.log(
          `Marking video ${videoId} as watched (progress: ${watchProgress}s)`
        );

        await db
          .update(videos)
          .set({
            watchProgress: watchProgress,
            duration: watchProgress,
            updatedAt: new Date().toISOString(),
          })
          .where(eq(videos.id, videoId));

        console.log(`Successfully marked video ${videoId} as watched`);
      } catch (error) {
        console.error(`Error marking video ${videoId} as watched:`, error);
      }
    },
    [db]
  );

  /**
   * Mark a video as unwatched by setting watchProgress to 0
   */
  const markVideoAsUnwatched = useCallback(
    async (videoId: string): Promise<void> => {
      try {
        console.log(`Marking video ${videoId} as unwatched (progress: 0s)`);

        await db
          .update(videos)
          .set({
            watchProgress: 0,
            updatedAt: new Date().toISOString(),
          })
          .where(eq(videos.id, videoId));

        console.log(`Successfully marked video ${videoId} as unwatched`);
      } catch (error) {
        console.error(`Error marking video ${videoId} as unwatched:`, error);
      }
    },
    [db]
  );

  return {
    getAllVideos,
    getLatestVideoDateForChannel,
    upsertVideos,
    updateVideoProgress,
    updateVideoDuration,
    markVideoAsWatched,
    markVideoAsUnwatched,
  };
}
