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
import { GlassView } from "expo-glass-effect";

// Right action function for swipeable delete
function RightAction(
  prog: SharedValue<number>,
  drag: SharedValue<number>,
  onDelete: () => void,
  backgroundColor: string
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
    <Reanimated.View style={[styleAnimation]}>
      <GlassView
        glassEffectStyle="regular"
        style={[styles.deleteButton, styles.rightAction, { backgroundColor }]}
      >
        <TouchableOpacity onPress={onDelete}>
          <Ionicons name="trash" size={20} color="#FFFFFF" />
        </TouchableOpacity>
      </GlassView>
    </Reanimated.View>
  );
}

// Swipeable Channel Item Component using ReanimatedSwipeable
const SwipeableChannelItem = ({
  channel,
  onRemove,
  onEdit,
  textColor,
  secondaryTextColor,
  cardBackgroundColor,
  borderColor,
  buttonColor,
  onSwipeableRef,
}: {
  channel: Channels;
  onRemove: (channelId: string) => void;
  onEdit: (channel: Channels) => void;
  textColor: string;
  secondaryTextColor: string;
  cardBackgroundColor: string;
  borderColor: string;
  buttonColor: string;
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
    return RightAction(prog, drag, handleDeletePress, buttonColor);
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
        <TouchableOpacity
          style={[
            styles.channelItem,
            {
              backgroundColor: "transparent",
              borderBottomColor: borderColor,
            },
          ]}
          activeOpacity={0.7}
          onPress={() => onEdit(channel)}
        >
          <View style={styles.channelInfo}>
            <Text style={[styles.channelTitle, { color: textColor }]}>
              {channel.title}
            </Text>
          </View>
          <Ionicons
            name="chevron-forward"
            size={16}
            color={secondaryTextColor}
          />
        </TouchableOpacity>
      </ReanimatedSwipeable>
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
  const secondaryTextColor = useThemeColor({}, "icon");
  const buttonColor = useThemeColor({}, "tint");

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

  const handleEditChannel = (channel: Channels) => {
    Alert.prompt(
      "Edit Channel ID",
      `${channel.id}`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Update",
          onPress: async (newChannelId?: string) => {
            if (
              newChannelId &&
              newChannelId.trim() &&
              newChannelId.trim() !== channel.id
            ) {
              await updateChannelId(channel.id, newChannelId.trim());
            }
          },
        },
      ],
      "plain-text",
      channel.id,
      "default"
    );
  };

  const updateChannelId = async (
    oldChannelId: string,
    newChannelId: string
  ) => {
    try {
      setLoading(true);

      // Extract channel ID from URL or validate direct channel ID input
      const extractedChannelId = extractChannelId(newChannelId);

      if (!extractedChannelId) {
        Alert.alert(
          "Error",
          "Invalid format. Please use a channel URL like:\nhttps://www.youtube.com/channel/UC...\nor a direct channel ID"
        );
        return;
      }

      // Check if the new channel ID already exists
      const existingChannels = await db
        .select()
        .from(channels)
        .where(eq(channels.id, extractedChannelId));

      if (existingChannels.length > 0 && extractedChannelId !== oldChannelId) {
        Alert.alert("Error", "This channel ID is already added");
        return;
      }

      // Validate new channel ID
      const isValid = await validateChannelId(extractedChannelId);
      if (!isValid) {
        Alert.alert("Error", "Invalid channel ID or channel not found");
        return;
      }

      // Get new channel info
      const channelInfo = await fetchChannelInfo(extractedChannelId);
      if (!channelInfo) {
        Alert.alert("Error", "Could not fetch channel information");
        return;
      }

      // Update channel in database
      await db
        .update(channels)
        .set({
          id: channelInfo.id,
          title: channelInfo.title,
        })
        .where(eq(channels.id, oldChannelId));

      // Delete videos from the old channel
      await db.delete(videos).where(eq(videos.channelId, oldChannelId));

      Alert.alert("Success", `Updated channel: ${channelInfo.title}`);
      await loadChannels();

      // Trigger video refresh
      triggerVideoRefresh();
    } catch {
      Alert.alert("Error", "Failed to update channel");
    } finally {
      setLoading(false);
    }
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
            // Empty state - just render an empty section
            <ThemedView style={styles.emptySection} />
          ) : (
            <>
              {channelsList.map((channel, index) => (
                <SwipeableChannelItem
                  key={channel.id}
                  channel={channel}
                  onRemove={handleRemoveChannel}
                  onEdit={handleEditChannel}
                  textColor={textColor}
                  secondaryTextColor={secondaryTextColor}
                  cardBackgroundColor={cardBackgroundColor}
                  borderColor={borderColor}
                  buttonColor={buttonColor}
                  onSwipeableRef={handleSwipeableRef}
                />
              ))}
            </>
          )}
        </ThemedView>
      </Animated.ScrollView>

      {/* Empty State Message - positioned near FAB */}
      {channelsList.length === 0 && (
        <ThemedView
          style={[styles.emptyStateContainer, { bottom: insets.bottom + 110 }]}
        >
          <ThemedView
            style={[
              styles.emptyStateCard,
              { backgroundColor: cardBackgroundColor },
            ]}
          >
            <ThemedText
              style={[styles.emptyStateText, { color: secondaryTextColor }]}
            >
              Add a channel to get started
            </ThemedText>
          </ThemedView>
        </ThemedView>
      )}

      {/* Floating Action Button */}
      <GlassView
        style={[
          styles.fab,
          {
            backgroundColor: buttonColor,
            bottom: insets.bottom + 60,
            right: 36,
          },
        ]}
        glassEffectStyle="regular"
      >
        <TouchableOpacity onPress={handleAddChannelPrompt} disabled={loading}>
          <Ionicons name="add" size={24} color="white" />
        </TouchableOpacity>
      </GlassView>
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
  channelItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    // paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  channelInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  channelTitle: {
    fontSize: 16,
    fontWeight: "500",
    lineHeight: 22,
  },
  emptySection: {
    // Empty section when no channels, takes minimal space
    height: 1,
  },
  emptyStateContainer: {
    position: "absolute",
    right: 80, // Position to the left of the FAB
    alignItems: "center",
    zIndex: 999,
  },
  emptyStateCard: {
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    borderBottomLeftRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 20,
    maxWidth: 280,
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
  emptyStateText: {
    fontSize: 16,
    fontWeight: "500",
    lineHeight: 22,
    textAlign: "center",
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
  // Swipe styles
  swipeContainer: {
    flex: 1,
    overflow: "hidden",
  },
  rightAction: {
    width: 60,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 28,
    marginLeft: 8,
    height: 38, // Slightly smaller than channel item height for better visual balance
    alignSelf: "center", // Vertically center within the swipe area
  },
  deleteButton: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
});
