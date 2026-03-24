import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { THEMES } from "../../constants/theme";
import { useAppStore } from "../../store/useAppStore";
import {
    clampPercent,
    getBudgetProgressColor,
    toBudgetPercentage,
} from "../../utils/budgeting";

type BudgetProgressBarProps = {
  spent: number;
  limit: number;
  currency: string;
  compact?: boolean;
};

export default function BudgetProgressBar({
  spent,
  limit,
  currency,
  compact = false,
}: BudgetProgressBarProps) {
  const currentTheme = useAppStore((state) => state.currentTheme);
  const theme = THEMES[currentTheme];
  const percentage = toBudgetPercentage(spent, limit);
  const barWidth = clampPercent(percentage);
  const barColor = getBudgetProgressColor(percentage);

  return (
    <View>
      <View style={styles.labelsRow}>
        <Text
          style={[
            styles.leftLabel,
            compact && styles.compactLabel,
            { color: theme.textPrimary },
          ]}
        >
          {spent.toFixed(2)} / {limit.toFixed(2)} {currency}
        </Text>
        <Text
          style={[
            styles.rightLabel,
            compact && styles.compactLabel,
            { color: theme.textSecondary },
          ]}
        >
          {percentage.toFixed(0)}%
        </Text>
      </View>

      <View style={[styles.track, { backgroundColor: theme.border }]}>
        <View
          style={[
            styles.fill,
            {
              width: `${barWidth}%`,
              backgroundColor: barColor,
            },
          ]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  labelsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  leftLabel: {
    fontSize: 13,
    fontWeight: "600",
  },
  rightLabel: {
    fontSize: 12,
    fontWeight: "700",
  },
  compactLabel: {
    fontSize: 12,
  },
  track: {
    height: 11,
    width: "100%",
    borderRadius: 999,
    overflow: "hidden",
  },
  fill: {
    height: "100%",
    borderRadius: 999,
  },
});
