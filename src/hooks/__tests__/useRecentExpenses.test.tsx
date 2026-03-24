import { act, renderHook } from "@testing-library/react-native";
import { useRecentExpenses } from "../useRecentExpenses";

describe("useRecentExpenses", () => {
  beforeAll(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2026-03-16T12:00:00.000Z"));
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  it("returns latest 3 by default and toggles to 30-day window", () => {
    const expenses = [
      { id: "1", date: new Date("2026-03-15T10:00:00.000Z") },
      { id: "2", date: new Date("2026-03-10T10:00:00.000Z") },
      { id: "3", date: new Date("2026-03-01T10:00:00.000Z") },
      { id: "4", date: new Date("2026-02-20T10:00:00.000Z") },
      { id: "5", date: new Date("2026-01-01T10:00:00.000Z") },
    ];

    const { result } = renderHook(() => useRecentExpenses(expenses));

    expect(result.current.displayedExpenses.map((x) => x.id)).toEqual([
      "1",
      "2",
      "3",
    ]);
    expect(result.current.shouldShowToggle).toBe(true);

    act(() => {
      result.current.setExpanded(true);
    });

    expect(result.current.displayedExpenses.map((x) => x.id)).toEqual([
      "1",
      "2",
      "3",
      "4",
    ]);
  });
});
