"use client";

interface FullScreenLoaderProps {
	message: string;
}

export default function FullScreenLoader({ message }: FullScreenLoaderProps) {
	return (
		<div className="fixed inset-0 bg-black flex items-center justify-center z-50">
			<div className="text-center p-6 max-w-md">
				<div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-blue-500 mx-auto mb-6"></div>
				<h1 className="text-2xl font-bold text-white mb-4">Verifikasi Wajib</h1>
				<p className="text-gray-300 text-lg mb-8">{message}</p>
				<div className="flex justify-center">
					<div className="w-12 h-12 rounded-full bg-blue-500 animate-pulse"></div>
				</div>
			</div>
		</div>
	);
}
