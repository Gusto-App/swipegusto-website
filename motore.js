/* IL MOTORE DI UN SITO IMMERSIVO: lo scorrimento morbido, le scene legate allo scorrimento, e i ripieghi.
   Regola madre: la pagina è già tutta lì, ferma e leggibile. Il motore aggiunge il movimento; se non parte, non manca niente.
   Si carica con «defer» dopo gsap, ScrollTrigger, SplitText e lenis, in quest'ordine. Poi la regia della pagina usa `sito.…`.

   sito.scena(sezione, regia, { schermate, insegue })   la sezione resta ferma e la tua linea del tempo va avanti col dito
   sito.passi(linea, passi, { segno, filo })            dentro una scena: i passi si danno il cambio, con le pause per leggere
   sito.entra(pezzi, { da, ogni })                      i pezzi entrano una volta, quando arrivano in vista
   sito.righe(titoli)                                   un titolo entra riga per riga
   sito.diLato(sezione)                                 una fila che scorre di lato mentre scorri in giù
   sito.conta(numeri)                                   un numero sale fino al valore scritto in data-fino
   sito.sequenza(tela, { cartella, piccola, inPiedi })  un video (fatto a immagini) che avanza con lo scorrimento; «inPiedi»
                                                       è la cartella di un video verticale per gli schermi in piedi
   sito.su("computer" | "piccolo", () => { … })         mosse solo per chi ha il mouse e lo schermo largo, o solo per gli altri
   sito.regola("nome", valore)                          un numero della regia che si può provare a più valori (foto.mjs prove)
   sito.acceso / sito.fermo / sito.tocco / sito.leggero come sta chi guarda
   sito.linee.<id della sezione>                        la linea del tempo di una scena, per aggiungerci il 3D
   Da soli, senza chiamarli: le atmosfere (data-aria sulle sezioni: il fondo della pagina cambia colore mentre scorri) e la prima
   vista (data-apre).

   Le sezioni ferme usano «position: sticky» (lo fa il browser, senza scatti anche sul telefono), non il «pin» di ScrollTrigger:
   l'altezza sta nel CSS, quindi le posizioni sono sempre giuste e non c'è un ordine di creazione da rispettare. */
(() => {
  const html = document.documentElement;
  const fermo = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const tocco = matchMedia("(pointer: coarse)").matches;
  const leggero = tocco || (navigator.hardwareConcurrency || 8) <= 4 || (navigator.deviceMemory || 8) <= 4;
  const sito = (window.sito = { acceso: false, fermo, tocco, leggero, lenis: null, linee: {} });
  // Le regolazioni: un valore della regia scritto così si può provare a più valori senza toccare il codice
  // (node foto.mjs prove sito --regola "vetro=0.2,0.35,0.5" --a 1800). In casa lo legge dall'indirizzo; online vale sempre quello scritto.
  sito.regola = (nome, base) => { const v = html.getAttribute("data-" + nome); if (v === null || v === "") return base; return typeof base === "number" ? (Number.isFinite(Number(v)) ? Number(v) : base) : v; };
  const niente = () => null;
  const MOSSE = ["su", "scena", "passi", "entra", "righe", "diLato", "conta", "sequenza"];

  // Senza movimento (lo chiede la persona, o le librerie non sono arrivate): tutto resta fermo, e si vede tutto.
  if (fermo || !window.gsap || !window.ScrollTrigger) {
    html.classList.remove("vivo");
    html.classList.add("fermo", "pronto");
    for (const nome of MOSSE) sito[nome] = niente;
    return;
  }

  sito.acceso = true;
  gsap.registerPlugin(ScrollTrigger);
  if (window.SplitText) gsap.registerPlugin(SplitText);
  ScrollTrigger.config({ ignoreMobileResize: true });      // la barra del telefono che entra ed esce non fa saltare le scene
  gsap.defaults({ ease: "power3.out", duration: 0.8 });    // una famiglia di curve sola: le entrate rallentano

  // Scorrimento morbido solo col mouse o il trackpad. Col dito, lo scorrimento del telefono è già quello giusto: non si tocca.
  // Un ciclo solo per tutto: il battito di GSAP comanda Lenis, le scene e (in tre.js) il 3D.
  if (!tocco && window.Lenis) {
    const lenis = (window.lenis = sito.lenis = new Lenis({ lerp: 0.1, anchors: true }));
    lenis.on("scroll", ScrollTrigger.update);
    gsap.ticker.add((t) => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
  }

  const uno = (s) => (typeof s === "string" ? document.querySelector(s) : s);
  const tutti = (s) => gsap.utils.toArray(s);
  let rinfresco = 0;
  const rinfresca = () => { cancelAnimationFrame(rinfresco); rinfresco = requestAnimationFrame(() => ScrollTrigger.refresh()); };

  // Mosse solo per un tipo di schermo. Se la finestra cambia, GSAP le toglie da solo e rimette la pagina com'era.
  const mm = gsap.matchMedia();
  const DOVE = { computer: "(min-width: 60rem) and (pointer: fine)", piccolo: "(max-width: 59.99rem), (pointer: coarse)" };
  let pulizie = null;
  const allaFine = (f) => { if (pulizie) pulizie.push(f); };
  sito.su = (dove, mosse) => mm.add(DOVE[dove] || dove, () => {
    const mie = (pulizie = []);
    mosse();
    pulizie = null;
    return () => { for (const f of mie) f(); rinfresca(); };
  });

  /** UNA SCENA. La sezione diventa alta «schermate + 1» schermi e la sua .cornice resta ferma mentre scorri. La regia riceve
   *  una linea del tempo lunga «schermate» (un'unità = uno schermo di scorrimento) e ci mette quello che cambia.
   *  «insegue» è il ritardo morbido, in secondi: da 0,4 a 1. La linea resta in sito.linee[id della sezione]. */
  sito.scena = (sezione, regia, { schermate = 2, insegue = 0.6 } = {}) => {
    const el = uno(sezione);
    if (!el) return null;
    el.style.setProperty("--schermate", schermate);
    el.classList.add("in-scena");
    const linea = gsap.timeline({ defaults: { ease: "none", duration: 1 },
      scrollTrigger: { trigger: el, start: "top top", end: "bottom bottom", scrub: insegue, invalidateOnRefresh: true } });
    linea.set({}, {}, schermate);                          // la linea dura quanto la scena: i tempi si scrivono in schermi
    if (regia) regia(linea, el, schermate);
    if (el.id) sito.linee[el.id] = linea;
    allaFine(() => { el.classList.remove("in-scena"); el.style.removeProperty("--schermate"); if (el.id) delete sito.linee[el.id]; });
    rinfresca();
    return linea;
  };

  /** I PASSI di una scena si danno il cambio: ognuno ha la sua parte uguale di linea, esce prima che entri il prossimo, e in mezzo
   *  resta fermo (si legge da fermi). «segno» è l'elemento col numero del passo, «filo» una riga che cresce: dicono quanto manca.
   *  Con «finestre» dici tu quando sta in scena ogni passo ([[0, 0.4], [1, 1.85], …], in schermi): così fra un passo e l'altro
   *  può restare un tratto senza testo, dove parla solo la scena. */
  sito.passi = (linea, passi, { da = 0, a = linea.duration(), segno = null, filo = null, sfuma = 0.16, sale = 16, finestre = null } = {}) => {
    passi = tutti(passi);
    const n = passi.length, parte = (a - da) / n;
    const quando = finestre || passi.map((_, i) => [da + i * parte, da + (i + 1) * parte]);
    passi.forEach((p, i) => {
      const [entra, esce] = quando[i], s = Math.min(parte, esce - entra) * sfuma;
      // Solo l'opacità, non la visibilità: un passo che non è in scena resta nella pagina per chi legge con uno screen reader
      // (con «visibility: hidden» sparirebbe dall'albero dell'accessibilità e i passi 2-4 non li troverebbe nessuno).
      if (i > 0 || entra > da) linea.fromTo(p, { opacity: 0, y: sale }, { opacity: 1, y: 0, duration: s, ease: "power2.out" }, entra);
      if (i < n - 1) linea.to(p, { opacity: 0, y: -sale, duration: s, ease: "power2.in" }, esce - s);
    });
    const stato = { v: 0 };
    // data-fuori sul passo trasparente: il CSS gli toglie il dito (un tasto invisibile non si deve poter toccare).
    const segna = () => { for (const p of passi) { if (Number(gsap.getProperty(p, "opacity")) < 0.5) p.setAttribute("data-fuori", ""); else p.removeAttribute("data-fuori"); } };
    linea.to(stato, { v: 1, duration: a - da, onUpdate: () => {
      segna();
      const ora = da + stato.v * (a - da);
      let i = 0;
      for (let k = 0; k < n; k++) if (ora >= quando[k][0] - 0.001) i = k;
      if (segno && segno.textContent !== String(i + 1)) segno.textContent = i + 1;
      if (filo) filo.style.transform = `scaleX(${stato.v.toFixed(4)})`;
    } }, da);
    return parte;
  };

  /** I pezzi entrano quando arrivano in vista, una volta sola, poco distanziati. Chi arriva a metà pagina li trova già entrati. */
  sito.entra = (pezzi, { da = { y: 26, autoAlpha: 0 }, ogni = 0.07, quando = "top 88%" } = {}) => {
    pezzi = tutti(pezzi);
    if (!pezzi.length) return;
    gsap.set(pezzi, da);
    ScrollTrigger.batch(pezzi, { start: quando, once: true,
      onEnter: (gruppo) => gsap.to(gruppo, { x: 0, y: 0, scale: 1, autoAlpha: 1, stagger: ogni, overwrite: true }) });
  };

  /** Un titolo entra riga per riga, da sotto la sua riga. Finita l'entrata il testo torna intero, com'era. */
  const perRighe = (el, vars) => SplitText.create(el, { type: "lines", mask: "lines", linesClass: "riga", autoSplit: true, aria: "auto",
    onSplit: (s) => gsap.from(s.lines, { yPercent: 110, duration: 1, ease: "power4.out", stagger: 0.09, ...vars, onComplete: () => s.revert() }) });
  sito.righe = (titoli, { quando = "top 86%" } = {}) => {
    if (!window.SplitText) return sito.entra(titoli);
    for (const el of tutti(titoli)) perRighe(el, { scrollTrigger: { trigger: el, start: quando, once: true } });
  };

  /** Una fila che scorre di lato mentre scorri in giù. Di base la fila si scorre col dito (CSS): questa mossa è per il computer,
   *  quindi si chiama dentro sito.su("computer", …). Con la tastiera la pagina segue la scheda che prende il fuoco. */
  sito.diLato = (sezione, { insegue = 0.5 } = {}) => {
    const el = uno(sezione), pista = el && el.querySelector("[data-pista]");
    if (!pista) return null;
    el.classList.add("in-fila");
    const corsa = () => Math.max(0, Math.ceil(pista.scrollWidth - el.clientWidth));
    const misura = () => el.style.setProperty("--corsa", corsa() + "px");
    misura();
    ScrollTrigger.addEventListener("refreshInit", misura);
    const mossa = gsap.to(pista, { x: () => -corsa(), ease: "none",
      scrollTrigger: { trigger: el, start: "top top", end: "bottom bottom", scrub: insegue, invalidateOnRefresh: true } });
    const fuoco = (e) => {
      if (!e.target.matches(":focus-visible")) return;
      const quanto = gsap.utils.clamp(0, 1, (e.target.offsetLeft - el.clientWidth * 0.2) / Math.max(1, corsa()));
      const y = el.getBoundingClientRect().top + scrollY + quanto * corsa();
      if (sito.lenis) sito.lenis.scrollTo(y); else scrollTo({ top: y });
    };
    pista.addEventListener("focusin", fuoco);
    allaFine(() => {
      ScrollTrigger.removeEventListener("refreshInit", misura);
      pista.removeEventListener("focusin", fuoco);
      el.classList.remove("in-fila");
      el.style.removeProperty("--corsa");
    });
    rinfresca();
    return mossa;
  };

  /** UN FILM CHE AVANZA COL DITO: una fila di immagini (fatte da un video con «foto.mjs sequenza») disegnate su una tela che copre
   *  il suo contenitore. Rende { mostra(v) } con v da 0 a 1: dentro una scena, linea.to(stato, { v: 1, onUpdate: () => film.mostra(stato.v) }).
   *  Le immagini si caricano quando la sezione è vicina: prima una ogni quattro, poi le altre. La prima sta già nella pagina come
   *  <img> (è quella che si vede da fermi). «piccola» è la cartella per il telefono (metà immagini, più strette), se c'è. */
  /** Il formato dei fotogrammi (webp o avif) lo dice sequenza.json («formato»). Se le immagini hanno la trasparenza (un oggetto
   *  ritagliato) la tela si pulisce prima di ogni fotogramma e l'immagine sta tutta dentro («contiene»), invece di coprire. */
  sito.sequenza = (tela, { cartella, piccola = null, inPiedi = null, contiene = false } = {}) => {
    const el = uno(tela);
    if (!el) return null;
    const verticale = inPiedi && matchMedia("(orientation: portrait)").matches;
    const dove = verticale ? inPiedi : tocco && piccola ? piccola : cartella, x = el.getContext("2d"), figure = [];
    let quanti = 0, ultima = -1, voluta = 0, formato = "webp";
    const disegna = () => {
      if (!quanti) return;
      let i = Math.round(voluta * (quanti - 1));
      for (let passo = 0; passo < quanti && !(figure[i] && figure[i].complete && figure[i].naturalWidth); passo++) i = Math.max(0, i - 1);   // se non è ancora arrivata, la più vicina prima
      const f = figure[i];
      if (!f || !f.complete || !f.naturalWidth || i === ultima) return;
      ultima = i;
      const k = (contiene ? Math.min : Math.max)(el.width / f.naturalWidth, el.height / f.naturalHeight), l = f.naturalWidth * k, a = f.naturalHeight * k;   // copre la tela (object-fit: cover), o ci sta dentro
      if (contiene) x.clearRect(0, 0, el.width, el.height);
      x.drawImage(f, (el.width - l) / 2, (el.height - a) / 2, l, a);
    };
    const misura = () => { const px = Math.min(devicePixelRatio || 1, 2); el.width = Math.round(el.clientWidth * px); el.height = Math.round(el.clientHeight * px); ultima = -1; disegna(); };
    new ResizeObserver(misura).observe(el);
    const carica = async () => {
      const dati = await fetch(`${dove}/sequenza.json`).then((r) => r.json());
      quanti = dati.quanti; formato = dati.formato || "webp";
      const prendi = (i) => { if (figure[i]) return; const f = (figure[i] = new Image()); f.decoding = "async"; f.onload = () => { if (Math.abs(i - Math.round(voluta * (quanti - 1))) < 5) { ultima = -1; disegna(); } }; f.src = `${dove}/q-${String(i).padStart(3, "0")}.${formato}`; };
      prendi(0);
      for (let i = 0; i < quanti; i += 4) prendi(i);
      // il resto quando la persona comincia a scorrere: la prima apertura resta leggera (un fotogramma su quattro)
      // dal fotogramma che serve adesso verso i più lontani: un film letto al contrario (dal macro al piatto) ha i suoi primi
      // fotogrammi in fondo alla fila, e in ordine di fila arriverebbero per ultimi
      const resto = () => { const c = Math.round(voluta * (quanti - 1)); const ordine = Array.from({ length: quanti }, (_, i) => i).sort((a, b) => Math.abs(a - c) - Math.abs(b - c)); for (const i of ordine) prendi(i); };
      if (scrollY > 8) resto(); else addEventListener("scroll", resto, { once: true, passive: true });
    };
    new IntersectionObserver(([v], oss) => { if (v.isIntersecting) { oss.disconnect(); carica().catch(() => {}); } }, { rootMargin: "150% 0px" }).observe(el);
    return { mostra: (v) => { voluta = gsap.utils.clamp(0, 1, v); disegna(); } };
  };

  /** Un numero sale fino al suo valore vero (data-fino), una volta, quando arriva in vista. Il valore finale è già scritto nella pagina. */
  sito.conta = (numeri) => {
    for (const el of tutti(numeri)) {
      const fino = Number(el.dataset.fino), scrivi = new Intl.NumberFormat(html.lang || "it");
      if (!Number.isFinite(fino)) continue;
      const stato = { v: Number(el.dataset.da ?? 0) };
      gsap.to(stato, { v: fino, duration: 1.4, ease: "power2.out", onUpdate: () => { el.textContent = scrivi.format(Math.round(stato.v)); },
        scrollTrigger: { trigger: el, start: "top 90%", once: true } });
    }
  };

  // LE ATMOSFERE. Una sezione con data-aria dà i suoi colori a tutta la pagina mentre sta a metà schermo; il passaggio lo fa il
  // CSS (immersivo.css). Dipende solo da dove sei: risalendo torna com'era.
  let arie = [];
  const aria = () => {
    const prova = html.getAttribute("data-prova-aria");      // foto.mjs prove … --regola "prova-aria=chiara,scura,colore": un'aria tenuta ferma, per confrontarle
    const dentro = arie.find((z) => z.isActive), quale = prova !== null ? (prova === "chiara" ? "" : prova) : dentro ? dentro.trigger.dataset.aria : "";
    if (quale) html.dataset.aria = quale; else delete html.dataset.aria;
  };
  arie = tutti("main [data-aria], footer[data-aria]").map((el) => ScrollTrigger.create({ trigger: el, start: "top 55%", end: "bottom 55%", onToggle: aria }));
  aria();                                                  // una sezione già a metà schermo all'apertura (la prima) dà subito la sua aria

  // LA PRIMA VISTA. I pezzi con data-apre entrano in fila appena la pagina c'è: il titolo riga per riga, gli altri salendo poco.
  // Fino a qui il CSS li teneva nascosti (al massimo un secondo e mezzo: vedi la riga nella testa della pagina).
  // La regia può aggiungere il suo pezzo d'ingresso (i piatti che si posano, la lastra che si sveglia): sito.ingressi.push(f).
  // sito.rifaiIngresso() lo rifà da capo: lo usa il filmato per cominciare dall'inizio.
  html.classList.add("pronto");
  const ingresso = () => tutti("[data-apre]").forEach((el, i) => {
    const ritardo = 0.06 + i * 0.1;
    if (window.SplitText && /^H[12]$/.test(el.tagName)) perRighe(el, { delay: ritardo });
    else gsap.from(el, { y: 20, autoAlpha: 0, duration: 0.9, delay: ritardo + 0.1 });
  });
  sito.ingressi = [];
  sito.rifaiIngresso = () => { ingresso(); for (const f of sito.ingressi) f(); };
  ingresso();

  // Quando immagini e caratteri sono arrivati le misure cambiano: si ricalcolano tutte le scene.
  addEventListener("load", rinfresca);
  if (document.fonts) document.fonts.ready.then(rinfresca);
})();
