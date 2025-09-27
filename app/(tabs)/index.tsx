import { Ionicons } from "@expo/vector-icons";
import { GlassStyle, GlassView } from "expo-glass-effect";
import { router } from "expo-router";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ActionSheetIOS,
  Alert,
  Animated,
  Image,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  useColorScheme,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { useVideoRefresh } from "@/contexts/videoRefreshContext";
import { channels } from "@/data/schema";
import { useChannelsRepository } from "@/data/useChannelsRepository";
import { useDb } from "@/data/useDb";
import { useVideosRepository } from "@/data/useVideosRepository";
import { useThemeColor } from "@/hooks/use-theme-color";
import { useVideos } from "@/services/videoService";
import { YouTubeVideo } from "@/services/youtubeService";
import {
  filterUnwatchedVideos,
  getVideoProgressPercentage,
  isVideoWatched,
} from "@/utils/videoUtils";

// Memoized video item component for performance
const VideoItem = React.memo(
  ({
    item,
    onPress,
    onLongPress,
    textColor,
    secondaryTextColor,
    cardBackgroundColor,
    tintColor,
    glassStyle,
  }: {
    item: YouTubeVideo;
    onPress: (video: YouTubeVideo) => void;
    onLongPress: (video: YouTubeVideo) => void;
    textColor: string;
    secondaryTextColor: string;
    cardBackgroundColor: string;
    tintColor: string;
    glassStyle: GlassStyle;
  }) => {
    // Calculate progress percentage (0.0 to 1.0)
    const progressPercentage = getVideoProgressPercentage(item);

    // Check if video is watched
    const watched = isVideoWatched(item);

    return (
      <TouchableOpacity
        style={[styles.videoItem, watched && styles.watchedVideoItem]}
        onPress={() => onPress(item)}
        onLongPress={() => onLongPress(item)}
        activeOpacity={0.7}
      >
        <ThemedView style={styles.videoCard}>
          <View style={styles.imageContainer}>
            <Image
              source={{ uri: item.img }}
              style={[styles.videoImage, watched && styles.watchedVideoImage]}
            />
          </View>

          {/* Progress bar */}
          {progressPercentage > 0 && (
            <View
              style={[
                styles.progressBarContainer,
                { backgroundColor: cardBackgroundColor },
              ]}
            >
              <GlassView
                style={[
                  styles.progressBarFill,
                  {
                    width: `${progressPercentage * 100}%`,
                    backgroundColor: tintColor,
                  },
                ]}
                glassEffectStyle={glassStyle}
              />
            </View>
          )}

          <ThemedView
            style={[styles.videoInfo, { backgroundColor: cardBackgroundColor }]}
          >
            <ThemedText
              style={[
                styles.videoTitle,
                { color: watched ? secondaryTextColor : textColor },
              ]}
              numberOfLines={2}
            >
              {item.title}
            </ThemedText>
            <ThemedText
              style={[styles.channelTitle, { color: secondaryTextColor }]}
              numberOfLines={1}
            >
              {item.channelTitle}
            </ThemedText>
          </ThemedView>
        </ThemedView>
      </TouchableOpacity>
    );
  }
);

VideoItem.displayName = "VideoItem";

// Memoized filter button component for performance
const FilterButton = React.memo(
  ({
    title,
    icon,
    isSelected,
    onPress,
    tintColor,
    textColor,
    cardBackgroundColor,
    glassEffectStyle,
  }: {
    title?: string;
    icon?: keyof typeof Ionicons.glyphMap;
    isSelected: boolean;
    onPress: () => void;
    tintColor: string;
    textColor: string;
    cardBackgroundColor: string;
    glassEffectStyle: GlassStyle;
  }) => (
    <GlassView
      style={[
        styles.filterButton,
        {
          backgroundColor: isSelected ? tintColor : cardBackgroundColor,
          overflow: "hidden",
        },
      ]}
      glassEffectStyle={glassEffectStyle}
    >
      <Pressable onPress={onPress}>
        {icon ? (
          <Ionicons
            name={icon}
            size={24}
            color={isSelected ? "#FFFFFF" : textColor}
          />
        ) : (
          <ThemedText
            style={[
              styles.filterText,
              {
                color: isSelected ? "#FFFFFF" : textColor,
              },
            ]}
          >
            {title}
          </ThemedText>
        )}
      </Pressable>
    </GlassView>
  )
);

FilterButton.displayName = "FilterButton";

// Memoized filter list component with integrated watched filter
const ChannelFilterList = React.memo(
  ({
    channelList,
    selectedChannel,
    onChannelSelect,
    showUnwatchedOnly,
    onWatchedFilterToggle,
    tintColor,
    textColor,
    cardBackgroundColor,
    glassEffectStyle,
  }: {
    channelList: { id: string; title: string }[];
    selectedChannel: string;
    onChannelSelect: (channel: string) => void;
    showUnwatchedOnly: boolean;
    onWatchedFilterToggle: () => void;
    tintColor: string;
    textColor: string;
    cardBackgroundColor: string;
    glassEffectStyle: GlassStyle;
  }) => {
    if (channelList.length === 0) {
      return null; // Don't render anything if there are no channels
    }
    return (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterContainer}
        contentContainerStyle={styles.filterContentContainer}
      >
        {/* Filter toggle button first */}
        <FilterButton
          icon="filter"
          isSelected={showUnwatchedOnly}
          onPress={onWatchedFilterToggle}
          tintColor={tintColor}
          textColor={textColor}
          cardBackgroundColor={cardBackgroundColor}
          glassEffectStyle={glassEffectStyle}
        />

        {/* All button */}
        <FilterButton
          title="All"
          isSelected={selectedChannel === "All"}
          onPress={() => onChannelSelect("All")}
          tintColor={tintColor}
          textColor={textColor}
          cardBackgroundColor={cardBackgroundColor}
          glassEffectStyle={glassEffectStyle}
        />

        {/* Channel buttons */}
        {channelList.length > 0 &&
          channelList.map((channel) => (
            <FilterButton
              key={channel.id}
              title={channel.title}
              isSelected={selectedChannel === channel.title}
              onPress={() => onChannelSelect(channel.title)}
              tintColor={tintColor}
              textColor={textColor}
              cardBackgroundColor={cardBackgroundColor}
              glassEffectStyle={glassEffectStyle}
            />
          ))}
      </ScrollView>
    );
  }
);

ChannelFilterList.displayName = "ChannelFilterList";

export default function HomeScreen() {
  const backgroundColor = useThemeColor({}, "background");
  const textColor = useThemeColor({}, "text");
  const tintColor = useThemeColor({}, "tint");
  const cardBackgroundColor = useThemeColor(
    { light: "#f2f2f7", dark: "#1a1a1c" },
    "background"
  );
  const secondaryTextColor = useThemeColor({}, "icon");

  const insets = useSafeAreaInsets();
  const [videoList, setVideoList] = useState<YouTubeVideo[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [channelList, setChannelList] = useState<
    { id: string; title: string }[]
  >([]);
  const [selectedChannel, setSelectedChannel] = useState<string>("All");
  const [showUnwatchedOnly, setShowUnwatchedOnly] = useState<boolean>(true);
  const [showScrollToTop, setShowScrollToTop] = useState(false);
  const { getVideos, refreshVideos } = useVideos();
  const { getActiveChannels } = useChannelsRepository();
  const { markVideoAsWatched, markVideoAsUnwatched } = useVideosRepository();
  const { shouldRefresh, resetRefreshTrigger } = useVideoRefresh();
  const { db } = useDb();

  // Animation values
  const scrollY = useRef(new Animated.Value(0)).current;
  const flatListRef = useRef<Animated.FlatList>(null);

  // Scroll to top function
  const scrollToTop = useCallback(() => {
    flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
  }, []);

  // Enhanced onScroll handler to track both animation and button visibility
  const handleScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { y: scrollY } } }],
    {
      useNativeDriver: false,
      listener: (event: any) => {
        const offsetY = event.nativeEvent.contentOffset.y;
        setShowScrollToTop(offsetY > 200); // Show button after scrolling 200px
      },
    }
  );

  // Check if user has channels and navigate to channels tab if not
  useEffect(() => {
    const checkChannelsAndNavigate = async () => {
      try {
        const channelData = await db.select().from(channels);
        if (channelData.length === 0) {
          // No channels found, navigate to channels tab
          router.push("/(tabs)/channels");
        }
      } catch (error) {
        console.error("Error checking channels:", error);
      }
    };

    checkChannelsAndNavigate();
  }, [db]);

  // Memoize the openVideo callback
  const openVideo = useCallback((video: YouTubeVideo) => {
    console.log(
      `[Home] Opening video ID: ${video.id} with: ${video.watchProgress}`
    );
    const encodedTitle = encodeURIComponent(video.title);
    router.push(
      `/modal?videoId=${video.id}&title=${encodedTitle}&watchProgress=${video.watchProgress}`
    );
  }, []);

  // Handle long press for video actions
  const handleVideoLongPress = useCallback(
    async (video: YouTubeVideo) => {
      const watched = isVideoWatched(video);
      const actionTitle = watched ? "Mark as Unwatched" : "Mark as Watched";

      const markAsWatched = async () => {
        try {
          await markVideoAsWatched(video.id);
          // Refresh the video list to show updated status
          const videos = await getVideos();
          const sortedVideos = videos.sort(
            (a, b) => b.dateTime.getTime() - a.dateTime.getTime()
          );
          setVideoList(sortedVideos);
        } catch (error) {
          console.error("Error marking video as watched:", error);
          Alert.alert("Error", "Failed to mark video as watched");
        }
      };

      const markAsUnwatched = async () => {
        try {
          await markVideoAsUnwatched(video.id);
          // Refresh the video list to show updated status
          const videos = await getVideos();
          const sortedVideos = videos.sort(
            (a, b) => b.dateTime.getTime() - a.dateTime.getTime()
          );
          setVideoList(sortedVideos);
        } catch (error) {
          console.error("Error marking video as unwatched:", error);
          Alert.alert("Error", "Failed to mark video as unwatched");
        }
      };

      if (Platform.OS === "ios") {
        ActionSheetIOS.showActionSheetWithOptions(
          {
            options: ["Cancel", actionTitle],
            cancelButtonIndex: 0,
          },
          (buttonIndex) => {
            if (buttonIndex === 1) {
              if (watched) {
                markAsUnwatched();
              } else {
                markAsWatched();
              }
            }
          }
        );
      } else {
        // Android fallback
        Alert.alert(
          "Video Actions",
          `What would you like to do with "${video.title}"?`,
          [
            { text: "Cancel", style: "cancel" },
            {
              text: actionTitle,
              onPress: () => {
                if (watched) {
                  markAsUnwatched();
                } else {
                  markAsWatched();
                }
              },
            },
          ]
        );
      }
    },
    [markVideoAsWatched, markVideoAsUnwatched, getVideos]
  );

  // Memoize the keyExtractor function
  const keyExtractor = useCallback((item: YouTubeVideo) => item.id, []);

  // Memoize the onChannelSelect callback
  const onChannelSelect = useCallback((channel: string) => {
    setSelectedChannel(channel);
  }, []);

  // Handle watched filter toggle
  const handleWatchedFilterToggle = useCallback(() => {
    if (Platform.OS === "ios") {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ["Cancel", "All", "Unwatched"],
          cancelButtonIndex: 0,
        },
        (buttonIndex) => {
          if (buttonIndex === 1) {
            setShowUnwatchedOnly(false);
          } else if (buttonIndex === 2) {
            setShowUnwatchedOnly(true);
          }
        }
      );
    } else {
      // Android fallback
      Alert.alert("Filter Videos", "Choose which videos to display:", [
        { text: "Cancel", style: "cancel" },
        {
          text: "All",
          onPress: () => setShowUnwatchedOnly(false),
        },
        {
          text: "Unwatched",
          onPress: () => setShowUnwatchedOnly(true),
        },
      ]);
    }
  }, []);

  const [glassStyle, setGlassStyle] = useState<GlassStyle>("regular");
  const colorScheme = useColorScheme();

  useEffect(() => {
    setGlassStyle((colorScheme === "dark" ? "regular" : "glass") as GlassStyle);
  }, [colorScheme]);

  // Memoize the renderVideoItem function (after glassStyle is defined)
  const renderVideoItem = useCallback(
    ({ item }: { item: YouTubeVideo }) => (
      <VideoItem
        item={item}
        onPress={openVideo}
        onLongPress={handleVideoLongPress}
        textColor={textColor}
        secondaryTextColor={secondaryTextColor}
        cardBackgroundColor={cardBackgroundColor}
        tintColor={tintColor}
        glassStyle={glassStyle}
      />
    ),
    [
      openVideo,
      handleVideoLongPress,
      textColor,
      secondaryTextColor,
      cardBackgroundColor,
      tintColor,
      glassStyle,
    ]
  );

  // Memoize the filtered video list
  const filteredVideoList = useMemo(() => {
    let filtered = videoList;

    // First, filter out videos from paused channels
    // Only show videos from channels that are in the active channel list
    const activeChannelTitles = new Set(
      channelList.map((channel) => channel.title)
    );
    filtered = filtered.filter((video) =>
      activeChannelTitles.has(video.channelTitle)
    );

    // Apply channel filter
    if (selectedChannel !== "All") {
      filtered = filtered.filter(
        (video) => video.channelTitle === selectedChannel
      );
    }

    // Apply watched filter
    if (showUnwatchedOnly) {
      filtered = filterUnwatchedVideos(filtered);
    }

    return filtered;
  }, [videoList, selectedChannel, showUnwatchedOnly, channelList]);

  // Load videos on component mount
  useEffect(() => {
    const loadVideos = async () => {
      try {
        console.log("Starting to load videos...");
        setRefreshing(true);
        const videos = await getVideos();
        console.log(`Loaded ${videos.length} videos from service`);

        // Sort videos by date (newest first) as a backup
        const sortedVideos = videos.sort(
          (a, b) => b.dateTime.getTime() - a.dateTime.getTime()
        );
        setVideoList(sortedVideos);
        console.log(`Set ${sortedVideos.length} videos in state`);
      } catch (error) {
        console.error("Error loading videos:", error);
      } finally {
        setRefreshing(false);
      }
    };

    loadVideos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run on mount to avoid infinite loop

  // Load channels on component mount
  useEffect(() => {
    const loadChannels = async () => {
      try {
        const channels = await getActiveChannels();
        // Sort channels alphabetically by title
        const sortedChannels = channels.sort((a, b) =>
          a.title.localeCompare(b.title)
        );
        setChannelList(sortedChannels);
      } catch (error) {
        console.error("Error loading channels:", error);
      }
    };

    loadChannels();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run on mount to avoid infinite loop

  // Listen for channel changes and refresh videos
  useEffect(() => {
    if (shouldRefresh) {
      console.log("Channel change detected, refreshing videos...");
      const refreshFromChannelChange = async () => {
        setRefreshing(true);
        try {
          // Refresh both videos and channels (only active ones)
          const [videos, channels] = await Promise.all([
            refreshVideos(),
            getActiveChannels(),
          ]);

          const sortedVideos = videos.sort(
            (a, b) => b.dateTime.getTime() - a.dateTime.getTime()
          );
          setVideoList(sortedVideos);

          // Sort and update channels
          const sortedChannels = channels.sort((a, b) =>
            a.title.localeCompare(b.title)
          );
          setChannelList(sortedChannels);
        } catch (error) {
          console.error("Error refreshing videos from channel change:", error);
        } finally {
          setRefreshing(false);
          // Reset the trigger after consumption
          resetRefreshTrigger();
        }
      };

      refreshFromChannelChange();
    }
  }, [shouldRefresh, refreshVideos, resetRefreshTrigger, getActiveChannels]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const videos = await refreshVideos();
      // Sort videos by date (newest first) as a backup
      const sortedVideos = videos.sort(
        (a, b) => b.dateTime.getTime() - a.dateTime.getTime()
      );
      setVideoList(sortedVideos);
    } catch (error) {
      console.error("Error refreshing videos:", error);
    } finally {
      setRefreshing(false);
    }
  }, [refreshVideos]);

  // Header animation
  const headerHeight = scrollY.interpolate({
    inputRange: [0, 50],
    outputRange: [0, 44 + insets.top],
    extrapolate: "clamp",
  });

  const largeTitleOpacity = scrollY.interpolate({
    inputRange: [0, 20],
    outputRange: [1, 0],
    extrapolate: "clamp",
  });

  const smallTitleOpacity = scrollY.interpolate({
    inputRange: [10, 50],
    outputRange: [0, 1],
    extrapolate: "clamp",
  });

  const blurOpacity = scrollY.interpolate({
    inputRange: [0, 10],
    outputRange: [0, 1],
    extrapolate: "clamp",
  });

  const solidBackgroundOpacity = scrollY.interpolate({
    inputRange: [0, 10],
    outputRange: [1, 0],
    extrapolate: "clamp",
  });

  return (
    <ThemedView style={[styles.container, { backgroundColor }]}>
      {/* Animated Header */}
      <Animated.View
        style={[
          styles.animatedHeader,
          {
            height: headerHeight,
            paddingTop: insets.top,
          },
        ]}
      >
        {/* Solid background when not scrolling */}
        <Animated.View
          style={[
            StyleSheet.absoluteFillObject,
            {
              backgroundColor: backgroundColor,
              opacity: solidBackgroundOpacity,
            },
          ]}
        />
        {/* Glass background when scrolling */}
        <Animated.View
          style={[
            StyleSheet.absoluteFillObject,
            {
              opacity: blurOpacity,
            },
          ]}
        >
          <GlassView
            glassEffectStyle="regular"
            style={StyleSheet.absoluteFillObject}
          />
        </Animated.View>
        <Animated.View
          style={[
            {
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
              // height: headerBorderWidth,
              backgroundColor: secondaryTextColor,
            },
          ]}
        />
        <Animated.View
          style={[styles.smallHeaderContent, { opacity: smallTitleOpacity }]}
        >
          <ThemedText style={[styles.smallTitle, { color: textColor }]}>
            Videos
          </ThemedText>
        </Animated.View>
      </Animated.View>

      {/* Video List with Large Title */}
      <Animated.FlatList
        ref={flatListRef}
        data={filteredVideoList}
        renderItem={renderVideoItem}
        keyExtractor={keyExtractor}
        contentContainerStyle={[styles.listContainer, { paddingTop: 20 }]}
        contentInsetAdjustmentBehavior="automatic"
        showsVerticalScrollIndicator={false}
        refreshControl={
          // Don't animate the pull down on every load. Only on user pull.
          <RefreshControl refreshing={false} onRefresh={onRefresh} />
        }
        removeClippedSubviews={true}
        maxToRenderPerBatch={10}
        updateCellsBatchingPeriod={100}
        initialNumToRender={8}
        windowSize={10}
        ListHeaderComponent={
          <Animated.View
            style={[
              styles.largeTitleContainer,
              {
                opacity: largeTitleOpacity,
              },
            ]}
          >
            <ThemedText style={[styles.largeTitle, { color: textColor }]}>
              Videos
            </ThemedText>

            {/* Channel Filter with integrated watched filter */}
            <ChannelFilterList
              channelList={channelList}
              selectedChannel={selectedChannel}
              onChannelSelect={onChannelSelect}
              showUnwatchedOnly={showUnwatchedOnly}
              onWatchedFilterToggle={handleWatchedFilterToggle}
              tintColor={tintColor}
              textColor={textColor}
              cardBackgroundColor={cardBackgroundColor}
              glassEffectStyle={glassStyle}
            />
          </Animated.View>
        }
        onScroll={handleScroll}
        scrollEventThrottle={16}
        ItemSeparatorComponent={() => <ThemedView style={styles.separator} />}
        ListEmptyComponent={
          !refreshing ? (
            <ThemedView style={styles.emptyContainer}>
              <ThemedView
                style={[
                  styles.emptyCard,
                  { backgroundColor: cardBackgroundColor },
                ]}
              >
                <ThemedText style={[styles.emptyTitle, { color: textColor }]}>
                  No Videos Yet
                </ThemedText>
                <ThemedText
                  style={[
                    styles.emptyDescription,
                    { color: secondaryTextColor },
                  ]}
                >
                  Add some channels to see their latest videos here
                </ThemedText>
              </ThemedView>
            </ThemedView>
          ) : null
        }
      />

      {/* Scroll to Top Floating Action Button */}
      {showScrollToTop && (
        <GlassView
          style={[
            styles.scrollToTopFab,
            {
              bottom: insets.bottom + 60,
            },
          ]}
          glassEffectStyle="regular"
        >
          <TouchableOpacity onPress={scrollToTop} activeOpacity={0.8}>
            <Ionicons name="chevron-up" size={24} color={textColor} />
          </TouchableOpacity>
        </GlassView>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  // Animated header styles
  animatedHeader: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
  },
  smallHeaderContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingBottom: 8,
  },
  smallTitle: {
    fontSize: 17,
    fontWeight: "600",
  },
  // Large title styles
  largeTitleContainer: {
    paddingBottom: 16,
    paddingTop: 8,
  },
  largeTitle: {
    fontSize: 34,
    fontWeight: "700",
    letterSpacing: 0.41,
    lineHeight: 42,
  },
  // List styles
  listContainer: {
    paddingHorizontal: 20,
    paddingBottom: 32,
  },
  videoItem: {
    marginBottom: 16,
  },
  watchedVideoItem: {
    opacity: 0.7,
  },
  videoCard: {
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "transparent",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  imageContainer: {
    position: "relative",
  },
  videoImage: {
    width: "100%",
    aspectRatio: 16 / 9,
    backgroundColor: "transparent",
  },
  watchedVideoImage: {
    opacity: 0.6,
  },
  watchedOverlay: {
    position: "absolute",
    top: 8,
    right: 8,
    zIndex: 1,
  },
  watchedBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.3,
        shadowRadius: 2,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  progressBarContainer: {
    width: "100%",
    height: 4,
  },
  progressBarFill: {
    height: "100%",
    borderRadius: 0,
    overflow: "hidden",
  },
  videoInfo: {
    padding: 12,
  },
  videoTitle: {
    fontSize: 15,
    fontWeight: "500",
    lineHeight: 20,
  },
  channelTitle: {
    fontSize: 13,
    marginTop: 2,
    lineHeight: 18,
  },
  separator: {
    height: 8,
  },
  // Empty state styles
  emptyContainer: {
    paddingTop: 60,
    paddingHorizontal: 20,
    alignItems: "center",
  },
  emptyCard: {
    borderRadius: 12,
    padding: 32,
    alignItems: "center",
    maxWidth: 300,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "600",
    marginBottom: 8,
    textAlign: "center",
  },
  emptyDescription: {
    fontSize: 16,
    lineHeight: 22,
    textAlign: "center",
  },
  // Filter styles
  filterContainer: {
    marginTop: 16,
    marginBottom: 8,
  },
  filterContentContainer: {
    paddingHorizontal: 0,
    alignItems: "center",
    gap: 8,
  },
  filterButton: {
    borderRadius: 24,
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginRight: 8,
  },
  filterText: {
    fontSize: 12,
    fontWeight: "500",
  },
  // Scroll to top FAB styles
  scrollToTopFab: {
    position: "absolute",
    right: 36,
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
      },
      android: {
        elevation: 6,
      },
    }),
  },
});
