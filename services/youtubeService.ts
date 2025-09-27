import { XMLParser } from "fast-xml-parser";

export interface YouTubeVideo {
  id: string;
  title: string;
  img: string;
  dateTime: Date;
  channelTitle: string;
  channelId: string;
  watchProgress: number | null;
}

interface RSSEntry {
  "yt:videoId": string;
  "yt:channelId": string;
  title: string;
  published: string;
  author: {
    name: string;
    uri: string;
  };
  "media:group": {
    "media:title": string;
    "media:thumbnail": {
      "@_url": string;
    };
  };
}

interface RSSFeed {
  feed: {
    entry: RSSEntry | RSSEntry[];
  };
}

/**
 * Removes duplicate videos based on title, keeping the oldest published entry
 * @param videos Array of videos to deduplicate
 * @returns YouTubeVideo[] Array with duplicates removed
 */
function removeDuplicateVideos(videos: YouTubeVideo[]): YouTubeVideo[] {
  const seenTitles = new Map<string, YouTubeVideo>();

  for (const video of videos) {
    const normalizedTitle = video.title.trim().toLowerCase();
    const existing = seenTitles.get(normalizedTitle);

    if (!existing || video.dateTime < existing.dateTime) {
      // Keep this video if it's the first we've seen with this title
      // or if it was published earlier than the existing one
      seenTitles.set(normalizedTitle, video);
    }
  }

  return Array.from(seenTitles.values());
}

/**
 * Fetches videos from a YouTube channel's RSS feed
 * @param channelId The YouTube channel ID
 * @returns Promise<YouTubeVideo[]> Array of videos from the channel
 */
export async function fetchChannelVideos(
  channelId: string
): Promise<YouTubeVideo[]> {
  try {
    const rssUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`;
    const response = await fetch(rssUrl);

    if (!response.ok) {
      throw new Error(`Failed to fetch RSS feed: ${response.status}`);
    }

    const xmlData = await response.text();
    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: "@_",
    });

    const result: RSSFeed = parser.parse(xmlData);

    if (!result.feed?.entry) {
      return [];
    }

    // Handle both single entry and array of entries
    const entries = Array.isArray(result.feed.entry)
      ? result.feed.entry
      : [result.feed.entry];

    // Map entries to YouTubeVideo objects
    const videos = entries.map(
      (entry: RSSEntry): YouTubeVideo => ({
        id: entry["yt:videoId"],
        title: entry.title,
        img: entry["media:group"]["media:thumbnail"]["@_url"],
        dateTime: new Date(entry.published),
        channelTitle: entry.author.name,
        channelId: entry["yt:channelId"],
        watchProgress: null,
      })
    );

    // Remove duplicates - keep the oldest published entry
    return removeDuplicateVideos(videos);
  } catch (error) {
    console.error(`Error fetching videos for channel ${channelId}:`, error);
    return [];
  }
}

/**
 * Fetches videos from multiple YouTube channels
 * @param channelIds Array of YouTube channel IDs
 * @returns Promise<YouTubeVideo[]> Array of videos from all channels, sorted by date
 */
export async function fetchVideosFromChannels(
  channelIds: string[]
): Promise<YouTubeVideo[]> {
  try {
    const promises = channelIds.map((channelId) =>
      fetchChannelVideos(channelId)
    );
    const results = await Promise.all(promises);

    // Flatten the arrays and sort by date (newest first)
    const allVideos = results.flat();
    return allVideos.sort(
      (a, b) => b.dateTime.getTime() - a.dateTime.getTime()
    );
  } catch (error) {
    console.error("Error fetching videos from multiple channels:", error);
    return [];
  }
}

/**
 * Fetches channel information from RSS feed to get the channel title
 * @param channelId The YouTube channel ID
 * @returns Promise<{id: string, title: string} | null> Channel info or null if failed
 */
export async function fetchChannelInfo(
  channelId: string
): Promise<{ id: string; title: string } | null> {
  try {
    const videos = await fetchChannelVideos(channelId);
    if (videos.length > 0) {
      return {
        id: channelId,
        title: videos[0].channelTitle,
      };
    }
    return null;
  } catch (error) {
    console.error(`Error fetching channel info for ${channelId}:`, error);
    return null;
  }
}

/**
 * Extracts channel ID from YouTube channel URLs or validates direct channel IDs
 * @param input The YouTube channel URL or direct channel ID
 * @returns string | null The extracted channel ID or null if invalid
 */
export function extractChannelId(input: string): string | null {
  if (!input || typeof input !== "string") {
    return null;
  }

  const trimmedInput = input.trim();

  // Direct channel ID (starts with UC and is 24 characters)
  if (/^UC[a-zA-Z0-9_-]{22}$/.test(trimmedInput)) {
    return trimmedInput;
  }

  // Only accept specific YouTube channel URL pattern
  // https://www.youtube.com/channel/UC1yBKRuGpC1tSM73A0ZjYjQ
  const channelUrlPattern =
    /(?:https?:\/\/)?(?:www\.)?youtube\.com\/channel\/(UC[a-zA-Z0-9_-]{22})/i;
  const match = trimmedInput.match(channelUrlPattern);

  if (match) {
    return match[1];
  }

  return null;
}

/**
 * Validates if a channel ID exists and is accessible
 * @param channelId The YouTube channel ID
 * @returns Promise<boolean> True if channel exists and is accessible
 */
export async function validateChannelId(channelId: string): Promise<boolean> {
  try {
    const rssUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`;
    const response = await fetch(rssUrl);
    return response.ok;
  } catch (error) {
    console.error(`Error validating channel ${channelId}:`, error);
    return false;
  }
}
