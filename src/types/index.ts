export interface GeolocationData {
	lat: number;
	lng: number;
	accuracy: number;
	timestamp?: number;
}

export interface ContactData {
	name: string;
	email: string;
	phone: string;
}

export interface UserData {
	location: GeolocationData;
	contacts: ContactData[];
}
