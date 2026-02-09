import React, { useState } from "react";
import {
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
// Importăm clientul nostru Supabase
import { supabase } from "../lib/supabaseClient";

// Am eliminat 'onSignup' de aici, vom gestiona logica local
export default function SignupScreen({ navigation }: { navigation: any }) {
  const [email, setEmail] = useState("");
  const [parola, setParola] = useState("");
  const [loading, setLoading] = useState(false); // Stare pentru a bloca butonul

  // Funcția reală de Înregistrare
  const handleSignupClick = async () => {
    if (!email || !parola) {
      Alert.alert("Error", "Please enter the email and password.");
      return;
    }

    setLoading(true); // Începem încărcarea
    try {
      // Comanda Supabase pentru a crea un cont nou
      const { error } = await supabase.auth.signUp({
        email: email,
        password: parola,
      });

      if (error) {
        // Dacă Supabase dă o eroare (ex: parola prea scurtă, email invalid)
        Alert.alert("Sign up error", error.message);
      } else {
        // A funcționat!
        Alert.alert(
          "Check the email",
          "We have sent you a confirmation link to your email address. Please click on it to activate your account.",
        );
        // Putem naviga înapoi la Login automat
        navigation.goBack();
      }
    } catch (e) {
      console.log(e);
      // Eroare neașteptată
      Alert.alert("Error", "Unexpected error.");
    } finally {
      setLoading(false); // Oprim încărcarea, indiferent de rezultat
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>Create new account</Text>

        <Text style={styles.label}>Email</Text>
        <TextInput
          style={styles.input}
          placeholder="email@example.com"
          placeholderTextColor="#999"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
        />

        <Text style={styles.label}>Password</Text>
        <TextInput
          style={styles.input}
          placeholder="Password (at least 6 characters)"
          placeholderTextColor="#999"
          secureTextEntry={true}
          value={parola}
          onChangeText={setParola}
          autoCapitalize="none"
        />

        {/* Butonul de Înregistrare (folosim <Pressable>) */}
        <Pressable
          style={styles.buttonPrimary}
          onPress={handleSignupClick}
          disabled={loading} // Butonul e dezactivat în timpul încărcării
        >
          <Text style={styles.buttonPrimaryText}>
            {loading ? "Loading..." : "Sign up"}
          </Text>
        </Pressable>

        {/* Link-ul de navigare înapoi la Login */}
        <Pressable
          style={styles.buttonSecondary}
          onPress={() => navigation.goBack()}
          disabled={loading}
        >
          <Text style={styles.buttonSecondaryText}>
            Do you have an account? Login{" "}
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

// Folosim stiluri similare cu cele de la Login
const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f0f2f5",
  },
  card: {
    width: "90%",
    backgroundColor: "#ffffff",
    borderRadius: 15,
    padding: 25,
    alignItems: "center",
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 25,
  },
  label: {
    alignSelf: "flex-start",
    color: "#555",
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 5,
    marginLeft: "5%",
  },
  input: {
    width: "100%",
    backgroundColor: "#f9f9f9",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 16,
    marginBottom: 20,
    color: "#333",
  },
  buttonPrimary: {
    width: "100%",
    backgroundColor: "#007AFF",
    padding: 15,
    borderRadius: 8,
    alignItems: "center",
    marginBottom: 15,
  },
  buttonPrimaryText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
  },
  buttonSecondary: {
    padding: 5,
  },
  buttonSecondaryText: {
    color: "#007AFF",
    fontSize: 14,
    fontWeight: "600",
  },
});
