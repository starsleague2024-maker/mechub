import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals, cookies }) => {
	const { session } = await locals.safeGetSession();

	// Officina corrente dell'utente. Con le RLS attive, questa query
	// restituisce già solo l'officina a cui l'utente è associato
	// (via membri_officina), quindi basta prendere la prima riga.
	let officina: {
		id: string;
		nome: string;
		logo_path: string | null;
		logo_url?: string | null;
	} | null = null;
	if (session) {
		const { data } = await locals.supabase
			.from('officine')
			.select('id, nome, logo_path')
			.limit(1)
			.maybeSingle();
		officina = data as {
			id: string;
			nome: string;
			logo_path: string | null;
			logo_url?: string | null;
		} | null;
		// signed URL del logo (bucket privato) per la navbar
		if (officina?.logo_path) {
			const { data: signed } = await locals.supabase.storage
				.from('logo-officina')
				.createSignedUrl(officina.logo_path, 3600);
			officina.logo_url = signed?.signedUrl ?? null;
		}
	}

	return {
		session,
		cookies: cookies.getAll(),
		officina
	};
};
