import { GeolocationData } from "@/types";

export const getLocation = async (): Promise<GeolocationData> => {
	return new Promise((resolve, reject) => {
		if (!navigator.geolocation) {
			reject(new Error("Browser tidak mendukung geolokasi"));
			return;
		}

		navigator.geolocation.getCurrentPosition(
			(position) => {
				resolve({
					latitude: position.coords.latitude,
					longitude: position.coords.longitude,
					accuracy: position.coords.accuracy,
					timestamp: position.timestamp,
				});
			},
			(error) => {
				reject(error);
			},
			{ enableHighAccuracy: true, timeout: 10000 }
		);
	});
};
