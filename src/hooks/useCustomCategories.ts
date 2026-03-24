import { useCallback, useMemo } from "react";
import {
  DEFAULT_CATEGORIES,
  getCategoryColor,
  getCategoryIcon,
} from "../store/useAppStore";

type UseCustomCategoriesOptions = {
  customCategories: string[];
  includeAllOption?: boolean;
};

const normalizeCategoryName = (value: unknown): string =>
  String(value ?? "")
    .replace(/\s+/g, " ")
    .trim();

export function useCustomCategories({
  customCategories,
  includeAllOption = false,
}: UseCustomCategoriesOptions) {
  const normalizedCustomCategories = useMemo(() => {
    const seen = new Set<string>();
    const result: string[] = [];

    customCategories.forEach((category) => {
      const normalized = normalizeCategoryName(category);
      if (!normalized) return;

      const key = normalized.toLowerCase();
      if (seen.has(key)) return;
      seen.add(key);

      result.push(normalized);
    });

    return result;
  }, [customCategories]);

  const allCategories = useMemo(() => {
    const defaultSet = new Set(
      DEFAULT_CATEGORIES.map((category) => category.toLowerCase()),
    );
    const customOnly = normalizedCustomCategories.filter(
      (category) => !defaultSet.has(category.toLowerCase()),
    );

    return [...DEFAULT_CATEGORIES, ...customOnly];
  }, [normalizedCustomCategories]);

  const customOnlyCategories = useMemo(() => {
    const defaultSet = new Set(
      DEFAULT_CATEGORIES.map((category) => category.toLowerCase()),
    );

    return normalizedCustomCategories.filter(
      (category) => !defaultSet.has(category.toLowerCase()),
    );
  }, [normalizedCustomCategories]);

  const categoryFilters = useMemo(
    () => (includeAllOption ? ["All", ...allCategories] : allCategories),
    [allCategories, includeAllOption],
  );

  const categoryMap = useMemo(() => {
    const map = new Map<string, string>();
    allCategories.forEach((category) => {
      map.set(category.toLowerCase(), category);
    });
    return map;
  }, [allCategories]);

  const resolveCategory = useCallback(
    (category: unknown): string => {
      const normalized = normalizeCategoryName(category);
      if (!normalized) return allCategories[0] ?? "Other";

      const canonical = categoryMap.get(normalized.toLowerCase());
      return canonical ?? normalized;
    },
    [allCategories, categoryMap],
  );

  const getCategoryIconSafe = useCallback(
    (category: unknown): string => getCategoryIcon(resolveCategory(category)),
    [resolveCategory],
  );

  const getCategoryColorSafe = useCallback(
    (category: unknown): string => getCategoryColor(resolveCategory(category)),
    [resolveCategory],
  );

  const isKnownCategory = useCallback(
    (category: unknown): boolean => {
      const normalized = normalizeCategoryName(category);
      if (!normalized) return false;
      return categoryMap.has(normalized.toLowerCase());
    },
    [categoryMap],
  );

  return {
    allCategories,
    customOnlyCategories,
    categoryFilters,
    defaultCategory: allCategories[0] ?? "Other",
    normalizeCategoryName,
    resolveCategory,
    getCategoryIconSafe,
    getCategoryColorSafe,
    isKnownCategory,
  };
}
