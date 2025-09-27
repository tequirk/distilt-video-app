import { VideoRefreshProvider } from "@/contexts/videoRefreshContext";
import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { Stack } from "expo-router";
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
            <Stack>
              <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
              <Stack.Screen
                name="modal"
                options={{
                  presentation: "modal",
                  headerShown: false,
                }}
              />
            </Stack>
          </ThemeProvider>
        </VideoRefreshProvider>
      </MigrationStatus>
    </GestureHandlerRootView>
  );
}
