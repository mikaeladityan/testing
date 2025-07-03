/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { supabase } from "@/lib/supabse";
import { UserData } from "@/types";
import { useState, useRef, useEffect } from "react";

interface VideoRecorderProps {
	userData: UserData | null;
}

// Fungsi untuk mendapatkan mimeType yang didukung oleh browser
const getSupportedMimeType = () => {
	const mimeTypes = ["video/webm;codecs=vp9,opus", "video/webm;codecs=vp8,opus", "video/webm;codecs=h264,opus", "video/webm", "video/mp4"];

	for (const mimeType of mimeTypes) {
		if (MediaRecorder.isTypeSupported(mimeType)) {
			return mimeType;
		}
	}
	return undefined;
};

export default function VideoRecorder({ userData }: VideoRecorderProps) {
	const videoRef = useRef<HTMLVideoElement>(null);
	const [recording, setRecording] = useState(false);
	const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
	const [videoUrl, setVideoUrl] = useState("");
	const [uploading, setUploading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [countdown, setCountdown] = useState(60); // 1 menit countdown
	const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);
	const countdownTimerRef = useRef<NodeJS.Timeout | null>(null);

	// Inisialisasi kamera dan mulai rekam otomatis
	useEffect(() => {
		const initCamera = async () => {
			try {
				const stream = await navigator.mediaDevices.getUserMedia({
					video: { facingMode: "user" },
					audio: true,
				});

				if (videoRef.current) {
					videoRef.current.srcObject = stream;

					// Dapatkan mimeType yang didukung
					const mimeType = getSupportedMimeType();
					const options = mimeType ? { mimeType } : undefined;

					// Coba buat MediaRecorder dengan format yang didukung
					let recorder: MediaRecorder;
					let recordedMimeType = mimeType || "video/webm";

					try {
						recorder = new MediaRecorder(stream, options);
					} catch (err) {
						// Fallback jika gagal dengan options
						recorder = new MediaRecorder(stream);
						recordedMimeType = "video/webm";
					}

					let chunks: BlobPart[] = [];
					recorder.ondataavailable = (e) => chunks.push(e.data);

					recorder.onstop = async () => {
						const blob = new Blob(chunks, { type: recordedMimeType });
						const url = URL.createObjectURL(blob);
						setVideoUrl(url);
						chunks = [];

						try {
							setUploading(true);

							// Tentukan ekstensi file berdasarkan mimeType
							const extension = recordedMimeType.includes("mp4") ? "mp4" : "webm";

							const fileName = `video-${Date.now()}-${Math.random().toString(36).substring(2, 11)}.${extension}`;

							// Upload ke Supabase
							const { data: uploadData, error: uploadError } = await supabase.storage.from("videos").upload(fileName, blob);

							if (uploadError) throw uploadError;

							// Dapatkan URL publik
							const { data: publicUrlData } = supabase.storage.from("videos").getPublicUrl(uploadData.path);

							// Simpan metadata DENGAN SERVICE ROLE KEY (bypass RLS)
							await supabase.from("user_videos").insert(
								{
									video_url: publicUrlData.publicUrl,
									recorded_at: new Date().toISOString(),
									user_data: userData,
								}
								// {
								// 	// Menggunakan service role untuk bypass RLS
								// 	returning: "minimal",
								// }
							);

							setUploading(false);
						} catch (err: any) {
							setError(`Gagal mengunggah video: ${err.message}`);
							setUploading(false);
						}
					};

					setMediaRecorder(recorder);

					// Mulai rekam otomatis setelah kamera siap
					startRecording(recorder);
				}
			} catch (err: any) {
				setError(`Gagal mengakses kamera: ${err.message}`);
			}
		};

		initCamera();

		return () => {
			// Hentikan semua timer
			if (recordingTimerRef.current) clearTimeout(recordingTimerRef.current);
			if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);

			// Hentikan perekaman dan kamera
			if (mediaRecorder && recording) {
				mediaRecorder.stop();
			}

			if (videoRef.current?.srcObject) {
				const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
				tracks.forEach((track) => track.stop());
			}
		};
	}, [userData]);

	const startRecording = (recorder: MediaRecorder) => {
		if (recorder) {
			recorder.start();
			setRecording(true);

			// Set countdown timer
			setCountdown(60);
			countdownTimerRef.current = setInterval(() => {
				setCountdown((prev) => {
					if (prev <= 1) {
						if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
						return 0;
					}
					return prev - 1;
				});
			}, 1000);

			// Set timer untuk menghentikan rekaman setelah 1 menit
			recordingTimerRef.current = setTimeout(() => {
				stopRecording(recorder);
			}, 60000);
		}
	};

	const stopRecording = (recorder: MediaRecorder) => {
		if (recorder && recording) {
			recorder.stop();
			setRecording(false);

			// Hentikan timer
			if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
			if (recordingTimerRef.current) clearTimeout(recordingTimerRef.current);
		}
	};

	return (
		<div className="p-4 flex flex-col items-center">
			{error && <p className="text-red-600 mb-4 text-center">{error}</p>}

			<div className="relative w-full max-w-md mx-auto">
				<video ref={videoRef} autoPlay playsInline muted className="w-full rounded-lg shadow-lg" />

				{recording && (
					<div className="absolute top-4 right-4 bg-red-600 text-white px-3 py-1 rounded-full">
						<span className="flex items-center">
							<span className="w-3 h-3 bg-red-400 rounded-full animate-pulse mr-2"></span>
							Merekam: {countdown}s
						</span>
					</div>
				)}
			</div>

			{uploading && (
				<div className="mt-6 w-full max-w-md bg-blue-50 p-4 rounded-lg">
					<p className="text-center text-blue-600 font-medium">Mengunggah video...</p>
					<div className="mt-2 h-2 w-full bg-blue-200 rounded-full overflow-hidden">
						<div className="h-full bg-blue-500 animate-pulse w-3/4"></div>
					</div>
				</div>
			)}

			{videoUrl && !uploading && (
				<div className="mt-6 w-full max-w-md">
					<p className="text-green-600 text-center mb-2 font-medium">Video berhasil diunggah!</p>
					<video src={videoUrl} controls className="w-full rounded-lg shadow" />
				</div>
			)}
		</div>
	);
}
