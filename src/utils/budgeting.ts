export const getBudgetProgressColor = (percentage: number): string => {
  if (percentage < 50) return "#29C46D";
  if (percentage < 70) return "#9ACA3C";
  if (percentage < 85) return "#F0C33B";
  if (percentage < 95) return "#F08B3B";
  if (percentage <= 100) return "#E34A4A";
  return "#7A1E1E";
};

export const toBudgetPercentage = (
  spent: number,
  limit: number | null,
): number => {
  if (!limit || limit <= 0) return 0;
  return (spent / limit) * 100;
};

export const clampPercent = (value: number): number => {
  if (!Number.isFinite(value) || Number.isNaN(value)) return 0;
  if (value < 0) return 0;
  if (value > 100) return 100;
  return value;
};
