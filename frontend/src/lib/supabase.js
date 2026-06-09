import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://kyhteatixdunvkgvdvxu.supabase.co';
// NOTE: For local dev only if anon key is missing. DO NOT use service key in production frontend!
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'MISSING_ANON_KEY'; 

console.log(">>> [SUPABASE INIT] Detected URL:", supabaseUrl);
console.log(">>> [SUPABASE INIT] ANON KEY present:", !!supabaseAnonKey, "Length:", supabaseAnonKey?.length);

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
