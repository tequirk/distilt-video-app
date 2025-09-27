import { VideoRefreshProvider } from "@/data/videoRefreshContext";
import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { Icon, Label, NativeTabs } from "expo-router/unstable-native-tabs";
import { DynamicColorIOS } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import "react-native-reanimated";

import { Colors } from "@/constants/theme";

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
            <NativeTabs
              tintColor={DynamicColorIOS({
                dark: Colors.dark.tint,
                light: Colors.light.tint,
              })}
            >
              <NativeTabs.Trigger name="index">
                <Label>Videos</Label>
                <Icon
                  sf="play.rectangle.fill"
                  drawable="custom_android_drawable"
                />
              </NativeTabs.Trigger>
              <NativeTabs.Trigger name="channels">
                <Label>Channels</Label>
                <Icon sf="tv.fill" drawable="custom_android_drawable" />
              </NativeTabs.Trigger>
              <NativeTabs.Trigger name="about">
                <Icon
                  sf="info.circle.fill"
                  drawable="custom_settings_drawable"
                />
                <Label>About</Label>
              </NativeTabs.Trigger>
            </NativeTabs>
          </ThemeProvider>
        </VideoRefreshProvider>
      </MigrationStatus>
    </GestureHandlerRootView>
  );
}
