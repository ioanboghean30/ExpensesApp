import AsyncStorage from "@react-native-async-storage/async-storage";
import { act, renderHook } from "@testing-library/react-native";
import { supabase } from "../../lib/supabaseClient";
import { useAppStore } from "../../store/useAppStore";
import { useGuestToCloudMigration } from "../useGuestToCloudMigration";

jest.mock("../../lib/supabaseClient", () => ({
  supabase: {
    auth: {
      signUp: jest.fn(),
    },
    from: jest.fn(),
  },
}));

describe("useGuestToCloudMigration", () => {
  const mockedSupabase = supabase as unknown as {
    auth: {
      signUp: jest.Mock;
    };
    from: jest.Mock;
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    await AsyncStorage.clear();

    useAppStore.setState({
      authStatus: "guest",
      currency: "RON",
      expenses: [],
      customCategories: [],
    });
  });

  it("migrates guest expenses to cloud and switches auth status to loggedIn", async () => {
    await AsyncStorage.setItem(
      "savedExpenses",
      JSON.stringify([
        {
          id: "g1",
          amount: 20,
          description: "Coffee",
          category: "Food",
          date: "2026-03-10T10:00:00.000Z",
        },
        {
          id: "g2",
          amount: 0,
          description: "Invalid",
          category: "Other",
          date: "2026-03-10T10:00:00.000Z",
        },
      ]),
    );
    await AsyncStorage.setItem(
      "userCategories",
      JSON.stringify(["  Pet   Care ", "pet care", "Books"]),
    );

    mockedSupabase.auth.signUp.mockResolvedValue({
      data: { user: { id: "user-123" } },
      error: null,
    });

    const insertMock = jest.fn().mockResolvedValue({ error: null });
    mockedSupabase.from.mockReturnValue({ insert: insertMock });

    const { result } = renderHook(() => useGuestToCloudMigration());

    let migrationResult:
      | { success: boolean; migratedExpenses: number; error?: string }
      | undefined;

    await act(async () => {
      migrationResult = await result.current.convertGuestToCloud(
        "  TEST@Email.COM ",
        "password123",
      );
    });

    expect(migrationResult).toEqual({ success: true, migratedExpenses: 1 });
    expect(mockedSupabase.auth.signUp).toHaveBeenCalledWith({
      email: "test@email.com",
      password: "password123",
    });
    expect(mockedSupabase.from).toHaveBeenCalledWith("expenses");
    expect(insertMock).toHaveBeenCalledTimes(1);

    const insertedRows = insertMock.mock.calls[0][0];
    expect(insertedRows).toHaveLength(1);
    expect(insertedRows[0]).toMatchObject({
      amount: 20,
      description: "Coffee",
      category: "Food",
      user_id: "user-123",
    });

    expect(await AsyncStorage.getItem("savedExpenses")).toBeNull();
    expect(useAppStore.getState().authStatus).toBe("loggedIn");
    expect(useAppStore.getState().customCategories).toEqual([
      "Pet Care",
      "Books",
    ]);
  });

  it("returns error and keeps guest data when expense insert fails", async () => {
    await AsyncStorage.setItem(
      "savedExpenses",
      JSON.stringify([
        {
          id: "g1",
          amount: 20,
          description: "Coffee",
          category: "Food",
          date: "2026-03-10T10:00:00.000Z",
        },
      ]),
    );

    mockedSupabase.auth.signUp.mockResolvedValue({
      data: { user: { id: "user-123" } },
      error: null,
    });

    const insertMock = jest
      .fn()
      .mockResolvedValue({ error: { message: "insert failed" } });
    mockedSupabase.from.mockReturnValue({ insert: insertMock });

    const { result } = renderHook(() => useGuestToCloudMigration());

    let migrationResult:
      | { success: boolean; migratedExpenses: number; error?: string }
      | undefined;

    await act(async () => {
      migrationResult = await result.current.convertGuestToCloud(
        "guest@user.com",
        "password123",
      );
    });

    expect(migrationResult).toEqual({
      success: false,
      migratedExpenses: 0,
      error: "insert failed",
    });

    expect(await AsyncStorage.getItem("savedExpenses")).not.toBeNull();
    expect(useAppStore.getState().authStatus).toBe("guest");
  });
});
