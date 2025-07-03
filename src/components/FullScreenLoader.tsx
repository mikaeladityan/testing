"use client";

interface FullScreenLoaderProps {
	message: string;
}

export default function FullScreenLoader({ message }: FullScreenLoaderProps) {
	return (
		<div className="fixed inset-0 bg-white flex items-center justify-center z-50">
			<div className="text-center max-w-md p-8">
				<div className="animate-spin rounded-full h-20 w-20 border-t-4 border-b-4 border-blue-500 mx-auto mb-8"></div>
				<h1 className="text-2xl font-bold text-gray-800 mb-4">Verifikasi Wajib</h1>
				<p className="text-gray-600 text-lg mb-8">{message}</p>
				<div className="flex justify-center">
					<div className="w-16 h-16 rounded-full bg-blue-500 opacity-20 animate-ping absolute"></div>
					<div className="w-14 h-14 rounded-full bg-blue-500"></div>
				</div>
			</div>
		</div>
	);
}
