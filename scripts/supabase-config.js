/**
 * COD Control Pro – Supabase Configuration
 * Project: jzbsutrmprzfuvaripwb
 */

const SUPABASE_URL = 'https://jzbsutrmprzfuvaripwb.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp6YnN1dHJtcHJ6ZnV2YXJpcHdiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIxNTEyNzQsImV4cCI6MjA4NzcyNzI3NH0.8nyUrjmmzhzrvLgIuk-odbiDEz27muKxBhFcrD2yhf4';

// Initialize Supabase client (CDN v2 exposes supabase.createClient via window.supabase)
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Also expose as `supabase` for backward compat (db.js uses both names)
window.supabaseClient = supabaseClient;
