import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "../lib/supabaseClient";
import { useAppStore } from "../store/useAppStore";

type ConversionResult = {
  success: boolean;
  migratedExpenses: number;
  error?: string;
};

type SupabaseExpenseInsert = {
  amount: number;
  description: string;
  category: string;
  date: string;
  user_id: string;
};

const normalizeCustomCategories = (raw: unknown): string[] => {
  if (!Array.isArray(raw)) return [];

  const seen = new Set<string>();
  const result: string[] = [];

  raw.forEach((value) => {
    const normalized = String(value ?? "")
      .replace(/\s+/g, " ")
      .trim();
    if (!normalized) return;

    const key = normalized.toLowerCase();
    if (seen.has(key)) return;

    seen.add(key);
    result.push(normalized);
  });

  return result;
};

const parseGuestExpenses = (
  raw: unknown,
  userId: string,
): SupabaseExpenseInsert[] => {
  if (!Array.isArray(raw)) return [];

  return raw
    .map((item) => {
      const amount = Number(item?.amount ?? 0);
      const description = String(item?.description ?? "").trim();
      const category = String(item?.category ?? "Other").trim() || "Other";
      const parsedDate = new Date(item?.date ?? Date.now());

      if (!description || Number.isNaN(amount) || amount <= 0) return null;
      if (Number.isNaN(parsedDate.getTime())) return null;

      return {
        amount,
        description,
        category,
        date: parsedDate.toISOString(),
        user_id: userId,
      };
    })
    .filter((expense): expense is SupabaseExpenseInsert => expense !== null);
};

export function useGuestToCloudMigration() {
  const setAuthStatus = useAppStore((state) => state.setAuthStatus);
  const setCustomCategories = useAppStore((state) => state.setCustomCategories);

  const convertGuestToCloud = async (
    email: string,
    password: string,
  ): Promise<ConversionResult> => {
    try {
      const normalizedEmail = email.trim().toLowerCase();
      if (!normalizedEmail || !password) {
        return {
          success: false,
          migratedExpenses: 0,
          error: "Please enter the email and password.",
        };
      }

      const { data, error } = await supabase.auth.signUp({
        email: normalizedEmail,
        password,
      });

      if (error) {
        return {
          success: false,
          migratedExpenses: 0,
          error: error.message,
        };
      }

      const userId = data.user?.id;
      if (!userId) {
        return {
          success: false,
          migratedExpenses: 0,
          error: "Could not resolve the new user. Please try again.",
        };
      }

      const [savedExpensesJson, savedCategoriesJson] = await Promise.all([
        AsyncStorage.getItem("savedExpenses"),
        AsyncStorage.getItem("userCategories"),
      ]);

      const parsedExpenses = savedExpensesJson
        ? JSON.parse(savedExpensesJson)
        : [];
      const parsedCategories = savedCategoriesJson
        ? normalizeCustomCategories(JSON.parse(savedCategoriesJson))
        : [];

      const expensesToInsert = parseGuestExpenses(parsedExpenses, userId);

      if (expensesToInsert.length > 0) {
        const { error: insertError } = await supabase
          .from("expenses")
          .insert(expensesToInsert);

        if (insertError) {
          return {
            success: false,
            migratedExpenses: 0,
            error: insertError.message,
          };
        }
      }

      await Promise.all([
        AsyncStorage.removeItem("savedExpenses"),
        setCustomCategories(parsedCategories),
      ]);

      setAuthStatus("loggedIn");

      return {
        success: true,
        migratedExpenses: expensesToInsert.length,
      };
    } catch (e) {
      console.error("Guest conversion failed", e);
      return {
        success: false,
        migratedExpenses: 0,
        error: "Failed to migrate guest data. Please try again.",
      };
    }
  };

  return {
    convertGuestToCloud,
  };
}
