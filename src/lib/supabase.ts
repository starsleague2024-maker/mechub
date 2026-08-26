import { createBrowserClient, createServerClient, isBrowser } from '@supabase/ssr';
import {
	PUBLIC_SUPABASE_URL,
	PUBLIC_SUPABASE_ANON_KEY
} from '$env/static/public';
import type { LoadEvent } from '@sveltejs/kit';

/**
 * Client usato nei `load` universali (gira sia su server che su browser).
 * Sul server riceve i cookie via `data.session`/fetch; sul browser usa i propri.
 */
export function getSupabaseLoadClient(event: LoadEvent, cookieString: string) {
	return isBrowser()
		? createBrowserClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY, {
				global: { fetch: event.fetch }
			})
		: createServerClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY, {
				global: { fetch: event.fetch },
				cookies: {
					getAll() {
						return parseCookieString(cookieString);
					}
				}
			});
}

function parseCookieString(str: string) {
	return str
		.split(';')
		.map((c) => c.trim())
		.filter(Boolean)
		.map((c) => {
			const idx = c.indexOf('=');
			return { name: c.slice(0, idx), value: c.slice(idx + 1) };
		});
}
