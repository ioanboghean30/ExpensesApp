import React, { useState } from "react";
import {
    Alert,
    Pressable,
    StyleProp,
    StyleSheet,
    Text,
    TextInput,
    TextStyle,
    View,
    ViewStyle,
} from "react-native";

type NewCategoryFormProps = {
  value: string;
  onChangeText: (value: string) => void;
  existingCategories: (string | null | undefined)[];
  onCreateCategory: (category: string) => Promise<boolean>;
  onCategoryCreated?: (category: string) => void;
  containerStyle?: StyleProp<ViewStyle>;
  inputStyle?: StyleProp<TextStyle>;
  buttonStyle?: StyleProp<ViewStyle>;
  buttonTextStyle?: StyleProp<TextStyle>;
};

export default function NewCategoryForm({
  value,
  onChangeText,
  existingCategories,
  onCreateCategory,
  onCategoryCreated,
  containerStyle,
  inputStyle,
  buttonStyle,
  buttonTextStyle,
}: NewCategoryFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const normalizeCategory = (category: unknown): string =>
    String(category ?? "")
      .trim()
      .toLowerCase();

  const handleCreate = async () => {
    if (isSubmitting) {
      return;
    }

    const normalized = value.trim();

    if (!normalized) {
      Alert.alert("Category", "Please enter a category name.");
      return;
    }

    const normalizedName = normalizeCategory(normalized);
    const alreadyExists = existingCategories.some(
      (category) => normalizeCategory(category) === normalizedName,
    );

    if (alreadyExists) {
      Alert.alert("Category", "Category already exists.");
      return;
    }

    try {
      setIsSubmitting(true);
      const created = await onCreateCategory(normalized);
      if (!created) {
        Alert.alert("Category", "Category already exists or is invalid.");
        return;
      }

      onCategoryCreated?.(normalized);
      onChangeText("");
    } catch (error) {
      console.error("Failed to create category", error);
      Alert.alert("Category", "Failed to create category. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View style={[styles.row, containerStyle]}>
      <TextInput
        style={[styles.input, inputStyle]}
        placeholder="New category (e.g. Cat Food)"
        placeholderTextColor="#999"
        value={value}
        onChangeText={onChangeText}
      />
      <Pressable
        style={[styles.button, buttonStyle]}
        onPress={handleCreate}
        disabled={isSubmitting}
      >
        <Text style={[styles.buttonText, buttonTextStyle]}>Add</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  input: {
    flex: 1,
    backgroundColor: "#333",
    color: "white",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  button: {
    backgroundColor: "#4BC0C0",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
  },
  buttonText: {
    color: "white",
    fontWeight: "700",
  },
});
