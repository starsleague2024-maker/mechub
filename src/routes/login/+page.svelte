<script lang="ts">
	import { goto } from '$app/navigation';

	let { data } = $props();
	let { supabase } = $derived(data);

	let modalita = $state<'accedi' | 'registra'>('accedi');
	let email = $state('');
	let password = $state('');
	let errore = $state('');
	let messaggio = $state('');
	let inCorso = $state(false);

	async function invia(e: Event) {
		e.preventDefault();
		errore = '';
		messaggio = '';
		inCorso = true;
		try {
			if (modalita === 'accedi') {
				const { error } = await supabase.auth.signInWithPassword({ email, password });
				if (error) throw error;
				goto('/');
			} else {
				const { error } = await supabase.auth.signUp({ email, password });
				if (error) throw error;
				messaggio =
					'Registrazione avviata. Se la conferma email è attiva su Supabase, controlla la posta prima di accedere.';
			}
		} catch (err: any) {
			errore = traduci(err?.message ?? 'Errore imprevisto');
		} finally {
			inCorso = false;
		}
	}

	function traduci(m: string): string {
		if (m.includes('Invalid login')) return 'Email o password non corretti.';
		if (m.includes('already registered')) return 'Questa email è già registrata.';
		if (m.includes('Password should')) return 'La password deve avere almeno 6 caratteri.';
		return m;
	}
</script>

<svelte:head><title>Accedi · Gestionale Officina</title></svelte:head>

<div class="login">
	<div class="login-lato">
		<div class="marchio">
			<span class="marchio-icona">⬢</span>
			<span class="marchio-nome">OFFICINA</span>
		</div>
		<h1>Il banco di lavoro,<br />digitale.</h1>
		<p>
			Planner come motore di capacità produttiva, non calendario. Ogni fatto
			operativo è un evento tracciato, ogni automatismo è una regola spiegabile.
		</p>
		<ul class="punti">
			<li><span>▤</span> Assegnazione manuale dei lavori alle postazioni</li>
			<li><span>▣</span> Interventi, lavorazioni e prerequisiti in un colpo d'occhio</li>
			<li><span>⬡</span> Ricambi, magazzino e ordini fornitori collegati</li>
		</ul>
	</div>

	<div class="login-form-lato">
		<div class="login-card panel panel-pad">
			<div class="eyebrow">{modalita === 'accedi' ? 'Accesso' : 'Nuovo account'}</div>
			<h2 class="mt-1">{modalita === 'accedi' ? 'Entra in officina' : 'Crea un account'}</h2>

			<form onsubmit={invia} class="mt-3 flex-col gap-2">
				<div class="field">
					<label for="email">Email</label>
					<input
						id="email"
						class="input"
						type="email"
						bind:value={email}
						required
						autocomplete="email"
						placeholder="nome@officina.it"
					/>
				</div>
				<div class="field">
					<label for="pw">Password</label>
					<input
						id="pw"
						class="input"
						type="password"
						bind:value={password}
						required
						autocomplete={modalita === 'accedi' ? 'current-password' : 'new-password'}
						placeholder="••••••••"
					/>
				</div>

				{#if errore}<div class="avviso errore">{errore}</div>{/if}
				{#if messaggio}<div class="avviso ok">{messaggio}</div>{/if}

				<button class="btn btn-accent mt-1" type="submit" disabled={inCorso}>
					{inCorso ? 'Attendere…' : modalita === 'accedi' ? 'Accedi' : 'Registrati'}
				</button>
			</form>

			<div class="cambia mt-2 small muted">
				{#if modalita === 'accedi'}
					Non hai un account?
					<button class="link" onclick={() => (modalita = 'registra')}>Registrati</button>
				{:else}
					Hai già un account?
					<button class="link" onclick={() => (modalita = 'accedi')}>Accedi</button>
				{/if}
			</div>
		</div>
	</div>
</div>

<style>
	.login {
		min-height: 100vh;
		display: grid;
		grid-template-columns: 1.1fr 1fr;
	}
	.login-lato {
		background: var(--grafite-900);
		color: var(--acciaio-200);
		padding: 56px 52px;
		display: flex;
		flex-direction: column;
		justify-content: center;
	}
	.marchio {
		display: flex;
		align-items: center;
		gap: 12px;
		margin-bottom: 48px;
	}
	.marchio-icona {
		font-size: 26px;
		color: var(--cantiere);
	}
	.marchio-nome {
		font-family: var(--display);
		font-weight: 700;
		letter-spacing: 0.16em;
		color: #fff;
		font-size: 18px;
	}
	.login-lato h1 {
		font-size: 46px;
		line-height: 1.05;
		color: #fff;
		margin-bottom: 18px;
	}
	.login-lato p {
		max-width: 42ch;
		color: var(--acciaio-300);
		font-size: 15px;
		line-height: 1.6;
	}
	.punti {
		list-style: none;
		padding: 0;
		margin: 36px 0 0;
		display: flex;
		flex-direction: column;
		gap: 14px;
	}
	.punti li {
		display: flex;
		align-items: center;
		gap: 12px;
		font-size: 14px;
		color: var(--acciaio-200);
	}
	.punti span {
		color: var(--cantiere);
		width: 20px;
		text-align: center;
	}

	.login-form-lato {
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 40px;
		background: var(--sfondo);
	}
	.login-card {
		width: 100%;
		max-width: 380px;
	}
	.login-card h2 {
		font-size: 24px;
	}
	.cambia {
		text-align: center;
	}
	.link {
		background: none;
		border: none;
		padding: 0;
		color: var(--blu);
		font-weight: 600;
		cursor: pointer;
		text-decoration: underline;
	}

	@media (max-width: 800px) {
		.login {
			grid-template-columns: 1fr;
		}
		.login-lato {
			padding: 40px 28px;
		}
		.login-lato h1 {
			font-size: 34px;
		}
		.punti {
			display: none;
		}
	}
</style>
