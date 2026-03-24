import AsyncStorage from "@react-native-async-storage/async-storage";
import { fireEvent, render, waitFor } from "@testing-library/react-native";
import React from "react";
import { useCustomCategories, useStatistics } from "../hooks";
import { useAppStore } from "../store/useAppStore";
import StatisticsScreen from "./StatisticsScreen";

jest.mock("@react-navigation/native", () => ({
  useIsFocused: jest.fn(() => true),
  useNavigation: jest.fn(() => ({
    canGoBack: () => false,
    goBack: jest.fn(),
    toggleDrawer: jest.fn(),
  })),
}));

jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: jest.fn(() => ({ top: 0, right: 0, bottom: 0, left: 0 })),
}));

jest.mock("react-native-chart-kit", () => ({
  BarChart: () => null,
  PieChart: () => null,
}));

jest.mock("../hooks", () => {
  const actual = jest.requireActual("../hooks");
  return {
    ...actual,
    TIME_FILTERS: [{ id: "month", label: "This Month" }],
    useCustomCategories: jest.fn(),
    useStatistics: jest.fn(),
  };
});

jest.mock("../store/useAppStore", () => ({
  useAppStore: jest.fn(),
}));

describe("StatisticsScreen budgets UX", () => {
  const mockState = {
    authStatus: "guest" as const,
    currentTheme: "midnightEmerald" as const,
    customCategories: [] as string[],
    budgets: {
      totalLimit: 300,
      categoryLimits: {
        Food: 100,
        Transport: 100,
        Bills: 100,
      },
    },
    setExpenses: jest.fn(),
    loadBudgets: jest.fn(),
    setTotalBudgetLimit: jest.fn(async () => ({ error: null })),
    setCategoryBudgetLimit: jest.fn(async () => ({ error: null })),
    removeCategoryBudgetLimit: jest.fn(async () => ({ error: null })),
  };

  beforeEach(() => {
    jest.clearAllMocks();

    (useAppStore as unknown as jest.Mock).mockImplementation((selector) =>
      selector(mockState),
    );

    (useCustomCategories as jest.Mock).mockReturnValue({
      allCategories: ["Food", "Transport", "Bills"],
      categoryFilters: ["All"],
      getCategoryColorSafe: () => "#ffffff",
    });

    (useStatistics as jest.Mock).mockReturnValue({
      activeFilter: "month",
      setActiveFilter: jest.fn(),
      activeCategory: "All",
      setActiveCategory: jest.fn(),
      customStart: new Date("2026-03-01T00:00:00.000Z"),
      customEnd: new Date("2026-03-31T23:59:59.000Z"),
      showPicker: false,
      pickerMode: "start",
      onDateChange: jest.fn(),
      openDatePicker: jest.fn(),
      filteredExpenses: [],
      categoryList: [],
      trendData: { labels: [], datasets: [{ data: [] }] },
      chartWidth: 320,
      totalSpent: 0,
      dailyAverage: 0,
      transactionList: [],
    });

    (AsyncStorage.getItem as jest.Mock).mockImplementation(async (key) => {
      if (key === "userCurrency") return "RON";
      if (key === "savedExpenses") {
        return JSON.stringify([
          {
            id: "e1",
            amount: 120,
            description: "Bus pass",
            category: "Transport",
            date: "2026-03-10T10:00:00.000Z",
          },
          {
            id: "e2",
            amount: 90,
            description: "Groceries",
            category: "Food",
            date: "2026-03-11T10:00:00.000Z",
          },
          {
            id: "e3",
            amount: 40,
            description: "Electricity",
            category: "Bills",
            date: "2026-03-12T10:00:00.000Z",
          },
        ]);
      }
      return null;
    });
  });

  it("shows top 1 critical category by default and reveals full list with total limit on expand", async () => {
    const { getByText, queryByText } = render(<StatisticsScreen />);

    await waitFor(() => {
      expect(getByText("Transport")).toBeTruthy();
    });

    expect(queryByText("Food")).toBeNull();
    expect(queryByText("Bills")).toBeNull();
    expect(queryByText("Total Limit")).toBeNull();
    expect(getByText("Show More")).toBeTruthy();

    fireEvent.press(getByText("Show More"));

    await waitFor(() => {
      expect(getByText("Food")).toBeTruthy();
      expect(getByText("Bills")).toBeTruthy();
      expect(getByText("Total Limit")).toBeTruthy();
      expect(getByText("Show Less")).toBeTruthy();
    });

    fireEvent.press(getByText("Show Less"));

    await waitFor(() => {
      expect(queryByText("Total Limit")).toBeNull();
    });
  });
});
