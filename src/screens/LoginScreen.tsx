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
import { supabase } from "../lib/supabaseClient";
import { useAppStore } from "../store/useAppStore";

// `navigation` is used to open the Signup screen.
export default function LoginScreen({ navigation }: { navigation: any }) {
  const setAuthStatus = useAppStore((state) => state.setAuthStatus);

  // Local form state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false); // Block buttons while auth request is pending.

  const handleLoginClick = async () => {
    if (!email || !password) {
      Alert.alert("Error", "Please enter the email and password.");
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email,
        password: password,
      });
      if (error) {
        Alert.alert("Error in Login", error.message);
      } else if (data.user) {
        setAuthStatus("loggedIn");
      }
    } catch (e) {
      console.log(e);
      Alert.alert("Error", "Unexpected error.");
    } finally {
      setLoading(false);
    }
  };
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Welcome!</Text>

      {/* Email field */}
      <TextInput
        style={styles.input}
        placeholder="Email"
        placeholderTextColor="#999"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
      />

      {/* Password field */}
      <TextInput
        style={styles.input}
        placeholder="Password"
        placeholderTextColor="#999"
        secureTextEntry={true} // Hide password input.
        value={password}
        onChangeText={setPassword}
        autoCapitalize="none"
      />
      <Pressable
        style={styles.buttonPrimary}
        onPress={handleLoginClick}
        disabled={loading} // Disable while loading.
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
        disabled={loading} // Disable while loading.
      >
        <Text style={styles.buttonSecondaryText}>Sign up</Text>
      </Pressable>

      <Pressable
        style={styles.buttonGuest}
        onPress={async () => {
          await AsyncStorage.setItem("shouldOpenInitialSetup", "true");
          setAuthStatus("guest");
        }}
        disabled={loading} // Disable while loading.
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
    padding: 20, // Screen padding.
    backgroundColor: "#fff", // Light auth background.
  },
  text: {
    fontSize: 24,
    marginBottom: 20,
  },
  // Text input style
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
