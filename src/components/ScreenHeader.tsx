import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { THEMES } from "../constants/theme";
import { useAppStore } from "../store/useAppStore";

type ScreenHeaderProps = {
  title: string;
  forceBackArrow?: boolean;
  onBackPress?: () => void;
};

export default function ScreenHeader({
  title,
  forceBackArrow = false,
  onBackPress,
}: ScreenHeaderProps) {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const currentTheme = useAppStore((state) => state.currentTheme);
  const theme = THEMES[currentTheme];

  const canGoBack = forceBackArrow || navigation.canGoBack();

  const handlePress = () => {
    if (forceBackArrow && onBackPress) {
      onBackPress();
      return;
    }

    if (canGoBack) {
      navigation.goBack();
      return;
    }

    navigation.toggleDrawer();
  };

  return (
    <View
      style={[
        styles.container,
        {
          paddingTop: insets.top + 8,
        },
      ]}
    >
      <View style={styles.row}>
        <Pressable
          onPress={handlePress}
          style={[
            styles.iconButton,
            {
              backgroundColor: theme.surface,
              borderColor: theme.border,
            },
          ]}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={canGoBack ? "Go back" : "Open menu"}
        >
          <MaterialCommunityIcons
            name={canGoBack ? "arrow-left" : "menu"}
            size={24}
            color={theme.textPrimary}
          />
        </Pressable>

        <Text style={[styles.title, { color: theme.textPrimary }]}>
          {title}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingBottom: 14,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  title: {
    marginLeft: 12,
    fontSize: 22,
    fontWeight: "800",
    letterSpacing: 0.3,
  },
});
