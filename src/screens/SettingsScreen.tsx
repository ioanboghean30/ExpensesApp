import { MaterialCommunityIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Picker } from "@react-native-picker/picker";
import React, { useEffect, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { GuestSignupModal, ScreenHeader } from "../components";
import { THEMES, ThemeName } from "../constants/theme";
import { supabase } from "../lib/supabaseClient";
import { useAppStore } from "../store/useAppStore";
import { exportExpensesToCSV } from "../utils/exportData";

const CURRENCIES = [
  { value: "RON", label: "RON (lei)" },
  { value: "USD", label: "USD ($)" },
  { value: "EUR", label: "EUR (€)" },
  { value: "GBP", label: "GBP (£)" },
  { value: "JPY", label: "JPY (¥)" },
  { value: "CHF", label: "CHF (Fr)" },
  { value: "CAD", label: "CAD (C$)" },
  { value: "AUD", label: "AUD (A$)" },
  { value: "CNY", label: "CNY (¥)" },
  { value: "INR", label: "INR (₹)" },
  { value: "BRL", label: "BRL (R$)" },
  { value: "KRW", label: "KRW (₩)" },
  { value: "MXN", label: "MXN (Mex$)" },
  { value: "SEK", label: "SEK (kr)" },
  { value: "NOK", label: "NOK (kr)" },
  { value: "DKK", label: "DKK (kr)" },
  { value: "PLN", label: "PLN (zł)" },
  { value: "CZK", label: "CZK (Kč)" },
  { value: "HUF", label: "HUF (Ft)" },
  { value: "TRY", label: "TRY (₺)" },
  { value: "ZAR", label: "ZAR (R)" },
  { value: "RUB", label: "RUB (₽)" },
  { value: "ILS", label: "ILS (₪)" },
  { value: "SGD", label: "SGD (S$)" },
  { value: "NZD", label: "NZD (NZ$)" },
  { value: "THB", label: "THB (฿)" },
  { value: "MYR", label: "MYR (RM)" },
  { value: "IDR", label: "IDR (Rp)" },
  { value: "PHP", label: "PHP (₱)" },
  { value: "AED", label: "AED (د.إ)" },
  { value: "SAR", label: "SAR (﷼)" },
  { value: "ARS", label: "ARS (AR$)" },
  { value: "COP", label: "COP (COL$)" },
  { value: "CLP", label: "CLP (CL$)" },
  { value: "EGP", label: "EGP (E£)" },
  { value: "NGN", label: "NGN (₦)" },
  { value: "UAH", label: "UAH (₴)" },
  { value: "BGN", label: "BGN (лв)" },
  { value: "RSD", label: "RSD (din)" },
  { value: "MDL", label: "MDL (L)" },
  { value: "PKR", label: "PKR (₨)" },
  { value: "BDT", label: "BDT (৳)" },
  { value: "VND", label: "VND (₫)" },
  { value: "TWD", label: "TWD (NT$)" },
  { value: "HKD", label: "HKD (HK$)" },
  { value: "PEN", label: "PEN (S/)" },
  { value: "KES", label: "KES (KSh)" },
  { value: "MAD", label: "MAD (د.م.)" },
  { value: "ISK", label: "ISK (kr)" },
];

function SettingsScreen() {
  const authStatus = useAppStore((state) => state.authStatus);
  const handleLogout = useAppStore((state) => state.handleLogout);
  const storeCurrency = useAppStore((state) => state.currency);
  const setStoreCurrency = useAppStore((state) => state.setCurrency);
  const expenses = useAppStore((state) => state.expenses);
  const currentTheme = useAppStore((state) => state.currentTheme);
  const setCurrentTheme = useAppStore((state) => state.setCurrentTheme);
  const theme = THEMES[currentTheme];

  const handleDeleteAccount = async () => {
    // Ask for confirmation before destructive action.
    Alert.alert(
      "Delete account",
      "Are you sure? This will permanently delete your account and all data.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              // If authenticated, remove cloud data first.
              if (authStatus === "loggedIn") {
                const {
                  data: { user },
                } = await supabase.auth.getUser();
                if (user) {
                  // Delete user expenses from Supabase table.
                  await supabase
                    .from("expenses")
                    .delete()
                    .eq("user_id", user.id);
                  // Delete user account via RPC.
                  await supabase.rpc("delete_user");
                  // Sign out of Supabase session.
                  await supabase.auth.signOut();
                }
              }
              // Clear local storage.
              await AsyncStorage.clear();
              // Reset app session.
              handleLogout();
            } catch (e) {
              console.error("Failed to delete account", e);
              Alert.alert(
                "Error",
                "Failed to delete account. Please try again.",
              );
            }
          },
        },
      ],
    );
  };
  const [currency, setCurrency] = useState(storeCurrency);
  const [showSignupModal, setShowSignupModal] = useState(false);
  // Keep local picker state synced with global currency.
  useEffect(() => {
    setCurrency(storeCurrency);
  }, [storeCurrency]);
  // Persist currency when user selects a new value.
  const handleCurrencyChange = async (itemValue: string) => {
    setCurrency(itemValue); // Update local UI state.
    setStoreCurrency(itemValue);
    try {
      await AsyncStorage.setItem("userCurrency", itemValue); // Persist locally.
    } catch (e) {
      console.error("Failed to save settings", e);
    }
  };

  const handleExportToCsv = async () => {
    if (!expenses.length) {
      Alert.alert("No data", "There are no expenses to export yet.");
      return;
    }

    try {
      await exportExpensesToCSV(expenses);
    } catch (error) {
      console.error("CSV export failed", error);
      Alert.alert("Export failed", "Could not export data to CSV.");
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <ScreenHeader title="Settings" />

      <Text style={[styles.sectionTitle, { color: theme.primary }]}>
        Preferences
      </Text>

      <Text style={[styles.subSectionTitle, { color: theme.textSecondary }]}>
        App Theme
      </Text>
      <View style={styles.themeToggleRow}>
        {(
          [
            { key: "midnightEmerald", label: "Midnight Emerald" },
            { key: "classicDark", label: "Classic Dark" },
          ] as { key: ThemeName; label: string }[]
        ).map((item) => {
          const isActive = currentTheme === item.key;

          return (
            <Pressable
              key={item.key}
              onPress={() => setCurrentTheme(item.key)}
              style={[
                styles.themeButton,
                {
                  borderColor: isActive ? theme.primary : theme.border,
                  backgroundColor: isActive ? theme.primary : theme.surface,
                },
              ]}
            >
              <Text
                style={[
                  styles.themeButtonText,
                  {
                    color: isActive ? theme.background : theme.textPrimary,
                  },
                ]}
              >
                {item.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {authStatus === "guest" && (
        <View
          style={[
            styles.promoBanner,
            {
              backgroundColor: theme.surface,
              borderColor: theme.border,
            },
          ]}
        >
          <Text style={[styles.promoTitle, { color: theme.textPrimary }]}>
            Back up your expenses
          </Text>
          <Text style={[styles.promoText, { color: theme.textSecondary }]}>
            Create a free account to sync your guest data to the cloud and keep
            it safe.
          </Text>
          <Pressable
            style={[styles.promoButton, { backgroundColor: theme.primary }]}
            onPress={() => setShowSignupModal(true)}
          >
            <Text style={[styles.promoButtonText, { color: theme.background }]}>
              Create Free Account
            </Text>
          </Pressable>
        </View>
      )}

      {/* Currency selection */}
      <View style={[styles.settingRow, { backgroundColor: theme.surface }]}>
        <Text style={[styles.settingLabel, { color: theme.textPrimary }]}>
          Currency
        </Text>
        <View
          style={[
            styles.pickerContainer,
            { backgroundColor: theme.background },
          ]}
        >
          <Picker
            selectedValue={currency}
            onValueChange={handleCurrencyChange}
            style={[styles.picker, { color: theme.textPrimary }]}
            dropdownIconColor={theme.textSecondary}
          >
            {CURRENCIES.map((item) => (
              <Picker.Item
                key={item.value}
                label={item.label}
                value={item.value}
              />
            ))}
          </Picker>
        </View>
      </View>

      <Pressable
        style={[
          styles.exportButton,
          {
            backgroundColor: theme.surface,
            borderColor: theme.border,
          },
        ]}
        onPress={handleExportToCsv}
      >
        <MaterialCommunityIcons
          name="file-delimited-outline"
          size={20}
          color={theme.primary}
        />
        <Text style={[styles.exportButtonText, { color: theme.textPrimary }]}>
          Export Data to CSV
        </Text>
      </Pressable>

      <View style={{ flex: 1 }} />
      <Text style={[styles.sectionTitle, { color: theme.danger }]}>
        Danger Zone
      </Text>
      <Pressable
        style={[styles.deleteButton, { backgroundColor: theme.danger }]}
        onPress={handleDeleteAccount}
      >
        <Text style={[styles.deleteButtonText, { color: theme.textPrimary }]}>
          Delete Account and Data
        </Text>
      </Pressable>

      <GuestSignupModal
        visible={showSignupModal}
        onClose={() => setShowSignupModal(false)}
      />
    </View>
  );
}
const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  subSectionTitle: {
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 10,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  themeToggleRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 16,
  },
  themeButton: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 12,
    alignItems: "center",
  },
  themeButtonText: {
    fontSize: 13,
    fontWeight: "700",
  },
  deleteButton: {
    padding: 15,
    borderRadius: 8,
    alignItems: "center",
  },
  deleteButtonText: {
    fontWeight: "bold",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 15,
    marginTop: 10,
    textTransform: "uppercase",
  },
  promoBanner: {
    borderWidth: 1,
    padding: 14,
    borderRadius: 12,
    marginBottom: 15,
  },
  promoTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 6,
  },
  promoText: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 12,
  },
  promoButton: {
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: "center",
  },
  promoButtonText: {
    fontWeight: "700",
  },
  settingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 15,
    borderRadius: 12,
  },
  exportButton: {
    marginTop: 14,
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 13,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  exportButtonText: {
    fontSize: 15,
    fontWeight: "700",
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: "500",
  },
  pickerContainer: {
    width: 150,
    borderRadius: 8,
  },
  picker: {
    height: 50,
  },
});
export default SettingsScreen;
