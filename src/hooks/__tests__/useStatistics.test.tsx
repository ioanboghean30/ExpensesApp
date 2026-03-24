import { act, renderHook } from "@testing-library/react-native";
import { useStatistics } from "../useStatistics";

describe("useStatistics", () => {
  beforeAll(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2026-03-16T12:00:00.000Z"));
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  it("applies time and category filters with correct aggregates", () => {
    const expenses = [
      {
        id: "1",
        amount: 100,
        description: "Food A",
        category: "Food",
        date: new Date("2026-03-10T10:00:00.000Z"),
      },
      {
        id: "2",
        amount: 50,
        description: "Transport A",
        category: "Transport",
        date: new Date("2026-03-12T10:00:00.000Z"),
      },
      {
        id: "3",
        amount: 200,
        description: "Old",
        category: "Food",
        date: new Date("2026-01-10T10:00:00.000Z"),
      },
    ];

    const { result } = renderHook(() =>
      useStatistics({ expenses, getCategoryColor: () => "#fff" }),
    );

    expect(result.current.activeFilter).toBe("month");
    expect(result.current.filteredExpenses).toHaveLength(2);
    expect(result.current.totalSpent).toBe(150);

    act(() => {
      result.current.setActiveCategory("Food");
    });

    expect(result.current.filteredExpenses).toHaveLength(1);
    expect(result.current.totalSpent).toBe(100);

    act(() => {
      result.current.setActiveFilter("all");
      result.current.setActiveCategory("All");
    });

    expect(result.current.filteredExpenses).toHaveLength(3);
    expect(result.current.totalSpent).toBe(350);
  });
});
