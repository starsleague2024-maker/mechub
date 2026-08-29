<script lang="ts">
	import '../app.css';
	import { page } from '$app/stores';
	import { goto, invalidate } from '$app/navigation';
	import { onMount } from 'svelte';

	let { data, children } = $props();
	let { supabase, session } = $derived(data);

	let menuMobileAperto = $state(false);

	onMount(() => {
		const { data: sub } = supabase.auth.onAuthStateChange((_, newSession) => {
			if (newSession?.expires_at !== session?.expires_at) {
				invalidate('supabase:auth');
			}
		});
		return () => sub.subscription.unsubscribe();
	});

	async function esci() {
		await supabase.auth.signOut();
		goto('/login');
	}

	const nav = [
		{ gruppo: 'Operativo', voci: [
			{ href: '/', label: 'Cruscotto', icona: '▦' },
			{ href: '/planner', label: 'Planner', icona: '▤' },
			{ href: '/interventi', label: 'Interventi', icona: '▣' },
			{ href: '/appuntamenti', label: 'Appuntamenti', icona: '◷' }
		]},
		{ gruppo: 'Anagrafiche', voci: [
			{ href: '/clienti', label: 'Clienti', icona: '◔' },
			{ href: '/veicoli', label: 'Veicoli', icona: '⬒' },
			{ href: '/organico', label: 'Organico', icona: '◑' },
			{ href: '/postazioni', label: 'Postazioni', icona: '▨' },
			{ href: '/catalogo', label: 'Catalogo lavorazioni', icona: '☰' }
		]},
		{ gruppo: 'Preventivi e ricambi', voci: [
			{ href: '/preventivi', label: 'Preventivi', icona: '€' },
			{ href: '/ricambi', label: 'Catalogo ricambi', icona: '⬡' },
			{ href: '/magazzino', label: 'Magazzino', icona: '▦' },
			{ href: '/ordini', label: 'Ordini fornitori', icona: '↧' }
		]},
		{ gruppo: 'Sistema', voci: [
			{ href: '/eventi', label: 'Registro eventi', icona: '≣' },
			{ href: '/impostazioni', label: 'Impostazioni', icona: '⚙' }
		]}
	];

	function attivo(href: string): boolean {
		if (href === '/') return $page.url.pathname === '/';
		return $page.url.pathname.startsWith(href);
	}
</script>

{#if session}
	<div class="shell">
		<aside class="sidebar" class:aperto={menuMobileAperto}>
			<div class="marchio">
				{#if data.officina?.logo_url}
					<img class="marchio-logo" src={data.officina.logo_url} alt={data.officina?.nome ?? 'Logo officina'} />
				{:else}
					<span class="marchio-icona">⬢</span>
					<div>
						<div class="marchio-nome">MecHub</div>
						<div class="marchio-sub">{data.officina?.nome ?? 'Gestionale'}</div>
					</div>
				{/if}
			</div>

			<nav>
				{#each nav as sezione}
					<div class="nav-gruppo">
						<div class="eyebrow nav-gruppo-tit">{sezione.gruppo}</div>
						{#each sezione.voci as v}
							<a
								href={v.href}
								class="nav-voce"
								class:attivo={attivo(v.href)}
								onclick={() => (menuMobileAperto = false)}
							>
								<span class="nav-icona">{v.icona}</span>
								{v.label}
							</a>
						{/each}
					</div>
				{/each}
			</nav>

			<div class="sidebar-piede">
				<div class="utente-mail mono">{data.user?.email}</div>
				<button class="btn btn-ghost btn-sm" onclick={esci}>Esci</button>
			</div>
		</aside>

		{#if menuMobileAperto}
			<div
				class="scrim"
				role="button"
				tabindex="-1"
				onclick={() => (menuMobileAperto = false)}
				onkeydown={() => {}}
			></div>
		{/if}

		<div class="contenuto-wrap">
			<header class="topbar">
				<button
					class="btn btn-ghost hamburger"
					onclick={() => (menuMobileAperto = !menuMobileAperto)}
					aria-label="Menu"
				>
					☰
				</button>
				<span class="mono small muted">Fase 2 · Planner manuale</span>
			</header>
			<main class="contenuto">
				{@render children()}
			</main>
		</div>
	</div>
{:else}
	{@render children()}
{/if}

<style>
	.shell {
		display: flex;
		min-height: 100vh;
	}
	.sidebar {
		width: var(--sidebar-w);
		flex-shrink: 0;
		background: var(--grafite-900);
		color: var(--acciaio-200);
		display: flex;
		flex-direction: column;
		position: sticky;
		top: 0;
		height: 100vh;
		overflow-y: auto;
	}
	.marchio {
		display: flex;
		align-items: center;
		gap: 11px;
		padding: 18px 18px 16px;
		border-bottom: 1px solid var(--grafite-600);
	}
	.marchio-icona {
		font-size: 22px;
		color: var(--cantiere);
	}
	.marchio-logo {
		max-width: 100%;
		max-height: 48px;
		object-fit: contain;
		display: block;
	}
	.marchio-nome {
		font-family: var(--display);
		font-weight: 700;
		letter-spacing: 0.14em;
		font-size: 15px;
		color: #fff;
	}
	.marchio-sub {
		font-size: 11.5px;
		color: var(--acciaio-400);
		margin-top: 1px;
	}
	nav {
		flex: 1;
		padding: 14px 10px;
	}
	.nav-gruppo {
		margin-bottom: 18px;
	}
	.nav-gruppo-tit {
		padding: 0 8px 6px;
		color: var(--acciaio-400);
	}
	.nav-voce {
		display: flex;
		align-items: center;
		gap: 10px;
		padding: 8px 10px;
		border-radius: var(--r);
		font-size: 13.5px;
		font-weight: 500;
		color: var(--acciaio-200);
		transition: background 0.12s, color 0.12s;
	}
	.nav-voce:hover {
		background: var(--grafite-700);
		color: #fff;
	}
	.nav-voce.attivo {
		background: var(--grafite-600);
		color: #fff;
	}
	.nav-voce.attivo .nav-icona {
		color: var(--cantiere);
	}
	.nav-icona {
		width: 18px;
		text-align: center;
		font-size: 14px;
		color: var(--acciaio-400);
	}
	.sidebar-piede {
		padding: 12px 14px;
		border-top: 1px solid var(--grafite-600);
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 8px;
	}
	.utente-mail {
		font-size: 11px;
		color: var(--acciaio-400);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.sidebar-piede .btn {
		color: var(--acciaio-200);
	}
	.sidebar-piede .btn:hover {
		background: var(--grafite-700);
	}

	.contenuto-wrap {
		flex: 1;
		min-width: 0;
		display: flex;
		flex-direction: column;
	}
	.topbar {
		display: flex;
		align-items: center;
		gap: 12px;
		padding: 10px 22px;
		border-bottom: 1px solid var(--bordo);
		background: var(--carta);
		position: sticky;
		top: 0;
		z-index: 20;
	}
	.hamburger {
		display: none;
		font-size: 18px;
	}
	.contenuto {
		padding: 26px;
		max-width: 1360px;
		width: 100%;
	}
	.scrim {
		display: none;
	}

	@media (max-width: 860px) {
		.sidebar {
			position: fixed;
			left: 0;
			top: 0;
			z-index: 60;
			transform: translateX(-100%);
			transition: transform 0.2s ease;
			box-shadow: var(--ombra-lg);
		}
		.sidebar.aperto {
			transform: translateX(0);
		}
		.hamburger {
			display: inline-flex;
		}
		.scrim {
			display: block;
			position: fixed;
			inset: 0;
			background: rgba(0, 0, 0, 0.4);
			z-index: 55;
		}
		.contenuto {
			padding: 18px;
		}
	}
</style>
