import { createBrowserClient } from '@supabase/ssr';

// These environment variables need to be set in your .env.local file
// You'll get these values from your Supabase project settings
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Create a browser client for client-side usage
export const supabase = createBrowserClient(
  supabaseUrl,
  supabaseAnonKey
);
