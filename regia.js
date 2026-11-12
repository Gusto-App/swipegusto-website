// LA REGIA DELLA VERSIONE 4 «DAL PIATTO». Il motore (motore.js) dà le mosse; qui si decide cosa si muove, quando e quanto.
//
// IL PIANO DELLA SCENA FIRMA, «Dal piatto alla tavola»:
//   il nome              si parte dentro la carbonara; la camera si allontana, il telefono si appoggia in tavola e si alza, tocchi
//                        «Cambia» e il piatto diventa una tagliata; poi la camera si alza fino a vedere tutta la settimana
//   cosa la fa partire   lo scorrimento: la sezione #dalpiatto resta ferma per 4,6 schermi (3,9 sul telefono)
//   le fasi (in schermi) 0-0,45 il titolo sul macro, la camera quasi ferma e un filo di vapore che sale (video in ciclo, svanisce entro 0,22) · 0,45-1,3 la camera si allontana (l'avvicinamento letto
//                        al contrario) fino al piatto sulla tavola · 1,3-1,5 il telefono si appoggia sul legno, con la sua ombra ·
//                        1,6-2,1 si alza verso di te; «Stasera, carbonara» · 2,15 il lampo su «Cambia» · 2,25 il vassoio con le tre
//                        proposte · 2,45 il lampo sulla tagliata · 2,6-3,0 il liquido scopre la tagliata nel piatto, lo schermo dice
//                        la tagliata; «Non ti va? Tocca Cambia» · 3,0-3,45 il telefono si riappoggia e se ne va · 3,5-4,0 la gru:
//                        la camera si alza fino alla tavola dall'alto · 3,9-4,6 «Tutta la settimana, in tavola»; sul telefono 4,0-4,45 la camera gira di 90° e si allontana fino a tutta la tavola
//   chi non tocca niente vede il macro della carbonara col titolo
//   sul telefono         le stesse due riprese girate in piedi; il telefono si alza al centro, le parole stanno in basso
//   «Riduci movimento»   niente film e niente 3D: il macro col titolo, poi i passi in fila con le foto e le schermate vere
// Ogni posa dipende solo da dove sei nella pagina: risalendo la scena va al contrario, ricaricando a metà è subito giusta.
// Il liquido è l'unica cosa che vive nel tempo, e alla fine si posa.
const sito = window.sito;
const T = 4.6;                                                      // gli schermi di riferimento: le fasi qui sotto valgono su questa scala
const dura = sito.regola("dura", sito.tocco ? 3.9 : 4.6);          // quanti schermi dura davvero la scena

// In casa (solo localhost): ?scorri=2000 porta la pagina a quel punto dopo un secondo e mezzo, per fotografarla sul simulatore senza un dito.
const scorriA = sito.regola("scorri", 0);
if (scorriA > 0) setTimeout(() => window.scrollTo({ top: scorriA, behavior: "instant" }), 1500);

sito.righe("[data-righe]");
sito.entra("[data-entra]");
sito.su("computer", () => sito.diLato("#piatti"));

const sezione = document.querySelector("#dalpiatto");
const st = { q: 0, mx: -1, my: -1 };
const inPiedi = matchMedia("(orientation: portrait)").matches;

sito.scena("#dalpiatto", (linea) => {
  const k = dura / T;
  sito.passi(linea, sezione.querySelectorAll(".passo"), { segno: sezione.querySelector("[data-segno]"), filo: sezione.querySelector("[data-filo]"),
    finestre: [[0, 0.45 * k], [1.4 * k, 2.08 * k], [2.18 * k, 3.05 * k], [3.95 * k, T * k]] });
  // Le due riprese: l'avvicinamento (letto al contrario: dal macro al piatto) e la gru (dal piatto alla tavola).
  const push = sito.sequenza(sezione.querySelector(".sequenza--push"), { cartella: "film4/push-1600", inPiedi: "film4/push-900" });
  const telaGru = sezione.querySelector(".sequenza--gru");
  // La gru serve da 3,4 schermi in poi: si accende appena si comincia a scorrere (non all'apertura), così la prima apertura resta
  // leggera; i suoi fotogrammi si caricano in ordine, dal primo, mentre quelli dell'avvicinamento arrivano dal più vicino al punto in cui sei.
  let gru = null, suGru = false;
  const accendiGru = () => { if (!gru) gru = sito.sequenza(telaGru, { cartella: "film5/1600", inPiedi: "film5/900" }); };
  // IL VAPORE: un video in ciclo (il primo e l'ultimo fotogramma sono il macro stesso) che vive solo finché la camera è ferma in
  // cima. Si sfuma via nei primi 0,22 schermi, poi si ferma. Senza movimento (sito.fermo) non parte: resta la foto.
  const vapore = sezione.querySelector(".film__vapore");
  const fra = (a, b, x) => Math.min(1, Math.max(0, (x - a) / (b - a)));
  const girando = () => !!(window.__film && window.__film.acceso);     // il filmato di foto.mjs: il tempo è finto, il video si porta a mano
  let vaporeFermo = false;
  if (vapore) {
    vapore.autoplay = true;
    vapore.src = inPiedi ? "film4/vapore-900.mp4" : "film4/vapore-1600.mp4";
    vapore.play().catch(() => {});
    gsap.ticker.add(() => {
      if (!girando() || vaporeFermo || !vapore.duration) return;
      if (!vapore.paused) vapore.pause();
      vapore.currentTime = (performance.now() / 1000) % vapore.duration;
    });
  }
  // IL GIRO FINALE (solo sul telefono): finita la gru, la camera gira di 90° e si allontana sulla stessa foto della tavolata (ruotata,
  // `film5/tavola-piedi-1620.avif`) finché la tavola intera sta nello schermo in piedi. La gru finisce sul ritaglio stretto di quella
  // stessa foto: niente taglio, un movimento solo. Entra in dissolvenza breve (il fotogramma finale di Kling non è identico al ritaglio).
  const telaGiro = sezione.querySelector(".sequenza--giro");
  if (telaGiro && !inPiedi) telaGiro.remove();
  let giro = null;
  const facile = (t) => t * t * (3 - 2 * t);
  const accendiGiro = () => {
    if (giro || !inPiedi || !telaGiro) return;
    giro = { img: null, banda: null, x: telaGiro.getContext("2d"), ultimo: -1, W: 0 };
    const misura = () => { const px = Math.min(devicePixelRatio || 1, 2); telaGiro.width = Math.round(telaGiro.clientWidth * px); telaGiro.height = Math.round(telaGiro.clientHeight * px); giro.ultimo = -1; mostra(); };
    new ResizeObserver(misura).observe(telaGiro);
    // due immagini della stessa foto: la tavola intera ruotata (leggera: alla fine è piccola) e il ritaglio stretto a piena nitidezza
    // (all'inizio riempie lo schermo), che si disegna sopra al suo posto e sfuma via mentre la camera si allontana
    const im = new Image(); im.decoding = "async"; im.onload = () => { giro.img = im; giro.ultimo = -1; mostra(); }; im.src = "film5/tavola-piedi-1080.avif";
    const ba = new Image(); ba.decoding = "async"; ba.onload = () => { giro.banda = ba; giro.ultimo = -1; mostra(); }; ba.src = "film5/tavola-piedi-banda-900.avif";
  };
  const disegnaGiro = (e) => {                                     // e da 0 (il ritaglio stretto, com'è la fine della gru) a 1 (tutta la tavola)
    if (!giro || !giro.img) return;
    const { x, img } = giro, W = telaGiro.width, H = telaGiro.height, nw = img.naturalWidth, nh = img.naturalHeight;
    if (giro.ultimo === e && giro.W === W) return;
    giro.ultimo = e; giro.W = W;
    const s1 = Math.max(H / nw, W / (nh * 0.3164));                // la banda (il ritaglio 9:16 della tavolata, alto quanto la foto è larga) copre lo schermo
    const s2 = Math.max(W / nw, H / nh);                           // tutta la foto ruotata copre lo schermo
    const s = s1 * Math.pow(s2 / s1, e), a = -Math.PI / 2 * (1 - e);
    const cx = W / 2, cy = H * (0.5 + (0.4974 - 0.5) * e);          // la ciotola resta ferma al centro
    x.setTransform(1, 0, 0, 1, 0, 0); x.clearRect(0, 0, W, H);
    x.translate(cx, cy); x.rotate(a); x.scale(s, s);
    x.drawImage(img, -0.4995 * nw, -0.4974 * nh);
    if (giro.banda && e < 0.6) {                                   // il ritaglio nitido: nella foto ruotata sta di traverso, al centro
      const k = nh / 3840, bw = 1215 * k, bh = 2160 * k;           // la sua misura nelle unità della foto ruotata
      x.globalAlpha = 1 - facile(Math.min(1, e / 0.6));
      x.rotate(Math.PI / 2); x.drawImage(giro.banda, -bw / 2, -bh / 2, bw, bh);
      x.globalAlpha = 1;
    }
  };
  const mostra = () => {
    const q = st.q;
    if (telaGiro && inPiedi) {
      const g = fra(4.0, 4.45, q);
      telaGiro.style.opacity = String(fra(4.0, 4.11, q));
      if (q > 3.9) { if (!giro) accendiGiro(); disegnaGiro(g < 0.25 ? 0 : facile((g - 0.25) / 0.75)); }
    }
    if (vapore) {
      const via = fra(0.02, 0.22, q);
      vapore.style.opacity = String(1 - via);
      const fermo = via >= 1;
      if (fermo !== vaporeFermo) { vaporeFermo = fermo; vapore.style.visibility = fermo ? "hidden" : ""; if (fermo) vapore.pause(); else if (!girando()) vapore.play().catch(() => {}); }
    }
    if (!gru && q > 0.3) { accendiGru(); accendiGiro(); }                              // appena la persona ha cominciato a scorrere: i suoi fotogrammi servono da 3,4
    // «v» da 0 (il macro) a 1 (il piatto sulla tavola) a 2 (la tavola dall'alto). Si muove dove non ci sono parole.
    let v;
    if (q < 0.45) v = (q / 0.45) * 0.04;
    else if (q < 1.3) v = 0.04 + ((q - 0.45) / 0.85) * 0.96;
    else if (q < 3.5) v = 1;
    else if (q < 4.0) v = 1 + (q - 3.5) / 0.5;
    else v = 2;
    const dopo = v > 1.0001 || q >= 3.4;                            // dalla fine del cambio in poi si vede la gru (parte dalla tagliata)
    if (dopo !== suGru) { suGru = dopo; telaGru.style.opacity = dopo ? 1 : 0; }
    if (push) push.mostra(1 - Math.min(1, v));
    if (gru) gru.mostra(Math.max(0, v - 1));
  };
  linea.to(st, { q: T, duration: dura, ease: "none", onUpdate: mostra }, 0);
  mostra();
}, { schermate: dura });

// La barra senza fondo finché il film è sullo schermo.
if (sito.acceso) ScrollTrigger.create({ trigger: "#dalpiatto", start: "top bottom", end: "bottom 12%", toggleClass: { targets: document.documentElement, className: "sul-film" } });

// IL 3D: il telefono (con le schermate vere della prima schermata dell'app) e il piatto che cambia col liquido.
const tela = sezione.querySelector(".film__tela3d");
if (sito.acceso && tela) Promise.all([import("./tre.js"), import("./moduli/fluido.js")]).then(([tre, fl]) => scena3d(tre, fl)).catch((e) => console.warn("Senza 3D:", e));

async function scena3d({ palco, lastra, ombra, alone, immagine, curve }, { fluido, rivela }) {
  const p = palco(tela, { calore: sito.regola("calore", 0.4) });
  if (!p) return;
  try {
    const { fra, dolce, posa, mescola } = curve;
    const grande = inPiedi ? "piedi-1152" : "2048";
    // All'apertura arrivano solo le due immagini del «prima» (il piatto sulla tavola e la prima schermata). Quelle del «dopo»
    // (la tagliata, il vassoio, la schermata con la tagliata) servono da 2,26 schermi in poi: partono al primo scorrimento,
    // così la prima apertura resta sotto i 4 MB anche col video del vapore.
    let cambiato = false;                                           // a metà cambio la tagliata diventa la foto di base
    const [tPrima, schPrima] = await Promise.all([immagine(`tavole4/carbonara-${grande}.avif`), immagine("img/viva-carbonara-1080.avif")]);
    let tDopo = tPrima, schVassoio = schPrima, schDopo = schPrima, dopoChiesto = false;
    const caricaDopo = () => {
      if (dopoChiesto) return; dopoChiesto = true;
      Promise.all([immagine(`tavole4/tagliata-${grande}.avif`), immagine("img/viva-vassoio-1080.avif"), immagine("img/viva-dopo-1080.avif")])
        .then(([a, b, c]) => { tDopo = a; schVassoio = b; schDopo = c; m.uniforms.uB.value = tDopo; if (cambiato) m.uniforms.uA.value = tDopo; })
        .catch((e) => console.warn("Senza il piatto dopo:", e));
    };

    // IL PIATTO: la foto ferma del piatto sulla tavola, e dove passa il liquido quella con la tagliata. Parte trasparente: prende il
    // posto del film piano, quando la camera si è fermata.
    const acqua = fluido(p.renderer, { lato: sito.leggero ? 64 : 128 });
    const tavola = rivela(tPrima, tDopo, acqua, { bordo: 0.18, luce: 0.16, opacita: 0 });
    const m = tavola.material;
    tavola.renderOrder = -2;
    if (scrollY > 8) caricaDopo(); else addEventListener("scroll", caricaDopo, { once: true, passive: true });

    // IL TELEFONO: la lastra con la schermata vera, l'ombra sul legno, e il lampo sul punto vero del tasto.
    const telefono = lastra(schPrima, { vetro: sito.regola("vetro", 0.35) }), u = telefono.userData;
    const sotto = ombra(u.largo, u.alto, { forza: 0.55, morbida: 0.4 });
    sotto.renderOrder = -1;
    const dito = alone(u.largo * 0.36, { forza: 0.95, colore: "255,255,255" });
    dito.position.z = u.schermo.position.z + 0.01;
    u.dentro.add(dito);
    const CAMBIA = [0.80, 0.587], TONDO = [0.565, 0.508];           // dove stanno «Cambia» e il tondo della tagliata nelle schermate vere (frazioni)
    const puntaDito = ([x, y]) => dito.position.set((x - 0.5) * u.largo, (0.5 - y) * u.alto, dito.position.z);
    p.scena.add(tavola, sotto, telefono);

    // I POSTI (in misure della scena), letti quando la finestra cambia: mai nel ciclo.
    let P = {}, C = {};
    const leggi = () => {
      const L = p.larga * p.unita, A = p.alta * p.unita;
      tavola.userData.copri(L, A);
      const altezza = inPiedi ? A * 0.46 : A * 0.58;                // quanto è alto il telefono quando è in mano
      // in mano sta davanti al bordo sinistro del piatto, mai sopra le parole (che stanno in basso a sinistra)
      P = inPiedi
        ? { fuori: [-L * 0.55, -A * 0.75], giu: [-L * 0.12, -A * 0.34], su: [0, A * 0.09], altezza }
        : { fuori: [-L * 0.6, -A * 0.75], giu: [-L * 0.15, -A * 0.34], su: [-L * 0.08, A * 0.1], altezza };
      // il centro del piatto nella foto (frazioni, dal basso) → nelle coordinate del liquido (0-1 sulla tela)
      const b = inPiedi ? { x: 0.58, y: 0.43, rx: 0.42, ry: 0.19 } : { x: 0.657, y: 0.44, rx: 0.33, ry: 0.36 };
      const s = m.uniforms.uScalaA.value;
      C = { x: (b.x - 0.5) / s.x + 0.5, y: (b.y - 0.5) / s.y + 0.5, rx: b.rx / s.x, ry: b.ry / s.y };
    };
    leggi();
    p.alCambio = leggi;
    ScrollTrigger.addEventListener("refresh", leggi);
    const cornice = sezione.querySelector(".cornice");
    if (!sito.tocco) cornice.addEventListener("pointermove", (e) => { const f = cornice.getBoundingClientRect(); st.mx = (e.clientX - f.left) / f.width; st.my = 1 - (e.clientY - f.top) / f.height; }, { passive: true });

    let prima = -1, mostrato = null, nx = 0;
    p.aOgniGiro((t, dt) => {
      const q = st.q;
      // 1. la foto ferma prende il posto del film quando la camera si ferma, e lo lascia quando riparte
      const pieno = fra(1.12, 1.32, q) * (1 - fra(3.42, 3.6, q));
      tavola.visible = pieno > 0.001;
      m.uniforms.uOpacita.value = pieno;
      // 2. il cambio: un filo di liquido gira dal centro del piatto verso il bordo, e scopre la tagliata
      const c = fra(2.6, 3.0, q);
      if (c > 0 && c < 1 && Math.abs(c - prima) > 0.002) {
        const g = c * Math.PI * 6, r = 0.15 + 0.85 * c;
        acqua.scia(C.x + Math.cos(g) * C.rx * r, C.y + Math.sin(g) * C.ry * r, 2.4);
      }
      prima = c;
      if (st.mx >= 0 && pieno > 0.5 && c < 1) { acqua.scia(st.mx, st.my, 0.9); st.mx = -1; }   // col mouse si sbircia il piatto dopo
      acqua.avanza(dt);
      const ora = c >= 0.6;                                         // a metà cambio la tagliata diventa la foto di base
      if (ora !== cambiato) { cambiato = ora; m.uniforms.uA.value = ora ? tDopo : tPrima; }

      // 3. il telefono: entra dal bordo e si appoggia, si alza verso di te, si riappoggia e se ne va
      const entra = posa(fra(1.3, 1.52, q)), esce = dolce(fra(3.25, 3.45, q));
      const alza = dolce(fra(1.6, 2.1, q)) * (1 - dolce(fra(3.0, 3.28, q)));
      const visibile = q > 1.28 && q < 3.47;
      telefono.visible = sotto.visible = visibile;
      if (visibile) {
        const quale = q >= 2.62 ? schDopo : q >= 2.26 ? schVassoio : schPrima;
        if (quale !== mostrato) { u.cambia(quale); mostrato = quale; }
        const k = P.altezza / u.alto;
        nx += ((st.mx >= 0 ? st.mx - 0.5 : 0) - nx) * 0.05;
        // dove sta: fuori → appoggiato → in mano → appoggiato → fuori
        const gx = mescola(mescola(P.fuori[0], P.giu[0], entra), P.fuori[0], esce), gy = mescola(mescola(P.fuori[1], P.giu[1], entra), P.fuori[1], esce);
        telefono.position.set(mescola(gx, P.su[0], alza), mescola(gy, P.su[1], alza), mescola(0.05, 1.5, alza));
        telefono.scale.setScalar(k * mescola(0.92, 1, alza));
        // sdraiato: molto inclinato e un po' girato sul legno; in mano: quasi di fronte, segue appena il mouse
        telefono.rotation.set(mescola(-1.12, -0.14, alza), mescola(0.0, 0.16 + nx * 0.2, alza), mescola(-0.3, -0.03, alza));
        u.dentro.position.y = Math.sin(t * 0.9) * 0.02 * alza;
        // l'ombra sul legno: sotto il telefono sdraiato, stretta; quando si alza si allarga, si allontana e si schiarisce (luce da sinistra)
        sotto.position.set(gx + k * (0.08 + alza * 0.9), gy - k * (0.1 + alza * 0.5), 0.02);
        sotto.rotation.set(-1.12, 0, -0.3);
        sotto.scale.set(k * (1.02 + alza * 0.25), k * (1.02 + alza * 0.2), 1);
        sotto.material.opacity = mescola(0.9, 0.4, alza) * (1 - esce);
        // i lampi: su «Cambia», poi sul tondo della tagliata
        const tocco1 = fra(2.14, 2.2, q) * (1 - fra(2.2, 2.34, q)), tocco2 = fra(2.44, 2.5, q) * (1 - fra(2.5, 2.64, q));
        if (tocco1 > 0) puntaDito(CAMBIA); else if (tocco2 > 0) puntaDito(TONDO);
        const tocco = Math.max(tocco1, tocco2);
        dito.visible = tocco > 0.01;
        dito.material.opacity = tocco;
        dito.scale.setScalar(0.5 + (tocco1 > 0 ? fra(2.14, 2.34, q) : fra(2.44, 2.64, q)) * 1.1);
      }
      p.camera.position.x = nx * 0.25;
      p.camera.lookAt(0, 0, 0);
      return visibile || tavola.visible;
    });

    await p.pronto();
  } catch (e) {
    console.warn("Senza 3D:", e);
    p.spegni();
  }
}
