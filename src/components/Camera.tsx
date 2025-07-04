/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-unused-vars */
"use client";

import { useEffect, useRef, useState } from "react";

interface CameraCaptureProps {
	onCapture: (dataUrl: string) => void;
}

export default function CameraCapture({ onCapture }: CameraCaptureProps) {
	const videoRef = useRef<HTMLVideoElement>(null);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		const initCamera = async () => {
			try {
				const stream = await navigator.mediaDevices.getUserMedia({
					video: { facingMode: "user" },
				});

				if (videoRef.current) {
					videoRef.current.srcObject = stream;
				}
			} catch (err) {
				setError("Gagal mengakses kamera. Pastikan Anda memberikan izin.");
			}
		};

		initCamera();

		return () => {
			if (videoRef.current?.srcObject) {
				const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
				tracks.forEach((track) => track.stop());
			}
		};
	}, []);

	const capturePhoto = () => {
		if (!videoRef.current) return;

		const canvas = document.createElement("canvas");
		canvas.width = videoRef.current.videoWidth;
		canvas.height = videoRef.current.videoHeight;

		const context = canvas.getContext("2d");
		if (context) {
			context.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
			const dataUrl = canvas.toDataURL("image/jpeg");
			onCapture(dataUrl);
		}
	};

	return (
		<div className="w-full">
			{error ? (
				<p className="text-red-500 text-center">{error}</p>
			) : (
				<>
					<div className="relative bg-gray-100 rounded-xl overflow-hidden mb-6">
						<video ref={videoRef} autoPlay playsInline muted className="w-full h-auto aspect-video object-cover" />
					</div>
					<div className="text-center">
						<button onClick={capturePhoto} className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors shadow-md">
							Ambil Foto
						</button>
					</div>
				</>
			)}
		</div>
	);
}
