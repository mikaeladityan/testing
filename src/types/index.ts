// Data lokasi
export interface LocationData {
	lat: number;
	lng: number;
	accuracy: number;
	timestamp?: number;
}

// Data kontak
export interface ContactData {
	name: string;
	email: string;
	phone: string;
}
