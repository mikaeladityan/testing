import { NextResponse } from "next/server";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

export async function POST(request: Request) {
	const formData = await request.formData();
	const file = formData.get("file") as File;

	if (!file) {
		return NextResponse.json({ error: "File tidak ditemukan" }, { status: 400 });
	}

	try {
		const s3Client = new S3Client({
			region: process.env.NEXT_PUBLIC_S3_REGION,
			endpoint: process.env.NEXT_PUBLIC_S3_ENDPOINT,
			credentials: {
				accessKeyId: process.env.NEXT_PUBLIC_S3_ACCESS_KEY!,
				secretAccessKey: process.env.NEXT_PUBLIC_S3_SECRET_KEY!,
			},
			forcePathStyle: true, // Diperlukan untuk S3 selain AWS
		});

		const buffer = Buffer.from(await file.arrayBuffer());
		const fileName = `${Date.now()}-${file.name}`;

		const command = new PutObjectCommand({
			Bucket: process.env.NEXT_PUBLIC_S3_BUCKET_NAME,
			Key: fileName,
			Body: buffer,
			ContentType: file.type,
			ACL: "public-read",
		});

		await s3Client.send(command);

		// Format URL: https://endpoint/bucket/filename
		const fileUrl = `${process.env.NEXT_PUBLIC_S3_ENDPOINT}/${process.env.NEXT_PUBLIC_S3_BUCKET_NAME}/${fileName}`;

		return NextResponse.json({ url: fileUrl }, { status: 200 });
	} catch (error) {
		console.error("S3 Upload Error:", error);
		return NextResponse.json({ error: "Gagal mengunggah file ke S3" }, { status: 500 });
	}
}
