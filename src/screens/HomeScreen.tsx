import { MaterialCommunityIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useIsFocused } from "@react-navigation/native";
import React, { useCallback, useEffect, useState } from "react";
import {
    Alert,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { supabase } from "../lib/supabaseClient";
import { useAppStore } from "../store/useAppStore";

export default function HomeScreen({ navigation }: any) {
  const authStatus = useAppStore((state) => state.authStatus);
  const isFocused = useIsFocused();
  const [allExpenses, setAllExpenses] = useState<any[]>([]);
  const [totalMonth, setTotalMonth] = useState(0);
  const [expanded, setExpanded] = useState(false);

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
          allExpenses = JSON.parse(json).map((c: any) => ({
            id: String(c.id ?? Math.random().toString()),
            amount: Number(c.amount ?? 0),
            description: String(c.description ?? ""),
            category: String(c.category ?? "Other"),
            date: new Date(c.date ?? Date.now()),
          }));
        }
      } else if (authStatus === "loggedIn") {
        // Load enough rows to cover current month confidently.
        const { data } = await supabase
          .from("expenses")
          .select("*")
          .order("date", { ascending: false })
          .limit(300);

        if (data) {
          allExpenses = data.map((c: any) => ({
            id: String(c.id ?? Math.random().toString()),
            amount: Number(c.amount ?? 0),
            description: String(c.description ?? ""),
            category: String(c.category ?? "Other"),
            date: new Date(c.date ?? Date.now()),
          }));
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
    } catch (e) {
      console.error("Error loading home data:", e);
    }
  }, [authStatus]);

  // Get displayed expenses: 3 recent or last 30 days
  const getDisplayedExpenses = () => {
    if (!expanded) return allExpenses.slice(0, 3);
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    return allExpenses.filter((e) => e.date >= thirtyDaysAgo);
  };

  const displayedExpenses = getDisplayedExpenses();

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
              if (authStatus === "guest") {
                const json = await AsyncStorage.getItem("savedExpenses");
                if (json) {
                  const saved = JSON.parse(json).filter(
                    (c: any) => c.id !== item.id,
                  );
                  await AsyncStorage.setItem(
                    "savedExpenses",
                    JSON.stringify(saved),
                  );
                }
              } else if (authStatus === "loggedIn") {
                const { error } = await supabase
                  .from("expenses")
                  .delete()
                  .eq("id", item.id);
                if (error) {
                  Alert.alert("Error", error.message);
                  return;
                }
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
    }
  }, [isFocused, loadHomeData]);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={{ paddingBottom: 50 }}>
        {/* SECTION 1: Header */}
        <View style={styles.header}>
          <Text style={styles.greeting}>Welcome!</Text>
        </View>

        {/* Main card - Current month total */}
        <View style={styles.heroCard}>
          <Text style={styles.heroLabel}>Spent this Month</Text>
          <Text style={styles.heroValue}>
            {totalMonth.toFixed(2)}{" "}
            <Text style={styles.currency}>{currency}</Text>
          </Text>
        </View>

        {/* SECTION 2: Action buttons */}
        <View style={styles.actionsGrid}>
          <Pressable
            style={styles.actionButton}
            onPress={() => navigation.navigate("AddExpenseScreen")}
          >
            <View
              style={[
                styles.iconBox,
                { backgroundColor: "rgba(75, 192, 192, 0.2)" },
              ]}
            >
              <MaterialCommunityIcons name="plus" size={32} color="#4BC0C0" />
            </View>
            <Text style={styles.actionText}>Add Expense</Text>
          </Pressable>

          <Pressable
            style={styles.actionButton}
            onPress={() => navigation.navigate("StatisticsScreen")}
          >
            <View
              style={[
                styles.iconBox,
                { backgroundColor: "rgba(255, 99, 132, 0.2)" },
              ]}
            >
              <MaterialCommunityIcons
                name="chart-bar"
                size={32}
                color="#FF6384"
              />
            </View>
            <Text style={styles.actionText}>Statistics</Text>
          </Pressable>
        </View>

        {/* SECTION 3: Recent list */}
        <View style={styles.recentSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Activity</Text>
          </View>

          {displayedExpenses.length === 0 ? (
            <Text style={{ color: "#666", fontStyle: "italic", marginTop: 10 }}>
              No expenses yet.
            </Text>
          ) : (
            displayedExpenses.map((item, index) => (
              <View key={item.id ?? index} style={styles.transactionItem}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.transName}>{item.description}</Text>
                  <Text style={styles.transDate}>
                    {new Date(item.date).toLocaleDateString()} •{" "}
                    {item.category ?? "Other"}
                  </Text>
                </View>
                <Text style={styles.transValue}>
                  {Number(item.amount ?? 0).toFixed(2)} {currency}
                </Text>
                <View style={styles.transActions}>
                  <Pressable
                    onPress={() => {
                      const { date, ...rest } = item;
                      navigation.navigate("UpdateScreen", {
                        expense: { ...rest, data: date.toISOString() },
                      });
                    }}
                    style={styles.actionIcon}
                  >
                    <MaterialCommunityIcons
                      name="pencil"
                      size={20}
                      color="#4BC0C0"
                    />
                  </Pressable>
                  <Pressable
                    onPress={() => handleDelete(item)}
                    style={styles.actionIcon}
                  >
                    <MaterialCommunityIcons
                      name="trash-can-outline"
                      size={20}
                      color="#FF6384"
                    />
                  </Pressable>
                </View>
              </View>
            ))
          )}

          {allExpenses.length > 3 && (
            <Pressable
              onPress={() => setExpanded(!expanded)}
              style={styles.expandButtonContainer}
            >
              <Text style={styles.expandButton}>
                {expanded ? "Show Less" : "Show more"}
              </Text>
            </Pressable>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#1E1E1E",
    paddingHorizontal: 20,
  },
  header: {
    marginTop: 20,
    marginBottom: 10,
  },
  greeting: {
    color: "white",
    fontSize: 22,
    fontWeight: "bold",
  },
  // HERO CARD
  heroCard: {
    backgroundColor: "#4BC0C0",
    borderRadius: 20,
    padding: 25,
    marginBottom: 30,
    elevation: 5,
  },
  heroLabel: {
    color: "rgba(255,255,255,0.9)",
    fontSize: 14,
    marginBottom: 5,
    textTransform: "uppercase",
    fontWeight: "600",
  },
  heroValue: {
    color: "white",
    fontSize: 34,
    fontWeight: "bold",
  },
  currency: {
    fontSize: 18,
    fontWeight: "normal",
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
  transactionItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#2A2A2A",
    padding: 15,
    borderRadius: 12,
    marginBottom: 10,
  },
  transName: {
    color: "white",
    fontSize: 16,
    fontWeight: "500",
  },
  transDate: {
    color: "#888",
    fontSize: 12,
    marginTop: 2,
  },
  transValue: {
    color: "lightgreen",
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
