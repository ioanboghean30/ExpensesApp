 import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import 'react-native-url-polyfill/auto'; // Necesare pentru ca Supabase să meargă în React Native

// AICI PUI CHEILE TALE PE CARE LE-AI COPIAT
const supabaseUrl = "https://pghsknexvauwruiwtqpw.supabase.co"; 
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBnaHNrbmV4dmF1d3J1aXd0cXB3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE4MjkyOTgsImV4cCI6MjA3NzQwNTI5OH0.8XPL6u0NWKAm8mggL7G0IyeW3FQVPIxkrpV18EkDZBM"; // <-- ÎNLOCUIEȘTE CU CHEIA TA ANON

// Creăm și exportăm clientul Supabase
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage, // Folosim AsyncStorage pentru a salva sesiunea utilizatorului
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});