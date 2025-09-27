import { useCallback } from "react";
import { useChannelsRepository } from "../data/useChannelsRepository";
import { useVideosRepository } from "../data/useVideosRepository";
import { fetchChannelVideos } from "./youtubeService";

/**
 * Hook for syncing videos from RSS feeds to database
 */
export function useVideoSync() {
  const { upsertVideos, getLatestVideoDateForChannel } = useVideosRepository();
  const { getChannels } = useChannelsRepository();

  /**
   * Sync videos for a specific channel (incremental)
   * Only fetches videos newer than what we already have
   */
  const syncChannelVideos = useCallback(
    async (channelId: string): Promise<number> => {
      try {
        console.log(`Starting sync for channel: ${channelId}`);

        // Get the latest video date we have for this channel
        const latestDate = await getLatestVideoDateForChannel(channelId);

        // Fetch all videos from RSS (YouTube RSS returns last ~15 videos)
        const rssVideos = await fetchChannelVideos(channelId);

        if (rssVideos.length === 0) {
          console.log(`No videos found in RSS for channel: ${channelId}`);
          return 0;
        }

        // Filter to only new videos (if we have existing videos)
        let newVideos = rssVideos;
        if (latestDate) {
          newVideos = rssVideos.filter((video) => video.dateTime > latestDate);
          console.log(
            `Found ${
              newVideos.length
            } new videos since ${latestDate.toISOString()}`
          );
        } else {
          console.log(
            `First sync for channel ${channelId}: storing all ${newVideos.length} videos`
          );
        }

        if (newVideos.length > 0) {
          await upsertVideos(newVideos);
          console.log(
            `Successfully synced ${newVideos.length} videos for channel: ${channelId}`
          );
        }

        return newVideos.length;
      } catch (error) {
        console.error(`Error syncing channel ${channelId}:`, error);
        return 0;
      }
    },
    [getLatestVideoDateForChannel, upsertVideos]
  );

  /**
   * Sync videos for all channels
   */
  const syncAllChannels = useCallback(async (): Promise<{
    total: number;
    byChannel: { [channelId: string]: number };
  }> => {
    try {
      console.log("Starting sync for all channels...");

      // Get all channels from database
      const channels = await getChannels();

      if (channels.length === 0) {
        console.log("No channels found in database");
        return { total: 0, byChannel: {} };
      }

      console.log(`Syncing ${channels.length} channels...`);

      // Sync each channel in parallel
      const syncPromises = channels.map(async (channel) => {
        const count = await syncChannelVideos(channel.id);
        return { channelId: channel.id, count };
      });

      const results = await Promise.all(syncPromises);

      // Calculate totals
      const byChannel: { [channelId: string]: number } = {};
      let total = 0;

      results.forEach(({ channelId, count }) => {
        byChannel[channelId] = count;
        total += count;
      });

      console.log(
        `Sync complete: ${total} new videos across ${channels.length} channels`
      );
      return { total, byChannel };
    } catch (error) {
      console.error("Error syncing all channels:", error);
      return { total: 0, byChannel: {} };
    }
  }, [getChannels, syncChannelVideos]);

  /**
   * Force full resync (ignores latest dates, fetches all available videos)
   */
  const forceFullSync = useCallback(async (): Promise<number> => {
    try {
      console.log("Starting force full sync...");

      const channels = await getChannels();
      let totalVideos = 0;

      for (const channel of channels) {
        console.log(`Force syncing channel: ${channel.id}`);
        const rssVideos = await fetchChannelVideos(channel.id);

        if (rssVideos.length > 0) {
          await upsertVideos(rssVideos);
          totalVideos += rssVideos.length;
          console.log(
            `Force synced ${rssVideos.length} videos for channel: ${channel.id}`
          );
        }
      }

      console.log(`Force sync complete: processed ${totalVideos} videos`);
      return totalVideos;
    } catch (error) {
      console.error("Error in force full sync:", error);
      return 0;
    }
  }, [getChannels, upsertVideos]);

  return {
    syncChannelVideos,
    syncAllChannels,
    forceFullSync,
  };
}
