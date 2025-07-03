"use client";

import { useEffect, useRef, useState } from "react";

interface VideoRecorderProps {
	onRecordingComplete: (url: string) => void;
}

export default function VideoRecorder({ onRecordingComplete }: VideoRecorderProps) {
	const videoRef = useRef<HTMLVideoElement>(null);
	const [countdown, setCountdown] = useState(15);
	const [recording, setRecording] = useState(false);
	const mediaRecorderRef = useRef<MediaRecorder | null>(null);
	const recordedChunksRef = useRef<Blob[]>([]);
	const countdownRef = useRef<NodeJS.Timeout | null>(null);

	useEffect(() => {
		const initCamera = async () => {
			try {
				const stream = await navigator.mediaDevices.getUserMedia({
					video: { facingMode: "user" },
					audio: true,
				});

				if (videoRef.current) {
					videoRef.current.srcObject = stream;
				}
			} catch (err) {
				console.error("Camera access error:", err);
			}
		};

		initCamera();

		return () => {
			if (countdownRef.current) clearInterval(countdownRef.current);
			if (videoRef.current?.srcObject) {
				const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
				tracks.forEach((track) => track.stop());
			}
		};
	}, []);

	const startRecording = async () => {
		try {
			if (!videoRef.current?.srcObject) return;

			const stream = videoRef.current.srcObject as MediaStream;
			recordedChunksRef.current = [];

			const recorder = new MediaRecorder(stream, { mimeType: "video/webm" });
			mediaRecorderRef.current = recorder;

			recorder.ondataavailable = (e) => {
				if (e.data.size > 0) {
					recordedChunksRef.current.push(e.data);
				}
			};

			recorder.onstop = () => {
				const blob = new Blob(recordedChunksRef.current, { type: "video/webm" });
				const url = URL.createObjectURL(blob);
				onRecordingComplete(url);
			};

			recorder.start();
			setRecording(true);

			// Start countdown
			setCountdown(15);
			countdownRef.current = setInterval(() => {
				setCountdown((prev) => {
					if (prev <= 1) {
						if (countdownRef.current) clearInterval(countdownRef.current);
						stopRecording();
						return 0;
					}
					return prev - 1;
				});
			}, 1000);
		} catch (err) {
			console.error("Recording error:", err);
		}
	};

	const stopRecording = () => {
		if (mediaRecorderRef.current && recording) {
			mediaRecorderRef.current.stop();
			setRecording(false);
			if (countdownRef.current) clearInterval(countdownRef.current);
		}
	};

	return (
		<div className="w-full max-w-md mx-auto">
			<div className="relative bg-gray-100 rounded-xl overflow-hidden mb-6">
				<video ref={videoRef} autoPlay playsInline muted className="w-full h-auto aspect-video object-cover" />

				{recording && <div className="absolute top-4 right-4 bg-red-500 text-white px-3 py-1 rounded-full font-bold">{countdown}s</div>}
			</div>

			<div className="text-center">
				{!recording ? (
					<button onClick={startRecording} className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors shadow-md">
						Mulai Merekam
					</button>
				) : (
					<button onClick={stopRecording} className="px-6 py-3 bg-red-500 text-white rounded-lg font-medium hover:bg-red-600 transition-colors">
						Hentikan Rekaman
					</button>
				)}
			</div>
		</div>
	);
}
