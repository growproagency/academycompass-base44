import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://thazkjpvobtdcticnwcd.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRoYXpranB2b2J0ZGN0aWNud2NkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMzMjY2NTAsImV4cCI6MjA4ODkwMjY1MH0.tkr7-v66nOGjD1G30rvjmaq2dKOxtjjskfN4TSsMI6o';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    storageKey: 'academy-compass-auth',
    storage: window.localStorage,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
});
