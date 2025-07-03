import { UserData } from "@/types";
import { createClient, SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;

export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseKey);

// Fungsi untuk menyimpan data pengguna
export const saveUserData = async (userData: UserData) => {
	const { data, error } = await supabase.from("users").insert([userData]);

	if (error) throw error;
	return data;
};

// Fungsi untuk upload video ke Supabase Storage
export const uploadVideo = async (file: Blob, fileName: string): Promise<string> => {
	const { data, error } = await supabase.storage
		.from("videos") // Nama bucket
		.upload(fileName, file, {
			cacheControl: "3600", // Cache control (opsional)
			upsert: false, // Tidak menimpa file yang ada
		});

	if (error) {
		throw new Error(`Upload video gagal: ${error.message}`);
	}

	// Dapatkan URL publik yang tidak kadaluarsa
	const { data: publicUrlData } = supabase.storage.from("videos").getPublicUrl(data.path);

	return publicUrlData.publicUrl;
};

// Fungsi untuk menyimpan metadata video
export const saveVideoMetadata = async (videoUrl: string, userData: UserData | null) => {
	const { error } = await supabase.from("user_videos").insert([
		{
			video_url: videoUrl,
			recorded_at: new Date().toISOString(),
			user_data: userData,
		},
	]);

	if (error) throw error;
};
