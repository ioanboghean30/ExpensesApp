import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";

type ExportableExpense = {
  amount: number;
  description: string;
  category: string;
  date: Date | string;
};

const toCsvSafeText = (value: unknown): string => {
  const text = String(value ?? "");
  const escaped = text.replace(/"/g, '""');
  return `"${escaped}"`;
};

const toCsvDate = (value: Date | string): string => {
  const parsed = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";

  const year = parsed.getFullYear();
  const month = String(parsed.getMonth() + 1).padStart(2, "0");
  const day = String(parsed.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export const exportExpensesToCSV = async (
  expenses: ExportableExpense[],
): Promise<void> => {
  const headers = ["Date", "Description", "Category", "Amount"];

  const rows = expenses.map((expense) => {
    const date = toCsvSafeText(toCsvDate(expense.date));
    const description = toCsvSafeText(expense.description);
    const category = toCsvSafeText(expense.category);
    const amount = Number(expense.amount ?? 0).toFixed(2);

    return [date, description, category, amount].join(",");
  });

  const csvContent = [headers.join(","), ...rows].join("\n");

  const baseDirectory =
    FileSystem.cacheDirectory ?? FileSystem.documentDirectory;
  if (!baseDirectory) {
    throw new Error("No writable directory is available on this device.");
  }

  const fileUri = `${baseDirectory}expenses-${Date.now()}.csv`;

  await FileSystem.writeAsStringAsync(fileUri, csvContent, {
    encoding: FileSystem.EncodingType.UTF8,
  });

  const canShare = await Sharing.isAvailableAsync();
  if (!canShare) {
    throw new Error("Sharing is not available on this device.");
  }

  await Sharing.shareAsync(fileUri, {
    mimeType: "text/csv",
    dialogTitle: "Export expenses to CSV",
    UTI: "public.comma-separated-values-text",
  });
};
