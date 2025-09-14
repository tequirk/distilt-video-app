import Constants from "expo-constants";
import { router, Stack, useLocalSearchParams } from "expo-router";
import React from "react";
import {
  Platform,
  StatusBar,
  StyleSheet,
  TouchableOpacity,
} from "react-native";
import { WebView } from "react-native-webview";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { useThemeColor } from "@/hooks/use-theme-color";

export default function ModalScreen() {
  const { videoId, title } = useLocalSearchParams<{
    videoId?: string;
    title?: string;
  }>();
  const backgroundColor = useThemeColor({}, "background");
  const textColor = useThemeColor({}, "text");
  const tintColor = useThemeColor({}, "tint");

  const handleGoBack = () => {
    router.back();
  };

  // If no videoId, show default modal content
  if (!videoId) {
    return (
      <ThemedView style={[styles.container, { backgroundColor }]}>
        <ThemedText style={[styles.errorText, { color: textColor }]}>
          No video selected
        </ThemedText>
        <TouchableOpacity
          style={[styles.backButton, { backgroundColor: tintColor }]}
          onPress={handleGoBack}
        >
          <ThemedText style={styles.backButtonText}>Go Back</ThemedText>
        </TouchableOpacity>
      </ThemedView>
    );
  }

  const youtubeUrl = `https://www.youtube.com/embed/${videoId}?autoplay=1&fs=1&modestbranding=1&rel=0`;

  return (
    <ThemedView style={[styles.videoContainer, { backgroundColor: "#000" }]}>
      <Stack.Screen
        options={{
          title: title || "Video Player",
        }}
      />
      <StatusBar barStyle="light-content" backgroundColor="#000" />

      {/* WebView for YouTube video */}
      <WebView
        style={styles.webview}
        source={{ uri: youtubeUrl }}
        allowsFullscreenVideo={true}
        mediaPlaybackRequiresUserAction={false}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        startInLoadingState={true}
        scalesPageToFit={true}
        mixedContentMode="compatibility"
        allowsInlineMediaPlayback={true}
        {...(Platform.OS === "ios" && {
          allowsLinkPreview: false,
          dataDetectorTypes: "none",
        })}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  videoContainer: {
    flex: 1,
    backgroundColor: "#000",
  },
  errorText: {
    fontSize: 18,
    marginBottom: 20,
    textAlign: "center",
  },
  header: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  headerBackButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  backButton: {
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  backButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  webview: {
    flex: 1,
    marginTop: Constants.statusBarHeight,
  },
});
