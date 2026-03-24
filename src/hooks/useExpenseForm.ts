import { useCallback, useEffect, useState } from "react";

type UseExpenseFormMode = "add" | "update";

type UseExpenseFormConfig = {
  mode: UseExpenseFormMode;
  categories: string[];
  initialAmount?: string;
  initialDescription?: string;
  initialCategory?: string;
  initialDate?: Date;
};

type FormValuesInput = {
  amount?: string;
  description?: string;
  category?: string;
  selectedDate?: Date;
};

type FormValidationResult =
  | {
      isValid: true;
      amountNumber: number;
      description: string;
      category: string;
      date: Date;
    }
  | {
      isValid: false;
      message: string;
    };

const safeDate = (value?: Date): Date => {
  if (!value) return new Date();
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
};

const firstCategory = (categories: string[], fallback?: string): string =>
  categories[0] ?? fallback ?? "Other";

export function useExpenseForm({
  mode,
  categories,
  initialAmount = "",
  initialDescription = "",
  initialCategory,
  initialDate,
}: UseExpenseFormConfig) {
  const [amount, setAmount] = useState(initialAmount);
  const [description, setDescription] = useState(initialDescription);
  const [category, setCategory] = useState(
    initialCategory ?? firstCategory(categories),
  );
  const [selectedDate, setSelectedDate] = useState(safeDate(initialDate));

  useEffect(() => {
    if (!categories.includes(category)) {
      setCategory(firstCategory(categories));
    }
  }, [categories, category]);

  const setFormValues = useCallback(
    ({ amount, description, category, selectedDate }: FormValuesInput) => {
      setAmount(String(amount ?? ""));
      setDescription(String(description ?? ""));
      setCategory(category ?? firstCategory(categories));
      setSelectedDate(safeDate(selectedDate));
    },
    [categories],
  );

  const resetForm = useCallback(() => {
    setAmount("");
    setDescription("");
    setCategory(firstCategory(categories));
    setSelectedDate(new Date());
  }, [categories]);

  const validateForm = useCallback((): FormValidationResult => {
    const safeDescription = String(description ?? "").trim();
    const amountNumber = Number.parseFloat(amount);

    if (mode === "add") {
      if (!safeDescription || Number.isNaN(amountNumber) || amountNumber <= 0) {
        return {
          isValid: false,
          message: "Please enter the amount and description.",
        };
      }
    } else {
      if (
        !amount ||
        !safeDescription ||
        !category ||
        Number.isNaN(amountNumber)
      ) {
        return {
          isValid: false,
          message: "Please fill all fields.",
        };
      }
    }

    return {
      isValid: true,
      amountNumber,
      description: safeDescription,
      category,
      date: selectedDate,
    };
  }, [amount, category, description, mode, selectedDate]);

  return {
    amount,
    setAmount,
    description,
    setDescription,
    category,
    setCategory,
    selectedDate,
    setSelectedDate,
    setFormValues,
    resetForm,
    validateForm,
  };
}
