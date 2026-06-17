import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';

const ExpoSecureStoreAdapter = {
  getItem: (key: string) => {
    return SecureStore.getItemAsync(key);
  },
  setItem: (key: string, value: string) => {
    SecureStore.setItemAsync(key, value);
  },
  removeItem: (key: string) => {
    SecureStore.deleteItemAsync(key);
  },
};

// Replace these with the actual Supabase URL and Anon Key once the project is created
export const supabaseUrl = 'https://rzdxvmufvaltpahcusqr.supabase.co';
export const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ6ZHh2bXVmdmFsdHBhaGN1c3FyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE2ODYxMjgsImV4cCI6MjA5NzI2MjEyOH0.ZEU4QrNWbGUiZb1K1-H3eQRXTzF-AoulzH-7t4whsUM';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: ExpoSecureStoreAdapter as any,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
