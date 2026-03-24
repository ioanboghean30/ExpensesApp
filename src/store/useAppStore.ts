import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { THEMES, ThemeName } from "../constants/theme";
import { supabase } from "../lib/supabaseClient";
import { normalizeExpensesForState } from "../utils/normalizeData";

export type AuthStatus = "loggedOut" | "guest" | "loggedIn";

export const DEFAULT_CATEGORIES = [
  "Food",
  "Transport",
  "Bills",
  "Entertainment",
  "Shopping",
  "Health",
  "Other",
];

export const CATEGORY_ICONS: Record<string, string> = {
  Food: "food-variant",
  Transport: "car",
  Bills: "file-document-outline",
  Entertainment: "gamepad-variant",
  Shopping: "shopping",
  Health: "heart-pulse",
  Other: "dots-horizontal-circle",
};

export const CATEGORY_COLORS: Record<string, string> = {
  Food: "#FF6384",
  Transport: "#36A2EB",
  Bills: "#FFCE56",
  Entertainment: "#4BC0C0",
  Shopping: "#9966FF",
  Health: "#FF9F40",
  Other: "#C9CBCF",
};

export const CUSTOM_CATEGORY_ICON = "shape-outline";
export const CUSTOM_CATEGORY_COLOR = "#7B8794";

const hashCategoryName = (category: string): number => {
  let hash = 0;
  const normalized = category.trim().toLowerCase();

  for (let i = 0; i < normalized.length; i += 1) {
    hash = (hash * 31 + normalized.charCodeAt(i)) >>> 0;
  }

  return hash;
};

const generateCustomCategoryColor = (category: string): string => {
  const normalized = category.trim();
  if (!normalized) return CUSTOM_CATEGORY_COLOR;

  // Spread custom category hues around the color wheel and keep saturation/lightness readable.
  const hash = hashCategoryName(normalized);
  const hue = hash % 360;
  const saturation = 55 + (hash % 16);
  const lightness = 46 + ((hash >> 4) % 10);

  return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
};

export const getCategoryIcon = (category: string): string =>
  CATEGORY_ICONS[category] ?? CUSTOM_CATEGORY_ICON;

export const getCategoryColor = (category: string): string =>
  CATEGORY_COLORS[category] ?? generateCustomCategoryColor(category);

export type Expense = {
  id: string;
  amount: number;
  description: string;
  date: Date;
  category: string;
};

export type Budgets = {
  totalLimit: number | null;
  categoryLimits: Record<string, number>;
};

const DEFAULT_BUDGETS: Budgets = {
  totalLimit: null,
  categoryLimits: {},
};

const BUDGETS_STORAGE_KEY = "userBudgets";
const THEME_STORAGE_KEY = "appTheme";
const DEFAULT_THEME: ThemeName = "midnightEmerald";

const toBudgetLimit = (value: unknown): number | null => {
  if (value === null || value === undefined || value === "") return null;

  const parsed = Number(value);
  if (!Number.isFinite(parsed) || Number.isNaN(parsed) || parsed <= 0) {
    return null;
  }

  return parsed;
};

const normalizeCategoryLimits = (raw: unknown): Record<string, number> => {
  if (!raw || typeof raw !== "object") return {};

  const entries = Object.entries(raw as Record<string, unknown>);
  const normalized: Record<string, number> = {};

  entries.forEach(([category, value]) => {
    const cleanCategory = String(category ?? "").trim();
    const cleanLimit = toBudgetLimit(value);

    if (!cleanCategory || cleanLimit === null) {
      return;
    }

    normalized[cleanCategory] = cleanLimit;
  });

  return normalized;
};

const normalizeBudgets = (raw: unknown): Budgets => {
  if (!raw || typeof raw !== "object") {
    return DEFAULT_BUDGETS;
  }

  const parsed = raw as {
    totalLimit?: unknown;
    categoryLimits?: unknown;
    total_limit?: unknown;
    category_limits?: unknown;
  };

  return {
    totalLimit: toBudgetLimit(parsed.totalLimit ?? parsed.total_limit),
    categoryLimits: normalizeCategoryLimits(
      parsed.categoryLimits ?? parsed.category_limits,
    ),
  };
};

const loadBudgetsFromStorage = async (): Promise<Budgets> => {
  try {
    const saved = await AsyncStorage.getItem(BUDGETS_STORAGE_KEY);
    if (!saved) return DEFAULT_BUDGETS;

    return normalizeBudgets(JSON.parse(saved));
  } catch (error) {
    console.error("Failed to read budgets from storage", error);
    return DEFAULT_BUDGETS;
  }
};

const persistBudgetsToStorage = async (budgets: Budgets): Promise<void> => {
  try {
    await AsyncStorage.setItem(BUDGETS_STORAGE_KEY, JSON.stringify(budgets));
  } catch (error) {
    console.error("Failed to save budgets to storage", error);
  }
};

const fetchBudgetsFromSupabase = async (): Promise<{
  budgets: Budgets;
  error?: string;
}> => {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return {
        budgets: DEFAULT_BUDGETS,
        error: "Not authenticated.",
      };
    }

    const { data, error } = await supabase
      .from("budgets")
      .select("total_limit, category_limits")
      .eq("user_id", user.id)
      .maybeSingle();

    if (error) {
      return {
        budgets: DEFAULT_BUDGETS,
        error: error.message,
      };
    }

    if (!data) {
      return {
        budgets: DEFAULT_BUDGETS,
      };
    }

    return {
      budgets: normalizeBudgets(data),
    };
  } catch (error) {
    console.error("Failed to fetch budgets from Supabase", error);
    return {
      budgets: DEFAULT_BUDGETS,
      error: "Failed to fetch budgets from cloud.",
    };
  }
};

const upsertBudgetsToSupabase = async (
  budgets: Budgets,
): Promise<{ error?: string }> => {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { error: "Not authenticated." };
    }

    const { error } = await supabase.from("budgets").upsert(
      {
        user_id: user.id,
        total_limit: budgets.totalLimit,
        category_limits: budgets.categoryLimits,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: "user_id",
      },
    );

    if (error) {
      return { error: error.message };
    }

    return {};
  } catch (error) {
    console.error("Failed to save budgets to Supabase", error);
    return { error: "Failed to save budgets to cloud." };
  }
};

type AppState = {
  authStatus: AuthStatus;
  currency: string;
  currentTheme: ThemeName;
  expenses: Expense[];
  customCategories: string[];
  budgets: Budgets;
  setAuthStatus: (status: AuthStatus) => void;
  setCurrency: (currency: string) => void;
  setCurrentTheme: (theme: ThemeName) => Promise<void>;
  setExpenses: (expenses: Expense[]) => void;
  loadBudgets: () => Promise<void>;
  setTotalBudgetLimit: (limit: number | null) => Promise<{ error?: string }>;
  setCategoryBudgetLimit: (
    category: string,
    limit: number,
  ) => Promise<{ error?: string }>;
  removeCategoryBudgetLimit: (category: string) => Promise<{ error?: string }>;
  clearBudgets: () => Promise<void>;
  setCustomCategories: (categories: string[]) => Promise<void>;
  addCustomCategory: (category: string) => Promise<boolean>;
  removeCustomCategory: (category: string) => Promise<boolean>;
  hydrateFromStorage: () => Promise<void>;
  handleLogout: () => Promise<void>;
};

export const useAppStore = create<AppState>((set, get) => ({
  authStatus: "loggedOut",
  currency: "RON",
  currentTheme: DEFAULT_THEME,
  expenses: [],
  customCategories: [],
  budgets: DEFAULT_BUDGETS,

  setAuthStatus: (status) => set({ authStatus: status }),
  setCurrency: (currency) => set({ currency }),
  setCurrentTheme: async (theme) => {
    const nextTheme = theme in THEMES ? theme : DEFAULT_THEME;
    set({ currentTheme: nextTheme });

    try {
      await AsyncStorage.setItem(THEME_STORAGE_KEY, nextTheme);
    } catch (e) {
      console.error("Failed to save app theme", e);
    }
  },
  setExpenses: (expenses) =>
    set({
      expenses: normalizeExpensesForState(expenses),
    }),
  loadBudgets: async () => {
    const { authStatus } = get();

    if (authStatus === "loggedIn") {
      const remote = await fetchBudgetsFromSupabase();

      if (!remote.error) {
        set({ budgets: remote.budgets });
        await persistBudgetsToStorage(remote.budgets);
        return;
      }
    }

    const local = await loadBudgetsFromStorage();
    set({ budgets: local });
  },
  setTotalBudgetLimit: async (limit) => {
    const nextBudgets: Budgets = {
      ...get().budgets,
      totalLimit: toBudgetLimit(limit),
    };

    set({ budgets: nextBudgets });
    await persistBudgetsToStorage(nextBudgets);

    if (get().authStatus === "loggedIn") {
      return upsertBudgetsToSupabase(nextBudgets);
    }

    return {};
  },
  setCategoryBudgetLimit: async (category, limit) => {
    const normalizedCategory = String(category ?? "").trim();
    const normalizedLimit = toBudgetLimit(limit);

    if (!normalizedCategory || normalizedLimit === null) {
      return { error: "Invalid category limit." };
    }

    const current = get().budgets;
    const nextBudgets: Budgets = {
      ...current,
      categoryLimits: {
        ...current.categoryLimits,
        [normalizedCategory]: normalizedLimit,
      },
    };

    set({ budgets: nextBudgets });
    await persistBudgetsToStorage(nextBudgets);

    if (get().authStatus === "loggedIn") {
      return upsertBudgetsToSupabase(nextBudgets);
    }

    return {};
  },
  removeCategoryBudgetLimit: async (category) => {
    const normalizedCategory = String(category ?? "").trim();
    if (!normalizedCategory) {
      return { error: "Invalid category." };
    }

    const current = get().budgets;
    const nextCategoryLimits = { ...current.categoryLimits };
    delete nextCategoryLimits[normalizedCategory];

    const nextBudgets: Budgets = {
      ...current,
      categoryLimits: nextCategoryLimits,
    };

    set({ budgets: nextBudgets });
    await persistBudgetsToStorage(nextBudgets);

    if (get().authStatus === "loggedIn") {
      return upsertBudgetsToSupabase(nextBudgets);
    }

    return {};
  },
  clearBudgets: async () => {
    set({ budgets: DEFAULT_BUDGETS });
    await persistBudgetsToStorage(DEFAULT_BUDGETS);

    if (get().authStatus === "loggedIn") {
      await upsertBudgetsToSupabase(DEFAULT_BUDGETS);
    }
  },
  setCustomCategories: async (categories) => {
    try {
      await AsyncStorage.setItem("userCategories", JSON.stringify(categories));
      set({ customCategories: categories });
    } catch (e) {
      console.error("Failed to save custom categories", e);
    }
  },
  addCustomCategory: async (category) => {
    const trimmed = category.trim();
    if (!trimmed) return false;

    const state = useAppStore.getState();
    const existing = [...DEFAULT_CATEGORIES, ...state.customCategories].some(
      (c) => c.toLowerCase() === trimmed.toLowerCase(),
    );

    if (existing) return false;

    const next = [...state.customCategories, trimmed];
    try {
      await AsyncStorage.setItem("userCategories", JSON.stringify(next));
      set({ customCategories: next });
      return true;
    } catch (e) {
      console.error("Failed to add custom category", e);
      return false;
    }
  },
  removeCustomCategory: async (category) => {
    const trimmed = category.trim();
    if (!trimmed) return false;

    const state = get();
    const next = state.customCategories.filter(
      (c) => c.toLowerCase() !== trimmed.toLowerCase(),
    );

    if (next.length === state.customCategories.length) {
      return false;
    }

    try {
      await AsyncStorage.setItem("userCategories", JSON.stringify(next));
      const nextCategoryLimits = { ...state.budgets.categoryLimits };
      delete nextCategoryLimits[trimmed];

      const nextBudgets: Budgets = {
        ...state.budgets,
        categoryLimits: nextCategoryLimits,
      };

      set({ customCategories: next, budgets: nextBudgets });
      await persistBudgetsToStorage(nextBudgets);

      if (state.authStatus === "loggedIn") {
        await upsertBudgetsToSupabase(nextBudgets);
      }

      return true;
    } catch (e) {
      console.error("Failed to remove custom category", e);
      return false;
    }
  },

  hydrateFromStorage: async () => {
    try {
      const [
        savedStatus,
        savedCurrency,
        savedCategories,
        savedBudgets,
        savedTheme,
      ] = await Promise.all([
        AsyncStorage.getItem("authStatus"),
        AsyncStorage.getItem("userCurrency"),
        AsyncStorage.getItem("userCategories"),
        AsyncStorage.getItem(BUDGETS_STORAGE_KEY),
        AsyncStorage.getItem(THEME_STORAGE_KEY),
      ]);

      if (savedStatus === "guest" || savedStatus === "loggedIn") {
        set({ authStatus: savedStatus });
      } else {
        set({ authStatus: "loggedOut" });
      }

      if (savedCurrency) {
        set({ currency: savedCurrency });
      }

      if (savedTheme && savedTheme in THEMES) {
        set({ currentTheme: savedTheme as ThemeName });
      }

      if (savedCategories) {
        const parsed = JSON.parse(savedCategories);
        if (Array.isArray(parsed)) {
          set({
            customCategories: parsed.filter((x) => typeof x === "string"),
          });
        }
      }

      if (savedBudgets) {
        const parsedBudgets = normalizeBudgets(JSON.parse(savedBudgets));
        set({ budgets: parsedBudgets });
      }
    } catch (e) {
      console.error("Failed to hydrate app store", e);
      set({
        authStatus: "loggedOut",
        currency: "RON",
        currentTheme: DEFAULT_THEME,
        customCategories: [],
        budgets: DEFAULT_BUDGETS,
      });
    }
  },

  handleLogout: async () => {
    try {
      await AsyncStorage.multiRemove([
        "authStatus",
        "userCurrency",
        "userCountry",
        "savedExpenses",
        "userCategories",
        BUDGETS_STORAGE_KEY,
      ]);
    } catch (e) {
      console.error("Failed to clear local session", e);
    } finally {
      set({
        authStatus: "loggedOut",
        currency: "RON",
        currentTheme: get().currentTheme,
        expenses: [],
        customCategories: [],
        budgets: DEFAULT_BUDGETS,
      });
    }
  },
}));
