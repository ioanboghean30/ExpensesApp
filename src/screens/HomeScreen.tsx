import { MaterialCommunityIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useIsFocused } from "@react-navigation/native";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Keyboard,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { BudgetProgressBar, ExpenseCard, ScreenHeader } from "../components";
import { THEMES } from "../constants/theme";
import {
  useDailyReminder,
  useExpenseMutations,
  useRecentExpenses,
} from "../hooks";
import { supabase } from "../lib/supabaseClient";
import { useAppStore } from "../store/useAppStore";
import { normalizeExpensesForState } from "../utils/normalizeData";

export default function HomeScreen({ navigation }: any) {
  useDailyReminder();

  const authStatus = useAppStore((state) => state.authStatus);
  const currentTheme = useAppStore((state) => state.currentTheme);
  const expenses = useAppStore((state) => state.expenses);
  const setStoreExpenses = useAppStore((state) => state.setExpenses);
  const budgets = useAppStore((state) => state.budgets);
  const loadBudgets = useAppStore((state) => state.loadBudgets);
  const { deleteExpense } = useExpenseMutations(authStatus);
  const isFocused = useIsFocused();
  const [allExpenses, setAllExpenses] = useState<any[]>([]);
  const [totalMonth, setTotalMonth] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const {
    expanded,
    setExpanded,
    displayedExpenses: recentDisplayedExpenses,
    shouldShowToggle,
  } = useRecentExpenses(allExpenses);
  const normalizedSearchQuery = searchQuery.trim().toLowerCase();
  const displayedExpenses = useMemo(() => {
    if (!normalizedSearchQuery) {
      return recentDisplayedExpenses;
    }

    return expenses.filter((expense) => {
      const description = String(expense.description ?? "").toLowerCase();
      const category = String(expense.category ?? "").toLowerCase();
      const amount = String(expense.amount ?? "").toLowerCase();

      return (
        description.includes(normalizedSearchQuery) ||
        category.includes(normalizedSearchQuery) ||
        amount.includes(normalizedSearchQuery)
      );
    });
  }, [expenses, normalizedSearchQuery, recentDisplayedExpenses]);
  const showToggleButton = !normalizedSearchQuery && shouldShowToggle;
  const showSearchResultsAboveKeyboard =
    Boolean(normalizedSearchQuery) && isSearchFocused && keyboardHeight > 0;
  const theme = THEMES[currentTheme];

  // Open setup only when explicitly requested by signup/guest flows.
  useEffect(() => {
    const checkInitialSetup = async () => {
      try {
        const shouldOpenInitialSetup = await AsyncStorage.getItem(
          "shouldOpenInitialSetup",
        );
        if (shouldOpenInitialSetup === "true") {
          await AsyncStorage.removeItem("shouldOpenInitialSetup");
          navigation.navigate("InitialSetupScreen");
        }
      } catch (e) {
        console.error("Failed to load initial setup:", e);
      }
    };
    checkInitialSetup();
  }, [navigation]);

  // Selected currency state.
  const [currency, setCurrency] = useState("RON");
  useEffect(() => {
    const loadCurrency = async () => {
      try {
        const savedCurrency = await AsyncStorage.getItem("userCurrency");
        if (savedCurrency) {
          setCurrency(savedCurrency);
        }
      } catch (e) {
        console.error("Failes to load currency", e);
      }
    };
    if (isFocused) {
      loadCurrency();
    }
  }, [isFocused]);
  // Load expenses and compute monthly total.
  const loadHomeData = useCallback(async () => {
    try {
      let allExpenses: any[] = [];

      // Branch by auth mode.
      if (authStatus === "guest") {
        const json = await AsyncStorage.getItem("savedExpenses");
        if (json) {
          const parsed = JSON.parse(json);
          allExpenses = normalizeExpensesForState(
            Array.isArray(parsed) ? parsed : [],
          );
        }
      } else if (authStatus === "loggedIn") {
        // Load enough rows to cover current month confidently.
        const { data } = await supabase
          .from("expenses")
          .select("*")
          .order("date", { ascending: false })
          .limit(300);

        if (data) {
          allExpenses = normalizeExpensesForState(data);
        }
      }

      // Compute total for current month.
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      const thisMonthExpenses = allExpenses.filter(
        (e) => e.date >= startOfMonth,
      );
      const total = thisMonthExpenses.reduce(
        (acc, curr) => acc + curr.amount,
        0,
      );
      setTotalMonth(total);

      // Sort descending by date
      allExpenses.sort((a, b) => b.date.getTime() - a.date.getTime());
      setAllExpenses(allExpenses);
      setStoreExpenses(allExpenses);
    } catch (e) {
      console.error("Error loading home data:", e);
    }
  }, [authStatus, setStoreExpenses]);

  const handleDelete = (item: any) => {
    Alert.alert(
      "Delete Expense",
      `Are you sure you want to delete "${item.description}"?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              const { error } = await deleteExpense(item.id);
              if (error) {
                Alert.alert("Error", error);
                return;
              }

              loadHomeData();
            } catch (e) {
              console.error("Delete error:", e);
              Alert.alert("Error", "Failed to delete expense.");
            }
          },
        },
      ],
    );
  };

  // Reload every time screen becomes focused.
  useEffect(() => {
    if (isFocused) {
      loadHomeData();
      loadBudgets();
    }
  }, [isFocused, loadBudgets, loadHomeData]);

  useEffect(() => {
    const showSubscription = Keyboard.addListener(
      "keyboardDidShow",
      (event) => {
        setKeyboardHeight(event.endCoordinates.height);
      },
    );
    const hideSubscription = Keyboard.addListener("keyboardDidHide", () => {
      setKeyboardHeight(0);
    });

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  return (
    <SafeAreaView
      edges={["left", "right"]}
      style={[styles.container, { backgroundColor: theme.background }]}
    >
      <ScrollView contentContainerStyle={{ paddingBottom: 50 }}>
        <ScreenHeader title="Home" />

        {/* Main card - Current month total */}
        <View
          style={[
            styles.heroCard,
            {
              backgroundColor: theme.surface,
              borderColor: theme.border,
            },
          ]}
        >
          <View style={styles.heroGlowA} />
          <View style={styles.heroGlowB} />

          <Text style={[styles.heroEyebrow, { color: theme.textSecondary }]}>
            Monthly Budget
          </Text>
          <Text style={[styles.heroLabel, { color: theme.textPrimary }]}>
            Spent this Month
          </Text>
          <Text style={[styles.heroValue, { color: theme.textPrimary }]}>
            {totalMonth.toFixed(2)}{" "}
            <Text style={[styles.currency, { color: theme.textSecondary }]}>
              {currency}
            </Text>
          </Text>

          {budgets.totalLimit ? (
            <View
              style={[
                styles.budgetPanel,
                {
                  backgroundColor: theme.background,
                  borderColor: theme.border,
                },
              ]}
            >
              <BudgetProgressBar
                spent={totalMonth}
                limit={budgets.totalLimit}
                currency={currency}
              />
            </View>
          ) : (
            <Pressable
              style={[
                styles.setLimitCta,
                {
                  backgroundColor: theme.background,
                  borderColor: theme.border,
                },
              ]}
              onPress={() => navigation.navigate("StatisticsScreen")}
            >
              <Text
                style={[styles.setLimitCtaText, { color: theme.textSecondary }]}
              >
                Set your monthly limit in Statistics
              </Text>
            </Pressable>
          )}
        </View>

        {/* SECTION 2: Action buttons */}
        <View style={styles.actionsGrid}>
          <Pressable
            style={[styles.actionButton, { backgroundColor: theme.surface }]}
            onPress={() => navigation.navigate("AddExpenseScreen")}
          >
            <View style={[styles.iconBox, { backgroundColor: theme.border }]}>
              <MaterialCommunityIcons
                name="plus"
                size={32}
                color={theme.primary}
              />
            </View>
            <Text style={[styles.actionText, { color: theme.textPrimary }]}>
              Add Expense
            </Text>
          </Pressable>

          <Pressable
            style={[styles.actionButton, { backgroundColor: theme.surface }]}
            onPress={() => navigation.navigate("StatisticsScreen")}
          >
            <View style={[styles.iconBox, { backgroundColor: theme.border }]}>
              <MaterialCommunityIcons
                name="chart-bar"
                size={32}
                color={theme.primary}
              />
            </View>
            <Text style={[styles.actionText, { color: theme.textPrimary }]}>
              Statistics
            </Text>
          </Pressable>
        </View>

        {/* SECTION 3: Recent list */}
        <View style={styles.recentSection}>
          <View
            style={[
              styles.searchContainer,
              {
                backgroundColor: theme.surface,
                borderColor: theme.border,
              },
            ]}
          >
            <MaterialCommunityIcons
              name="magnify"
              size={20}
              color={theme.textSecondary}
            />
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              onFocus={() => setIsSearchFocused(true)}
              onBlur={() => setIsSearchFocused(false)}
              placeholder="Search by description, category, or amount"
              placeholderTextColor={theme.textSecondary}
              style={[styles.searchInput, { color: theme.textPrimary }]}
            />
            {searchQuery ? (
              <Pressable
                onPress={() => setSearchQuery("")}
                hitSlop={8}
                style={styles.clearButton}
              >
                <MaterialCommunityIcons
                  name="close-circle"
                  size={20}
                  color={theme.textSecondary}
                />
              </Pressable>
            ) : null}
          </View>

          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>
              Recent Activity
            </Text>
          </View>

          {!showSearchResultsAboveKeyboard && displayedExpenses.length === 0 ? (
            <Text
              style={{
                color: theme.textSecondary,
                fontStyle: "italic",
                marginTop: 10,
              }}
            >
              No expenses yet.
            </Text>
          ) : !showSearchResultsAboveKeyboard ? (
            displayedExpenses.map((item, index) => (
              <ExpenseCard
                key={item.id ?? index}
                item={item}
                currency={currency}
                onEdit={() => {
                  const { date, ...rest } = item;
                  navigation.navigate("UpdateScreen", {
                    expense: { ...rest, date: date.toISOString() },
                  });
                }}
                onDelete={() => handleDelete(item)}
              />
            ))
          ) : null}

          {showSearchResultsAboveKeyboard ? (
            <Text
              style={{
                color: theme.textSecondary,
                fontStyle: "italic",
                marginTop: 10,
              }}
            >
              Search results are shown above the keyboard.
            </Text>
          ) : null}

          {showToggleButton && (
            <Pressable
              onPress={() => setExpanded(!expanded)}
              style={styles.expandButtonContainer}
            >
              <Text style={[styles.expandButton, { color: theme.primary }]}>
                {expanded ? "Show Less" : "Show more"}
              </Text>
            </Pressable>
          )}
        </View>
      </ScrollView>

      {showSearchResultsAboveKeyboard ? (
        <View
          style={[
            styles.keyboardResultsContainer,
            {
              backgroundColor: theme.surface,
              borderColor: theme.border,
              bottom: keyboardHeight + 8,
            },
          ]}
        >
          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.keyboardResultsContent}
            showsVerticalScrollIndicator={false}
          >
            {displayedExpenses.length === 0 ? (
              <Text
                style={{
                  color: theme.textSecondary,
                  fontStyle: "italic",
                  paddingHorizontal: 4,
                }}
              >
                No matching expenses.
              </Text>
            ) : (
              displayedExpenses.map((item, index) => (
                <ExpenseCard
                  key={item.id ?? index}
                  item={item}
                  currency={currency}
                  onEdit={() => {
                    const { date, ...rest } = item;
                    navigation.navigate("UpdateScreen", {
                      expense: { ...rest, date: date.toISOString() },
                    });
                  }}
                  onDelete={() => handleDelete(item)}
                />
              ))
            )}
          </ScrollView>
        </View>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
  },
  // HERO CARD
  heroCard: {
    backgroundColor: "#1D2834",
    borderRadius: 24,
    padding: 22,
    marginTop: 8,
    marginBottom: 30,
    borderWidth: 1,
    borderColor: "#314355",
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 14,
    elevation: 8,
  },
  heroGlowA: {
    position: "absolute",
    top: -30,
    right: -30,
    width: 140,
    height: 140,
    borderRadius: 999,
    backgroundColor: "rgba(75, 192, 192, 0.2)",
  },
  heroGlowB: {
    position: "absolute",
    bottom: -45,
    left: -30,
    width: 150,
    height: 150,
    borderRadius: 999,
    backgroundColor: "rgba(0, 122, 255, 0.18)",
  },
  heroEyebrow: {
    color: "#AFC4D8",
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: 6,
  },
  heroLabel: {
    color: "#E6EDF4",
    fontSize: 14,
    marginBottom: 8,
    fontWeight: "600",
  },
  heroValue: {
    color: "white",
    fontSize: 36,
    fontWeight: "bold",
    marginBottom: 14,
  },
  currency: {
    fontSize: 16,
    fontWeight: "normal",
    color: "#D0DEE8",
  },
  budgetPanel: {
    backgroundColor: "rgba(12, 16, 21, 0.45)",
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: "#334252",
  },
  setLimitCta: {
    backgroundColor: "rgba(12, 16, 21, 0.55)",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: "#334252",
  },
  setLimitCtaText: {
    color: "#BFD1E1",
    fontWeight: "600",
    fontSize: 13,
  },
  // GRID
  actionsGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 30,
  },
  actionButton: {
    backgroundColor: "#333",
    width: "48%",
    padding: 20,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  iconBox: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 10,
  },
  actionText: {
    color: "white",
    fontWeight: "bold",
    fontSize: 15,
  },
  // RECENT LIST
  recentSection: {
    marginTop: 10,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    paddingVertical: 0,
  },
  clearButton: {
    justifyContent: "center",
    alignItems: "center",
  },
  keyboardResultsContainer: {
    position: "absolute",
    left: 20,
    right: 20,
    borderWidth: 1,
    borderRadius: 14,
    maxHeight: 320,
    padding: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 10,
  },
  keyboardResultsContent: {
    paddingBottom: 2,
  },
  sectionHeader: {
    marginBottom: 15,
  },
  sectionTitle: {
    color: "white",
    fontSize: 18,
    fontWeight: "bold",
  },
  expandButton: {
    color: "#4BC0C0",
    fontSize: 14,
    fontWeight: "600",
  },
  expandButtonContainer: {
    marginTop: 4,
    alignSelf: "center",
    paddingVertical: 6,
  },
});
