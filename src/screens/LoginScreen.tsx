import React, { useState } from "react"; // Am adăugat useState
import {
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { supabase } from "../lib/supabaseClient";

// 'navigation' ne lasă să mergem la Signup
// 'onLogin' este o funcție pe care o vom "trimite" din App.tsx
export default function LoginScreen({
  navigation,
  onLogin,
  onGuestLogin,
}: {
  navigation: any;
  onLogin: any;
  onGuestLogin: any;
}) {
  // Stări pentru email și parolă
  const [email, setEmail] = useState("");
  const [parola, setParola] = useState("");
  const [loading, setLoading] = useState(false); // Stare pentru a bloca butonul de login in timp ce asteptam logarea

  const handleLoginClick = async () => {
    if (!email || !parola) {
      Alert.alert("Error", "Please enter the email and password.");
      return;
    }
    setLoading(true); // Începem încărcarea
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email,
        password: parola,
      });
      if (error) {
        Alert.alert("Error in Login", error.message);
      } else if (data.user) {
        onLogin(); // Apelăm funcția trimisă din App.tsx
      }
    } catch (e) {
      console.log(e);
      Alert.alert("Error", "Unexpected error.");
    } finally {
      setLoading(false); // Oprim încărcarea, indiferent de rezultat
    }
  };
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Welcome!</Text>

      {/* Câmpul pentru Email */}
      <TextInput
        style={styles.input}
        placeholder="Email"
        placeholderTextColor="#999"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
      />

      {/* Câmpul pentru Parolă */}
      <TextInput
        style={styles.input}
        placeholder="Password"
        placeholderTextColor="#999"
        secureTextEntry={true} // Ascunde textul
        value={parola}
        onChangeText={setParola}
        autoCapitalize="none"
      />
      <Pressable
        style={styles.buttonPrimary}
        onPress={handleLoginClick}
        disabled={loading} // Dezactivează butonul dacă se încarcă
        android_ripple={{ color: "#0056b3" }}
      >
        <Text style={styles.buttonPrimaryText}>
          {}
          {loading ? "Loading..." : "Login"}
        </Text>
      </Pressable>
      <Pressable
        style={styles.buttonSecondary}
        onPress={() => navigation.navigate("Signup")}
        disabled={loading} // Dezactivează butonul dacă se încarcă
      >
        <Text style={styles.buttonSecondaryText}>Sign up</Text>
      </Pressable>

      <Pressable
        style={styles.buttonGuest}
        onPress={onGuestLogin}
        disabled={loading} // Dezactivează butonul dacă se încarcă
      >
        <Text style={styles.buttonGuestText}>Continue as Guest</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  buttonPrimary: {
    width: "80%",
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
  buttonGuest: {
    marginTop: 0,
    padding: 10,
  },
  buttonGuestText: {
    color: "#555",
    fontSize: 14,
    fontWeight: "600",
  },
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20, // Spațiu pe margini
    backgroundColor: "#fff", // Fundal alb (sau ce culoare vrei)
  },
  text: {
    fontSize: 24,
    marginBottom: 20,
  },
  // Stilul pentru câmpurile de text
  input: {
    width: "80%",
    backgroundColor: "#eee",
    borderRadius: 5,
    paddingHorizontal: 15,
    paddingVertical: 10,
    fontSize: 16,
    marginBottom: 15,
    color: "#333",
  },
});
