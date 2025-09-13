import { BlurView } from "expo-blur";
import { router } from "expo-router";
import React, { useRef } from "react";
import { Animated, StyleSheet, TouchableOpacity } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useThemeColor } from "@/hooks/use-theme-color";

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();

  // Theme colors
  const backgroundColor = useThemeColor({}, "background");
  const textColor = useThemeColor({}, "text");
  const cardBackgroundColor = useThemeColor(
    { light: "#f2f2f7", dark: "#1a1a1c" },
    "background"
  );
  const secondaryTextColor = useThemeColor(
    { light: "#8e8e93", dark: "#8e8e93" },
    "text"
  );

  // Animation values
  const scrollY = useRef(new Animated.Value(0)).current;

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
    <ThemedView style={styles.container}>
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
              backgroundColor: secondaryTextColor,
            },
          ]}
        />
        <Animated.View
          style={[styles.smallHeaderContent, { opacity: smallTitleOpacity }]}
        >
          <ThemedText style={[styles.smallTitle, { color: textColor }]}>
            Settings
          </ThemedText>
        </Animated.View>
      </Animated.View>

      {/* Settings Content with Large Title */}
      <Animated.ScrollView
        contentContainerStyle={[styles.listContainer, { paddingTop: 20 }]}
        contentInsetAdjustmentBehavior="automatic"
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: false }
        )}
        scrollEventThrottle={16}
      >
        <Animated.View
          style={[
            styles.largeTitleContainer,
            {
              opacity: largeTitleOpacity,
            },
          ]}
        >
          <ThemedText style={[styles.largeTitle, { color: textColor }]}>
            Settings
          </ThemedText>
        </Animated.View>

        {/* Settings content */}
        <ThemedView style={styles.contentContainer}>
          {/* About Section */}
          <TouchableOpacity
            style={[
              styles.settingsButton,
              { backgroundColor: cardBackgroundColor },
            ]}
            onPress={() => router.push("/about")}
            activeOpacity={0.7}
          >
            <ThemedView
              style={[styles.buttonContent, { backgroundColor: "transparent" }]}
            >
              <IconSymbol size={24} name="info.circle" color={textColor} />
              <ThemedText style={[styles.buttonText, { color: textColor }]}>
                About
              </ThemedText>
            </ThemedView>
            <IconSymbol
              size={16}
              name="chevron.right"
              color={secondaryTextColor}
            />
          </TouchableOpacity>

          {/* Theme setting placeholder */}
          {/* <ThemedView style={styles.sectionSpacer} />
          <ThemedText
            style={[styles.placeholderText, { color: secondaryTextColor }]}
          >
            Theme setting coming soon...
          </ThemedText> */}
        </ThemedView>
      </Animated.ScrollView>
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
  // Content styles
  listContainer: {
    paddingHorizontal: 20,
    paddingBottom: 32,
  },
  contentContainer: {},
  // Settings button styles
  settingsButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  buttonContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  buttonText: {
    marginLeft: 12,
  },
  sectionSpacer: {},
  placeholderText: {
    fontSize: 16,
    paddingVertical: 4,
  },
});
