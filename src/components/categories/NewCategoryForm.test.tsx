import { fireEvent, render, waitFor } from "@testing-library/react-native";
import { Alert } from "react-native";
import NewCategoryForm from "./NewCategoryForm";

describe("NewCategoryForm", () => {
  beforeEach(() => {
    jest.spyOn(Alert, "alert").mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("creates category when value is unique", async () => {
    const onCreateCategory = jest.fn().mockResolvedValue(true);
    const onCategoryCreated = jest.fn();
    const onChangeText = jest.fn();

    const { getByPlaceholderText, getByText } = render(
      <NewCategoryForm
        value="Pet Care"
        onChangeText={onChangeText}
        existingCategories={["Food", "Transport"]}
        onCreateCategory={onCreateCategory}
        onCategoryCreated={onCategoryCreated}
      />,
    );

    fireEvent.press(getByText("Add"));

    await waitFor(() => {
      expect(onCreateCategory).toHaveBeenCalledWith("Pet Care");
    });
    expect(onCategoryCreated).toHaveBeenCalledWith("Pet Care");
    expect(onChangeText).toHaveBeenCalledWith("");

    fireEvent.changeText(
      getByPlaceholderText("New category (e.g. Cat Food)"),
      "Books",
    );
    expect(onChangeText).toHaveBeenCalledWith("Books");
  });

  it("blocks duplicate category and shows alert", async () => {
    const onCreateCategory = jest.fn().mockResolvedValue(true);

    const { getByText } = render(
      <NewCategoryForm
        value="food"
        onChangeText={jest.fn()}
        existingCategories={["Food", "Transport"]}
        onCreateCategory={onCreateCategory}
      />,
    );

    fireEvent.press(getByText("Add"));

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalled();
    });
    expect(onCreateCategory).not.toHaveBeenCalled();
  });
});
