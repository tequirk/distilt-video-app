import { BlurView } from "expo-blur";
import * as WebBrowser from "expo-web-browser";
import { useRef, useState } from "react";
import {
  Animated,
  Image,
  Platform,
  RefreshControl,
  StyleSheet,
  TouchableOpacity,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import videos from "@/data";
import { useThemeColor } from "@/hooks/use-theme-color";

interface Video {
  id: string;
  title: string;
  img: string;
  dateTime: Date;
  channelTitle: string;
}

export default function HomeScreen() {
  const backgroundColor = useThemeColor({}, "background");
  const textColor = useThemeColor({}, "text");
  const insets = useSafeAreaInsets();
  const [videoList, setVideoList] = useState<Video[]>(videos);
  const [refreshing, setRefreshing] = useState(false);

  // Animation values
  const scrollY = useRef(new Animated.Value(0)).current;

  // Card colors for light/dark theme
  const cardBackgroundColor = useThemeColor(
    { light: "#f2f2f7", dark: "#1a1a1c" },
    "background"
  );
  const secondaryTextColor = useThemeColor(
    { light: "#8e8e93", dark: "#8e8e93" },
    "text"
  );

  const onRefresh = async () => {
    setRefreshing(true);
    // Simulate API call
    setTimeout(() => {
      console.log("Refreshing videos...");
      setVideoList([...videos]);
      setRefreshing(false);
    }, 1000);
  };

  const openVideo = (videoId: string) => {
    const url = `https://www.youtube.com/embed/${videoId}`;
    WebBrowser.openBrowserAsync(url);
  };

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

  // const headerBorderWidth = scrollY.interpolate({
  //   inputRange: [0, 20],
  //   outputRange: [0, StyleSheet.hairlineWidth],
  //   extrapolate: "clamp",
  // });

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

  const renderVideoItem = ({ item }: { item: Video }) => (
    <TouchableOpacity
      style={styles.videoItem}
      onPress={() => openVideo(item.id)}
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
  );

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
        data={videoList}
        renderItem={renderVideoItem}
        contentContainerStyle={[styles.listContainer, { paddingTop: 20 }]}
        contentInsetAdjustmentBehavior="automatic"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
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
          </Animated.View>
        }
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: false }
        )}
        scrollEventThrottle={16}
        ItemSeparatorComponent={() => <ThemedView style={styles.separator} />}
      />
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
    backgroundColor: "#f2f2f7",
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
});
