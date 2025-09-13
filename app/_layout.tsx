import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import "react-native-reanimated";

import { MigrationStatus, useDb } from "@/data/useDb";
import { useColorScheme } from "@/hooks/use-color-scheme";

export const unstable_settings = {
  anchor: "(tabs)",
};

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const { db } = useDb();

  return (
    <MigrationStatus db={db}>
      <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
        <Stack>
          <Stack.Screen
            name="(tabs)"
            options={{ headerShown: false, headerTitle: "Distilt" }}
          />
          <Stack.Screen
            name="about"
            options={{
              headerShown: true,
              title: "About",
              headerTransparent: true,
              headerBlurEffect: "regular",
              headerLargeTitle: false,
            }}
          />
          <Stack.Screen
            name="modal"
            options={{ presentation: "modal", title: "Modal" }}
          />
        </Stack>
        <StatusBar style="auto" />
      </ThemeProvider>
    </MigrationStatus>
  );
}
