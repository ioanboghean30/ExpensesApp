import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";

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

type AppState = {
  authStatus: AuthStatus;
  currency: string;
  expenses: Expense[];
  customCategories: string[];
  setAuthStatus: (status: AuthStatus) => void;
  setCurrency: (currency: string) => void;
  setExpenses: (expenses: Expense[]) => void;
  setCustomCategories: (categories: string[]) => Promise<void>;
  addCustomCategory: (category: string) => Promise<boolean>;
  hydrateFromStorage: () => Promise<void>;
  handleLogout: () => Promise<void>;
};

export const useAppStore = create<AppState>((set) => ({
  authStatus: "loggedOut",
  currency: "RON",
  expenses: [],
  customCategories: [],

  setAuthStatus: (status) => set({ authStatus: status }),
  setCurrency: (currency) => set({ currency }),
  setExpenses: (expenses) => set({ expenses }),
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

  hydrateFromStorage: async () => {
    try {
      const [savedStatus, savedCurrency, savedCategories] = await Promise.all([
        AsyncStorage.getItem("authStatus"),
        AsyncStorage.getItem("userCurrency"),
        AsyncStorage.getItem("userCategories"),
      ]);

      if (savedStatus === "guest" || savedStatus === "loggedIn") {
        set({ authStatus: savedStatus });
      } else {
        set({ authStatus: "loggedOut" });
      }

      if (savedCurrency) {
        set({ currency: savedCurrency });
      }

      if (savedCategories) {
        const parsed = JSON.parse(savedCategories);
        if (Array.isArray(parsed)) {
          set({
            customCategories: parsed.filter((x) => typeof x === "string"),
          });
        }
      }
    } catch (e) {
      console.error("Failed to hydrate app store", e);
      set({ authStatus: "loggedOut", currency: "RON", customCategories: [] });
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
      ]);
    } catch (e) {
      console.error("Failed to clear local session", e);
    } finally {
      set({
        authStatus: "loggedOut",
        currency: "RON",
        expenses: [],
        customCategories: [],
      });
    }
  },
}));
