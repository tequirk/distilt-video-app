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
  Animated,
  Image,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  useColorScheme,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { useVideoRefresh } from "@/contexts/videoRefreshContext";
import { channels } from "@/data/schema";
import { useChannelsRepository } from "@/data/useChannelsRepository";
import { useDb } from "@/data/useDb";
import { useThemeColor } from "@/hooks/use-theme-color";
import { useVideos } from "@/services/videoService";
import { YouTubeVideo } from "@/services/youtubeService";

// Memoized video item component for performance
const VideoItem = React.memo(
  ({
    item,
    onPress,
    textColor,
    secondaryTextColor,
    cardBackgroundColor,
  }: {
    item: YouTubeVideo;
    onPress: (video: YouTubeVideo) => void;
    textColor: string;
    secondaryTextColor: string;
    cardBackgroundColor: string;
  }) => (
    <TouchableOpacity
      style={styles.videoItem}
      onPress={() => onPress(item)}
      activeOpacity={0.7}
    >
      <ThemedView style={styles.videoCard}>
        <Image source={{ uri: item.img }} style={styles.videoImage} />
        <ThemedView
          style={[styles.videoInfo, { backgroundColor: cardBackgroundColor }]}
        >
          <ThemedText
            style={[styles.videoTitle, { color: textColor }]}
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
  )
);

VideoItem.displayName = "VideoItem";

// Memoized filter button component for performance
const FilterButton = React.memo(
  ({
    title,
    isSelected,
    onPress,
    tintColor,
    textColor,
    cardBackgroundColor,
    glassEffectStyle,
  }: {
    title: string;
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
      </Pressable>
    </GlassView>
  )
);

FilterButton.displayName = "FilterButton";

// Memoized filter list component
const ChannelFilterList = React.memo(
  ({
    channelList,
    selectedChannel,
    onChannelSelect,
    tintColor,
    textColor,
    cardBackgroundColor,
    glassEffectStyle,
  }: {
    channelList: { id: string; title: string }[];
    selectedChannel: string;
    onChannelSelect: (channel: string) => void;
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
        <FilterButton
          title="All"
          isSelected={selectedChannel === "All"}
          onPress={() => onChannelSelect("All")}
          tintColor={tintColor}
          textColor={textColor}
          cardBackgroundColor={cardBackgroundColor}
          glassEffectStyle={glassEffectStyle}
        />
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
  const [showScrollToTop, setShowScrollToTop] = useState(false);
  const { getVideos, refreshVideos } = useVideos();
  const { getChannels } = useChannelsRepository();
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
    const encodedTitle = encodeURIComponent(video.title);
    router.push(`/modal?videoId=${video.id}&title=${encodedTitle}`);
  }, []);

  // Memoize the renderVideoItem function
  const renderVideoItem = useCallback(
    ({ item }: { item: YouTubeVideo }) => (
      <VideoItem
        item={item}
        onPress={openVideo}
        textColor={textColor}
        secondaryTextColor={secondaryTextColor}
        cardBackgroundColor={cardBackgroundColor}
      />
    ),
    [openVideo, textColor, secondaryTextColor, cardBackgroundColor]
  );

  // Memoize the keyExtractor function
  const keyExtractor = useCallback((item: YouTubeVideo) => item.id, []);

  // Memoize the onChannelSelect callback
  const onChannelSelect = useCallback((channel: string) => {
    setSelectedChannel(channel);
  }, []);

  const [glassStyle, setGlassStyle] = useState<GlassStyle>("regular");
  const colorScheme = useColorScheme();

  useEffect(() => {
    setGlassStyle((colorScheme === "dark" ? "regular" : "glass") as GlassStyle);
  }, [colorScheme]);

  // Memoize the filtered video list
  const filteredVideoList = useMemo(() => {
    if (selectedChannel === "All") {
      return videoList;
    }
    return videoList.filter((video) => video.channelTitle === selectedChannel);
  }, [videoList, selectedChannel]);

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
        const channels = await getChannels();
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
      const refreshFromChannelChange = async () => {
        setRefreshing(true);
        try {
          // Refresh both videos and channels
          const [videos, channels] = await Promise.all([
            refreshVideos(),
            getChannels(),
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
  }, [shouldRefresh, refreshVideos, resetRefreshTrigger, getChannels]);

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
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
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
            {/* Channel Filter Buttons - optimized memoized component */}
            <ChannelFilterList
              channelList={channelList}
              selectedChannel={selectedChannel}
              onChannelSelect={onChannelSelect}
              tintColor={tintColor}
              textColor={textColor}
              cardBackgroundColor={cardBackgroundColor}
              // Use regular glass when dark mode
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
  videoImage: {
    width: "100%",
    aspectRatio: 16 / 9,
    backgroundColor: "transparent",
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
