import { eq } from "drizzle-orm";
import { useCallback } from "react";
import { channels, Channels } from "./schema";
import { useDb } from "./useDb";

/**
 * Hook to get all channels from the database
 */
export function useChannels() {
  const { db } = useDb();

  const getChannels = useCallback(async (): Promise<Channels[]> => {
    try {
      return await db.select().from(channels);
    } catch (error) {
      console.error("Error fetching channels:", error);
      return [];
    }
  }, [db]);

  const addChannel = useCallback(
    async (channelId: string, title: string): Promise<boolean> => {
      try {
        await db.insert(channels).values({
          id: channelId,
          title: title,
        });
        return true;
      } catch (error) {
        console.error("Error adding channel:", error);
        return false;
      }
    },
    [db]
  );

  const removeChannel = useCallback(
    async (channelId: string): Promise<boolean> => {
      try {
        await db.delete(channels).where(eq(channels.id, channelId));
        return true;
      } catch (error) {
        console.error("Error removing channel:", error);
        return false;
      }
    },
    [db]
  );

  const channelExists = useCallback(
    async (channelId: string): Promise<boolean> => {
      try {
        const result = await db
          .select()
          .from(channels)
          .where(eq(channels.id, channelId));
        return result.length > 0;
      } catch (error) {
        console.error("Error checking channel existence:", error);
        return false;
      }
    },
    [db]
  );

  return { getChannels, addChannel, removeChannel, channelExists };
}

/**
 * Hook to get videos for a specific channel
 */
export function useChannelVideos(channelId: string) {
  const { db } = useDb();

  const getChannelInfo = useCallback(async (): Promise<Channels | null> => {
    try {
      const result = await db
        .select()
        .from(channels)
        .where(eq(channels.id, channelId));
      return result[0] || null;
    } catch (error) {
      console.error(`Error fetching channel ${channelId}:`, error);
      return null;
    }
  }, [db, channelId]);

  return { getChannelInfo };
}
