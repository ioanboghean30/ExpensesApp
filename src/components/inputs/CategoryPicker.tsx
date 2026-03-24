import { MaterialCommunityIcons } from "@expo/vector-icons";
import React, { useState } from "react";
import {
    Alert,
    Modal,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";
import { THEMES } from "../../constants/theme";
import { useAppStore } from "../../store/useAppStore";

type CategoryPickerProps = {
  categories: string[];
  customCategories?: string[];
  selectedValue: string;
  onValueChange: (value: string) => void;
  onCreateCategory?: (value: string) => Promise<boolean>;
  onDeleteCustomCategory?: (category: string) => void;
};

export default function CategoryPicker({
  categories,
  customCategories = [],
  selectedValue,
  onValueChange,
  onCreateCategory,
  onDeleteCustomCategory,
}: CategoryPickerProps) {
  const currentTheme = useAppStore((state) => state.currentTheme);
  const theme = THEMES[currentTheme];
  const [isCreateModalVisible, setIsCreateModalVisible] = useState(false);
  const [isPickerModalVisible, setIsPickerModalVisible] = useState(false);
  const [customCategoryName, setCustomCategoryName] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const customCategorySet = new Set(customCategories);

  const closeCreateModal = () => {
    setIsCreateModalVisible(false);
    setCustomCategoryName("");
    setIsSaving(false);
  };

  const handleOpenPicker = () => {
    setIsPickerModalVisible(true);
  };

  const handleClosePicker = () => {
    setIsPickerModalVisible(false);
  };

  const handleCancel = () => {
    onValueChange("Other");
    closeCreateModal();
  };

  const handleConfirm = async () => {
    const normalizedName = customCategoryName.trim();
    if (!normalizedName) {
      Alert.alert("Category required", "Please type a category name.");
      return;
    }

    if (!onCreateCategory) {
      onValueChange(normalizedName);
      closeCreateModal();
      return;
    }

    setIsSaving(true);

    let created = false;
    try {
      created = await onCreateCategory(normalizedName);
    } catch (error) {
      console.error("Failed to create category", error);
      Alert.alert("Error", "Could not create category right now.");
      return;
    } finally {
      setIsSaving(false);
    }

    if (!created) {
      Alert.alert(
        "Category already exists",
        "Choose a different name for your new category.",
      );
      return;
    }

    onValueChange(normalizedName);
    closeCreateModal();
  };

  const handleValueChange = (itemValue: string) => {
    if (itemValue === "Other") {
      onValueChange("Other");
      handleClosePicker();
      setIsCreateModalVisible(true);
      return;
    }

    onValueChange(itemValue);
    handleClosePicker();
  };

  return (
    <>
      <Pressable style={styles.pickerTrigger} onPress={handleOpenPicker}>
        <Text style={[styles.pickerTriggerText, { color: theme.textPrimary }]}>
          {selectedValue}
        </Text>
        <MaterialCommunityIcons
          name="chevron-down"
          size={20}
          color={theme.textSecondary}
        />
      </Pressable>

      <Modal
        transparent
        visible={isPickerModalVisible}
        animationType="fade"
        onRequestClose={handleClosePicker}
      >
        <Pressable
          style={[
            styles.modalOverlay,
            { backgroundColor: "rgba(0, 0, 0, 0.6)" },
          ]}
          onPress={handleClosePicker}
        >
          <Pressable
            style={[
              styles.pickerModalCard,
              {
                backgroundColor: theme.surface,
                borderColor: theme.border,
              },
            ]}
          >
            <Text
              style={[styles.pickerModalTitle, { color: theme.textPrimary }]}
            >
              Select category
            </Text>
            <ScrollView style={styles.pickerList}>
              {categories.map((category) => {
                const isCustom = customCategorySet.has(category);
                const isSelected = selectedValue === category;

                return (
                  <View
                    key={category}
                    style={[
                      styles.pickerRow,
                      { backgroundColor: theme.background },
                    ]}
                  >
                    <Pressable
                      style={styles.pickerRowMain}
                      onPress={() => handleValueChange(category)}
                    >
                      <Text
                        style={[
                          styles.pickerRowText,
                          { color: theme.textPrimary },
                        ]}
                      >
                        {category}
                      </Text>
                      {isSelected ? (
                        <MaterialCommunityIcons
                          name="check"
                          size={18}
                          color={theme.primary}
                        />
                      ) : null}
                    </Pressable>

                    {isCustom ? (
                      <Pressable
                        accessibilityRole="button"
                        onPress={() => onDeleteCustomCategory?.(category)}
                        style={styles.trashButton}
                      >
                        <MaterialCommunityIcons
                          name="trash-can-outline"
                          size={18}
                          color={theme.danger}
                        />
                      </Pressable>
                    ) : null}
                  </View>
                );
              })}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        transparent
        visible={isCreateModalVisible}
        animationType="fade"
        onRequestClose={handleCancel}
      >
        <View
          style={[
            styles.modalOverlay,
            { backgroundColor: "rgba(0, 0, 0, 0.6)" },
          ]}
        >
          <View
            style={[
              styles.modalCard,
              {
                backgroundColor: theme.surface,
                borderColor: theme.border,
              },
            ]}
          >
            <Text style={[styles.modalTitle, { color: theme.textPrimary }]}>
              Create a new category
            </Text>
            <TextInput
              value={customCategoryName}
              onChangeText={setCustomCategoryName}
              placeholder="Category name"
              placeholderTextColor={theme.textSecondary}
              autoFocus
              style={[
                styles.modalInput,
                {
                  backgroundColor: theme.background,
                  color: theme.textPrimary,
                  borderColor: theme.border,
                },
              ]}
              editable={!isSaving}
            />
            <View style={styles.modalActions}>
              <Pressable
                style={[
                  styles.modalButton,
                  styles.cancelButton,
                  { backgroundColor: theme.border },
                ]}
                onPress={handleCancel}
                disabled={isSaving}
              >
                <Text
                  style={[
                    styles.cancelButtonText,
                    { color: theme.textPrimary },
                  ]}
                >
                  Cancel
                </Text>
              </Pressable>
              <Pressable
                style={[
                  styles.modalButton,
                  styles.confirmButton,
                  { backgroundColor: theme.primary },
                ]}
                onPress={handleConfirm}
                disabled={isSaving}
              >
                <Text
                  style={[
                    styles.confirmButtonText,
                    { color: theme.background },
                  ]}
                >
                  {isSaving ? "Saving..." : "Confirm"}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  pickerTrigger: {
    backgroundColor: "#333",
    borderRadius: 10,
    minHeight: 50,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 15,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  pickerTriggerText: {
    color: "white",
    fontSize: 16,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  pickerModalCard: {
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    maxHeight: "55%",
  },
  pickerModalTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 10,
  },
  pickerList: {
    maxHeight: 320,
  },
  pickerRow: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 10,
    marginBottom: 4,
    paddingRight: 8,
  },
  pickerRowMain: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  pickerRowText: {
    fontSize: 15,
  },
  trashButton: {
    padding: 6,
    borderRadius: 8,
  },
  modalCard: {
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 12,
  },
  modalInput: {
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 8,
    marginTop: 14,
  },
  modalButton: {
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    minWidth: 86,
    alignItems: "center",
  },
  cancelButton: {
    backgroundColor: "#3A3A3A",
  },
  cancelButtonText: {
    fontWeight: "600",
  },
  confirmButton: {
    backgroundColor: "#007AFF",
  },
  confirmButtonText: {
    fontWeight: "700",
  },
});
