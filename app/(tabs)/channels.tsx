import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  Animated,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import ReanimatedSwipeable, {
  SwipeableMethods,
} from "react-native-gesture-handler/ReanimatedSwipeable";
import Reanimated, {
  SharedValue,
  useAnimatedStyle,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { channels, Channels, videos } from "@/data/schema";
import { useDb } from "@/data/useDb";
import { useVideoRefresh } from "@/data/videoRefreshContext";
import { useThemeColor } from "@/hooks/use-theme-color";
import {
  extractChannelId,
  fetchChannelInfo,
  validateChannelId,
} from "@/services/youtube-rss";
import { eq } from "drizzle-orm";

// Right action function for swipeable delete
function RightAction(
  prog: SharedValue<number>,
  drag: SharedValue<number>,
  onDelete: () => void
) {
  const styleAnimation = useAnimatedStyle(() => {
    // Create a smooth animation that keeps the delete area visible
    // but doesn't allow the content to overswipe too much
    const translateX = Math.min(0, Math.max(drag.value, +80));

    return {
      transform: [{ translateX }],
      // Optional: Add a subtle scale effect when fully revealed
      opacity: prog.value,
    };
  });

  return (
    <Reanimated.View style={[styles.rightAction, styleAnimation]}>
      <TouchableOpacity style={styles.deleteButton} onPress={onDelete}>
        <Ionicons name="trash" size={20} color="#FFFFFF" />
      </TouchableOpacity>
    </Reanimated.View>
  );
}

// Swipeable Channel Item Component using ReanimatedSwipeable
const SwipeableChannelItem = ({
  channel,
  onRemove,
  textColor,
  secondaryTextColor,
  borderColor,
  isLast,
  onSwipeableRef,
}: {
  channel: Channels;
  onRemove: (channelId: string) => void;
  textColor: string;
  secondaryTextColor: string;
  borderColor: string;
  isLast: boolean;
  onSwipeableRef: (id: string, ref: SwipeableMethods | null) => void;
}) => {
  const swipeableRef = useRef<SwipeableMethods>(null);

  useEffect(() => {
    onSwipeableRef(channel.id, swipeableRef.current);
  }, [channel.id, onSwipeableRef]);

  const handleDeletePress = () => {
    // Close this specific swipe first
    swipeableRef.current?.close();
    // Add a small delay to let the close animation complete
    setTimeout(() => {
      onRemove(channel.id);
    }, 150);
  };

  // Create a closure that captures the handleDeletePress function
  const renderRightActions = (
    prog: SharedValue<number>,
    drag: SharedValue<number>
  ) => {
    return RightAction(prog, drag, handleDeletePress);
  };

  return (
    <View style={styles.swipeContainer}>
      <ReanimatedSwipeable
        ref={swipeableRef}
        renderRightActions={renderRightActions}
        rightThreshold={40}
        overshootRight={false}
        onSwipeableOpen={() => {
          // This could be used to close other swipes if needed
        }}
        onSwipeableClose={() => {
          // This fires when the swipe closes
        }}
      >
        <View style={styles.channelItemContainer}>
          <TouchableOpacity style={styles.channelItem} activeOpacity={0.7}>
            <View style={styles.channelInfo}>
              <Text style={[styles.channelTitle, { color: textColor }]}>
                {channel.title}
              </Text>
              <Text style={[styles.channelId, { color: secondaryTextColor }]}>
                {channel.id}
              </Text>
            </View>
          </TouchableOpacity>
        </View>
      </ReanimatedSwipeable>

      {/* Separator */}
      {!isLast && (
        <View style={[styles.separator, { backgroundColor: borderColor }]} />
      )}
    </View>
  );
};

export default function ChannelsScreen() {
  const [channelsList, setChannelsList] = useState<Channels[]>([]);
  const [loading, setLoading] = useState(false);

  // Collection of swipeable refs
  const swipeableRefs = useRef<{ [key: string]: SwipeableMethods | null }>({});

  const { db } = useDb();
  const { triggerVideoRefresh } = useVideoRefresh();
  const insets = useSafeAreaInsets();

  // Animation values
  const scrollY = useRef(new Animated.Value(0)).current;

  // Theme colors
  const textColor = useThemeColor({}, "text");
  const backgroundColor = useThemeColor({}, "background");
  const cardBackgroundColor = useThemeColor(
    { light: "#f2f2f7", dark: "#1a1a1c" },
    "background"
  );
  const borderColor = useThemeColor(
    { light: "#e0e0e0", dark: "#3c3c43" },
    "text"
  );
  const secondaryTextColor = useThemeColor(
    { light: "#8e8e93", dark: "#8e8e93" },
    "text"
  );
  const buttonColor = useThemeColor(
    { light: "#FF3B30", dark: "#FF453A" },
    "tint"
  );

  // Header animations
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

  useEffect(() => {
    const loadChannelsData = async () => {
      setLoading(true);
      try {
        const channelData = await db.select().from(channels);
        // Sort channels by title (channel name) alphabetically
        const sortedChannels = channelData.sort((a, b) =>
          a.title.localeCompare(b.title, undefined, { sensitivity: "base" })
        );
        setChannelsList(sortedChannels);
      } catch (error) {
        console.error("Error loading channels:", error);
      } finally {
        setLoading(false);
      }
    };

    loadChannelsData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty dependency array - db is stable once initialized

  const loadChannels = useCallback(async () => {
    setLoading(true);
    try {
      const channelData = await db.select().from(channels);
      // Sort channels by title (channel name) alphabetically
      const sortedChannels = channelData.sort((a, b) =>
        a.title.localeCompare(b.title, undefined, { sensitivity: "base" })
      );
      setChannelsList(sortedChannels);
    } catch (error) {
      console.error("Error loading channels:", error);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty dependency array - db is stable once initialized

  const handleAddChannelPrompt = () => {
    Alert.prompt(
      "Add Channel",
      "Enter a YouTube Channel URL or ID:",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Add",
          onPress: async (input?: string) => {
            if (input && input.trim()) {
              await handleAddChannel(input.trim());
            }
          },
        },
      ],
      "plain-text",
      "",
      "default"
    );
  };

  const handleAddChannel = async (input: string) => {
    if (!input.trim()) {
      Alert.alert("Error", "Please enter a channel ID or URL");
      return;
    }

    try {
      setLoading(true);

      // Extract channel ID from URL or validate direct channel ID input
      const channelId = extractChannelId(input.trim());

      if (!channelId) {
        Alert.alert(
          "Error",
          "Invalid format. Please use a channel URL like:\nhttps://www.youtube.com/channel/UC...\nor a direct channel ID"
        );
        return;
      }

      // Check if channel already exists
      const existingChannels = await db
        .select()
        .from(channels)
        .where(eq(channels.id, channelId));

      if (existingChannels.length > 0) {
        Alert.alert("Error", "This channel is already added");
        return;
      }

      // Validate channel ID and get channel info
      const isValid = await validateChannelId(channelId);
      if (!isValid) {
        Alert.alert("Error", "Invalid channel ID or channel not found");
        return;
      }

      const channelInfo = await fetchChannelInfo(channelId);
      if (!channelInfo) {
        Alert.alert("Error", "Could not fetch channel information");
        return;
      }

      // Add channel to database
      await db.insert(channels).values({
        id: channelInfo.id,
        title: channelInfo.title,
      });

      Alert.alert("Success", `Added channel: ${channelInfo.title}`);
      await loadChannels();

      // Trigger video refresh so the videos tab updates
      triggerVideoRefresh();
    } catch {
      Alert.alert("Error", "Failed to add channel");
    } finally {
      setLoading(false);
    }
  };

  const handleSwipeableRef = (id: string, ref: SwipeableMethods | null) => {
    swipeableRefs.current[id] = ref;
  };

  const handleRemoveChannel = async (channelId: string) => {
    // The swipe is already closed by the individual item

    Alert.alert(
      "Remove Channel",
      "Are you sure you want to remove this channel?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: async () => {
            try {
              // First, delete all videos from this channel
              await db.delete(videos).where(eq(videos.channelId, channelId));

              // Then, delete the channel itself
              await db.delete(channels).where(eq(channels.id, channelId));

              Alert.alert(
                "Success",
                "Channel and all its videos removed successfully"
              );
              await loadChannels();

              // Trigger video refresh so the videos tab updates
              triggerVideoRefresh();
            } catch {
              Alert.alert("Error", "Failed to remove channel");
            }
          },
        },
      ]
    );
  };

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
        {/* Blur background when scrolling */}
        <Animated.View
          style={[
            StyleSheet.absoluteFillObject,
            {
              opacity: blurOpacity,
            },
          ]}
        >
          <BlurView
            intensity={50}
            tint="systemMaterial"
            style={StyleSheet.absoluteFillObject}
          />
        </Animated.View>
        <Animated.View
          style={[styles.smallHeaderContent, { opacity: smallTitleOpacity }]}
        >
          <ThemedText style={[styles.smallTitle, { color: textColor }]}>
            Channels
          </ThemedText>
        </Animated.View>
      </Animated.View>

      {/* Content with Large Title */}
      <Animated.ScrollView
        contentContainerStyle={[styles.scrollContainer, { paddingTop: 20 }]}
        contentInsetAdjustmentBehavior="automatic"
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: false }
        )}
        scrollEventThrottle={16}
      >
        {/* Large Title */}
        <Animated.View
          style={[
            styles.largeTitleContainer,
            {
              opacity: largeTitleOpacity,
            },
          ]}
        >
          <ThemedText style={[styles.largeTitle, { color: textColor }]}>
            Channels
          </ThemedText>
        </Animated.View>

        {/* Subscribed Channels Section */}
        <ThemedView style={styles.section}>
          {channelsList.length === 0 ? (
            <ThemedView
              style={[styles.card, { backgroundColor: cardBackgroundColor }]}
            >
              <ThemedText
                style={[styles.emptyText, { color: secondaryTextColor }]}
              >
                Add a channel to get started.
              </ThemedText>
            </ThemedView>
          ) : (
            <ThemedView
              style={[styles.card, { backgroundColor: cardBackgroundColor }]}
            >
              {channelsList.map((channel, index) => (
                <SwipeableChannelItem
                  key={channel.id}
                  channel={channel}
                  onRemove={handleRemoveChannel}
                  textColor={textColor}
                  secondaryTextColor={secondaryTextColor}
                  borderColor={borderColor}
                  isLast={index === channelsList.length - 1}
                  onSwipeableRef={handleSwipeableRef}
                />
              ))}
            </ThemedView>
          )}
        </ThemedView>
      </Animated.ScrollView>

      {/* Floating Action Button */}
      <TouchableOpacity
        style={[
          styles.fab,
          {
            backgroundColor: buttonColor,
            bottom: insets.bottom,
            right: 36,
          },
        ]}
        onPress={handleAddChannelPrompt}
        disabled={loading}
      >
        <Ionicons name="add" size={24} color="white" />
      </TouchableOpacity>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  animatedHeader: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    overflow: "hidden",
  },
  smallHeaderContent: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 44,
    justifyContent: "center",
    alignItems: "center",
    paddingBottom: 8,
  },
  smallTitle: {
    fontSize: 17,
    fontWeight: "600",
  },
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
  scrollContainer: {
    paddingHorizontal: 20,
    paddingBottom: 32,
  },
  section: {
    marginBottom: 80,
  },
  card: {
    borderRadius: 12,
    overflow: "hidden",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  channelItem: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    height: "100%",
  },
  channelInfo: {
    flex: 1,
    marginRight: 12,
  },
  channelTitle: {
    fontSize: 16,
    fontWeight: "500",
    lineHeight: 22,
    marginBottom: 2,
  },
  channelId: {
    fontSize: 13,
    lineHeight: 16,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 16,
  },
  emptyText: {
    fontSize: 16,
    lineHeight: 22,
    textAlign: "center",
    padding: 24,
  },
  fab: {
    position: "absolute",
    right: 20,
    width: 48,
    height: 48,
    borderRadius: 28,
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
  fabText: {
    fontSize: 24,
    fontWeight: "300",
    color: "white",
  },
  // Swipe styles
  swipeContainer: {
    flex: 1,
    overflow: "hidden",
  },
  channelItemContainer: {
    flexDirection: "row",
    alignItems: "center",
    height: 80,
  },
  rightAction: {
    width: 80,
    backgroundColor: "#FF3B30",
    justifyContent: "center",
    alignItems: "center",
    height: "100%",
  },
  deleteButton: {
    padding: 16,
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
});
