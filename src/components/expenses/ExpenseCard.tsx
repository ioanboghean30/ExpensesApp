import { MaterialCommunityIcons } from "@expo/vector-icons";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { THEMES } from "../../constants/theme";
import { useAppStore } from "../../store/useAppStore";

type ExpenseCardItem = {
  id: string;
  amount: number;
  description: string;
  date: Date;
  category: string;
};

type ExpenseCardProps = {
  item: ExpenseCardItem;
  currency: string;
  onEdit: () => void;
  onDelete: () => void;
  dateLocale?: string;
  categoryIconName?: string;
  categoryIconColor?: string;
};

export default function ExpenseCard({
  item,
  currency,
  onEdit,
  onDelete,
  dateLocale,
  categoryIconName,
  categoryIconColor,
}: ExpenseCardProps) {
  const currentTheme = useAppStore((state) => state.currentTheme);
  const theme = THEMES[currentTheme];

  const expenseDate =
    item.date instanceof Date ? item.date : new Date(item.date);
  const formattedDate = dateLocale
    ? expenseDate.toLocaleDateString(dateLocale)
    : expenseDate.toLocaleDateString();

  return (
    <View
      style={[
        styles.transactionItem,
        {
          backgroundColor: theme.surface,
          borderColor: theme.border,
        },
      ]}
    >
      {categoryIconName ? (
        <View
          style={[
            styles.iconContainer,
            { backgroundColor: categoryIconColor ?? "#7B8794" },
          ]}
        >
          <MaterialCommunityIcons
            name={categoryIconName as any}
            size={24}
            color={theme.textPrimary}
          />
        </View>
      ) : null}

      <View style={{ flex: 1 }}>
        <Text style={[styles.transName, { color: theme.textPrimary }]}>
          {item.description}
        </Text>
        <Text style={[styles.transDate, { color: theme.textSecondary }]}>
          {formattedDate} • {item.category ?? "Other"}
        </Text>
      </View>

      <Text style={[styles.transValue, { color: theme.primary }]}>
        {Number(item.amount ?? 0).toFixed(2)} {currency}
      </Text>

      <View style={styles.transActions}>
        <Pressable onPress={onEdit} style={styles.actionIcon}>
          <MaterialCommunityIcons
            name="pencil"
            size={20}
            color={theme.primary}
          />
        </Pressable>
        <Pressable onPress={onDelete} style={styles.actionIcon}>
          <MaterialCommunityIcons
            name="trash-can-outline"
            size={20}
            color={theme.danger}
          />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  transactionItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 15,
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  transName: {
    fontSize: 16,
    fontWeight: "500",
  },
  transDate: {
    fontSize: 12,
    marginTop: 2,
  },
  transValue: {
    fontSize: 16,
    fontWeight: "bold",
    marginRight: 10,
  },
  transActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  actionIcon: {
    padding: 5,
  },
});
