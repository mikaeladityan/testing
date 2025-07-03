export interface GeolocationData {
	latitude: number;
	longitude: number;
	accuracy: number;
	timestamp: number;
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
