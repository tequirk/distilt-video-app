import { eq } from "drizzle-orm";
import { useCallback } from "react";
import { channels, Channels } from "./schema";
import { useDb } from "./useDb";

/**
 * Hook to get all channels from the database
 */
export function useChannelsRepository() {
  const { db } = useDb();

  const getChannels = useCallback(async (): Promise<Channels[]> => {
    try {
      return await db.select().from(channels);
    } catch (error) {
      console.error("Error fetching channels:", error);
      return [];
    }
  }, [db]);

  const getActiveChannels = useCallback(async (): Promise<Channels[]> => {
    try {
      return await db.select().from(channels).where(eq(channels.paused, 0));
    } catch (error) {
      console.error("Error fetching active channels:", error);
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

  const pauseChannel = useCallback(
    async (channelId: string): Promise<boolean> => {
      try {
        await db
          .update(channels)
          .set({ paused: 1 })
          .where(eq(channels.id, channelId));
        return true;
      } catch (error) {
        console.error("Error pausing channel:", error);
        return false;
      }
    },
    [db]
  );

  const unpauseChannel = useCallback(
    async (channelId: string): Promise<boolean> => {
      try {
        await db
          .update(channels)
          .set({ paused: 0 })
          .where(eq(channels.id, channelId));
        return true;
      } catch (error) {
        console.error("Error unpausing channel:", error);
        return false;
      }
    },
    [db]
  );

  return {
    getChannels,
    getActiveChannels,
    addChannel,
    removeChannel,
    channelExists,
    pauseChannel,
    unpauseChannel,
  };
}
