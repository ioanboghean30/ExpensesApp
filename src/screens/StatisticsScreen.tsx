import { MaterialCommunityIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useIsFocused } from "@react-navigation/native";
import React, { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Dimensions,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from "react-native";
import { BarChart, PieChart } from "react-native-chart-kit";
import { supabase } from "../lib/supabaseClient";
import {
    DEFAULT_CATEGORIES,
    getCategoryColor,
    useAppStore,
} from "../store/useAppStore";

// Visual settings
const SCREEN_WIDTH = Dimensions.get("window").width;

// Available time filters
const TIME_FILTERS = [
  { id: "7days", label: "7 Days" },
  { id: "month", label: "This Month" },
  { id: "year", label: "This Year" },
  { id: "all", label: "All Time" },
  { id: "custom", label: "Custom" },
];

type ExpenseItem = {
  id: string;
  amount: number;
  description: string;
  date: Date;
  category: string;
};

export default function StatisticsScreen() {
  const authStatus = useAppStore((state) => state.authStatus);
  const customCategories = useAppStore((state) => state.customCategories);
  const categoryFilters = ["All", ...DEFAULT_CATEGORIES, ...customCategories];
  const [expenses, setExpenses] = useState<ExpenseItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const isFocused = useIsFocused();

  // Currency selected in settings.
  const [currency, setCurrency] = useState("RON");
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

  // UI state
  const [activeFilter, setActiveFilter] = useState("month"); // Default: current month.
  const [activeCategory, setActiveCategory] = useState("All"); // Default: all categories.

  const [customStart, setCustomStart] = useState(new Date());
  const [customEnd, setCustomEnd] = useState(new Date());
  const [showPicker, setShowPicker] = useState(false); // Toggle date picker visibility.
  const [pickerMode, setPickerMode] = useState<"start" | "end">("start"); // Track which date is being edited.

  const onDateChange = (event: any, selectedDate: Date | undefined) => {
    setShowPicker(Platform.OS === "ios"); // iOS keeps picker open; Android closes automatically.
    if (event.type === "dismissed") {
      setShowPicker(false);
      return;
    }
    if (selectedDate) {
      if (pickerMode === "start") {
        setCustomStart(selectedDate);
      } else {
        setCustomEnd(selectedDate);
      }
    }
  };

  const openDatePicker = (mode: "start" | "end") => {
    setPickerMode(mode);
    setShowPicker(true);
  };

  // Load expenses for current auth mode.
  useEffect(() => {
    const loadExpenses = async () => {
      setIsLoading(true);
      try {
        let loadedExpenses: ExpenseItem[] = [];
        if (authStatus === "guest") {
          const savedExpensesJson = await AsyncStorage.getItem("savedExpenses");
          if (savedExpensesJson !== null) {
            const savedExpenses = JSON.parse(savedExpensesJson);
            loadedExpenses = savedExpenses.map((c: any) => ({
              id: String(c.id ?? Math.random().toString()),
              amount: Number(c.amount ?? 0),
              description: String(c.description ?? ""),
              category: String(c.category ?? "Other"),
              date: new Date(c.date ?? Date.now()),
            }));
          }
        } else if (authStatus === "loggedIn") {
          const { data, error } = await supabase.from("expenses").select("*");
          if (error) throw error;
          if (data) {
            loadedExpenses = data.map((c: any) => ({
              id: c.id.toString(),
              amount: Number(c.amount ?? 0),
              description: String(c.description ?? ""),
              category: String(c.category ?? "Other"),
              date: new Date(c.date ?? Date.now()),
            }));
          }
        }
        setExpenses(loadedExpenses);
      } catch (e) {
        console.error("Error loading expenses:", e);
      } finally {
        setIsLoading(false);
      }
    };
    if (isFocused) {
      loadExpenses();
    }
  }, [authStatus, isFocused]);

  const getStartDate = () => {
    const now = new Date();
    const start = new Date();

    switch (activeFilter) {
      case "7days":
        start.setDate(now.getDate() - 7); // Start from today and include last 7 days.
        break;
      case "month":
        start.setDate(1); // Start at first day of current month.
        break;
      case "year":
        start.setMonth(0, 1); // Jan 1st of current year.
        break;
      case "custom":
        start.setTime(customStart.getTime());
        break;
      case "all":
        return new Date(0); // Earliest possible date.
    }
    start.setHours(0, 0, 0, 0); // Start of day boundary.
    return start;
  };
  // Apply active time + category filters.
  const filteredExpenses = expenses.filter((item) => {
    const itemDate = new Date(item.date);
    const startDate = getStartDate();

    // Custom filter needs both start and end bounds.
    let matchesTime = false;
    if (activeFilter === "custom") {
      // Include full selected end day.
      const end = new Date(customEnd);
      end.setHours(23, 59, 59, 999);
      matchesTime = itemDate >= startDate && itemDate <= end;
    } else {
      matchesTime = itemDate >= startDate;
    }

    // Category filter check.
    const matchesCategory =
      activeCategory === "All" || item.category === activeCategory;
    // Keep only rows that satisfy both filters.
    return matchesTime && matchesCategory;
  });

  // Pie chart category aggregation.
  const getChartData = () => {
    const totalsByCategory: { [key: string]: number } = {};
    filteredExpenses.forEach((item) => {
      if (totalsByCategory[item.category]) {
        totalsByCategory[item.category] += item.amount;
      } else {
        totalsByCategory[item.category] = item.amount;
      }
    });

    return Object.keys(totalsByCategory)
      .map((categoryName) => ({
        name: categoryName,
        population: totalsByCategory[categoryName],
        color: getCategoryColor(categoryName),
        legendFontColor: "#bbb",
        legendFontSize: 12,
      }))
      .sort((a, b) => b.population - a.population);
  };
  // Build bar chart trend data.
  const getTrendData = () => {
    const dataMap: { [key: string]: number } = {};
    const labels: string[] = [];

    // 1. Define start and end bounds.
    let end = new Date();
    let start = new Date(getStartDate());

    if (activeFilter === "custom") {
      end = new Date(customEnd);
    }

    // Normalize to day boundaries.
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);

    // Special adjustments
    if (activeFilter === "month") start.setDate(1);
    if (activeFilter === "all") {
      if (expenses.length > 0) {
        const expenseDates = expenses.map((c) => c.date.getTime());
        start = new Date(Math.min(...expenseDates));
        start.setDate(1);
        start.setHours(0, 0, 0, 0);
      } else {
        start = new Date(new Date().getFullYear(), 0, 1);
      }
    }

    // 2. Decide grouping granularity (days vs months).
    let groupByMonth = false;

    if (activeFilter === "year" || activeFilter === "all") {
      groupByMonth = true;
    } else if (activeFilter === "custom") {
      // Compute day span.
      const diffTime = Math.abs(end.getTime() - start.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      if (diffDays > 30) groupByMonth = true;
    }

    if (groupByMonth) start.setDate(1);

    // 3. Generate timeline labels.
    let current = new Date(start);

    while (current <= end) {
      let label = "";

      if (groupByMonth) {
        // Monthly mode
        const monthName = current.toLocaleString("default", { month: "short" });
        const year = current.getFullYear().toString().slice(-2);
        label = `${monthName} '${year}`;
        // Advance by one month
        current.setMonth(current.getMonth() + 1);
      } else {
        // Daily mode
        label = `${current.getDate()}/${current.getMonth() + 1}`;
        // Advance by one day
        current.setDate(current.getDate() + 1);
      }

      labels.push(label);
      dataMap[label] = 0; // Pre-fill missing labels with zero.
    }

    // 4. Fill timeline values from filtered expenses.
    filteredExpenses.forEach((item) => {
      let label = "";
      if (groupByMonth) {
        const monthName = item.date.toLocaleString("default", {
          month: "short",
        });
        const year = item.date.getFullYear().toString().slice(-2);
        label = `${monthName} '${year}`;
      } else {
        label = `${item.date.getDate()}/${item.date.getMonth() + 1}`;
      }

      if (dataMap[label] !== undefined) {
        dataMap[label] += item.amount;
      }
    });

    if (labels.length === 0)
      return { labels: ["No Data"], datasets: [{ data: [0] }] };

    return {
      labels: labels,
      datasets: [{ data: labels.map((label) => dataMap[label]) }],
    };
  };
  // Totals + average metrics.
  const totalSpent = filteredExpenses.reduce((acc, c) => acc + c.amount, 0);
  // Daily average divisor by active filter window.
  let dayDivisor = 1;
  if (activeFilter === "7days") dayDivisor = 7;
  else if (activeFilter === "month") dayDivisor = new Date().getDate();
  else if (activeFilter === "year") {
    // Current day index in year.
    const now = new Date();
    const start = new Date(now.getFullYear(), 0, 0);
    const diff = now.getTime() - start.getTime();
    dayDivisor = Math.floor(diff / (1000 * 60 * 60 * 24));
  } else if (activeFilter === "custom") {
    // Difference between custom end and start.
    const diffTime = Math.abs(customEnd.getTime() - customStart.getTime());
    // Convert milliseconds to days.
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    dayDivisor = diffDays + 1; // Include start day.
  } else if (activeFilter === "all") {
    if (expenses.length > 0) {
      // Find first expense date.
      const minTime = Math.min(...expenses.map((c) => c.date.getTime()));
      const firstDate = new Date(minTime);
      const now = new Date();
      // Days between first expense and today.
      const diffTime = Math.abs(now.getTime() - firstDate.getTime());
      dayDivisor = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      dayDivisor += 1; // Include first day.
    } else {
      dayDivisor = 1; // Prevent division by zero.
    }
  }
  // Final daily average
  const dailyAverage = dayDivisor > 0 ? totalSpent / dayDivisor : totalSpent;

  // Precompute trend data and chart width.
  const trendData = getTrendData();

  // Width scales with number of labels.
  const chartWidth = trendData.labels.length * 50 + 60;
  const categoryList = getChartData();

  // UI render
  return (
    <View style={styles.container}>
      {isLoading ? (
        <ActivityIndicator
          size="large"
          color="#fff"
          style={{ marginTop: 50 }}
        />
      ) : (
        <ScrollView
          contentContainerStyle={{ paddingTop: 20, paddingBottom: 100 }}
        >
          {/* SECTION 1: Time filter pills */}
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
                    activeFilter === filter.id && styles.filterPillActive,
                  ]}
                  onPress={() => setActiveFilter(filter.id)}
                >
                  <Text
                    style={[
                      styles.filterText,
                      activeFilter === filter.id && styles.filterTextActive,
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

                <Text style={{ color: "#555" }}>—</Text>

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

          {/* SECTION 2: Category chips */}
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
                    activeCategory === cat && {
                      backgroundColor:
                        cat === "All" ? "#007AFF" : getCategoryColor(cat),
                      borderColor: "transparent",
                    },
                  ]}
                  onPress={() => setActiveCategory(cat)}
                >
                  <Text
                    style={[
                      styles.categoryText,
                      activeCategory === cat && {
                        color: "white",
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

          {/* SECTION 3: KPI cards */}
          <View style={styles.cardsRow}>
            {/* Card Total */}
            <View style={styles.kpiCard}>
              <View style={styles.iconCircle}>
                <MaterialCommunityIcons
                  name="wallet-outline"
                  size={24}
                  color="#4BC0C0"
                />
              </View>
              <Text style={styles.cardLabel}>Total Spent</Text>
              <Text style={styles.cardValue}>
                {totalSpent.toFixed(2)}{" "}
                <Text style={styles.currency}>{currency}</Text>
              </Text>
            </View>

            {/* Card Average */}
            <View style={styles.kpiCard}>
              <View
                style={[
                  styles.iconCircle,
                  { backgroundColor: "rgba(255, 99, 132, 0.2)" },
                ]}
              >
                <MaterialCommunityIcons
                  name="chart-timeline-variant"
                  size={24}
                  color="#FF6384"
                />
              </View>
              <Text style={styles.cardLabel}>Daily Avg</Text>
              <Text style={styles.cardValue}>
                {dailyAverage.toFixed(2)}{" "}
                <Text style={styles.currency}>{currency}</Text>
              </Text>
            </View>
          </View>

          {/* SECTION 4: Charts */}
          {filteredExpenses.length > 0 ? (
            <View style={styles.chartContainer}>
              <Text style={styles.sectionTitle}>Spending Trend</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <BarChart
                  data={trendData}
                  width={chartWidth}
                  height={220}
                  yAxisLabel=""
                  yAxisSuffix={` ${currency}`}
                  fromZero={true} // Start Y axis at zero.
                  chartConfig={{
                    backgroundColor: "#1E1E1E",
                    backgroundGradientFrom: "#1E1E1E",
                    backgroundGradientTo: "#1E1E1E",
                    decimalPlaces: 0, // No decimals on Y axis.
                    color: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
                    labelColor: (opacity = 1) =>
                      `rgba(255, 255, 255, ${opacity})`,
                    style: {
                      borderRadius: 16,
                    },
                    barPercentage: 0.5,
                  }}
                  style={{
                    marginVertical: 8,
                    borderRadius: 16,
                    marginRight: 20,
                  }}
                  verticalLabelRotation={0}
                />
              </ScrollView>
              <PieChart
                data={getChartData()}
                width={SCREEN_WIDTH - 30}
                height={220}
                chartConfig={{
                  color: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
                }}
                accessor={"population"}
                backgroundColor={"transparent"}
                paddingLeft={"15"}
                absolute
              />
            </View>
          ) : (
            <Text style={styles.noDataText}>No expenses for this period.</Text>
          )}

          {/* SECTION 5: Expense list */}
          <View style={styles.listContainer}>
            <Text style={styles.sectionTitle}>
              {activeCategory === "All"
                ? "Top Categories"
                : "Transactions List"}
            </Text>
            {activeCategory === "All"
              ? categoryList.map((item: any, index: number) => (
                  <View key={index} style={styles.listItem}>
                    <View
                      style={[
                        styles.iconCircleSmall,
                        { backgroundColor: item.color },
                      ]}
                    >
                      <MaterialCommunityIcons
                        name="shape-outline"
                        size={20}
                        color="#white"
                      />
                    </View>
                    <Text style={styles.listItemName}>{item.name}</Text>
                    <Text style={styles.listItemValue}>
                      {item.population.toFixed(2)} {currency}
                    </Text>
                  </View>
                ))
              : filteredExpenses
                  .sort((a, b) => b.date.getTime() - a.date.getTime())
                  .map((item) => (
                    <View key={item.id} style={styles.listItem}>
                      <View style={styles.dateBox}>
                        <Text style={styles.dateDay}>
                          {item.date.getDate()}
                        </Text>
                        <Text style={styles.dateMonth}>
                          {item.date.toLocaleString("default", {
                            month: "short",
                          })}
                        </Text>
                      </View>
                      <View style={{ flex: 1, marginLeft: 12 }}>
                        <Text style={styles.listItemName} numberOfLines={1}>
                          {item.description}
                        </Text>
                        <Text style={styles.subText}>
                          {item.date.toLocaleString()}
                        </Text>
                      </View>

                      <Text style={styles.listItemValue}>
                        {item.amount.toFixed(2)} {currency}
                      </Text>
                    </View>
                  ))}
          </View>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#1E1E1E",
  },
  // Filters Styles
  filterSection: {
    marginBottom: 15,
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
    backgroundColor: "#007AFF", // Active state color.
    borderColor: "#007AFF",
  },
  filterText: {
    color: "#aaa",
    fontWeight: "600",
  },
  filterTextActive: {
    color: "white",
  },
  // Category Chips
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
  // KPI Cards
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
    // Shadow for iOS
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(75, 192, 192, 0.2)", // Soft green tint.
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
  // Chart Area
  chartContainer: {
    alignItems: "center",
    marginBottom: 20,
  },
  sectionTitle: {
    color: "white",
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 10,
    alignSelf: "flex-start",
    marginLeft: 20,
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
});
