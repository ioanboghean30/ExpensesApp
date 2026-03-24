import { MaterialCommunityIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useIsFocused } from "@react-navigation/native";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { BarChart, PieChart } from "react-native-chart-kit";
import { BudgetProgressBar, ScreenHeader } from "../components";
import { THEMES } from "../constants/theme";
import { TIME_FILTERS, useCustomCategories, useStatistics } from "../hooks";
import { supabase } from "../lib/supabaseClient";
import { useAppStore } from "../store/useAppStore";
import { toBudgetPercentage } from "../utils/budgeting";
import { normalizeExpensesForState } from "../utils/normalizeData";

const SCREEN_WIDTH = Dimensions.get("window").width;

type ExpenseItem = {
  id: string;
  amount: number;
  description: string;
  date: Date;
  category: string;
};

const toBudgetInput = (value: string): string => {
  const withDot = value.replace(/,/g, ".");
  const onlyValidChars = withDot.replace(/[^0-9.]/g, "");
  const firstDotIndex = onlyValidChars.indexOf(".");
  if (firstDotIndex === -1) return onlyValidChars;

  return (
    onlyValidChars.slice(0, firstDotIndex + 1) +
    onlyValidChars.slice(firstDotIndex + 1).replace(/\./g, "")
  );
};

export default function StatisticsScreen() {
  const authStatus = useAppStore((state) => state.authStatus);
  const currentTheme = useAppStore((state) => state.currentTheme);
  const setStoreExpenses = useAppStore((state) => state.setExpenses);
  const customCategories = useAppStore((state) => state.customCategories);
  const budgets = useAppStore((state) => state.budgets);
  const loadBudgets = useAppStore((state) => state.loadBudgets);
  const setTotalBudgetLimit = useAppStore((state) => state.setTotalBudgetLimit);
  const setCategoryBudgetLimit = useAppStore(
    (state) => state.setCategoryBudgetLimit,
  );
  const removeCategoryBudgetLimit = useAppStore(
    (state) => state.removeCategoryBudgetLimit,
  );

  const { allCategories, categoryFilters, getCategoryColorSafe } =
    useCustomCategories({
      customCategories,
      includeAllOption: true,
    });

  const [expenses, setExpenses] = useState<ExpenseItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const isFocused = useIsFocused();

  const [currency, setCurrency] = useState("RON");
  const [isBudgetModalVisible, setIsBudgetModalVisible] = useState(false);
  const [showAllBudgets, setShowAllBudgets] = useState(false);
  const [totalLimitInput, setTotalLimitInput] = useState("");
  const [categoryLimitInputs, setCategoryLimitInputs] = useState<
    Record<string, string>
  >({});
  const theme = THEMES[currentTheme];

  useEffect(() => {
    const loadCurrency = async () => {
      try {
        const savedCurrency = await AsyncStorage.getItem("userCurrency");
        if (savedCurrency) {
          setCurrency(savedCurrency);
        }
      } catch (e) {
        console.error("Failed to load currency", e);
      }
    };

    if (isFocused) {
      loadCurrency();
    }
  }, [isFocused]);

  const {
    activeFilter,
    setActiveFilter,
    activeCategory,
    setActiveCategory,
    customStart,
    customEnd,
    showPicker,
    pickerMode,
    onDateChange,
    openDatePicker,
    filteredExpenses,
    categoryList,
    trendData,
    chartWidth,
    totalSpent,
    dailyAverage,
    transactionList,
  } = useStatistics({
    expenses,
    getCategoryColor: getCategoryColorSafe,
  });

  useEffect(() => {
    const loadExpenses = async () => {
      setIsLoading(true);
      try {
        let loadedExpenses: ExpenseItem[] = [];
        if (authStatus === "guest") {
          const savedExpensesJson = await AsyncStorage.getItem("savedExpenses");
          if (savedExpensesJson !== null) {
            const savedExpenses = JSON.parse(savedExpensesJson);
            loadedExpenses = normalizeExpensesForState(
              Array.isArray(savedExpenses) ? savedExpenses : [],
            );
          }
        } else if (authStatus === "loggedIn") {
          const { data, error } = await supabase.from("expenses").select("*");
          if (error) throw error;
          if (data) {
            loadedExpenses = normalizeExpensesForState(data);
          }
        }
        setExpenses(loadedExpenses);
        setStoreExpenses(loadedExpenses);
      } catch (e) {
        console.error("Error loading expenses:", e);
      } finally {
        setIsLoading(false);
      }
    };

    if (isFocused) {
      loadExpenses();
      loadBudgets();
    }
  }, [authStatus, isFocused, loadBudgets, setStoreExpenses]);

  const monthlyCategorySpent = useMemo(() => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    return expenses.reduce<Record<string, number>>((acc, expense) => {
      if (expense.date < startOfMonth) {
        return acc;
      }

      acc[expense.category] = (acc[expense.category] ?? 0) + expense.amount;
      return acc;
    }, {});
  }, [expenses]);

  const sortedLimitedCategories = useMemo(
    () =>
      Object.entries(budgets.categoryLimits)
        .filter(([, limit]) => Number.isFinite(limit) && limit > 0)
        .map(([category, limit]) => {
          const spent = monthlyCategorySpent[category] ?? 0;
          const percentage = toBudgetPercentage(spent, limit);
          return {
            category,
            limit,
            spent,
            percentage,
          };
        })
        .sort((a, b) => {
          if (b.percentage !== a.percentage) {
            return b.percentage - a.percentage;
          }

          if (b.spent !== a.spent) {
            return b.spent - a.spent;
          }

          return a.category.localeCompare(b.category);
        }),
    [budgets.categoryLimits, monthlyCategorySpent],
  );

  const monthlyTotalSpent = useMemo(
    () =>
      Object.values(monthlyCategorySpent).reduce(
        (acc, value) => acc + value,
        0,
      ),
    [monthlyCategorySpent],
  );

  const hasTotalLimit =
    Number.isFinite(budgets.totalLimit) && (budgets.totalLimit ?? 0) > 0;
  const displayedCategoryBudgets = showAllBudgets
    ? sortedLimitedCategories
    : sortedLimitedCategories.slice(0, 1);
  const canToggleBudgetView =
    sortedLimitedCategories.length > 1 || hasTotalLimit;

  const openBudgetModal = () => {
    setTotalLimitInput(budgets.totalLimit ? String(budgets.totalLimit) : "");

    const nextInputs: Record<string, string> = {};
    allCategories.forEach((category) => {
      const current = budgets.categoryLimits[category];
      nextInputs[category] = current ? String(current) : "";
    });

    setCategoryLimitInputs(nextInputs);
    setIsBudgetModalVisible(true);
  };

  const handleSaveTotalLimit = async () => {
    const trimmed = totalLimitInput.trim();
    const parsed = Number(trimmed);

    if (!trimmed) {
      const result = await setTotalBudgetLimit(null);
      if (result.error) {
        return;
      }
      return;
    }

    if (!Number.isFinite(parsed) || Number.isNaN(parsed) || parsed <= 0) {
      return;
    }

    await setTotalBudgetLimit(parsed);
  };

  const handleDeleteTotalLimit = async () => {
    await setTotalBudgetLimit(null);
    setTotalLimitInput("");
  };

  const handleSaveCategoryLimit = async (category: string) => {
    const raw = categoryLimitInputs[category] ?? "";
    const trimmed = raw.trim();

    if (!trimmed) {
      await removeCategoryBudgetLimit(category);
      return;
    }

    const parsed = Number(trimmed);
    if (!Number.isFinite(parsed) || Number.isNaN(parsed) || parsed <= 0) {
      return;
    }

    await setCategoryBudgetLimit(category, parsed);
  };

  const handleDeleteCategoryLimit = async (category: string) => {
    await removeCategoryBudgetLimit(category);
    setCategoryLimitInputs((prev) => ({
      ...prev,
      [category]: "",
    }));
  };

  const trendMaxValue = useMemo(() => {
    const values = trendData.datasets[0]?.data ?? [];
    return values.reduce((max, value) => Math.max(max, value), 0);
  }, [trendData.datasets]);

  const trendAxisValues = useMemo(() => {
    const axisSteps = 4;

    if (trendMaxValue <= 0) {
      return [0];
    }

    const step = trendMaxValue / axisSteps;
    return Array.from({ length: axisSteps + 1 }, (_, index) =>
      Math.round((axisSteps - index) * step),
    );
  }, [trendMaxValue]);

  const formatTrendAxisValue = (value: number) => {
    if (value >= 10000) {
      return `${Math.round(value / 1000)}k`;
    }

    if (value >= 1000) {
      return `${(value / 1000).toFixed(1)}k`;
    }

    return `${Math.round(value)}`;
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {isLoading ? (
        <ActivityIndicator
          size="large"
          color={theme.primary}
          style={{ marginTop: 50 }}
        />
      ) : (
        <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
          <View style={styles.screenHeaderWrap}>
            <ScreenHeader title="Statistics" />
          </View>

          <View style={styles.filterSection}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.filterScroll}
            >
              {TIME_FILTERS.map((filter) => (
                <Pressable
                  key={filter.id}
                  style={[
                    styles.filterPill,
                    {
                      backgroundColor: theme.surface,
                      borderColor: theme.border,
                    },
                    activeFilter === filter.id && styles.filterPillActive,
                    activeFilter === filter.id
                      ? {
                          backgroundColor: theme.primary,
                          borderColor: theme.primary,
                        }
                      : null,
                  ]}
                  onPress={() => setActiveFilter(filter.id)}
                >
                  <Text
                    style={[
                      styles.filterText,
                      { color: theme.textSecondary },
                      activeFilter === filter.id && styles.filterTextActive,
                      activeFilter === filter.id
                        ? {
                            color: theme.background,
                          }
                        : null,
                    ]}
                  >
                    {filter.label}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
            {activeFilter === "custom" && (
              <View style={styles.customDateContainer}>
                <Pressable
                  onPress={() => openDatePicker("start")}
                  style={styles.dateButton}
                >
                  <MaterialCommunityIcons
                    name="calendar-arrow-right"
                    size={20}
                    color="#aaa"
                  />
                  <Text style={styles.dateButtonText}>
                    {customStart.toLocaleDateString("ro-RO")}
                  </Text>
                </Pressable>

                <Text style={{ color: theme.textSecondary }}>-</Text>

                <Pressable
                  onPress={() => openDatePicker("end")}
                  style={styles.dateButton}
                >
                  <Text style={styles.dateButtonText}>
                    {customEnd.toLocaleDateString("ro-RO")}
                  </Text>
                  <MaterialCommunityIcons
                    name="calendar-arrow-left"
                    size={20}
                    color="#aaa"
                  />
                </Pressable>
              </View>
            )}
            {showPicker && (
              <DateTimePicker
                value={pickerMode === "start" ? customStart : customEnd}
                mode="date"
                display="default"
                onChange={onDateChange}
                maximumDate={new Date()}
              />
            )}
          </View>

          <View style={styles.categorySection}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.filterScroll}
            >
              {categoryFilters.map((cat, index) => (
                <Pressable
                  key={index}
                  style={[
                    styles.categoryChip,
                    {
                      borderColor: theme.border,
                    },
                    activeCategory === cat && {
                      backgroundColor:
                        cat === "All"
                          ? theme.primary
                          : getCategoryColorSafe(cat),
                      borderColor: "transparent",
                    },
                  ]}
                  onPress={() => setActiveCategory(cat)}
                >
                  <Text
                    style={[
                      styles.categoryText,
                      { color: theme.textSecondary },
                      activeCategory === cat && {
                        color: theme.background,
                        fontWeight: "bold",
                      },
                    ]}
                  >
                    {cat}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>

          <View style={styles.cardsRow}>
            <View style={[styles.kpiCard, { backgroundColor: theme.surface }]}>
              <View style={styles.iconCircle}>
                <MaterialCommunityIcons
                  name="wallet-outline"
                  size={24}
                  color={theme.primary}
                />
              </View>
              <Text style={[styles.cardLabel, { color: theme.textSecondary }]}>
                Total Spent
              </Text>
              <Text style={[styles.cardValue, { color: theme.textPrimary }]}>
                {totalSpent.toFixed(2)}{" "}
                <Text style={[styles.currency, { color: theme.textSecondary }]}>
                  {currency}
                </Text>
              </Text>
            </View>

            <View style={[styles.kpiCard, { backgroundColor: theme.surface }]}>
              <View
                style={[styles.iconCircle, { backgroundColor: theme.border }]}
              >
                <MaterialCommunityIcons
                  name="chart-timeline-variant"
                  size={24}
                  color={theme.primary}
                />
              </View>
              <Text style={[styles.cardLabel, { color: theme.textSecondary }]}>
                Daily Avg
              </Text>
              <Text style={[styles.cardValue, { color: theme.textPrimary }]}>
                {dailyAverage.toFixed(2)}{" "}
                <Text style={[styles.currency, { color: theme.textSecondary }]}>
                  {currency}
                </Text>
              </Text>
            </View>
          </View>

          {filteredExpenses.length > 0 ? (
            <View style={styles.chartContainer}>
              <Text
                style={[
                  styles.sectionTitle,
                  styles.trendSectionTitle,
                  { color: theme.textPrimary },
                ]}
              >
                Spending Trend
              </Text>
              <View style={styles.trendChartRow}>
                <View style={styles.trendAxisColumn}>
                  {trendAxisValues.map((value, index) => (
                    <Text
                      key={`${value}-${index}`}
                      style={[
                        styles.trendAxisLabel,
                        { color: theme.textSecondary },
                      ]}
                    >
                      {formatTrendAxisValue(value)} {currency}
                    </Text>
                  ))}
                </View>

                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={styles.trendChartScroll}
                  contentContainerStyle={styles.trendChartScrollContent}
                >
                  <BarChart
                    data={trendData}
                    width={chartWidth}
                    height={220}
                    yAxisLabel=""
                    yAxisSuffix=""
                    fromZero={true}
                    withHorizontalLabels={false}
                    chartConfig={{
                      backgroundColor: theme.background,
                      backgroundGradientFrom: theme.background,
                      backgroundGradientTo: theme.background,
                      decimalPlaces: 0,
                      color: (opacity = 1) => `rgba(71, 229, 188, ${opacity})`,
                      labelColor: (opacity = 1) =>
                        `rgba(141, 153, 174, ${opacity})`,
                      style: {
                        borderRadius: 16,
                      },
                      barPercentage: 0.5,
                    }}
                    style={styles.trendChart}
                    verticalLabelRotation={0}
                  />
                </ScrollView>
              </View>
              <PieChart
                data={categoryList}
                width={SCREEN_WIDTH - 30}
                height={220}
                chartConfig={{
                  color: (opacity = 1) => `rgba(141, 153, 174, ${opacity})`,
                }}
                accessor={"population"}
                backgroundColor={"transparent"}
                paddingLeft={"15"}
                absolute
              />
            </View>
          ) : (
            <Text style={[styles.noDataText, { color: theme.textSecondary }]}>
              No expenses for this period.
            </Text>
          )}

          <View style={styles.listContainer}>
            <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>
              {activeCategory === "All"
                ? "Top Categories"
                : "Transactions List"}
            </Text>
            {activeCategory === "All"
              ? categoryList.map((item: any, index: number) => (
                  <View
                    key={index}
                    style={[
                      styles.listItem,
                      { backgroundColor: theme.surface },
                    ]}
                  >
                    <View
                      style={[
                        styles.iconCircleSmall,
                        { backgroundColor: item.color },
                      ]}
                    >
                      <MaterialCommunityIcons
                        name="shape-outline"
                        size={20}
                        color={theme.textPrimary}
                      />
                    </View>
                    <Text
                      style={[
                        styles.listItemName,
                        { color: theme.textPrimary },
                      ]}
                    >
                      {item.name}
                    </Text>
                    <Text
                      style={[styles.listItemValue, { color: theme.primary }]}
                    >
                      {item.population.toFixed(2)} {currency}
                    </Text>
                  </View>
                ))
              : transactionList.map((item) => (
                  <View
                    key={item.id}
                    style={[
                      styles.listItem,
                      { backgroundColor: theme.surface },
                    ]}
                  >
                    <View
                      style={[
                        styles.dateBox,
                        { backgroundColor: theme.border },
                      ]}
                    >
                      <Text
                        style={[styles.dateDay, { color: theme.textPrimary }]}
                      >
                        {item.date.getDate()}
                      </Text>
                      <Text
                        style={[
                          styles.dateMonth,
                          { color: theme.textSecondary },
                        ]}
                      >
                        {item.date.toLocaleString("default", {
                          month: "short",
                        })}
                      </Text>
                    </View>
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <Text
                        style={[
                          styles.listItemName,
                          { color: theme.textPrimary },
                        ]}
                        numberOfLines={1}
                      >
                        {item.description}
                      </Text>
                      <Text
                        style={[styles.subText, { color: theme.textSecondary }]}
                      >
                        {item.date.toLocaleString()}
                      </Text>
                    </View>

                    <Text
                      style={[styles.listItemValue, { color: theme.primary }]}
                    >
                      {item.amount.toFixed(2)} {currency}
                    </Text>
                  </View>
                ))}
          </View>

          <View style={styles.budgetHeaderRow}>
            <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>
              Budgets
            </Text>
            <Pressable
              style={[styles.limitButton, { backgroundColor: theme.primary }]}
              onPress={openBudgetModal}
            >
              <MaterialCommunityIcons
                name="pencil-outline"
                size={16}
                color={theme.background}
              />
              <Text
                style={[styles.limitButtonText, { color: theme.background }]}
              >
                View & Edit Your Limits
              </Text>
            </Pressable>
          </View>

          {sortedLimitedCategories.length > 0 ? (
            <View
              style={[
                styles.categoryBudgetContainer,
                {
                  backgroundColor: theme.surface,
                  borderColor: theme.border,
                },
              ]}
            >
              {displayedCategoryBudgets.map((item) => (
                <View
                  key={item.category}
                  style={[
                    styles.categoryBudgetItem,
                    { borderBottomColor: theme.border },
                  ]}
                >
                  <View style={styles.categoryBudgetTitleRow}>
                    <Text
                      style={[
                        styles.categoryBudgetTitle,
                        { color: theme.textPrimary },
                      ]}
                    >
                      {item.category}
                    </Text>
                    <Text
                      style={[
                        styles.categoryBudgetSpent,
                        { color: theme.textSecondary },
                      ]}
                    >
                      {item.spent.toFixed(2)} {currency}
                    </Text>
                  </View>

                  <BudgetProgressBar
                    spent={item.spent}
                    limit={item.limit}
                    currency={currency}
                    compact
                  />
                </View>
              ))}

              {showAllBudgets && hasTotalLimit ? (
                <View
                  style={[
                    styles.totalBudgetItem,
                    { borderTopColor: theme.border },
                  ]}
                >
                  <View style={styles.categoryBudgetTitleRow}>
                    <Text
                      style={[
                        styles.categoryBudgetTitle,
                        { color: theme.textPrimary },
                      ]}
                    >
                      Total Limit
                    </Text>
                    <Text
                      style={[
                        styles.categoryBudgetSpent,
                        { color: theme.textSecondary },
                      ]}
                    >
                      {monthlyTotalSpent.toFixed(2)} {currency}
                    </Text>
                  </View>

                  <BudgetProgressBar
                    spent={monthlyTotalSpent}
                    limit={budgets.totalLimit ?? 0}
                    currency={currency}
                    compact
                  />
                </View>
              ) : null}

              {canToggleBudgetView ? (
                <Pressable
                  style={[
                    styles.toggleBudgetViewButton,
                    {
                      backgroundColor: theme.background,
                      borderColor: theme.border,
                    },
                  ]}
                  onPress={() => setShowAllBudgets((prev) => !prev)}
                >
                  <MaterialCommunityIcons
                    name={showAllBudgets ? "chevron-up" : "chevron-down"}
                    size={16}
                    color={theme.textPrimary}
                  />
                  <Text
                    style={[
                      styles.toggleBudgetViewText,
                      { color: theme.textPrimary },
                    ]}
                  >
                    {showAllBudgets ? "Show Less" : "Show More"}
                  </Text>
                </Pressable>
              ) : null}
            </View>
          ) : (
            <Text
              style={[styles.emptyBudgetText, { color: theme.textSecondary }]}
            >
              No category budgets yet. Tap View and Edit Your Limits.
            </Text>
          )}
        </ScrollView>
      )}

      <Modal
        transparent
        animationType="slide"
        visible={isBudgetModalVisible}
        onRequestClose={() => setIsBudgetModalVisible(false)}
      >
        <View
          style={[styles.modalBackdrop, { backgroundColor: "rgba(0,0,0,0.6)" }]}
        >
          <View
            style={[
              styles.modalCard,
              {
                backgroundColor: theme.surface,
                borderColor: theme.border,
              },
            ]}
          >
            <Text style={[styles.modalTitle, { color: theme.textPrimary }]}>
              Your Monthly Limits
            </Text>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text
                style={[
                  styles.modalSectionTitle,
                  { color: theme.textSecondary },
                ]}
              >
                Total Monthly Limit
              </Text>
              <View style={styles.modalRow}>
                <TextInput
                  value={totalLimitInput}
                  onChangeText={(value) =>
                    setTotalLimitInput(toBudgetInput(value))
                  }
                  keyboardType="decimal-pad"
                  placeholder="Set total limit"
                  placeholderTextColor={theme.textSecondary}
                  style={[
                    styles.modalInput,
                    {
                      backgroundColor: theme.background,
                      borderColor: theme.border,
                      color: theme.textPrimary,
                    },
                  ]}
                />
                <Pressable
                  style={[
                    styles.modalSaveBtn,
                    { backgroundColor: theme.primary },
                  ]}
                  onPress={handleSaveTotalLimit}
                >
                  <Text
                    style={[
                      styles.modalSaveBtnText,
                      { color: theme.background },
                    ]}
                  >
                    Save
                  </Text>
                </Pressable>
                <Pressable
                  style={[
                    styles.modalDeleteBtn,
                    { backgroundColor: theme.danger },
                  ]}
                  onPress={handleDeleteTotalLimit}
                >
                  <Text
                    style={[
                      styles.modalDeleteBtnText,
                      { color: theme.textPrimary },
                    ]}
                  >
                    Delete
                  </Text>
                </Pressable>
              </View>

              <Text
                style={[
                  styles.modalSectionTitle,
                  { color: theme.textSecondary },
                ]}
              >
                Category Limits
              </Text>
              {allCategories.map((category) => (
                <View
                  key={category}
                  style={[
                    styles.categoryLimitCard,
                    {
                      backgroundColor: theme.background,
                      borderColor: theme.border,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.categoryLimitTitle,
                      { color: theme.textPrimary },
                    ]}
                  >
                    {category}
                  </Text>
                  <View style={styles.modalRow}>
                    <TextInput
                      value={categoryLimitInputs[category] ?? ""}
                      onChangeText={(value) =>
                        setCategoryLimitInputs((prev) => ({
                          ...prev,
                          [category]: toBudgetInput(value),
                        }))
                      }
                      keyboardType="decimal-pad"
                      placeholder="No limit"
                      placeholderTextColor={theme.textSecondary}
                      style={[
                        styles.modalInput,
                        {
                          backgroundColor: theme.surface,
                          borderColor: theme.border,
                          color: theme.textPrimary,
                        },
                      ]}
                    />
                    <Pressable
                      style={[
                        styles.modalSaveBtn,
                        { backgroundColor: theme.primary },
                      ]}
                      onPress={() => handleSaveCategoryLimit(category)}
                    >
                      <Text
                        style={[
                          styles.modalSaveBtnText,
                          { color: theme.background },
                        ]}
                      >
                        Save
                      </Text>
                    </Pressable>
                    <Pressable
                      style={[
                        styles.modalDeleteBtn,
                        { backgroundColor: theme.danger },
                      ]}
                      onPress={() => handleDeleteCategoryLimit(category)}
                    >
                      <Text
                        style={[
                          styles.modalDeleteBtnText,
                          { color: theme.textPrimary },
                        ]}
                      >
                        Delete
                      </Text>
                    </Pressable>
                  </View>
                </View>
              ))}
            </ScrollView>

            <Pressable
              style={[styles.modalCloseBtn, { backgroundColor: theme.border }]}
              onPress={() => setIsBudgetModalVisible(false)}
            >
              <Text
                style={[styles.modalCloseBtnText, { color: theme.textPrimary }]}
              >
                Done
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  filterSection: {
    marginBottom: 15,
  },
  screenHeaderWrap: {
    paddingHorizontal: 20,
  },
  categorySection: {
    marginBottom: 20,
  },
  filterScroll: {
    paddingHorizontal: 20,
  },
  filterPill: {
    backgroundColor: "#333",
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 10,
    borderWidth: 1,
    borderColor: "#444",
  },
  filterPillActive: {
    backgroundColor: "#007AFF",
    borderColor: "#007AFF",
  },
  filterText: {
    color: "#aaa",
    fontWeight: "600",
  },
  filterTextActive: {
    color: "white",
  },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 15,
    marginRight: 8,
    borderWidth: 1,
    borderColor: "#555",
    backgroundColor: "transparent",
  },
  categoryText: {
    color: "#ccc",
    fontSize: 13,
  },
  budgetHeaderRow: {
    paddingHorizontal: 20,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  limitButton: {
    backgroundColor: "#007AFF",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  limitButtonText: {
    color: "white",
    fontWeight: "700",
    fontSize: 12,
  },
  categoryBudgetContainer: {
    marginHorizontal: 20,
    marginBottom: 18,
    backgroundColor: "#2A2A2A",
    borderRadius: 14,
    padding: 12,
  },
  categoryBudgetItem: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#3B3B3B",
  },
  totalBudgetItem: {
    marginTop: 10,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#3B3B3B",
  },
  categoryBudgetTitleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  categoryBudgetTitle: {
    color: "white",
    fontWeight: "700",
    fontSize: 14,
  },
  categoryBudgetSpent: {
    color: "#9CB2C7",
    fontSize: 12,
    fontWeight: "600",
  },
  emptyBudgetText: {
    color: "#95A2AF",
    fontSize: 13,
    marginHorizontal: 20,
    marginBottom: 18,
  },
  toggleBudgetViewButton: {
    marginTop: 12,
    backgroundColor: "#2E3A47",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#445669",
    paddingVertical: 9,
    paddingHorizontal: 12,
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  toggleBudgetViewText: {
    color: "#DCE9F7",
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.3,
    textTransform: "uppercase",
  },
  cardsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    marginBottom: 30,
  },
  kpiCard: {
    backgroundColor: "#333",
    width: "48%",
    padding: 15,
    borderRadius: 16,
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(75, 192, 192, 0.2)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 10,
  },
  cardLabel: {
    color: "#aaa",
    fontSize: 12,
    textTransform: "uppercase",
    marginBottom: 5,
    fontWeight: "bold",
    letterSpacing: 0.5,
  },
  cardValue: {
    color: "white",
    fontSize: 22,
    fontWeight: "bold",
  },
  currency: {
    fontSize: 14,
    color: "#888",
    fontWeight: "normal",
  },
  chartContainer: {
    alignItems: "center",
    marginBottom: 20,
  },
  trendChartRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    width: "100%",
    paddingLeft: 0,
  },
  trendSectionTitle: {
    paddingLeft: 8,
  },
  trendAxisColumn: {
    height: 220,
    justifyContent: "space-between",
    minWidth: 74,
    marginRight: 8,
    paddingTop: 16,
    paddingBottom: 28,
  },
  trendAxisLabel: {
    fontSize: 11,
    fontWeight: "600",
    textAlign: "left",
    marginLeft: 12,
  },
  trendChartScroll: {
    flex: 1,
  },
  trendChartScrollContent: {
    paddingRight: 20,
  },
  trendChart: {
    marginVertical: 8,
    borderRadius: 16,
  },
  sectionTitle: {
    color: "white",
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 10,
    alignSelf: "flex-start",
  },
  noDataText: {
    color: "#aaa",
    textAlign: "center",
    marginTop: 50,
    fontSize: 16,
  },
  customDateContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 15,
    gap: 10,
  },
  dateButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#2A2A2A",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#444",
    gap: 8,
  },
  dateButtonText: {
    color: "white",
    fontSize: 14,
  },
  listContainer: {
    marginTop: 20,
    paddingHorizontal: 20,
    marginBottom: 30,
  },
  listItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#333",
    padding: 12,
    borderRadius: 12,
    marginBottom: 10,
  },
  iconCircleSmall: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  listItemName: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
    flex: 1,
  },
  listItemValue: {
    color: "#4BC0C0",
    fontSize: 16,
    fontWeight: "bold",
  },
  dateBox: {
    backgroundColor: "#222",
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
    alignItems: "center",
    minWidth: 45,
  },
  dateDay: {
    color: "white",
    fontWeight: "bold",
    fontSize: 16,
  },
  dateMonth: {
    color: "#aaa",
    fontSize: 10,
    textTransform: "uppercase",
  },
  subText: {
    color: "#777",
    fontSize: 12,
    marginTop: 2,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "center",
    paddingHorizontal: 18,
  },
  modalCard: {
    maxHeight: "86%",
    backgroundColor: "#1F252D",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#36424F",
    padding: 16,
  },
  modalTitle: {
    color: "white",
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 14,
  },
  modalSectionTitle: {
    color: "#AFC1D2",
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 8,
    marginTop: 8,
    textTransform: "uppercase",
    letterSpacing: 0.7,
  },
  categoryLimitCard: {
    backgroundColor: "#2A313A",
    borderRadius: 10,
    padding: 10,
    marginBottom: 8,
  },
  categoryLimitTitle: {
    color: "#E7EEF6",
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 8,
  },
  modalRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  modalInput: {
    flex: 1,
    backgroundColor: "#11161C",
    borderWidth: 1,
    borderColor: "#3B4957",
    borderRadius: 10,
    color: "white",
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  modalSaveBtn: {
    backgroundColor: "#007AFF",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  modalSaveBtnText: {
    color: "white",
    fontWeight: "700",
    fontSize: 12,
  },
  modalDeleteBtn: {
    backgroundColor: "#712B2B",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  modalDeleteBtnText: {
    color: "#F5DADA",
    fontWeight: "700",
    fontSize: 12,
  },
  modalCloseBtn: {
    marginTop: 12,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
    backgroundColor: "#27313D",
  },
  modalCloseBtnText: {
    color: "#DEE8F2",
    fontWeight: "700",
  },
});
