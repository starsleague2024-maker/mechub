<script lang="ts">
	import { enhance } from '$app/forms';
	import Sezione from '$lib/components/Sezione.svelte';
	import OrariSettimana from '$lib/components/OrariSettimana.svelte';
	import Badge from '$lib/components/Badge.svelte';
	import { ALIMENTAZIONE, STATO_CERTIFICAZIONE, statoCertificazione, voce, fmtData } from '$lib/dominio';

	let { data, form } = $props();

	const STATO_LABEL: Record<string, string> = { attivo: 'Attivo', in_prova: 'In prova', cessato: 'Cessato' };
	const LIVELLI = ['—', 'Base', 'Intermedio', 'Avanzato', 'Esperto'];

	function iniziali(nome: string, cognome: string) {
		return `${(nome?.[0] ?? '').toUpperCase()}${(cognome?.[0] ?? '').toUpperCase()}`;
	}

	// ── Orari: converte le righe DB nel formato del componente ──
	function orariIniziali() {
		const out: Record<string, any> = {};
		for (let i = 0; i < 7; i++) {
			const r = data.orari.find((o: any) => o.giorno === i);
			out[String(i)] = r
				? {
						aperto: r.lavorativo,
						entrata: r.entrata ?? '',
						uscita: r.uscita ?? '',
						pausa_inizio: r.pausa_inizio ?? '',
						pausa_fine: r.pausa_fine ?? ''
					}
				: { aperto: false, entrata: '', uscita: '', pausa_inizio: '', pausa_fine: '' };
		}
		return out;
	}
	let orariCorrenti = $state(orariIniziali());
	let formOrari = $state<HTMLFormElement | null>(null);
	let orariJson = $state(JSON.stringify(orariIniziali()));
	function onOrariChange(dati: any) {
		orariCorrenti = dati;
		orariJson = JSON.stringify(dati);
	}

	// ── helper toggle generici (submit form nascosto) ──
	function submitHidden(form: HTMLFormElement | null) {
		queueMicrotask(() => form?.requestSubmit());
	}

	// veicoli
	let formVei = $state<HTMLFormElement | null>(null);
	let veiId = $state('');
	let veiAttivo = $state('true');
	function toggleVei(id: string, attivo: boolean) {
		veiId = id; veiAttivo = String(attivo); submitHidden(formVei);
	}
	function haVei(id: string) { return data.personaCategorie.includes(id); }

	// alimentazioni
	let formAlim = $state<HTMLFormElement | null>(null);
	let alimVal = $state('');
	let alimAttivo = $state('true');
	function toggleAlim(a: string, attivo: boolean) {
		alimVal = a; alimAttivo = String(attivo); submitHidden(formAlim);
	}
	function haAlim(a: string) { return data.personaAlimentazioni.includes(a); }

	// competenze (albero)
	let formComp = $state<HTMLFormElement | null>(null);
	let compId = $state('');
	let compAttivo = $state('true');
	function toggleComp(id: string, attivo: boolean) {
		compId = id; compAttivo = String(attivo); submitHidden(formComp);
	}
	function compPosseduta(id: string) {
		return data.personaCompetenze.find((c: any) => c.competenza_id === id);
	}
	// albero: figli di un nodo
	function figli(padreId: string | null) {
		return data.competenze
			.filter((c: any) => c.competenza_padre_id === padreId)
			.sort((a: any, b: any) => a.ordine - b.ordine);
	}

	// mansioni
	let formMans = $state<HTMLFormElement | null>(null);
	let mansId = $state('');
	let mansAttivo = $state('true');
	function toggleMans(id: string, attivo: boolean) {
		mansId = id; mansAttivo = String(attivo); submitHidden(formMans);
	}
	function haMans(id: string) { return data.personaMansioni.includes(id); }
	function consigliata(nome: string) { return data.mansioniConsigliate.includes(nome); }
	const mansioniDesk = $derived(data.mansioni.filter((m: any) => m.gruppo === 'desk'));
	const mansioniOfficina = $derived(data.mansioni.filter((m: any) => m.gruppo === 'officina'));

	// permessi
	let formPerm = $state<HTMLFormElement | null>(null);
	let permId = $state('');
	let permStato = $state('eredita');
	function setPermesso(id: string, stato: string) {
		permId = id; permStato = stato; submitHidden(formPerm);
	}
	function statoPermesso(id: string): string {
		const ov = data.personaPermessi.find((p: any) => p.permesso_id === id);
		if (ov) return ov.concesso ? 'concesso' : 'revocato';
		return data.ruoloPermessi.includes(id) ? 'da_ruolo' : 'nessuno';
	}
	function haPermessoEffettivo(id: string): boolean {
		const s = statoPermesso(id);
		return s === 'concesso' || s === 'da_ruolo';
	}
</script>

<div class="pagina-head">
	<div>
		<div class="eyebrow">Impostazioni · Staff</div>
		<h1 class="pagina-titolo">{data.persona.nome} {data.persona.cognome}</h1>
	</div>
	<a href="/impostazioni/staff" class="btn btn-ghost">← Tutte le persone</a>
</div>

{#if form?.errore}<div class="avviso errore mb-2">{form.errore}</div>{/if}

<div class="sezioni">
	<!-- ─── Profilo ─── -->
	<Sezione titolo="Profilo" descrizione="Dati, ruolo, foto" aperta={true}>
		<div class="profilo-riga">
			<div class="foto-blocco">
				<div class="foto">
					{#if data.persona.foto_url}
						<img src={data.persona.foto_url} alt="Foto" />
					{:else}
						<span class="iniziali">{iniziali(data.persona.nome, data.persona.cognome)}</span>
					{/if}
				</div>
				<form method="POST" action="?/caricaFoto" use:enhance enctype="multipart/form-data" class="flex-col gap-1">
					<input type="hidden" name="officina_id" value={data.officinaId} />
					<input class="input" type="file" name="file" accept="image/*" required />
					<button class="btn btn-sm" type="submit">Carica foto</button>
				</form>
			</div>
			<form method="POST" action="?/aggiornaProfilo" use:enhance class="flex-col gap-2 profilo-form">
				<div class="griglia g-2">
					<div class="field"><label for="n">Nome</label><input id="n" class="input" name="nome" value={data.persona.nome} /></div>
					<div class="field"><label for="c">Cognome</label><input id="c" class="input" name="cognome" value={data.persona.cognome} /></div>
				</div>
				<div class="griglia g-2">
					<div class="field"><label for="e">Email</label><input id="e" class="input" name="email" value={data.persona.email ?? ''} /></div>
					<div class="field"><label for="t">Telefono</label><input id="t" class="input mono" name="telefono" value={data.persona.telefono ?? ''} /></div>
				</div>
				<div class="griglia g-2">
					<div class="field">
						<label for="r">Ruolo principale</label>
						<select id="r" class="select" name="ruolo_id">
							<option value="">— nessuno —</option>
							{#each data.ruoli as r}
								<option value={r.id} selected={r.id === data.persona.ruolo_id}>{r.nome}</option>
							{/each}
						</select>
					</div>
					<div class="field">
						<label for="s">Stato</label>
						<select id="s" class="select" name="stato">
							{#each Object.entries(STATO_LABEL) as [val, lab]}
								<option value={val} selected={val === data.persona.stato}>{lab}</option>
							{/each}
						</select>
					</div>
				</div>
				<div><button class="btn btn-accent" type="submit">Salva profilo</button></div>
			</form>
		</div>
	</Sezione>

	<!-- ─── Orari ─── -->
	<Sezione titolo="Orari di lavoro" descrizione="Orario personale settimanale">
		<p class="muted small mb-2">Imposta l'orario di questa persona, giorno per giorno. Il tasto ↧ tutti copia l'orario di un giorno su tutti gli altri.</p>
		<OrariSettimana valore={orariCorrenti} onChange={onOrariChange} />
		<form method="POST" action="?/salvaOrari" use:enhance bind:this={formOrari} class="mt-2">
			<input type="hidden" name="orari" value={orariJson} />
			<button class="btn btn-accent" type="submit">Salva orari</button>
		</form>
	</Sezione>

	<!-- ─── Veicoli trattati ─── -->
	<Sezione titolo="Veicoli trattati" descrizione="Categorie su cui lavora" badge={data.personaCategorie.length}>
		{#if data.categorieAttive.length === 0}
			<p class="muted small">L'officina non ha ancora categorie di veicolo attive. Attivale in Impostazioni → Veicoli trattati.</p>
		{:else}
			<p class="muted small mb-2">Solo le categorie che l'officina tratta. Seleziona quelle su cui questa persona può lavorare.</p>
			<div class="toggle-grid">
				{#each data.categorieAttive as c}
					<label class="toggle-chip" class:on={haVei(c.id)}>
						<input type="checkbox" checked={haVei(c.id)} onchange={(e) => toggleVei(c.id, e.currentTarget.checked)} />
						<span>{c.nome}</span>
					</label>
				{/each}
			</div>
		{/if}
	</Sezione>

	<!-- ─── Alimentazioni ─── -->
	<Sezione titolo="Alimentazioni" descrizione="Alimentazioni su cui è competente" badge={data.personaAlimentazioni.length}>
		{#if data.alimentazioniAttive.length === 0}
			<p class="muted small">L'officina non ha ancora alimentazioni attive. Attivale in Impostazioni → Alimentazioni.</p>
		{:else}
			<p class="muted small mb-2">Solo le alimentazioni che l'officina tratta. Seleziona quelle di questa persona.</p>
			<div class="toggle-grid">
				{#each data.alimentazioniAttive as a}
					<label class="toggle-chip" class:on={haAlim(a)}>
						<input type="checkbox" checked={haAlim(a)} onchange={(e) => toggleAlim(a, e.currentTarget.checked)} />
						<span>{ALIMENTAZIONE[a]?.label ?? a}</span>
					</label>
				{/each}
			</div>
		{/if}
	</Sezione>

	<!-- ─── Competenze ─── -->
	<Sezione titolo="Competenze" descrizione="Cosa sa fare tecnicamente" badge={data.personaCompetenze.length}>
		<p class="muted small mb-2">Capacità tecniche dal catalogo dell'officina. Per ognuna puoi indicare il livello.</p>
		{#if data.competenze.length === 0}
			<p class="muted small">Nessuna competenza nel catalogo. Configura l'albero in Impostazioni → Competenze.</p>
		{:else}
			<div class="albero">
				{#each figli(null) as radice}
					<div class="ramo">
						<div class="ramo-tit">{radice.nome}</div>
						{#each figli(radice.id) as nodo}
							{@const poss = compPosseduta(nodo.id)}
							{#if nodo.selezionabile}
								<div class="foglia">
									<label class="foglia-check">
										<input type="checkbox" checked={!!poss} onchange={(e) => toggleComp(nodo.id, e.currentTarget.checked)} />
										<span>{nodo.nome}</span>
									</label>
									{#if poss}
										<form method="POST" action="?/livelloCompetenza" use:enhance class="inline">
											<input type="hidden" name="competenza_id" value={nodo.id} />
											<select class="select select-sm" name="livello" onchange={(e) => e.currentTarget.form?.requestSubmit()}>
												{#each [1, 2, 3, 4] as lv}
													<option value={lv} selected={poss.livello === lv}>{LIVELLI[lv]}</option>
												{/each}
											</select>
										</form>
									{/if}
								</div>
							{:else}
								<div class="sotto-ramo">{nodo.nome}</div>
								{#each figli(nodo.id) as sotto}
									{@const poss2 = compPosseduta(sotto.id)}
									<div class="foglia foglia-annidata">
										<label class="foglia-check">
											<input type="checkbox" checked={!!poss2} onchange={(e) => toggleComp(sotto.id, e.currentTarget.checked)} />
											<span>{sotto.nome}</span>
										</label>
										{#if poss2}
											<form method="POST" action="?/livelloCompetenza" use:enhance class="inline">
												<input type="hidden" name="competenza_id" value={sotto.id} />
												<select class="select select-sm" name="livello" onchange={(e) => e.currentTarget.form?.requestSubmit()}>
													{#each [1, 2, 3, 4] as lv}
														<option value={lv} selected={poss2.livello === lv}>{LIVELLI[lv]}</option>
													{/each}
												</select>
											</form>
										{/if}
									</div>
								{/each}
							{/if}
						{/each}
					</div>
				{/each}
			</div>
		{/if}
	</Sezione>

	<!-- ─── Mansioni ─── -->
	<Sezione titolo="Mansioni / Operatività" descrizione="Attività che svolge" badge={data.personaMansioni.length}>
		<div class="avviso info mb-2">
			Le mansioni evidenziate con ★ sono <strong>consigliate</strong> dal sistema per il ruolo selezionato, per organizzare al meglio il lavoro.
			Sono solo suggerimenti: puoi selezionarle o deselezionarle liberamente in base a come è organizzata la tua officina.
			Ogni persona può svolgere qualsiasi mansione, a prescindere dal ruolo.
		</div>
		<div class="mans-gruppo">
			<div class="mans-tit">Operatività ufficio / gestione</div>
			<div class="toggle-grid">
				{#each mansioniDesk as m}
					<label class="toggle-chip" class:on={haMans(m.id)} class:consigliata={consigliata(m.nome)}>
						<input type="checkbox" checked={haMans(m.id)} onchange={(e) => toggleMans(m.id, e.currentTarget.checked)} />
						<span>{#if consigliata(m.nome)}★ {/if}{m.nome}</span>
					</label>
				{/each}
			</div>
		</div>
		<div class="mans-gruppo mt-2">
			<div class="mans-tit">Operatività officina</div>
			<div class="toggle-grid">
				{#each mansioniOfficina as m}
					<label class="toggle-chip" class:on={haMans(m.id)} class:consigliata={consigliata(m.nome)}>
						<input type="checkbox" checked={haMans(m.id)} onchange={(e) => toggleMans(m.id, e.currentTarget.checked)} />
						<span>{#if consigliata(m.nome)}★ {/if}{m.nome}</span>
					</label>
				{/each}
			</div>
		</div>
	</Sezione>

	<!-- ─── Certificazioni ─── -->
	<Sezione titolo="Certificazioni" descrizione="Abilitazioni e qualifiche" badge={data.certificazioni.length}>
		<p class="muted small mb-2">Le certificazioni si gestiscono in dettaglio nell'elenco unico (Impostazioni → Certificazioni). Qui vedi quelle di questa persona.</p>
		{#if data.certificazioni.length === 0}
			<p class="muted small">Nessuna certificazione registrata.</p>
		{:else}
			<div class="cert-lista">
				{#each data.certificazioni as c}
					{@const st = voce(STATO_CERTIFICAZIONE, statoCertificazione(c.data_scadenza, c.stato_manuale))}
					<div class="cert-riga">
						{#if c.tipo === 'PES/PAV/PEI'}<Badge label="PES/PAV/PEI" colore="cantiere" />{/if}
						<span class="cert-nome">{c.nome}</span>
						{#if c.data_scadenza}<span class="mono small muted">scad. {fmtData(c.data_scadenza)}</span>{/if}
						<Badge label={st.label} colore={st.colore} />
					</div>
				{/each}
			</div>
		{/if}
	</Sezione>

	<!-- ─── Permessi ─── -->
	<Sezione titolo="Permessi" descrizione="Cosa può fare nel gestionale" badge={data.permessi.filter((p:any)=>haPermessoEffettivo(p.id)).length}>
		<div class="avviso info mb-2">
			I permessi base arrivano dal <strong>ruolo</strong>. Puoi fare eccezioni per questa persona:
			concedere un permesso in più, o revocarne uno che il ruolo darebbe.
		</div>
		<div class="perm-lista">
			{#each data.permessi as p}
				{@const stato = statoPermesso(p.id)}
				<div class="perm-riga">
					<div class="perm-info">
						<span class="perm-nome">{p.descrizione ?? p.codice}</span>
						{#if stato === 'da_ruolo'}<span class="perm-tag ereditato">dal ruolo</span>
						{:else if stato === 'concesso'}<span class="perm-tag concesso">concesso</span>
						{:else if stato === 'revocato'}<span class="perm-tag revocato">revocato</span>{/if}
					</div>
					<div class="perm-azioni">
						<button class="mini" class:sel={stato === 'concesso'} onclick={() => setPermesso(p.id, 'concesso')}>Sì</button>
						<button class="mini" class:sel={stato === 'revocato'} onclick={() => setPermesso(p.id, 'revocato')}>No</button>
						<button class="mini" class:sel={stato === 'da_ruolo' || stato === 'nessuno'} onclick={() => setPermesso(p.id, 'eredita')}>Ruolo</button>
					</div>
				</div>
			{/each}
		</div>
	</Sezione>
</div>

<!-- form nascosti per i toggle -->
<form method="POST" action="?/toggleVeicolo" use:enhance bind:this={formVei} class="hidden-form">
	<input type="hidden" name="categoria_id" value={veiId} />
	<input type="hidden" name="attivo" value={veiAttivo} />
</form>
<form method="POST" action="?/toggleAlimentazione" use:enhance bind:this={formAlim} class="hidden-form">
	<input type="hidden" name="alimentazione" value={alimVal} />
	<input type="hidden" name="attivo" value={alimAttivo} />
</form>
<form method="POST" action="?/toggleCompetenza" use:enhance bind:this={formComp} class="hidden-form">
	<input type="hidden" name="competenza_id" value={compId} />
	<input type="hidden" name="attivo" value={compAttivo} />
</form>
<form method="POST" action="?/toggleMansione" use:enhance bind:this={formMans} class="hidden-form">
	<input type="hidden" name="mansione_id" value={mansId} />
	<input type="hidden" name="attivo" value={mansAttivo} />
</form>
<form method="POST" action="?/overridePermesso" use:enhance bind:this={formPerm} class="hidden-form">
	<input type="hidden" name="permesso_id" value={permId} />
	<input type="hidden" name="stato" value={permStato} />
</form>

<style>
	.pagina-head {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		gap: 12px;
		margin-bottom: 8px;
		flex-wrap: wrap;
	}
	.sezioni {
		display: flex;
		flex-direction: column;
		gap: 12px;
		width: 100%;
	}
	.hidden-form {
		display: none;
	}
	/* Profilo */
	.profilo-riga {
		display: flex;
		gap: 20px;
		flex-wrap: wrap;
	}
	.foto-blocco {
		display: flex;
		flex-direction: column;
		gap: 8px;
		align-items: center;
	}
	.foto {
		width: 110px;
		height: 110px;
		border-radius: 50%;
		overflow: hidden;
		display: flex;
		align-items: center;
		justify-content: center;
		background: var(--grafite-900, #2a2d33);
		color: #fff;
		font-weight: 700;
		font-size: 34px;
		font-family: var(--display);
	}
	.foto img { width: 100%; height: 100%; object-fit: cover; }
	.profilo-form { flex: 1; min-width: 280px; }
	/* Toggle chips */
	.toggle-grid {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
	}
	.toggle-chip {
		display: inline-flex;
		align-items: center;
		gap: 7px;
		padding: 7px 13px;
		border: 1px solid var(--bordo, #e2e5ea);
		border-radius: 999px;
		cursor: pointer;
		font-size: 14px;
		background: var(--carta, #fff);
		transition: all 0.12s;
	}
	.toggle-chip.on {
		background: var(--grafite-900, #2a2d33);
		color: #fff;
		border-color: var(--grafite-900, #2a2d33);
	}
	.toggle-chip.consigliata:not(.on) {
		border-color: var(--cantiere, #f5b301);
		background: var(--cantiere-tenue, #fdf3d7);
	}
	.toggle-chip input { display: none; }
	.mans-tit {
		font-size: 12px;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.03em;
		color: var(--testo-tenue, #7a828e);
		margin-bottom: 6px;
	}
	/* Albero competenze */
	.albero { display: flex; flex-direction: column; gap: 12px; }
	.ramo-tit {
		font-family: var(--display);
		font-weight: 600;
		font-size: 14px;
		margin-bottom: 4px;
	}
	.sotto-ramo {
		font-size: 12px;
		font-weight: 600;
		color: var(--testo-tenue, #7a828e);
		margin: 4px 0 2px 12px;
	}
	.foglia {
		display: flex;
		align-items: center;
		gap: 10px;
		padding: 4px 0 4px 12px;
	}
	.foglia-annidata { padding-left: 24px; }
	.foglia-check {
		display: flex;
		align-items: center;
		gap: 7px;
		cursor: pointer;
		font-size: 14px;
	}
	.select-sm { padding: 3px 6px; font-size: 12px; }
	/* Certificazioni */
	.cert-lista { display: flex; flex-direction: column; gap: 6px; }
	.cert-riga {
		display: flex;
		align-items: center;
		gap: 10px;
		padding: 7px 10px;
		background: var(--nebbia-50, #f6f7f9);
		border-radius: var(--r, 8px);
	}
	.cert-nome { font-weight: 500; }
	/* Permessi */
	.perm-lista { display: flex; flex-direction: column; gap: 4px; }
	.perm-riga {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 12px;
		padding: 8px 12px;
		background: var(--nebbia-50, #f6f7f9);
		border-radius: var(--r, 8px);
		flex-wrap: wrap;
	}
	.perm-info { display: flex; align-items: center; gap: 8px; }
	.perm-nome { font-size: 14px; }
	.perm-tag {
		font-size: 10px;
		font-weight: 600;
		text-transform: uppercase;
		padding: 1px 7px;
		border-radius: 999px;
	}
	.perm-tag.ereditato { background: #eef; color: #556; }
	.perm-tag.concesso { background: #e6f5ec; color: #1a7f4b; }
	.perm-tag.revocato { background: #fdecea; color: #c0392b; }
	.perm-azioni { display: flex; gap: 4px; }
	.mini {
		border: 1px solid var(--bordo, #e2e5ea);
		background: var(--carta, #fff);
		border-radius: 6px;
		padding: 4px 12px;
		font-size: 12px;
		cursor: pointer;
	}
	.mini.sel {
		background: var(--grafite-900, #2a2d33);
		color: #fff;
		border-color: var(--grafite-900, #2a2d33);
	}
</style>
