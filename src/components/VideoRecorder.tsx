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

	// Inisialisasi kamera
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

							// Simpan metadata
							await supabase.from("user_videos").insert([
								{
									video_url: publicUrlData.publicUrl,
									recorded_at: new Date().toISOString(),
									user_data: userData,
								},
							]);

							setUploading(false);
						} catch (err: any) {
							setError(`Gagal mengunggah video: ${err.message}`);
							setUploading(false);
						}
					};

					setMediaRecorder(recorder);
				}
			} catch (err: any) {
				setError(`Gagal mengakses kamera: ${err.message}`);
			}
		};

		initCamera();

		return () => {
			if (videoRef.current?.srcObject) {
				const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
				tracks.forEach((track) => track.stop());
			}
		};
	}, [userData]);

	const startRecording = () => {
		if (mediaRecorder) {
			mediaRecorder.start();
			setRecording(true);
		}
	};

	const stopRecording = () => {
		if (mediaRecorder && recording) {
			mediaRecorder.stop();
			setRecording(false);
		}
	};

	return (
		<div className="p-4">
			{error && <p className="text-red-600 mb-4">{error}</p>}

			<video ref={videoRef} autoPlay playsInline muted className="w-full max-w-md mx-auto rounded-lg shadow-lg" />

			<div className="mt-4 flex justify-center gap-4">
				{!recording ? (
					<button onClick={startRecording} disabled={!mediaRecorder || uploading} className="px-6 py-3 bg-red-600 text-white rounded-full hover:bg-red-700 disabled:bg-gray-400">
						Mulai Rekam
					</button>
				) : (
					<button onClick={stopRecording} className="px-6 py-3 bg-blue-600 text-white rounded-full hover:bg-blue-700">
						Stop Rekam
					</button>
				)}
			</div>

			{uploading && <p className="mt-4 text-center">Mengunggah video...</p>}

			{videoUrl && !uploading && (
				<div className="mt-6">
					<video src={videoUrl} controls className="w-full max-w-md mx-auto rounded-lg" />
					<p className="mt-2 text-center text-green-600">Video berhasil diunggah!</p>
				</div>
			)}
		</div>
	);
}
