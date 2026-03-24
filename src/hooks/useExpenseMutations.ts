import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "../lib/supabaseClient";
import { AuthStatus } from "../store/useAppStore";
import {
    normalizeExpense,
    normalizeExpenseForState,
} from "../utils/normalizeData";

type MutationExpense = {
  id: string;
  amount: number;
  description: string;
  category: string;
  date: Date;
};

type ExpensePayload = {
  amount: number;
  description: string;
  category: string;
  date: Date;
};

const toMutationExpense = (value: any): MutationExpense =>
  normalizeExpenseForState(value);

const readGuestExpenses = async (): Promise<MutationExpense[]> => {
  const savedExpensesJson = await AsyncStorage.getItem("savedExpenses");
  if (!savedExpensesJson) {
    return [];
  }

  try {
    const parsed = JSON.parse(savedExpensesJson);
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.map(toMutationExpense);
  } catch (error) {
    console.error("Failed to parse guest expenses", error);
    return [];
  }
};

const saveGuestExpenses = async (expenses: MutationExpense[]) => {
  const normalized = expenses.map((expense) => normalizeExpense(expense));
  await AsyncStorage.setItem("savedExpenses", JSON.stringify(normalized));
};

export function useExpenseMutations(authStatus: AuthStatus) {
  const countExpensesByCategory = async (
    category: string,
  ): Promise<{ count: number; error?: string }> => {
    try {
      if (authStatus === "guest") {
        const current = await readGuestExpenses();
        return {
          count: current.filter((expense) => expense.category === category)
            .length,
        };
      }

      if (authStatus === "loggedIn") {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          return { count: 0, error: "Not authenticated." };
        }

        const { count, error } = await supabase
          .from("expenses")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id)
          .eq("category", category);

        if (error) {
          return { count: 0, error: error.message };
        }

        return { count: count ?? 0 };
      }

      return { count: 0, error: "Cannot query expenses while logged out." };
    } catch (error) {
      console.error("Count by category failed", error);
      return { count: 0, error: "Failed to count expenses by category." };
    }
  };

  const deleteExpensesByCategory = async (
    category: string,
  ): Promise<{ deletedCount: number; error?: string }> => {
    try {
      if (authStatus === "guest") {
        const current = await readGuestExpenses();
        const filtered = current.filter(
          (expense) => expense.category !== category,
        );
        await saveGuestExpenses(filtered);
        return { deletedCount: current.length - filtered.length };
      }

      if (authStatus === "loggedIn") {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          return { deletedCount: 0, error: "Not authenticated." };
        }

        const { data, error } = await supabase
          .from("expenses")
          .delete()
          .eq("user_id", user.id)
          .eq("category", category)
          .select("id");

        if (error) {
          return { deletedCount: 0, error: error.message };
        }

        return { deletedCount: data?.length ?? 0 };
      }

      return {
        deletedCount: 0,
        error: "Cannot delete expenses while logged out.",
      };
    } catch (error) {
      console.error("Delete by category failed", error);
      return { deletedCount: 0, error: "Failed to delete category expenses." };
    }
  };

  const moveExpensesToCategory = async (
    fromCategory: string,
    toCategory: string,
  ): Promise<{ movedCount: number; error?: string }> => {
    try {
      if (authStatus === "guest") {
        const current = await readGuestExpenses();
        let movedCount = 0;
        const updated = current.map((expense) => {
          if (expense.category !== fromCategory) return expense;
          movedCount += 1;
          return { ...expense, category: toCategory };
        });

        await saveGuestExpenses(updated);
        return { movedCount };
      }

      if (authStatus === "loggedIn") {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          return { movedCount: 0, error: "Not authenticated." };
        }

        const { data, error } = await supabase
          .from("expenses")
          .update({ category: toCategory })
          .eq("user_id", user.id)
          .eq("category", fromCategory)
          .select("id");

        if (error) {
          return { movedCount: 0, error: error.message };
        }

        return { movedCount: data?.length ?? 0 };
      }

      return { movedCount: 0, error: "Cannot move expenses while logged out." };
    } catch (error) {
      console.error("Move by category failed", error);
      return { movedCount: 0, error: "Failed to move category expenses." };
    }
  };

  const addExpense = async (
    payload: ExpensePayload,
  ): Promise<{ expense?: MutationExpense; error?: string }> => {
    try {
      if (authStatus === "guest") {
        const createdExpense: MutationExpense = toMutationExpense({
          ...payload,
          id: Math.random().toString(),
        });

        const current = await readGuestExpenses();
        await saveGuestExpenses([createdExpense, ...current]);
        return { expense: createdExpense };
      }

      if (authStatus === "loggedIn") {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          return { error: "Not authenticated." };
        }

        const normalizedPayload = normalizeExpense(payload);
        const { data, error } = await supabase
          .from("expenses")
          .insert({
            amount: normalizedPayload.amount,
            description: normalizedPayload.description,
            category: normalizedPayload.category,
            date: normalizedPayload.date,
            user_id: user.id,
          })
          .select()
          .single();

        if (error) {
          return { error: error.message };
        }

        return { expense: toMutationExpense(data) };
      }

      return { error: "Cannot add expense while logged out." };
    } catch (error) {
      console.error("Add expense failed", error);
      return { error: "Failed to add expense." };
    }
  };

  const updateExpense = async (
    id: string,
    payload: ExpensePayload,
  ): Promise<{ error?: string }> => {
    try {
      if (authStatus === "guest") {
        const current = await readGuestExpenses();
        const updated = current.map((expense) =>
          expense.id === id
            ? toMutationExpense({ ...expense, ...payload })
            : expense,
        );
        await saveGuestExpenses(updated);
        return {};
      }

      if (authStatus === "loggedIn") {
        const normalizedPayload = normalizeExpense(payload);
        const { error } = await supabase
          .from("expenses")
          .update({
            amount: normalizedPayload.amount,
            description: normalizedPayload.description,
            category: normalizedPayload.category,
            date: normalizedPayload.date,
          })
          .eq("id", id);

        if (error) {
          return { error: error.message };
        }

        return {};
      }

      return { error: "Cannot update expense while logged out." };
    } catch (error) {
      console.error("Update expense failed", error);
      return { error: "Failed to update expense." };
    }
  };

  const deleteExpense = async (id: string): Promise<{ error?: string }> => {
    try {
      if (authStatus === "guest") {
        const current = await readGuestExpenses();
        const filtered = current.filter((expense) => expense.id !== id);
        await saveGuestExpenses(filtered);
        return {};
      }

      if (authStatus === "loggedIn") {
        const { error } = await supabase.from("expenses").delete().eq("id", id);
        if (error) {
          return { error: error.message };
        }

        return {};
      }

      return { error: "Cannot delete expense while logged out." };
    } catch (error) {
      console.error("Delete expense failed", error);
      return { error: "Failed to delete expense." };
    }
  };

  return {
    countExpensesByCategory,
    deleteExpensesByCategory,
    moveExpensesToCategory,
    addExpense,
    updateExpense,
    deleteExpense,
  };
}
