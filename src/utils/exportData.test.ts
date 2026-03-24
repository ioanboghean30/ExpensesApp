import { exportExpensesToCSV } from "./exportData";

const mockWriteAsStringAsync = jest.fn();
const mockShareAsync = jest.fn();
const mockIsAvailableAsync = jest.fn();

jest.mock("expo-file-system/legacy", () => ({
  cacheDirectory: "file:///cache/",
  documentDirectory: "file:///docs/",
  EncodingType: {
    UTF8: "utf8",
  },
  writeAsStringAsync: (...args: unknown[]) => mockWriteAsStringAsync(...args),
}));

jest.mock("expo-sharing", () => ({
  isAvailableAsync: (...args: unknown[]) => mockIsAvailableAsync(...args),
  shareAsync: (...args: unknown[]) => mockShareAsync(...args),
}));

describe("exportExpensesToCSV", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockWriteAsStringAsync.mockResolvedValue(undefined);
    mockIsAvailableAsync.mockResolvedValue(true);
    mockShareAsync.mockResolvedValue(undefined);
  });

  it("writes escaped CSV and opens native share sheet", async () => {
    const expenses = [
      {
        amount: 42.5,
        description: 'apples, pears and "honey"',
        category: "Food",
        date: "2026-03-22T10:00:00.000Z",
      },
      {
        amount: 15,
        description: "Bus pass",
        category: "Transport",
        date: new Date("2026-03-20T08:00:00.000Z"),
      },
    ];

    await exportExpensesToCSV(expenses);

    expect(mockWriteAsStringAsync).toHaveBeenCalledTimes(1);

    const [uri, content, options] = mockWriteAsStringAsync.mock.calls[0];
    expect(uri).toContain("file:///cache/expenses-");
    expect(uri).toContain(".csv");
    expect(options).toEqual({ encoding: "utf8" });

    expect(content).toContain("Date,Description,Category,Amount");
    expect(content).toContain(
      '"2026-03-22","apples, pears and ""honey""","Food",42.50',
    );
    expect(content).toContain('"2026-03-20","Bus pass","Transport",15.00');

    expect(mockIsAvailableAsync).toHaveBeenCalledTimes(1);
    expect(mockShareAsync).toHaveBeenCalledTimes(1);
    expect(mockShareAsync).toHaveBeenCalledWith(
      uri,
      expect.objectContaining({
        mimeType: "text/csv",
        dialogTitle: "Export expenses to CSV",
        UTI: "public.comma-separated-values-text",
      }),
    );
  });

  it("throws when sharing is unavailable", async () => {
    mockIsAvailableAsync.mockResolvedValue(false);

    await expect(
      exportExpensesToCSV([
        {
          amount: 1,
          description: "x",
          category: "Other",
          date: "2026-03-22T10:00:00.000Z",
        },
      ]),
    ).rejects.toThrow("Sharing is not available on this device.");

    expect(mockWriteAsStringAsync).toHaveBeenCalledTimes(1);
    expect(mockShareAsync).not.toHaveBeenCalled();
  });
});
