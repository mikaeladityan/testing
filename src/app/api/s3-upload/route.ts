import { NextRequest, NextResponse } from "next/server";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export async function POST(request: NextRequest) {
	try {
		const { fileName, fileType } = await request.json();

		// Konfigurasi S3 client untuk ID Cloudhost
		const s3Client = new S3Client({
			region: process.env.S3_REGION,
			endpoint: process.env.S3_ENDPOINT,
			credentials: {
				accessKeyId: process.env.S3_ACCESS_KEY!,
				secretAccessKey: process.env.S3_SECRET_KEY!,
			},
			forcePathStyle: true, // Diperlukan untuk S3 selain AWS
		});

		const command = new PutObjectCommand({
			Bucket: process.env.S3_BUCKET_NAME,
			Key: fileName,
			ContentType: fileType,
			ACL: "public-read",
		});

		// Generate presigned URL (berlaku 1 jam)
		const url = await getSignedUrl(s3Client, command, { expiresIn: 3600 });

		// URL publik untuk akses file setelah diupload
		const publicUrl = `${process.env.S3_ENDPOINT}/${process.env.S3_BUCKET_NAME}/${fileName}`;

		return NextResponse.json({ url, publicUrl });
	} catch (error) {
		console.error("S3 Upload Error:", error);
		return NextResponse.json({ error: "Gagal membuat URL unggah" }, { status: 500 });
	}
}
