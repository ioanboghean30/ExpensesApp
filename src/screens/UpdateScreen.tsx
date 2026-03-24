import React, { useEffect, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
    AmountInput,
    CategoryPicker,
    DateField,
    DescriptionInput,
    ScreenHeader,
} from "../components";
import { THEMES } from "../constants/theme";
import {
    useCustomCategories,
    useExpenseForm,
    useExpenseMutations,
} from "../hooks";
import { useAppStore } from "../store/useAppStore";
export default function UpdateScreen({
  route,
  navigation,
}: {
  route: any;
  navigation: any;
}) {
  const authStatus = useAppStore((state) => state.authStatus);
  const currentTheme = useAppStore((state) => state.currentTheme);
  const {
    updateExpense,
    countExpensesByCategory,
    deleteExpensesByCategory,
    moveExpensesToCategory,
  } = useExpenseMutations(authStatus);
  const customCategories = useAppStore((state) => state.customCategories);
  const addCustomCategory = useAppStore((state) => state.addCustomCategory);
  const removeCustomCategory = useAppStore(
    (state) => state.removeCustomCategory,
  );
  const { allCategories, customOnlyCategories, defaultCategory } =
    useCustomCategories({
      customCategories,
    });

  const { expense: routeExpense, returnTo } = route.params ?? {};
  const expense = routeExpense;
  const {
    amount,
    setAmount,
    description,
    setDescription,
    category,
    setCategory,
    selectedDate,
    setSelectedDate,
    setFormValues,
    validateForm,
  } = useExpenseForm({
    mode: "update",
    categories: allCategories,
    initialAmount: String(expense?.amount ?? ""),
    initialDescription: expense?.description ?? "",
    initialCategory: expense?.category ?? defaultCategory,
    initialDate: new Date(expense?.date),
  });

  // Reset form when a different expense is selected
  useEffect(() => {
    if (!expense) return;
    setFormValues({
      amount: String(expense.amount ?? ""),
      description: expense.description ?? "",
      category: expense.category ?? defaultCategory,
      selectedDate: new Date(expense.date),
    });
  }, [defaultCategory, expense, setFormValues]);

  const [loading, setLoading] = useState(false);
  const theme = THEMES[currentTheme];

  if (!expense?.id) {
    return (
      <SafeAreaView
        edges={["left", "right"]}
        style={[styles.container, { backgroundColor: theme.background }]}
      >
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          <ScreenHeader title="Update Expense" />

          <Text style={[styles.label, { color: theme.textPrimary }]}>
            Invalid expense payload.
          </Text>
          <Pressable
            style={[styles.buttonPrimary, { backgroundColor: theme.primary }]}
            onPress={() => navigation.goBack()}
          >
            <Text
              style={[styles.buttonPrimaryText, { color: theme.background }]}
            >
              Go Back
            </Text>
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    );
  }

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

            if (expense?.category === categoryName) {
              Alert.alert(
                "Expense removed",
                "The expense you were editing was deleted with this category.",
              );
              if (returnTo) {
                navigation.navigate(returnTo);
              } else {
                navigation.goBack();
              }
            }
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

            if (expense?.category === categoryName) {
              setFormValues({
                amount,
                description,
                category: "Other",
                selectedDate,
              });
            }
          },
        },
        { text: "Cancel", style: "cancel" },
      ],
    );
  };

  // Save update action.
  const handleUpdate = async () => {
    const validation = validateForm();
    if (!validation.isValid) {
      Alert.alert("Error", validation.message);
      return;
    }
    setLoading(true);

    try {
      const { error } = await updateExpense(expense.id, {
        amount: validation.amountNumber,
        description: validation.description,
        category: validation.category,
        date: validation.date,
      });

      if (error) {
        setLoading(false);
        Alert.alert("Error", error);
        return;
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
    <SafeAreaView
      edges={["left", "right"]}
      style={[styles.container, { backgroundColor: theme.background }]}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <ScreenHeader title="Update Expense" />

        <Text style={[styles.label, { color: theme.textPrimary }]}>Amount</Text>
        <AmountInput
          style={[
            styles.input,
            {
              backgroundColor: theme.surface,
              color: theme.textPrimary,
            },
          ]}
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
        <Text style={[styles.label, { color: theme.textPrimary }]}>
          Description
        </Text>
        <DescriptionInput
          style={[
            styles.input,
            {
              backgroundColor: theme.surface,
              color: theme.textPrimary,
            },
          ]}
          value={description}
          onChangeText={setDescription}
        />
        <DateField
          label="Date"
          value={selectedDate}
          onChange={setSelectedDate}
          labelStyle={[styles.label, { color: theme.textPrimary }]}
          fieldStyle={[
            styles.input,
            {
              backgroundColor: theme.surface,
            },
          ]}
          textStyle={{ color: theme.textPrimary }}
        />
        <Pressable
          style={[styles.buttonPrimary, { backgroundColor: theme.primary }]}
          onPress={handleUpdate}
          disabled={loading}
        >
          <Text style={[styles.buttonPrimaryText, { color: theme.background }]}>
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
  },
  scrollContainer: {
    padding: 20,
  },
  label: {
    fontSize: 16,
    marginBottom: 5,
    fontWeight: "600",
  },
  input: {
    borderRadius: 10,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 16,
    marginBottom: 20,
  },
  buttonPrimary: {
    padding: 15,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 10,
  },
  buttonPrimaryText: {
    fontSize: 16,
    fontWeight: "bold",
  },
});
