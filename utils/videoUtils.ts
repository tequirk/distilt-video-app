import { YouTubeVideo } from "@/services/youtubeService";

/**
 * Threshold in seconds to consider a video "watched" when close to the end
 * For example, if a video is 10 minutes (600s) and user watched 590s, it's considered watched
 */
const WATCHED_THRESHOLD_SECONDS = 30;

/**
 * Determines if a video is considered "watched" based on watch progress and duration
 * A video is considered watched if:
 * 1. watchProgress equals or exceeds duration (explicitly marked as watched)
 * 2. watchProgress is within WATCHED_THRESHOLD_SECONDS of duration (nearly finished)
 *
 * @param video The YouTube video object
 * @returns boolean indicating if the video is considered watched
 */
export function isVideoWatched(video: YouTubeVideo): boolean {
  // If we don't have both watchProgress and duration, it's not watched
  if (!video.watchProgress || !video.duration || video.duration <= 0) {
    return false;
  }

  // If watchProgress equals or exceeds duration, it's watched
  if (video.watchProgress >= video.duration) {
    return true;
  }

  // If watchProgress is within threshold of duration, it's watched
  const remainingTime = video.duration - video.watchProgress;
  return remainingTime <= WATCHED_THRESHOLD_SECONDS;
}

/**
 * Calculates the watch progress percentage (0.0 to 1.0)
 *
 * @param video The YouTube video object
 * @returns number between 0.0 and 1.0 representing watch progress percentage
 */
export function getVideoProgressPercentage(video: YouTubeVideo): number {
  if (!video.duration || video.duration <= 0 || !video.watchProgress) {
    return 0;
  }

  return Math.min(video.watchProgress / video.duration, 1.0);
}

/**
 * Filters videos to show only unwatched ones
 *
 * @param videos Array of YouTube videos
 * @returns Array of unwatched videos
 */
export function filterUnwatchedVideos(videos: YouTubeVideo[]): YouTubeVideo[] {
  return videos.filter((video) => !isVideoWatched(video));
}
