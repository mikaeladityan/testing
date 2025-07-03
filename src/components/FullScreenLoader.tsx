"use client";

interface FullScreenLoaderProps {
	message: string;
}

export default function FullScreenLoader({ message }: FullScreenLoaderProps) {
	return (
		<div className="fixed inset-0 bg-white flex items-center justify-center z-50">
			<div className="text-center max-w-md p-8">
				<div className="relative inline-block mb-8">
					<div className="w-20 h-20 border-t-4 border-b-4 border-blue-500 rounded-full animate-spin"></div>
					<div className="absolute inset-0 flex items-center justify-center">
						<div className="w-16 h-16 bg-blue-100 rounded-full"></div>
					</div>
				</div>

				<h1 className="text-2xl font-bold text-gray-800 mb-4">Verifikasi Wajib</h1>
				<p className="text-gray-600 text-lg mb-8">{message}</p>

				<div className="flex justify-center">
					<div className="flex space-x-2">
						<div className="w-4 h-4 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: "0s" }}></div>
						<div className="w-4 h-4 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: "0.2s" }}></div>
						<div className="w-4 h-4 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: "0.4s" }}></div>
					</div>
				</div>
			</div>
		</div>
	);
}
