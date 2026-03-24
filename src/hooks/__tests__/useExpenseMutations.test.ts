import AsyncStorage from "@react-native-async-storage/async-storage";
import { useExpenseMutations } from "../useExpenseMutations";

jest.mock("../../lib/supabaseClient", () => ({
  supabase: {
    auth: { getUser: jest.fn() },
    from: jest.fn(),
  },
}));

describe("useExpenseMutations (guest mode)", () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    jest.clearAllMocks();
  });

  it("adds, updates, and deletes guest expenses", async () => {
    const mutations = useExpenseMutations("guest");

    const added = await mutations.addExpense({
      amount: 42,
      description: "Coffee",
      category: "Food",
      date: new Date("2026-03-16T10:00:00.000Z"),
    });

    expect(added.error).toBeUndefined();
    expect(added.expense?.description).toBe("Coffee");

    const savedAfterAdd = JSON.parse(
      (await AsyncStorage.getItem("savedExpenses")) ?? "[]",
    );
    expect(savedAfterAdd).toHaveLength(1);

    const createdId = String(added.expense?.id);
    const updated = await mutations.updateExpense(createdId, {
      amount: 50,
      description: "Coffee + Tip",
      category: "Food",
      date: new Date("2026-03-16T11:00:00.000Z"),
    });
    expect(updated.error).toBeUndefined();

    const savedAfterUpdate = JSON.parse(
      (await AsyncStorage.getItem("savedExpenses")) ?? "[]",
    );
    expect(savedAfterUpdate[0].amount).toBe(50);
    expect(savedAfterUpdate[0].description).toBe("Coffee + Tip");

    const deleted = await mutations.deleteExpense(createdId);
    expect(deleted.error).toBeUndefined();

    const savedAfterDelete = JSON.parse(
      (await AsyncStorage.getItem("savedExpenses")) ?? "[]",
    );
    expect(savedAfterDelete).toHaveLength(0);
  });
});
