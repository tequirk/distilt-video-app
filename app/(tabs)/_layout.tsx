import { Colors } from "@/constants/theme";
import { Icon, Label, NativeTabs } from "expo-router/unstable-native-tabs";
import { DynamicColorIOS } from "react-native";

export default function TabLayout() {
  return (
    <NativeTabs
      tintColor={DynamicColorIOS({
        dark: Colors.dark.tint,
        light: Colors.light.tint,
      })}
    >
      <NativeTabs.Trigger name="index">
        <Label>Videos</Label>
        <Icon sf="play.rectangle.fill" drawable="custom_android_drawable" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="channels">
        <Label>Channels</Label>
        <Icon sf="tv.fill" drawable="custom_android_drawable" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="about">
        <Icon sf="info.circle.fill" drawable="custom_settings_drawable" />
        <Label>About</Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
