/* eslint-disable @typescript-eslint/no-explicit-any */
import { createClient } from "@supabase/supabase-js";

// Periksa environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
	throw new Error("Supabase URL or Anon Key is missing in environment variables");
}

// Buat client dengan error handling
export const supabase = createClient(supabaseUrl, supabaseKey, {
	auth: {
		autoRefreshToken: true,
		persistSession: true,
		detectSessionInUrl: true,
	},
});

// Fungsi untuk handle error supabase
export const handleSupabaseError = (error: any) => {
	console.error("Supabase Error:", error);
	throw new Error(error.message || "Database error occurred");
};
