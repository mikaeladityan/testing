/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

export async function POST(request: NextRequest) {
	try {
		// Ambil data dari form
		const formData = await request.formData();
		const file = formData.get("file") as File;
		const contentType = formData.get("contentType") as string;

		if (!file) {
			return NextResponse.json({ error: "File tidak ditemukan" }, { status: 400 });
		}

		// Konversi file ke buffer
		const buffer = Buffer.from(await file.arrayBuffer());
		const fileName = file.name;

		// Konfigurasi S3 client
		const s3Client = new S3Client({
			region: process.env.S3_REGION,
			endpoint: process.env.S3_ENDPOINT,
			credentials: {
				accessKeyId: process.env.S3_ACCESS_KEY!,
				secretAccessKey: process.env.S3_SECRET_KEY!,
			},
			forcePathStyle: true,
		});

		// Buat command untuk upload
		const command = new PutObjectCommand({
			Bucket: process.env.S3_BUCKET_NAME,
			Key: fileName,
			Body: buffer,
			ContentType: contentType || "video/webm",
			ACL: "public-read",
		});

		// Eksekusi upload
		await s3Client.send(command);

		// Generate public URL
		const publicUrl = `${process.env.S3_ENDPOINT}/${process.env.S3_BUCKET_NAME}/${fileName}`;

		return NextResponse.json({ publicUrl });
	} catch (error: any) {
		console.error("S3 Upload Error:", error);
		return NextResponse.json(
			{
				error: error.message || "Gagal mengunggah file",
				details: error,
			},
			{ status: 500 }
		);
	}
}
