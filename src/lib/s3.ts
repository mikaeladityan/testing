// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const uploadToS3 = async (fileBlob: Blob, fileName: string): Promise<string> => {
	// Dapatkan URL signed dari API route Next.js
	const response = await fetch("/api/s3-upload");
	if (!response.ok) {
		throw new Error("Gagal mendapatkan URL unggah");
	}

	const { url } = await response.json();

	// Unggah file langsung ke S3
	const uploadResponse = await fetch(url, {
		method: "PUT",
		body: fileBlob,
		headers: {
			"Content-Type": fileBlob.type,
		},
	});

	if (!uploadResponse.ok) {
		throw new Error("Upload ke S3 gagal");
	}

	// Kembalikan URL publik (hapus parameter signed)
	return url.split("?")[0];
};
