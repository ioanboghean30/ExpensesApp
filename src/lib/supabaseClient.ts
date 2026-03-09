import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";
import "react-native-url-polyfill/auto"; // Required for Supabase to work in React Native.

// Supabase project credentials.
const supabaseUrl = "https://pghsknexvauwruiwtqpw.supabase.co";
const supabaseAnonKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBnaHNrbmV4dmF1d3J1aXd0cXB3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE4MjkyOTgsImV4cCI6MjA3NzQwNTI5OH0.8XPL6u0NWKAm8mggL7G0IyeW3FQVPIxkrpV18EkDZBM"; // Replace with your own anon key if needed.

// Create and export the Supabase client.
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage, // Persist user session in local storage.
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
