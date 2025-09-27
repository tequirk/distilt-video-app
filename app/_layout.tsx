import { VideoRefreshProvider } from "@/data/videoRefreshContext";
import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { Icon, Label, NativeTabs } from "expo-router/unstable-native-tabs";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import "react-native-reanimated";

import { MigrationStatus, useDb } from "@/data/useDb";
import { useColorScheme } from "@/hooks/use-color-scheme";

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const { db } = useDb();

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <MigrationStatus db={db}>
        <VideoRefreshProvider>
          <ThemeProvider
            value={colorScheme === "dark" ? DarkTheme : DefaultTheme}
          >
            <NativeTabs>
              <NativeTabs.Trigger name="index">
                <Label>Videos</Label>
                <Icon sf="house.fill" drawable="custom_android_drawable" />
              </NativeTabs.Trigger>
              <NativeTabs.Trigger name="channels">
                <Label>Channels</Label>
                <Icon sf="laser.burst" drawable="custom_android_drawable" />
              </NativeTabs.Trigger>
              <NativeTabs.Trigger name="about">
                <Icon sf="gear" drawable="custom_settings_drawable" />
                <Label>About</Label>
              </NativeTabs.Trigger>
            </NativeTabs>
          </ThemeProvider>
        </VideoRefreshProvider>
      </MigrationStatus>
    </GestureHandlerRootView>
  );
}
