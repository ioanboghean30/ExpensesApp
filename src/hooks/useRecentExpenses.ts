import { useMemo, useState } from "react";

type ExpenseLike = {
  id: string;
  date: Date | string;
};

type UseRecentExpensesOptions = {
  limit?: number;
  windowDays?: number;
};

const toDate = (value: Date | string): Date => {
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? new Date(0) : date;
};

export function useRecentExpenses<T extends ExpenseLike>(
  expenses: T[],
  options: UseRecentExpensesOptions = {},
) {
  const { limit = 3, windowDays = 30 } = options;
  const [expanded, setExpanded] = useState(false);

  const displayedExpenses = useMemo(() => {
    if (!expanded) {
      return expenses.slice(0, limit);
    }

    const threshold = new Date();
    threshold.setDate(threshold.getDate() - windowDays);

    return expenses.filter((expense) => toDate(expense.date) >= threshold);
  }, [expenses, expanded, limit, windowDays]);

  const shouldShowToggle = expenses.length > limit;

  return {
    expanded,
    setExpanded,
    displayedExpenses,
    shouldShowToggle,
  };
}
