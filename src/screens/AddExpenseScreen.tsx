import { MaterialCommunityIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useIsFocused } from "@react-navigation/native";
import React, { useEffect, useState } from "react";
import {
    Alert,
    FlatList,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from "react-native";
import {
    AmountInput,
    CategoryPicker,
    DateField,
    DescriptionInput,
    ExpenseCard,
    ScreenHeader,
} from "../components";
import { THEMES } from "../constants/theme";
import {
    useCustomCategories,
    useExpenseForm,
    useExpenseMutations,
} from "../hooks";
import { supabase } from "../lib/supabaseClient";
import { useAppStore } from "../store/useAppStore";
import {
    normalizeExpense,
    normalizeExpensesForState,
} from "../utils/normalizeData";

// Type definition
type ExpenseItem = {
  id: string;
  amount: number;
  description: string;
  date: Date;
  category: string;
};

// Receives navigation (for Update) and authStatus (for logic)
export default function AddExpenseScreen({ navigation }: { navigation: any }) {
  const authStatus = useAppStore((state) => state.authStatus);
  const currentTheme = useAppStore((state) => state.currentTheme);
  const setStoreExpenses = useAppStore((state) => state.setExpenses);
  const {
    addExpense,
    deleteExpense,
    countExpensesByCategory,
    deleteExpensesByCategory,
    moveExpensesToCategory,
  } = useExpenseMutations(authStatus);
  const customCategories = useAppStore((state) => state.customCategories);
  const addCustomCategory = useAppStore((state) => state.addCustomCategory);
  const removeCustomCategory = useAppStore(
    (state) => state.removeCustomCategory,
  );
  const {
    allCategories,
    customOnlyCategories,
    defaultCategory,
    getCategoryIconSafe,
    getCategoryColorSafe,
  } = useCustomCategories({ customCategories });

  const {
    amount,
    setAmount,
    description,
    setDescription,
    category,
    setCategory,
    selectedDate,
    setSelectedDate,
    resetForm,
    validateForm,
  } = useExpenseForm({
    mode: "add",
    categories: allCategories,
    initialCategory: defaultCategory,
  });

  // List states
  const [expenses, setExpenses] = useState<ExpenseItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const isFocused = useIsFocused(); // Hook for reloading

  // Currency state
  const [currency, setCurrency] = useState("RON"); // Default fallback.
  // Load selected currency from settings.
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

  // Load expenses based on auth mode.
  useEffect(() => {
    const loadExpenses = async () => {
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
          const { data, error } = await supabase
            .from("expenses")
            .select("*")
            .order("date", { ascending: false });
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
    }
  }, [authStatus, isFocused, setStoreExpenses]);

  // Persist expenses in guest mode.
  useEffect(() => {
    const saveExpenses = async () => {
      try {
        const normalizedExpenses = expenses.map((expense) =>
          normalizeExpense(expense),
        );
        await AsyncStorage.setItem(
          "savedExpenses",
          JSON.stringify(normalizedExpenses),
        );
      } catch (e) {
        console.log("Error saving expenses:", e);
      }
    };
    if (authStatus === "guest" && !isLoading) {
      saveExpenses();
    }
  }, [expenses, authStatus, isLoading]);

  useEffect(() => {
    setStoreExpenses(expenses);
  }, [expenses, setStoreExpenses]);

  // Add expense action.
  const handleAddExpense = async () => {
    const validation = validateForm();
    if (!validation.isValid) {
      Alert.alert("Error", validation.message);
      return false;
    }

    const baseExpense = {
      amount: validation.amountNumber,
      description: validation.description,
      date: validation.date,
      category: validation.category,
    };

    const { expense, error } = await addExpense(baseExpense);
    if (error) {
      Alert.alert("Error", error);
      return false;
    }

    if (expense) {
      setExpenses((previousExpenses) => [
        expense as ExpenseItem,
        ...previousExpenses,
      ]);
    }

    resetForm();
    return true;
  };

  // Delete expense action.
  const handleDeleteExpense = (id: string, amountValue: number) => {
    Alert.alert(
      "Delete Confirmation",
      `Are you sure you want to delete the ${amountValue.toFixed(2)} ${currency} expense?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            const { error } = await deleteExpense(id);
            if (error) {
              Alert.alert("Delete Error", error);
              return;
            }

            setExpenses((previousExpenses) =>
              previousExpenses.filter((c) => c.id !== id),
            );
          },
        },
      ],
    );
  };

  const handleDeleteCustomCategory = async (categoryName: string) => {
    const { count, error } = await countExpensesByCategory(categoryName);
    if (error) {
      Alert.alert("Error", error);
      return;
    }

    Alert.alert(
      "Delete custom category",
      `You have ${count} expenses in this category.`,
      [
        {
          text: "Delete category + expenses",
          style: "destructive",
          onPress: async () => {
            const deleteResult = await deleteExpensesByCategory(categoryName);
            if (deleteResult.error) {
              Alert.alert("Error", deleteResult.error);
              return;
            }

            const removed = await removeCustomCategory(categoryName);
            if (!removed) {
              Alert.alert("Error", "Failed to remove custom category.");
              return;
            }

            if (category === categoryName) {
              setCategory("Other");
            }

            setExpenses((previousExpenses) =>
              previousExpenses.filter(
                (expense) => expense.category !== categoryName,
              ),
            );
          },
        },
        {
          text: 'Move expenses to "Other"',
          onPress: async () => {
            const moveResult = await moveExpensesToCategory(
              categoryName,
              "Other",
            );
            if (moveResult.error) {
              Alert.alert("Error", moveResult.error);
              return;
            }

            const removed = await removeCustomCategory(categoryName);
            if (!removed) {
              Alert.alert("Error", "Failed to remove custom category.");
              return;
            }

            if (category === categoryName) {
              setCategory("Other");
            }

            setExpenses((previousExpenses) =>
              previousExpenses.map((expense) =>
                expense.category === categoryName
                  ? { ...expense, category: "Other" }
                  : expense,
              ),
            );
          },
        },
        { text: "Cancel", style: "cancel" },
      ],
    );
  };

  const [showForm, setShowForm] = useState(false);
  const theme = THEMES[currentTheme];

  return (
    <View style={[styles.safeArea, { backgroundColor: theme.background }]}>
      <ScrollView style={styles.container}>
        <ScreenHeader
          title="Add Expense"
          forceBackArrow
          onBackPress={() => navigation.navigate("Home")}
        />

        {/* --- Add Expense Button / Collapsible Form --- */}
        {!showForm ? (
          <Pressable
            style={[styles.buttonPrimary, { backgroundColor: theme.primary }]}
            onPress={() => setShowForm(true)}
          >
            <MaterialCommunityIcons
              name="plus-circle-outline"
              size={24}
              color={theme.background}
              style={{ marginRight: 8 }}
            />
            <Text
              style={[styles.buttonPrimaryText, { color: theme.background }]}
            >
              Add Expense
            </Text>
          </Pressable>
        ) : (
          <View>
            <AmountInput
              style={[
                styles.input,
                {
                  backgroundColor: theme.surface,
                  color: theme.textPrimary,
                },
              ]}
              placeholder="Amount (e.g., 50)"
              value={amount}
              onChangeText={setAmount}
            />
            <CategoryPicker
              categories={allCategories}
              customCategories={customOnlyCategories}
              selectedValue={category}
              onValueChange={setCategory}
              onCreateCategory={addCustomCategory}
              onDeleteCustomCategory={handleDeleteCustomCategory}
            />
            <DescriptionInput
              style={[
                styles.input,
                {
                  backgroundColor: theme.surface,
                  color: theme.textPrimary,
                },
              ]}
              placeholder="Description (e.g., Coffee)"
              value={description}
              onChangeText={setDescription}
            />

            <DateField
              label="Date"
              value={selectedDate}
              onChange={setSelectedDate}
              labelStyle={[styles.label, { color: theme.textSecondary }]}
              fieldStyle={[
                styles.input,
                {
                  backgroundColor: theme.surface,
                },
              ]}
              textStyle={[styles.dateText, { color: theme.textPrimary }]}
              maximumDate={new Date()}
              iosDisplay="spinner"
              closeOnChange={false}
            />

            <View style={styles.formButtons}>
              <Pressable
                style={[
                  styles.buttonPrimary,
                  { backgroundColor: theme.primary },
                ]}
                onPress={async () => {
                  const didSave = await handleAddExpense();
                  if (didSave) {
                    setShowForm(false);
                  }
                }}
              >
                <MaterialCommunityIcons
                  name="check-circle-outline"
                  size={24}
                  color={theme.background}
                  style={{ marginRight: 8 }}
                />
                <Text
                  style={[
                    styles.buttonPrimaryText,
                    { color: theme.background },
                  ]}
                >
                  Confirm
                </Text>
              </Pressable>
              <Pressable
                style={styles.buttonCancel}
                onPress={() => setShowForm(false)}
              >
                <Text
                  style={[
                    styles.buttonCancelText,
                    { color: theme.textSecondary },
                  ]}
                >
                  Cancel
                </Text>
              </Pressable>
            </View>
          </View>
        )}

        {/* --- Separator --- */}
        <View style={[styles.separator, { backgroundColor: theme.border }]} />

        <Text style={[styles.title, { color: theme.textPrimary }]}>
          Expense History
        </Text>

        {/* --- Expense List --- */}
        <FlatList
          data={expenses}
          scrollEnabled={false} // Let the main ScrollView handle scrolling
          renderItem={({ item }) => (
            <ExpenseCard
              item={item}
              currency={currency}
              dateLocale="en-US"
              categoryIconName={getCategoryIconSafe(item.category)}
              categoryIconColor={getCategoryColorSafe(item.category)}
              onEdit={() => {
                const { date, ...rest } = item as any;
                navigation.navigate("UpdateScreen", {
                  expense: { ...rest, date: date.toISOString() },
                  returnTo: "AddExpenseScreen",
                });
              }}
              onDelete={() => handleDeleteExpense(item.id, item.amount)}
            />
          )}
          keyExtractor={(item) => item.id}
          style={styles.list}
        />
      </ScrollView>
    </View>
  );
}

// Styles
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "white",
    marginBottom: 20,
    marginTop: 10,
  },
  label: {
    color: "#aaa",
    fontSize: 14,
    marginBottom: 8,
  },
  input: {
    backgroundColor: "#333",
    color: "white",
    borderRadius: 10,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 16,
    marginBottom: 15,
  },
  dateText: {
    paddingTop: 0,
  },
  buttonPrimary: {
    backgroundColor: "#007AFF",
    padding: 15,
    borderRadius: 8,
    alignItems: "center",
    marginBottom: 10,
    marginTop: 10,
    flexDirection: "row",
    justifyContent: "center",
  },
  buttonPrimaryText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
  },
  buttonCancel: {
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  buttonCancelText: {
    color: "#aaa",
    fontSize: 15,
    fontWeight: "600",
  },
  formButtons: {
    marginTop: 5,
    marginBottom: 10,
  },
  separator: {
    height: 1,
    backgroundColor: "#444",
    marginVertical: 20,
  },
  list: {
    marginTop: 0,
  },
});
