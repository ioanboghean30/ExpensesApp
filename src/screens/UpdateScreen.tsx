import AsyncStorage from "@react-native-async-storage/async-storage";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Picker } from "@react-native-picker/picker";
import React, { useEffect, useMemo, useState } from "react";
import {
    Alert,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { supabase } from "../lib/supabaseClient";
import { DEFAULT_CATEGORIES, useAppStore } from "../store/useAppStore";

type ExpenseItem = {
  id: string;
  amount: number;
  description: string;
  category: string;
  date: Date;
};
export default function UpdateScreen({
  route,
  navigation,
}: {
  route: any;
  navigation: any;
}) {
  const authStatus = useAppStore((state) => state.authStatus);
  const customCategories = useAppStore((state) => state.customCategories);
  const addCustomCategory = useAppStore((state) => state.addCustomCategory);
  const allCategories = useMemo(
    () => [...DEFAULT_CATEGORIES, ...customCategories],
    [customCategories],
  );

  const { expense: routeExpense, returnTo } = route.params;
  const expense = routeExpense;
  const [amount, setAmount] = useState(String(expense?.amount ?? "")); // TextInput values are strings.
  const [description, setDescription] = useState(expense?.description ?? "");
  const [category, setCategory] = useState(
    expense?.category ?? DEFAULT_CATEGORIES[0],
  );
  const [newCategory, setNewCategory] = useState("");
  const [selectedDate, setSelectedDate] = useState(() => {
    const d = new Date(expense?.date);
    return isNaN(d.getTime()) ? new Date() : d;
  });
  const [showDataPicker, setShowDataPicker] = useState(false); // Keep calendar hidden until requested.

  // Reset form when a different expense is selected
  useEffect(() => {
    if (!expense) return;
    setAmount(String(expense.amount ?? ""));
    setDescription(expense.description ?? "");
    setCategory(expense.category ?? DEFAULT_CATEGORIES[0]);
    const d = new Date(expense.date);
    setSelectedDate(isNaN(d.getTime()) ? new Date() : d);
  }, [expense]);

  useEffect(() => {
    if (!allCategories.includes(category)) {
      setCategory(allCategories[0] ?? DEFAULT_CATEGORIES[0]);
    }
  }, [allCategories, category]);

  const onChangeDate = (event: any, selectedDate?: Date) => {
    setShowDataPicker(false);
    if (selectedDate) {
      setSelectedDate(selectedDate);
    }
  };

  const [loading, setLoading] = useState(false);

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

  // Save update action.
  const handleUpdate = async () => {
    const amountNumber = Number(amount);
    if (!amount || !description || !category || Number.isNaN(amountNumber)) {
      Alert.alert("Error", "Please fill all fields.");
      return;
    }
    setLoading(true);

    try {
      if (authStatus === "guest") {
        const savedExpensesJson = await AsyncStorage.getItem("savedExpenses");
        let savedExpenses: ExpenseItem[] = savedExpensesJson
          ? JSON.parse(savedExpensesJson)
          : [];
        const updatedExpenses = savedExpenses.map((c) => {
          if (c.id === expense.id) {
            return {
              ...c,
              amount: amountNumber,
              description: description,
              category: category,
              date: selectedDate,
            };
          }
          return c;
        });
        await AsyncStorage.setItem(
          "savedExpenses",
          JSON.stringify(updatedExpenses),
        );
      } else if (authStatus === "loggedIn") {
        const { error } = await supabase
          .from("expenses")
          .update({
            amount: amountNumber,
            description: description,
            category: category,
            date: selectedDate.toISOString(),
          })
          .eq("id", expense.id);

        if (error) {
          Alert.alert("Supabase error", error.message);
        }
      }
      setLoading(false);
      if (returnTo) {
        navigation.navigate(returnTo);
      } else {
        navigation.goBack();
      }
    } catch (e) {
      setLoading(false);
      Alert.alert("Error", "An unexpected error occurred.");
      console.error(e);
    }
  };
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <Text style={styles.label}>Amount</Text>
        <TextInput
          style={styles.input}
          value={amount}
          onChangeText={setAmount}
          keyboardType="numeric"
        />
        <Text style={styles.label}>Description</Text>
        <TextInput
          style={styles.input}
          value={description}
          onChangeText={setDescription}
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
            <Text style={{ color: "white", fontSize: 16 }}>
              {selectedDate.toLocaleDateString("ro-RO")}
            </Text>
          </View>
        </Pressable>
        {showDataPicker && (
          <DateTimePicker
            value={selectedDate}
            mode="date"
            display="default"
            onChange={onChangeDate}
          />
        )}
        <Pressable
          style={styles.buttonPrimary}
          onPress={handleUpdate}
          disabled={loading}
        >
          <Text style={styles.buttonPrimaryText}>
            {loading ? "Loading..." : "Save Changes"}
          </Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#1E1E1E",
  },
  scrollContainer: {
    padding: 20,
  },
  label: {
    color: "white",
    fontSize: 16,
    marginBottom: 5,
    fontWeight: "600",
  },
  input: {
    backgroundColor: "#333",
    color: "white",
    borderRadius: 10,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 16,
    marginBottom: 20,
  },
  buttonPrimary: {
    backgroundColor: "#007AFF",
    padding: 15,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 10,
  },
  buttonPrimaryText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
  },
  pickerContainer: {
    backgroundColor: "#333",
    borderRadius: 10,
    marginBottom: 20,
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
    marginBottom: 20,
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
});
