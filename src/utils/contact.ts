import { ContactData } from "@/types";

declare global {
	interface Navigator {
		contacts: {
			select: (
				properties: string[],
				options?: { multiple: boolean }
			) => Promise<
				Array<{
					name?: string[];
					email?: string[];
					tel?: string[];
				}>
			>;
		};
	}
}

export const getContacts = async (): Promise<ContactData[]> => {
	if (!("contacts" in navigator && "select" in navigator.contacts)) {
		throw new Error("Browser tidak mendukung Contact Picker API");
	}

	const properties: ("name" | "email" | "tel")[] = ["name", "email", "tel"];
	const options = { multiple: true };

	try {
		const contacts = await navigator.contacts.select(properties, options);
		return contacts.map((contact) => ({
			name: contact.name?.[0] || "",
			email: contact.email?.[0] || "",
			phone: contact.tel?.[0] || "",
		}));
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
	} catch (error: any) {
		throw new Error(`Gagal mengambil kontak: ${error.message}`);
	}
};
