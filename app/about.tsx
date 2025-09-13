import React from "react";
import { ScrollView, StyleSheet } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { useThemeColor } from "@/hooks/use-theme-color";

export default function AboutScreen() {
  // Theme colors
  const textColor = useThemeColor({}, "text");
  const secondaryTextColor = useThemeColor(
    { light: "#8e8e93", dark: "#8e8e93" },
    "text"
  );

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* About content */}
        <ThemedView style={styles.contentContainer}>
          <ThemedView style={styles.appInfoContainer}>
            <ThemedText style={[styles.appName, { color: textColor }]}>
              Distilt
            </ThemedText>
            <ThemedText
              style={[styles.appVersion, { color: secondaryTextColor }]}
            >
              YouTube RSS Client
            </ThemedText>
          </ThemedView>

          <ThemedView style={styles.infoSection}>
            <ThemedText style={[styles.sectionTitle, { color: textColor }]}>
              User Guide
            </ThemedText>
            <ThemedText
              style={[styles.sectionText, { color: secondaryTextColor }]}
            >
              Enter a YouTube channel ID or username to fetch its RSS feed.
            </ThemedText>
          </ThemedView>

          <ThemedView style={styles.infoSection}>
            <ThemedText style={[styles.sectionTitle, { color: textColor }]}>
              Legal
            </ThemedText>
            <ThemedText
              style={[styles.sectionText, { color: secondaryTextColor }]}
            >
              Distilt™
            </ThemedText>
            <ThemedText
              style={[styles.sectionText, { color: secondaryTextColor }]}
            >
              Copyright © 2025 Tequirk LLC. All Rights Reserved.
            </ThemedText>
          </ThemedView>
        </ThemedView>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  contentContainer: {
    flex: 1,
  },
  appInfoContainer: {
    alignItems: "center",
    paddingTop: 20,
    paddingBottom: 6,
  },
  appName: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: "700",
  },
  appVersion: {
    fontSize: 16,
  },
  descriptionContainer: {
    paddingBottom: 24,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#3c3c43",
  },
  description: {
    fontSize: 16,
    lineHeight: 24,
    textAlign: "center",
  },
  infoSection: {
    paddingVertical: 24,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#3c3c43",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 8,
  },
  sectionText: {
    fontSize: 16,
    lineHeight: 24,
  },
});
