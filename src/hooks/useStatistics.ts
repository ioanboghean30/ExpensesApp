import { useCallback, useMemo, useState } from "react";

type TimeFilter = "7days" | "month" | "year" | "all" | "custom";

type ExpenseItem = {
  id: string;
  amount: number;
  description: string;
  date: Date;
  category: string;
};

type StatisticsChartItem = {
  name: string;
  population: number;
  color: string;
  legendFontColor: string;
  legendFontSize: number;
};

type UseStatisticsOptions = {
  expenses: ExpenseItem[];
  getCategoryColor: (category: string) => string;
};

export const TIME_FILTERS = [
  { id: "7days", label: "7 Days" },
  { id: "month", label: "This Month" },
  { id: "year", label: "This Year" },
  { id: "all", label: "All Time" },
  { id: "custom", label: "Custom" },
] as const;

export function useStatistics({
  expenses,
  getCategoryColor,
}: UseStatisticsOptions) {
  const [activeFilter, setActiveFilter] = useState<TimeFilter>("month");
  const [activeCategory, setActiveCategory] = useState("All");
  const [customStart, setCustomStart] = useState(new Date());
  const [customEnd, setCustomEnd] = useState(new Date());
  const [showPicker, setShowPicker] = useState(false);
  const [pickerMode, setPickerMode] = useState<"start" | "end">("start");

  const onDateChange = (event: any, selectedDate: Date | undefined) => {
    if (event?.type === "dismissed") {
      setShowPicker(false);
      return;
    }

    if (selectedDate) {
      if (pickerMode === "start") {
        setCustomStart(selectedDate);
      } else {
        setCustomEnd(selectedDate);
      }
    }

    setShowPicker(false);
  };

  const openDatePicker = (mode: "start" | "end") => {
    setPickerMode(mode);
    setShowPicker(true);
  };

  const getStartDate = useCallback((): Date => {
    const now = new Date();
    const start = new Date();

    switch (activeFilter) {
      case "7days":
        start.setDate(now.getDate() - 7);
        break;
      case "month":
        start.setDate(1);
        break;
      case "year":
        start.setMonth(0, 1);
        break;
      case "custom":
        start.setTime(customStart.getTime());
        break;
      case "all":
        return new Date(0);
      default:
        break;
    }

    start.setHours(0, 0, 0, 0);
    return start;
  }, [activeFilter, customStart]);

  const filteredExpenses = useMemo(() => {
    const startDate = getStartDate();

    return expenses.filter((item) => {
      const itemDate = new Date(item.date);

      let matchesTime = false;
      if (activeFilter === "custom") {
        const end = new Date(customEnd);
        end.setHours(23, 59, 59, 999);
        matchesTime = itemDate >= startDate && itemDate <= end;
      } else {
        matchesTime = itemDate >= startDate;
      }

      const matchesCategory =
        activeCategory === "All" || item.category === activeCategory;

      return matchesTime && matchesCategory;
    });
  }, [expenses, activeFilter, activeCategory, customEnd, getStartDate]);

  const categoryList: StatisticsChartItem[] = useMemo(() => {
    const totalsByCategory: Record<string, number> = {};

    filteredExpenses.forEach((item) => {
      if (totalsByCategory[item.category]) {
        totalsByCategory[item.category] += item.amount;
      } else {
        totalsByCategory[item.category] = item.amount;
      }
    });

    return Object.keys(totalsByCategory)
      .map((categoryName) => ({
        name: categoryName,
        population: totalsByCategory[categoryName],
        color: getCategoryColor(categoryName),
        legendFontColor: "#bbb",
        legendFontSize: 12,
      }))
      .sort((a, b) => b.population - a.population);
  }, [filteredExpenses, getCategoryColor]);

  const trendData = useMemo(() => {
    const dataMap: Record<string, number> = {};
    const labels: string[] = [];

    let end = new Date();
    let start = new Date(getStartDate());

    if (activeFilter === "custom") {
      end = new Date(customEnd);
    }

    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);

    if (activeFilter === "month") start.setDate(1);
    if (activeFilter === "all") {
      if (expenses.length > 0) {
        const expenseDates = expenses.map((c) => c.date.getTime());
        start = new Date(Math.min(...expenseDates));
        start.setDate(1);
        start.setHours(0, 0, 0, 0);
      } else {
        start = new Date(new Date().getFullYear(), 0, 1);
      }
    }

    let groupByMonth = false;

    if (activeFilter === "year" || activeFilter === "all") {
      groupByMonth = true;
    } else if (activeFilter === "custom") {
      const diffTime = Math.abs(end.getTime() - start.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      if (diffDays > 30) groupByMonth = true;
    }

    if (groupByMonth) start.setDate(1);

    let current = new Date(start);

    while (current <= end) {
      let label = "";

      if (groupByMonth) {
        const monthName = current.toLocaleString("default", { month: "short" });
        const year = current.getFullYear().toString().slice(-2);
        label = `${monthName} '${year}`;
        current.setMonth(current.getMonth() + 1);
      } else {
        label = `${current.getDate()}/${current.getMonth() + 1}`;
        current.setDate(current.getDate() + 1);
      }

      labels.push(label);
      dataMap[label] = 0;
    }

    filteredExpenses.forEach((item) => {
      let label = "";
      if (groupByMonth) {
        const monthName = item.date.toLocaleString("default", {
          month: "short",
        });
        const year = item.date.getFullYear().toString().slice(-2);
        label = `${monthName} '${year}`;
      } else {
        label = `${item.date.getDate()}/${item.date.getMonth() + 1}`;
      }

      if (dataMap[label] !== undefined) {
        dataMap[label] += item.amount;
      }
    });

    if (labels.length === 0) {
      return { labels: ["No Data"], datasets: [{ data: [0] }] };
    }

    return {
      labels,
      datasets: [{ data: labels.map((label) => dataMap[label]) }],
    };
  }, [activeFilter, customEnd, expenses, filteredExpenses, getStartDate]);

  const totalSpent = useMemo(
    () => filteredExpenses.reduce((acc, expense) => acc + expense.amount, 0),
    [filteredExpenses],
  );

  const dayDivisor = useMemo(() => {
    if (activeFilter === "7days") return 7;
    if (activeFilter === "month") return new Date().getDate();

    if (activeFilter === "year") {
      const now = new Date();
      const start = new Date(now.getFullYear(), 0, 0);
      const diff = now.getTime() - start.getTime();
      return Math.floor(diff / (1000 * 60 * 60 * 24));
    }

    if (activeFilter === "custom") {
      const diffTime = Math.abs(customEnd.getTime() - customStart.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays + 1;
    }

    if (activeFilter === "all") {
      if (expenses.length > 0) {
        const minTime = Math.min(
          ...expenses.map((expense) => expense.date.getTime()),
        );
        const firstDate = new Date(minTime);
        const now = new Date();
        const diffTime = Math.abs(now.getTime() - firstDate.getTime());
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
      }
      return 1;
    }

    return 1;
  }, [activeFilter, customEnd, customStart, expenses]);

  const dailyAverage = dayDivisor > 0 ? totalSpent / dayDivisor : totalSpent;
  const chartWidth = trendData.labels.length * 50 + 60;

  const transactionList = useMemo(
    () =>
      [...filteredExpenses].sort((a, b) => b.date.getTime() - a.date.getTime()),
    [filteredExpenses],
  );

  return {
    activeFilter,
    setActiveFilter,
    activeCategory,
    setActiveCategory,
    customStart,
    customEnd,
    showPicker,
    pickerMode,
    onDateChange,
    openDatePicker,
    filteredExpenses,
    categoryList,
    trendData,
    chartWidth,
    totalSpent,
    dailyAverage,
    transactionList,
  };
}
