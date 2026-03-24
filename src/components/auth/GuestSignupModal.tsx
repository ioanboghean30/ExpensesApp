import React, { useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Modal,
    Pressable,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";
import { THEMES } from "../../constants/theme";
import { useGuestToCloudMigration } from "../../hooks";
import { useAppStore } from "../../store/useAppStore";

type GuestSignupModalProps = {
  visible: boolean;
  onClose: () => void;
};

export default function GuestSignupModal({
  visible,
  onClose,
}: GuestSignupModalProps) {
  const { convertGuestToCloud } = useGuestToCloudMigration();
  const currentTheme = useAppStore((state) => state.currentTheme);
  const theme = THEMES[currentTheme];
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const resetForm = () => {
    setEmail("");
    setPassword("");
  };

  const handleClose = () => {
    if (isSubmitting) return;
    resetForm();
    onClose();
  };

  const handleSignup = async () => {
    setIsSubmitting(true);

    const result = await convertGuestToCloud(email, password);

    setIsSubmitting(false);

    if (!result.success) {
      Alert.alert("Sign up error", result.error ?? "Unexpected error.");
      return;
    }

    Alert.alert(
      "Backup complete",
      `Your account was created and ${result.migratedExpenses} expense(s) were migrated to the cloud.`,
    );
    handleClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
    >
      <View style={[styles.backdrop, { backgroundColor: "rgba(0,0,0,0.6)" }]}>
        <View
          style={[
            styles.card,
            {
              backgroundColor: theme.surface,
              borderColor: theme.border,
            },
          ]}
        >
          <Text style={[styles.title, { color: theme.textPrimary }]}>
            Create free account
          </Text>
          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
            Keep your data safe in the cloud and access it from any device.
          </Text>

          <Text style={[styles.label, { color: theme.textPrimary }]}>
            Email
          </Text>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: theme.background,
                color: theme.textPrimary,
                borderColor: theme.border,
              },
            ]}
            placeholder="email@example.com"
            placeholderTextColor={theme.textSecondary}
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            editable={!isSubmitting}
          />

          <Text style={[styles.label, { color: theme.textPrimary }]}>
            Password
          </Text>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: theme.background,
                color: theme.textPrimary,
                borderColor: theme.border,
              },
            ]}
            placeholder="Password (min 6 characters)"
            placeholderTextColor={theme.textSecondary}
            secureTextEntry
            value={password}
            onChangeText={setPassword}
            autoCapitalize="none"
            editable={!isSubmitting}
          />

          <Pressable
            style={[styles.primaryButton, { backgroundColor: theme.primary }]}
            onPress={handleSignup}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator color={theme.background} />
            ) : (
              <Text
                style={[styles.primaryButtonText, { color: theme.background }]}
              >
                Create Free Account
              </Text>
            )}
          </Pressable>

          <Pressable
            style={styles.secondaryButton}
            onPress={handleClose}
            disabled={isSubmitting}
          >
            <Text
              style={[
                styles.secondaryButtonText,
                { color: theme.textSecondary },
              ]}
            >
              Cancel
            </Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  card: {
    width: "100%",
    borderRadius: 14,
    padding: 20,
    borderWidth: 1,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 8,
  },
  subtitle: {
    marginBottom: 18,
  },
  label: {
    marginBottom: 6,
    fontWeight: "600",
  },
  input: {
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 14,
    borderWidth: 1,
  },
  primaryButton: {
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
    marginTop: 6,
  },
  primaryButtonText: {
    fontWeight: "700",
    fontSize: 16,
  },
  secondaryButton: {
    paddingVertical: 10,
    alignItems: "center",
    marginTop: 8,
  },
  secondaryButtonText: {
    fontWeight: "600",
  },
});
