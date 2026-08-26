import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals, cookies }) => {
	const { session } = await locals.safeGetSession();

	// Officina corrente dell'utente. Con le RLS attive, questa query
	// restituisce già solo l'officina a cui l'utente è associato
	// (via membri_officina), quindi basta prendere la prima riga.
	let officina = null;
	if (session) {
		const { data } = await locals.supabase
			.from('officine')
			.select('id, nome')
			.limit(1)
			.maybeSingle();
		officina = data;
	}

	return {
		session,
		cookies: cookies.getAll(),
		officina
	};
};
