import { useCallback } from "react";
import { useVideosRepository } from "../data/useVideosRepository";
import { useVideoSync } from "./videoSyncService";
import { YouTubeVideo } from "./youtubeService";

/**
 * Hook to get videos from database with background sync
 */
export function useVideos() {
  const { getAllVideos } = useVideosRepository();
  const { syncAllChannels } = useVideoSync();

  const getVideos = useCallback(async (): Promise<YouTubeVideo[]> => {
    try {
      // Always check database first
      const dbVideos = await getAllVideos();

      // If database is empty, do initial sync before returning
      if (dbVideos.length === 0) {
        console.log("Database is empty, performing initial sync...");
        await syncAllChannels();
        // Return videos after initial sync
        return await getAllVideos();
      }

      // Database has videos, return them and sync in background
      syncAllChannels().catch((error) => {
        console.error("Background sync failed:", error);
      });

      return dbVideos;
    } catch (error) {
      console.error("Error fetching videos:", error);
      return [];
    }
  }, [getAllVideos, syncAllChannels]);

  /**
   * Force refresh: sync first, then return updated data
   */
  const refreshVideos = useCallback(async (): Promise<YouTubeVideo[]> => {
    try {
      // First, sync all channels
      await syncAllChannels();

      // Then return updated videos from database
      return await getAllVideos();
    } catch (error) {
      console.error("Error refreshing videos:", error);
      return [];
    }
  }, [getAllVideos, syncAllChannels]);

  return { getVideos, refreshVideos };
}
