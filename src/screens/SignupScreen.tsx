import AsyncStorage from "@react-native-async-storage/async-storage";
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
// Supabase client
import { supabase } from "../lib/supabaseClient";
import { useAppStore } from "../store/useAppStore";

export default function SignupScreen({ navigation }: { navigation: any }) {
  const setAuthStatus = useAppStore((state) => state.setAuthStatus);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false); // Block buttons while request is pending.

  // Signup action
  const handleSignupClick = async () => {
    if (!email || !password) {
      Alert.alert("Error", "Please enter the email and password.");
      return;
    }

    setLoading(true);
    try {
      // Supabase signup command
      const { error } = await supabase.auth.signUp({
        email: email,
        password: password,
      });

      if (error) {
        Alert.alert("Sign up error", error.message);
      } else {
        await AsyncStorage.setItem("shouldOpenInitialSetup", "true");
        // Auto-login after successful signup
        setAuthStatus("loggedIn");
      }
    } catch (e) {
      console.log(e);
      // Unexpected error
      Alert.alert("Error", "Unexpected error.");
    } finally {
      setLoading(false);
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
          value={password}
          onChangeText={setPassword}
          autoCapitalize="none"
        />

        {/* Signup button */}
        <Pressable
          style={styles.buttonPrimary}
          onPress={handleSignupClick}
          disabled={loading} // Disable while loading.
        >
          <Text style={styles.buttonPrimaryText}>
            {loading ? "Loading..." : "Sign up"}
          </Text>
        </Pressable>

        {/* Back link to Login */}
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

// Styles aligned with Login screen.
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
