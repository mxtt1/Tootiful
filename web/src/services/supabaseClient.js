import { createClient } from '@supabase/supabase-js';

// For Vite/React, use VITE_ prefix in .env
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.warn('Supabase URL or anon key is missing. Check your .env file and restart dev server.');
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export default supabase;