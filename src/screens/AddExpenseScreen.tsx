import { MaterialCommunityIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Picker } from "@react-native-picker/picker";
import { useIsFocused } from "@react-navigation/native";
import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  FlatList,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { supabase } from "../lib/supabaseClient";
import {
  DEFAULT_CATEGORIES,
  getCategoryColor,
  getCategoryIcon,
  useAppStore,
} from "../store/useAppStore";

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
  const customCategories = useAppStore((state) => state.customCategories);
  const addCustomCategory = useAppStore((state) => state.addCustomCategory);
  const allCategories = useMemo(
    () => [...DEFAULT_CATEGORIES, ...customCategories],
    [customCategories],
  );

  // Form states
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState<string>("");
  const [category, setCategory] = useState(DEFAULT_CATEGORIES[0]);
  const [newCategory, setNewCategory] = useState("");

  useEffect(() => {
    if (!allCategories.includes(category)) {
      setCategory(allCategories[0] ?? DEFAULT_CATEGORIES[0]);
    }
  }, [allCategories, category]);

  // Selected date for the expense form.
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showDataPicker, setShowDataPicker] = useState(false); // Date picker visibility.
  const onChangeDate = (event: any, pickedDate?: Date) => {
    const current = pickedDate || selectedDate;
    // Close picker on Android after selection.
    if (Platform.OS === "android") setShowDataPicker(false);
    setSelectedDate(current);
  };

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
            loadedExpenses = savedExpenses.map((c: any) => ({
              id: String(c.id ?? Math.random().toString()),
              amount: Number(c.amount ?? 0),
              description: String(c.description ?? ""),
              category: String(c.category ?? "Other"),
              date: new Date(c.date ?? Date.now()),
            }));
          }
        } else if (authStatus === "loggedIn") {
          const { data, error } = await supabase
            .from("expenses")
            .select("*")
            .order("date", { ascending: false });
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

  // Persist expenses in guest mode.
  useEffect(() => {
    const saveExpenses = async () => {
      try {
        const savedExpensesJson = JSON.stringify(expenses);
        await AsyncStorage.setItem("savedExpenses", savedExpensesJson);
      } catch (e) {
        console.log("Error saving expenses:", e);
      }
    };
    if (authStatus === "guest" && !isLoading) {
      saveExpenses();
    }
  }, [expenses, authStatus, isLoading]);

  // Add expense action.
  const handleAddExpense = async () => {
    const safeDescription = String(description || "");
    const amountNumber = parseFloat(amount);
    if (!safeDescription.trim() || isNaN(amountNumber) || amountNumber <= 0) {
      Alert.alert("Error", "Please enter the amount and description.");
      return;
    }
    const expenseDate = selectedDate;
    const baseExpense = {
      amount: parseFloat(amount),
      description: safeDescription.trim(),
      date: expenseDate,
      category: category,
    };

    if (authStatus === "guest") {
      const newGuestExpense = {
        ...baseExpense,
        id: Math.random().toString(),
      };
      setExpenses((previousExpenses) => [newGuestExpense, ...previousExpenses]);
    } else if (authStatus === "loggedIn") {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const newSupabaseExpense = {
        ...baseExpense,
        user_id: user.id,
        date: expenseDate.toISOString(),
      };
      const { data: insertedData, error } = await supabase
        .from("expenses")
        .insert(newSupabaseExpense)
        .select()
        .single();
      if (error) {
        Alert.alert("Supabase Error", error.message);
      } else if (insertedData) {
        const finalExpense = {
          ...insertedData,
          id: insertedData.id.toString(),
          date: new Date(insertedData.date ?? insertedData.data),
        };
        setExpenses((previousExpenses) => [finalExpense, ...previousExpenses]);
      }
    }
    setAmount("");
    setDescription("");
    setCategory(allCategories[0] ?? DEFAULT_CATEGORIES[0]);
  };

  const handleCreateCategory = async () => {
    const created = await addCustomCategory(newCategory);
    if (!created) {
      Alert.alert("Category", "Category already exists or is invalid.");
      return;
    }
    const createdName = newCategory.trim();
    setCategory(createdName);
    setNewCategory("");
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
            if (authStatus === "guest") {
              setExpenses((previousExpenses) =>
                previousExpenses.filter((c) => c.id !== id),
              );
            } else if (authStatus === "loggedIn") {
              try {
                const { error } = await supabase
                  .from("expenses")
                  .delete()
                  .eq("id", id);
                if (error) throw error;
                setExpenses((previousExpenses) =>
                  previousExpenses.filter((c) => c.id !== id),
                );
              } catch (e: any) {
                Alert.alert("Delete Error", e.message);
              }
            }
          },
        },
      ],
    );
  };

  const [showForm, setShowForm] = useState(false);

  return (
    <View style={styles.safeArea}>
      <ScrollView style={styles.container}>
        {/* --- Add Expense Button / Collapsible Form --- */}
        {!showForm ? (
          <Pressable
            style={styles.buttonPrimary}
            onPress={() => setShowForm(true)}
          >
            <MaterialCommunityIcons
              name="plus-circle-outline"
              size={24}
              color="white"
              style={{ marginRight: 8 }}
            />
            <Text style={styles.buttonPrimaryText}>Add Expense</Text>
          </Pressable>
        ) : (
          <View>
            <TextInput
              style={styles.input}
              placeholder="Amount (e.g., 50)"
              placeholderTextColor="#999"
              keyboardType="numeric"
              value={amount}
              onChangeText={setAmount}
            />
            <TextInput
              style={styles.input}
              placeholder="Description (e.g., Coffee)"
              placeholderTextColor="#999"
              value={String(description)}
              onChangeText={(text) => setDescription(text)}
            />
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={category}
                onValueChange={(itemValue) => setCategory(itemValue)}
                style={styles.picker}
                dropdownIconColor={"#aaa"}
              >
                {allCategories.map((cat, index) => (
                  <Picker.Item label={cat} value={cat} key={index.toString()} />
                ))}
              </Picker>
            </View>

            <View style={styles.customCategoryRow}>
              <TextInput
                style={styles.customCategoryInput}
                placeholder="New category (e.g. Cat Food)"
                placeholderTextColor="#999"
                value={newCategory}
                onChangeText={setNewCategory}
              />
              <Pressable
                style={styles.customCategoryButton}
                onPress={handleCreateCategory}
              >
                <Text style={styles.customCategoryButtonText}>Add</Text>
              </Pressable>
            </View>

            <Text style={styles.label}>Date</Text>
            <Pressable onPress={() => setShowDataPicker(true)}>
              <View style={styles.input}>
                <Text style={{ color: "white", fontSize: 16, paddingTop: 0 }}>
                  {selectedDate.toLocaleDateString("ro-RO")}
                </Text>
              </View>
            </Pressable>
            {showDataPicker && Platform.OS !== "web" && (
              <DateTimePicker
                value={selectedDate}
                mode="date"
                display={Platform.OS === "ios" ? "spinner" : "default"}
                onChange={onChangeDate}
                maximumDate={new Date()}
              />
            )}
            <View style={styles.formButtons}>
              <Pressable
                style={styles.buttonPrimary}
                onPress={() => {
                  handleAddExpense();
                  setShowForm(false);
                }}
              >
                <MaterialCommunityIcons
                  name="check-circle-outline"
                  size={24}
                  color="white"
                  style={{ marginRight: 8 }}
                />
                <Text style={styles.buttonPrimaryText}>Confirm</Text>
              </Pressable>
              <Pressable
                style={styles.buttonCancel}
                onPress={() => setShowForm(false)}
              >
                <Text style={styles.buttonCancelText}>Cancel</Text>
              </Pressable>
            </View>
          </View>
        )}

        {/* --- Separator --- */}
        <View style={styles.separator} />

        <Text style={styles.title}>Expense History</Text>

        {/* --- Expense List --- */}
        <FlatList
          data={expenses}
          scrollEnabled={false} // Let the main ScrollView handle scrolling
          renderItem={({ item }) => (
            <View style={styles.transactionItem}>
              <View
                style={[
                  styles.iconContainer,
                  {
                    backgroundColor: getCategoryColor(item.category),
                  },
                ]}
              >
                <MaterialCommunityIcons
                  name={getCategoryIcon(item.category) as any}
                  size={24}
                  color="white"
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.transName}>{item.description}</Text>
                <Text style={styles.transDate}>
                  {item.date.toLocaleDateString("en-US")} •{" "}
                  {item.category ?? "Other"}
                </Text>
              </View>
              <Text style={styles.transValue}>
                {Number(item.amount ?? 0).toFixed(2)} {currency}
              </Text>
              <View style={styles.transActions}>
                <Pressable
                  onPress={() => {
                    const { date, ...rest } = item as any;
                    navigation.navigate("UpdateScreen", {
                      expense: { ...rest, date: date.toISOString() },
                      returnTo: "AddExpenseScreen",
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
                  onPress={() => handleDeleteExpense(item.id, item.amount)}
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
    backgroundColor: "#1E1E1E",
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
  pickerContainer: {
    backgroundColor: "#333",
    borderRadius: 10,
    marginBottom: 15,
    width: "100%",
    borderWidth: Platform.OS === "android" ? 1 : 0,
    borderColor: "#333",
  },
  picker: {
    color: "white",
    height: 50,
  },
  customCategoryRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 15,
    gap: 8,
  },
  customCategoryInput: {
    flex: 1,
    backgroundColor: "#333",
    color: "white",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  customCategoryButton: {
    backgroundColor: "#4BC0C0",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
  },
  customCategoryButtonText: {
    color: "white",
    fontWeight: "700",
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
  transactionItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#2A2A2A",
    padding: 15,
    borderRadius: 12,
    marginBottom: 10,
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
