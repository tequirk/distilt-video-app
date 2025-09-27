import Constants from "expo-constants";
import { router, Stack, useLocalSearchParams } from "expo-router";
import React, { useEffect } from "react";
import {
  Platform,
  StatusBar,
  StyleSheet,
  TouchableOpacity,
} from "react-native";
import { WebView } from "react-native-webview";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { useVideoRefresh } from "@/contexts/videoRefreshContext";
import { useVideosRepository } from "@/data/useVideosRepository";
import { useThemeColor } from "@/hooks/use-theme-color";

export default function ModalScreen() {
  const { videoId, title, watchProgress } = useLocalSearchParams<{
    videoId?: string;
    title?: string;
    watchProgress?: string;
  }>();
  const backgroundColor = useThemeColor({}, "background");
  const textColor = useThemeColor({}, "text");
  const tintColor = useThemeColor({}, "tint");
  const { updateVideoProgress, updateVideoDuration } = useVideosRepository();
  const { triggerVideoRefresh } = useVideoRefresh();

  // Reset refresh trigger when modal closes (including swipe down) to ensure the main list refreshes
  // with fresh data, including watch progress updates.
  useEffect(() => {
    return () => {
      console.log("[Modal] Modal closed, resetting refresh trigger");
      triggerVideoRefresh();
    };
  }, [triggerVideoRefresh]);

  const handleGoBack = () => {
    router.back();
  };

  // JavaScript injection to track video progress
  const injectedJavaScript = `
    function trackVideoProgress() {
      try {
        const video = document.querySelector('video');
        if (video && !isNaN(video.currentTime)) {
          const currentTime = video.currentTime;
          const duration = video.duration || 0;
          
          // Send message to React Native
          if (window.ReactNativeWebView) {
            window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'progress',
              currentTime: currentTime,
              duration: duration
            }));
          }
        }
      } catch (error) {
        console.log('[Video Progress] Error: ' + error.message);
      }
    }
    
    // Start tracking when page is ready
    function startTracking() {
      // Track every 5 seconds
      setInterval(trackVideoProgress, 5000);
    }
    
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', startTracking);
    } else {
      startTracking();
    }
    
    true;
  `;

  const handleMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === "progress" && videoId) {
        const newProgress = Math.round(data.currentTime);
        const duration = Math.round(data.duration);
        console.log(
          `[Modal] Received video progress: ${newProgress}s / ${duration}s`
        );

        // Update progress in database
        updateVideoProgress(videoId, newProgress);

        // Update duration in database (only if we have a valid duration)
        if (duration > 0) {
          updateVideoDuration(videoId, duration);
        }
      }
    } catch (error) {
      console.log("Error parsing WebView message:", error);
    }
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

  console.log(`[Modal] Playing video ID: ${videoId} from ${watchProgress}s`);

  const youtubeUrl = `https://www.youtube.com/embed/${videoId}?autoplay=1&fs=1&modestbranding=1&rel=0&start=${watchProgress}`;

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
        injectedJavaScript={injectedJavaScript}
        onMessage={handleMessage}
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
