export type ExpenseInput = {
  id?: unknown;
  amount?: unknown;
  description?: unknown;
  category?: unknown;
  date?: unknown;
};

export type NormalizedExpense = {
  id: string;
  amount: number;
  description: string;
  category: string;
  date: string;
};

export type NormalizedExpenseForState = Omit<NormalizedExpense, "date"> & {
  date: Date;
};

const toSafeString = (value: unknown, fallback = ""): string => {
  const normalized = String(value ?? fallback).trim();
  return normalized || fallback;
};

const toSafeAmount = (value: unknown): number => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || Number.isNaN(parsed)) {
    return 0;
  }

  return parsed;
};

const toDateInput = (value: unknown): string | number | Date => {
  if (value instanceof Date) return value;
  if (typeof value === "string" || typeof value === "number") return value;
  return Date.now();
};

const toSafeIsoDate = (value: unknown): string => {
  const parsed = new Date(toDateInput(value));
  if (Number.isNaN(parsed.getTime())) {
    return new Date().toISOString();
  }

  return parsed.toISOString();
};

export function normalizeExpense(expense: ExpenseInput): NormalizedExpense {
  return {
    id: toSafeString(expense.id, Math.random().toString()),
    amount: toSafeAmount(expense.amount),
    description: toSafeString(expense.description),
    category: toSafeString(expense.category, "Other"),
    date: toSafeIsoDate(expense.date),
  };
}

export function normalizeExpenseForState(
  expense: ExpenseInput,
): NormalizedExpenseForState {
  const normalized = normalizeExpense(expense);

  return {
    ...normalized,
    date: new Date(normalized.date),
  };
}

export function normalizeExpensesForState(
  expenses: ExpenseInput[],
): NormalizedExpenseForState[] {
  return expenses.map((expense) => normalizeExpenseForState(expense));
}
