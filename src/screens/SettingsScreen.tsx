import AsyncStorage from "@react-native-async-storage/async-storage";
import { Picker } from "@react-native-picker/picker";
import React, { useEffect, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { supabase } from "../lib/supabaseClient";
import { useAppStore } from "../store/useAppStore";

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
  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Preferences</Text>
      {/* Currency selection */}
      <View style={styles.settingRow}>
        <Text style={styles.settingLabel}>Currency</Text>
        <View style={styles.pickerContainer}>
          <Picker
            selectedValue={currency}
            onValueChange={handleCurrencyChange}
            style={styles.picker}
            dropdownIconColor={"#aaa"}
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
      <View style={{ flex: 1 }} />
      <Text style={[styles.sectionTitle, { color: "#FF6384" }]}>
        Danger Zone
      </Text>
      <Pressable style={styles.deleteButton} onPress={handleDeleteAccount}>
        <Text style={styles.deleteButtonText}>Delete Account and Data</Text>
      </Pressable>
    </View>
  );
}
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#1E1E1E",
    padding: 20,
  },
  deleteButton: {
    backgroundColor: "#FF4C4C",
    padding: 15,
    borderRadius: 8,
    alignItems: "center",
  },
  deleteButtonText: {
    color: "white",
    fontWeight: "bold",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#4BC0C0",
    marginBottom: 15,
    marginTop: 10,
    textTransform: "uppercase",
  },
  settingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#333",
    padding: 15,
    borderRadius: 12,
  },
  settingLabel: {
    fontSize: 16,
    color: "white",
    fontWeight: "500",
  },
  pickerContainer: {
    width: 150,
    backgroundColor: "#222",
    borderRadius: 8,
  },
  picker: {
    color: "white",
    height: 50,
  },
});
export default SettingsScreen;
