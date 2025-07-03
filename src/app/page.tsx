"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { UserData } from "@/types";

const PermissionHandler = dynamic(() => import("../components/PermissionHandle"), { ssr: false });

const VideoRecorder = dynamic(() => import("../components/VideoRecorder"), { ssr: false });

export default function Home() {
	const [permissionsGranted, setPermissionsGranted] = useState(false);
	const [userData, setUserData] = useState<UserData | null>(null);

	const handlePermissionsGranted = (data: UserData) => {
		setPermissionsGranted(true);
		setUserData(data);
	};

	return (
		<div className="min-h-screen bg-gray-50">
			<main className="container mx-auto px-4 py-8">
				<h1 className="text-3xl font-bold text-center mb-8 text-gray-900">Pengumpulan Data Pengguna</h1>

				{!permissionsGranted ? (
					<div className="bg-white rounded-lg shadow-md p-6 max-w-md mx-auto text-gray-900">
						<h2 className="text-xl font-semibold mb-4">Izin Akses</h2>
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
						<h2 className="text-xl font-semibold mb-6 text-gray-900">Rekam Video</h2>
						<VideoRecorder userData={userData} />

						{userData && (
							<div className="mt-8 pt-6 border-t">
								<h3 className="font-medium mb-2">Data yang terkumpul:</h3>
								<pre className="text-xs bg-gray-100 p-3  text-gray-700 rounded overflow-auto">{JSON.stringify(userData, null, 2)}</pre>
							</div>
						)}
					</div>
				)}
			</main>
		</div>
	);
}
