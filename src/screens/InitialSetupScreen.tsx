import AsyncStorage from "@react-native-async-storage/async-storage";
import { Picker } from "@react-native-picker/picker";
import React, { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

// Country → Currency mapping
const COUNTRIES = [
  { country: "Romania", currency: "RON", label: "RON (lei)" },
  { country: "United States", currency: "USD", label: "USD ($)" },
  { country: "Eurozone", currency: "EUR", label: "EUR (€)" },
  { country: "United Kingdom", currency: "GBP", label: "GBP (£)" },
  { country: "Japan", currency: "JPY", label: "JPY (¥)" },
  { country: "Switzerland", currency: "CHF", label: "CHF (Fr)" },
  { country: "Canada", currency: "CAD", label: "CAD (C$)" },
  { country: "Australia", currency: "AUD", label: "AUD (A$)" },
  { country: "China", currency: "CNY", label: "CNY (¥)" },
  { country: "India", currency: "INR", label: "INR (₹)" },
  { country: "Brazil", currency: "BRL", label: "BRL (R$)" },
  { country: "South Korea", currency: "KRW", label: "KRW (₩)" },
  { country: "Mexico", currency: "MXN", label: "MXN (Mex$)" },
  { country: "Sweden", currency: "SEK", label: "SEK (kr)" },
  { country: "Norway", currency: "NOK", label: "NOK (kr)" },
  { country: "Denmark", currency: "DKK", label: "DKK (kr)" },
  { country: "Poland", currency: "PLN", label: "PLN (zł)" },
  { country: "Czech Republic", currency: "CZK", label: "CZK (Kč)" },
  { country: "Hungary", currency: "HUF", label: "HUF (Ft)" },
  { country: "Turkey", currency: "TRY", label: "TRY (₺)" },
  { country: "South Africa", currency: "ZAR", label: "ZAR (R)" },
  { country: "Russia", currency: "RUB", label: "RUB (₽)" },
  { country: "Israel", currency: "ILS", label: "ILS (₪)" },
  { country: "Singapore", currency: "SGD", label: "SGD (S$)" },
  { country: "New Zealand", currency: "NZD", label: "NZD (NZ$)" },
  { country: "Thailand", currency: "THB", label: "THB (฿)" },
  { country: "Malaysia", currency: "MYR", label: "MYR (RM)" },
  { country: "Indonesia", currency: "IDR", label: "IDR (Rp)" },
  { country: "Philippines", currency: "PHP", label: "PHP (₱)" },
  { country: "UAE", currency: "AED", label: "AED (د.إ)" },
  { country: "Saudi Arabia", currency: "SAR", label: "SAR (﷼)" },
  { country: "Argentina", currency: "ARS", label: "ARS (AR$)" },
  { country: "Colombia", currency: "COP", label: "COP (COL$)" },
  { country: "Chile", currency: "CLP", label: "CLP (CL$)" },
  { country: "Egypt", currency: "EGP", label: "EGP (E£)" },
  { country: "Nigeria", currency: "NGN", label: "NGN (₦)" },
  { country: "Ukraine", currency: "UAH", label: "UAH (₴)" },
  { country: "Croatia", currency: "EUR", label: "EUR (€)" },
  { country: "Bulgaria", currency: "BGN", label: "BGN (лв)" },
  { country: "Serbia", currency: "RSD", label: "RSD (din)" },
  { country: "Moldova", currency: "MDL", label: "MDL (L)" },
  { country: "Pakistan", currency: "PKR", label: "PKR (₨)" },
  { country: "Bangladesh", currency: "BDT", label: "BDT (৳)" },
  { country: "Vietnam", currency: "VND", label: "VND (₫)" },
  { country: "Taiwan", currency: "TWD", label: "TWD (NT$)" },
  { country: "Hong Kong", currency: "HKD", label: "HKD (HK$)" },
  { country: "Peru", currency: "PEN", label: "PEN (S/)" },
  { country: "Kenya", currency: "KES", label: "KES (KSh)" },
  { country: "Morocco", currency: "MAD", label: "MAD (د.م.)" },
  { country: "Iceland", currency: "ISK", label: "ISK (kr)" },
];

export default function InitialSetupScreen({
  navigation,
}: {
  navigation: any;
}) {
  const [country, setCountry] = useState("Romania");
  const [currency, setCurrency] = useState("RON");

  // When country changes, auto-set the matching currency
  const handleCountryChange = (selectedCountry: string) => {
    setCountry(selectedCountry);
    const match = COUNTRIES.find((c) => c.country === selectedCountry);
    if (match) {
      setCurrency(match.currency);
    }
  };

  // Get unique currencies for the currency picker
  const uniqueCurrencies = COUNTRIES.reduce(
    (acc: { currency: string; label: string }[], item) => {
      if (!acc.find((c) => c.currency === item.currency)) {
        acc.push({ currency: item.currency, label: item.label });
      }
      return acc;
    },
    [],
  );

  const handleContinue = async () => {
    try {
      await AsyncStorage.setItem("userCurrency", currency);
      await AsyncStorage.setItem("userCountry", country);
      navigation.navigate("Home");
    } catch (e) {
      console.error("Error saving initial setup", e);
    }
  };

  return (
    <ScrollView
      contentContainerStyle={styles.scrollContent}
      style={styles.scrollView}
    >
      <View style={styles.header}>
        <Text style={styles.title}>Welcome!</Text>
        <Text style={styles.subtitle}>
          {
            "Let's set up your country and currency before we start tracking your expenses."
          }
        </Text>
      </View>

      <View style={styles.settingRow}>
        <Text style={styles.settingLabel}>Country</Text>
        <View style={styles.pickerContainer}>
          <Picker
            selectedValue={country}
            onValueChange={handleCountryChange}
            style={styles.picker}
            dropdownIconColor={"#aaa"}
          >
            {COUNTRIES.map((item) => (
              <Picker.Item
                key={item.country}
                label={item.country}
                value={item.country}
              />
            ))}
          </Picker>
        </View>
      </View>

      <View style={styles.settingRow}>
        <Text style={styles.settingLabel}>Currency</Text>
        <View style={styles.pickerContainer}>
          <Picker
            selectedValue={currency}
            onValueChange={(itemValue) => setCurrency(itemValue)}
            style={styles.picker}
            dropdownIconColor={"#aaa"}
          >
            {uniqueCurrencies.map((item) => (
              <Picker.Item
                key={item.currency}
                label={item.label}
                value={item.currency}
              />
            ))}
          </Picker>
        </View>
      </View>

      <Pressable style={styles.buttonPrimary} onPress={handleContinue}>
        <Text style={styles.buttonPrimaryText}>Continue</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
    backgroundColor: "#1E1E1E",
  },
  scrollContent: {
    flexGrow: 1,
    padding: 20,
    justifyContent: "center",
  },
  header: {
    marginBottom: 40,
    alignItems: "center",
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    color: "white",
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: "#aaa",
    textAlign: "center",
    lineHeight: 22,
  },
  settingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#333",
    padding: 15,
    borderRadius: 12,
    marginBottom: 30,
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
  buttonPrimary: {
    backgroundColor: "#007AFF", // Primary action blue.
    padding: 15,
    borderRadius: 8,
    alignItems: "center",
  },
  buttonPrimaryText: {
    color: "white",
    fontSize: 18,
    fontWeight: "bold",
  },
});
