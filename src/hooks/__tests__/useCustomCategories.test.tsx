import { renderHook } from "@testing-library/react-native";
import { useCustomCategories } from "../useCustomCategories";

describe("useCustomCategories", () => {
  it("normalizes and deduplicates custom categories", () => {
    const { result } = renderHook(() =>
      useCustomCategories({
        customCategories: ["  Pet   Care ", "pet care", "Books"],
        includeAllOption: true,
      }),
    );

    expect(result.current.categoryFilters[0]).toBe("All");
    expect(result.current.allCategories).toContain("Pet Care");
    expect(result.current.allCategories).toContain("Books");
    expect(
      result.current.allCategories.filter((x) => x.toLowerCase() === "pet care")
        .length,
    ).toBe(1);
  });

  it("resolves category case and provides safe icon/color", () => {
    const { result } = renderHook(() =>
      useCustomCategories({ customCategories: ["Pet Care"] }),
    );

    expect(result.current.resolveCategory("pet care")).toBe("Pet Care");
    expect(result.current.getCategoryIconSafe("pet care")).toBe(
      "shape-outline",
    );
    expect(typeof result.current.getCategoryColorSafe("pet care")).toBe(
      "string",
    );
  });
});
