// GLI ATTREZZI PER UNA SCENA 3D SENZA UN MODELLATORE, E CON UN ASPETTO DA STUDIO: un palco che si regola da solo, la luce di
// uno studio fotografico, una lastra di metallo e vetro con la schermata vera, immagini ritagliate messe nello spazio con la
// loro ombra, la sfocatura di chi è lontano, e il modo di far combaciare il 3D con i riquadri della pagina.
// Si importa dalla regia della pagina, solo dove serve:   const tre = await import("./tre.js");
//
// Quello che fa sembrare vero un oggetto finto sono quattro cose, e stanno tutte qui: la LUCE (uno studio, non una lampadina),
// la MATERIA (metallo che riflette, vetro che prende i riflessi), l'OMBRA (attacca l'oggetto alla pagina e dice quanto è alto),
// la PROFONDITÀ (chi è lontano è sfocato). I colori di schermate e foto restano identici all'originale: non prendono luce.
//
// La lastra NON è un iPhone e non deve sembrarlo: niente isola, niente tasti, niente mela. Le regole di Apple per il marketing
// vietano di rendere in 3D, inclinare o far girare un prodotto Apple; un dispositivo generico senza i suoi dettagli si può.
import * as THREE from "three";

export { THREE };

/** Il 3D qui si può disegnare? Si chiede prima, così dove non c'è non parte nessun errore e restano le immagini della pagina. */
export function c3d() {
  try { const c = document.createElement("canvas"); return !!(c.getContext("webgl2") || c.getContext("webgl")); }
  catch { return false; }
}

/** LO STUDIO: la luce di un set fotografico, fatta a codice (niente file da scaricare). Un telo grande in alto, due strisce
 *  strette ai lati (sono loro i riflessi lunghi sul bordo e il lampo che passa sul vetro quando la lastra gira), un pannello
 *  morbido di tre quarti (il velo di luce sul vetro da ferma) e una spalla dietro. «calore» da -1 (fredda) a 1 (calda). */
function studio(renderer, { calore = 0.25 } = {}) {
  const s = new THREE.Scene();
  const tinta = (forza) => new THREE.Color(forza * (1 + 0.1 * calore), forza, forza * (1 - 0.14 * calore));
  s.add(new THREE.Mesh(new THREE.BoxGeometry(24, 14, 24), new THREE.MeshBasicMaterial({ color: tinta(0.16), side: THREE.BackSide })));
  const luce = (largo, alto, forza, x, y, z) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(largo, alto), new THREE.MeshBasicMaterial({ color: tinta(forza), side: THREE.DoubleSide }));
    m.position.set(x, y, z);
    m.lookAt(0, 0, 0);
    s.add(m);
  };
  luce(11, 11, 5, 0, 6.6, 1);        // il telo in alto: la luce generale, morbida
  luce(1.1, 10, 16, -9, 1, 4.5);     // la striscia a sinistra
  luce(1.1, 10, 11, 9.5, 0.5, 3.5);  // la striscia a destra
  luce(6, 8, 1.7, 7.5, 1.5, 8);      // il pannello di tre quarti, davanti a destra
  luce(7, 3, 2.4, 0, 1.5, -11);      // la spalla dietro
  const forno = new THREE.PMREMGenerator(renderer), ambiente = forno.fromScene(s, 0.03).texture;
  forno.dispose();
  return ambiente;
}

/** IL PALCO. Una tela che riempie il suo contenitore (di solito .palco-fisso, grande come lo schermo). Disegna solo quando si
 *  vede, non supera il doppio dei pixel né sei milioni di pixel in tutto (la schermata sulla lastra deve restare nitida come il
 *  testo accanto); se il telefono non ce la fa, scende da solo a una volta e un quarto. Va allo stesso passo dello scorrimento. Rende null dove il 3D non c'è: allora non fare niente, restano le immagini.
 *    p.scena, p.camera, p.renderer     le cose di Three.js
 *    p.aOgniGiro((t, dt) => …)         la tua funzione a ogni fotogramma: qui si calcola la posa dagli stati, senza creare oggetti;
 *                                      se rende false («adesso non c'è niente da vedere») la tela si svuota e riposa
 *    p.posto(riquadro, rispetto)       dove sta un riquadro della pagina in misure della scena: { x, y, largo, alto }
 *    p.lontano(z)                      di quanto rimpicciolire un oggetto a profondità z perché sembri fermo e grande uguale
 *    p.pronto()                        prepara, disegna il primo fotogramma e solo allora mostra la tela (classe in-3d su <html>)
 *    p.spegni()                        torna alle immagini della pagina (lo fa da solo se la scheda grafica si perde) */
export function palco(tela, { campo = 30, distanza = 10, massimoPixel = 2, calore = 0.25 } = {}) {
  if (!tela || !c3d()) return null;
  let renderer;
  try { renderer = new THREE.WebGLRenderer({ canvas: tela, antialias: true, alpha: true, powerPreference: "high-performance" }); }
  catch { return null; }
  const html = document.documentElement, contenitore = tela.parentElement;
  const leggero = window.sito ? window.sito.leggero : matchMedia("(pointer: coarse)").matches;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NeutralToneMapping;
  const scena = new THREE.Scene();
  scena.environment = studio(renderer, { calore });
  const camera = new THREE.PerspectiveCamera(campo, 1, 0.1, 200);
  camera.position.set(0, 0, distanza);

  const p = { renderer, scena, camera, distanza, larga: 1, alta: 1, unita: 1, leggero };
  let lento = false;
  // Le misure si leggono qui, quando la finestra cambia, e poi si riusano: mai dentro il ciclo.
  p.misura = () => {
    const l = Math.max(1, contenitore.clientWidth), a = Math.max(1, contenitore.clientHeight);
    const pixel = Math.min(window.devicePixelRatio || 1, lento ? 1.25 : massimoPixel, Math.sqrt(6e6 / (l * a)));
    renderer.setPixelRatio(pixel);
    renderer.setSize(l, a, false);
    camera.aspect = l / a;
    camera.updateProjectionMatrix();
    p.larga = l; p.alta = a;
    p.unita = (2 * distanza * Math.tan(THREE.MathUtils.degToRad(campo) / 2)) / a;   // quanto vale un pixel della pagina, a profondità 0
    if (p.alCambio) p.alCambio();
  };
  new ResizeObserver(p.misura).observe(contenitore);
  p.misura();

  /** Dove sta un riquadro della pagina, in misure della scena a profondità 0: il centro (x, y) e la grandezza. «rispetto» è
   *  l'elemento la cui cima si considera in cima allo schermo: la pagina intera (di base: vale a scorrimento zero) oppure la
   *  .cornice ferma di una scena. Per un oggetto a profondità z, moltiplica posizione e grandezza per p.lontano(z). */
  p.posto = (riquadro, rispetto = html) => {
    const r = riquadro.getBoundingClientRect(), cima = rispetto.getBoundingClientRect().top, u = p.unita;
    return { x: (r.left + r.width / 2 - p.larga / 2) * u, y: -(r.top - cima + r.height / 2 - p.alta / 2) * u, largo: r.width * u, alto: r.height * u };
  };
  p.lontano = (z) => (distanza - z) / distanza;

  let siVede = true, perso = false, cera = true, prima = performance.now(), contati = 0, speso = 0;
  const zero = prima, funzioni = new Set();
  new IntersectionObserver(([v]) => { siVede = v.isIntersecting; }).observe(tela);
  const giro = () => {
    const ora = performance.now(), dt = Math.min((ora - prima) / 1000, 0.05);
    prima = ora;
    if (perso || !siVede || document.hidden) return;          // quando non si vede non si disegna: niente batteria sprecata
    let ce = false;
    for (const f of funzioni) if (f((ora - zero) / 1000, dt) !== false) ce = true;
    if (ce) {
      if (p.disegna) p.disegna(); else renderer.render(scena, camera);       // con gli effetti (moduli/effetti.js) si disegna passando da lì
      // I primi due secondi si cronometra: sotto i 40 fotogrammi al secondo si disegnano meno pixel, una volta per tutte.
      if (!lento && contati < 120 && dt > 0 && dt < 0.05) { contati++; speso += dt; if (contati === 120 && speso / 120 > 0.025) { lento = true; p.misura(); } }
    } else if (cera) renderer.clear();                         // appena non c'è più niente da vedere, la tela si svuota una volta
    cera = ce;
  };
  // Un ciclo solo: se c'è GSAP si usa il suo battito, così 3D, scorrimento e scene vanno insieme.
  if (window.gsap) window.gsap.ticker.add(giro); else renderer.setAnimationLoop(giro);
  p.aOgniGiro = (f) => { funzioni.add(f); return () => funzioni.delete(f); };
  p.spegni = () => { perso = true; html.classList.remove("in-3d"); };
  p.pronto = async () => {
    try { await renderer.compileAsync(scena, camera); } catch { /* si prepara al primo disegno */ }
    for (const f of funzioni) f(0, 0);
    if (p.disegna) p.disegna(); else renderer.render(scena, camera);
    await new Promise((fatto) => requestAnimationFrame(fatto));
    if (!perso) html.classList.add("in-3d");
  };
  tela.addEventListener("webglcontextlost", (e) => { e.preventDefault(); p.spegni(); });
  window.__scena = renderer;   // per il controllo automatico: chiamate di disegno, memoria
  return p;
}

const tavolozza = (l, a) => { const c = document.createElement("canvas"); c.width = Math.max(1, Math.round(l)); c.height = Math.max(1, Math.round(a)); return c; };
const materia = (fonte) => { const t = new THREE.Texture(fonte); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; t.needsUpdate = true; return t; };
/** Sfoca una figura, lasciandole attorno un margine perché la sfocatura non venga tagliata ai bordi. Dove il browser sa sfocare
 *  un disegno lo fa lui (meglio); altrove la figura si rimpicciolisce e si ringrandisce più volte (funziona ovunque). */
const MARGINE = 0.14;
function sfocata(fonte, quanto) {
  const l = fonte.width, a = fonte.height, c = tavolozza(l / (1 - MARGINE * 2), a / (1 - MARGINE * 2)), x = c.getContext("2d");
  const dx = (c.width - l) / 2, dy = (c.height - a) / 2;
  if ("filter" in x) {
    x.filter = `blur(${(quanto * Math.max(l, a) / 110).toFixed(1)}px)`;
    x.drawImage(fonte, dx, dy);
    return c;
  }
  x.drawImage(fonte, dx, dy);
  let giro = c;
  for (let passo = 0; passo < 3; passo++) {
    const piccola = tavolozza(c.width / (1 + quanto), c.height / (1 + quanto)), grande = tavolozza(c.width, c.height);
    piccola.getContext("2d").drawImage(giro, 0, 0, piccola.width, piccola.height);
    const g = grande.getContext("2d");
    g.imageSmoothingQuality = "high";
    g.drawImage(piccola, 0, 0, grande.width, grande.height);
    giro = grande;
  }
  return giro;
}

/** Un'immagine come materia per il 3D, coi colori giusti. Le dai l'<img> della pagina (così non si scarica due volte) o un indirizzo.
 *    massimo   il lato più lungo, in pixel (2048 bastano; un ritaglio 720)
 *    sfoca     da 0 a 6: la sfocatura di chi è lontano o troppo vicino. È la profondità di campo, senza costi a ogni fotogramma */
export async function immagine(da, { massimo = 2048, sfoca = 0 } = {}) {
  const img = typeof da === "string" ? Object.assign(new Image(), { decoding: "async", src: da }) : da;
  if (img.loading === "lazy") img.loading = "eager";
  await img.decode();
  // Un'immagine troppo grande si rimpicciolisce; una vettoriale si disegna alla sua misura piena (se no arriverebbe grande com'è
  // sulla pagina); una da sfocare passa comunque da qui.
  const l = img.naturalWidth, a = img.naturalHeight, k = Math.min(1, massimo / Math.max(l, a));
  if (k === 1 && !sfoca && !/\.svg(\?|#|$)|^data:image\/svg/i.test(img.currentSrc || img.src)) return materia(img);
  let fonte = tavolozza(l * k, a * k);
  fonte.getContext("2d").drawImage(img, 0, 0, fonte.width, fonte.height);
  if (!sfoca) return materia(fonte);
  const t = materia(sfocata(fonte, sfoca));
  t.userData = { margine: MARGINE, largo: fonte.width, alto: fonte.height };   // la figura sta dentro il margine: `piano` ne tiene conto
  return t;
}

function rettangoloTondo(l, a, r) {
  const s = new THREE.Shape(), x = -l / 2, y = -a / 2;
  r = Math.min(r, l / 2, a / 2);
  s.moveTo(x + r, y);
  s.lineTo(x + l - r, y); s.absarc(x + l - r, y + r, r, -Math.PI / 2, 0, false);
  s.lineTo(x + l, y + a - r); s.absarc(x + l - r, y + a - r, r, 0, Math.PI / 2, false);
  s.lineTo(x + r, y + a); s.absarc(x + r, y + a - r, r, Math.PI / 2, Math.PI, false);
  s.lineTo(x, y + r); s.absarc(x + r, y + r, r, Math.PI, Math.PI * 1.5, false);
  return s;
}
/** L'immagine copre la forma da bordo a bordo (una forma ritagliata nasce senza le coordinate per l'immagine). */
function stesa(geometria, l, a) {
  const pos = geometria.attributes.position, uv = new Float32Array(pos.count * 2);
  for (let i = 0; i < pos.count; i++) { uv[i * 2] = (pos.getX(i) + l / 2) / l; uv[i * 2 + 1] = (pos.getY(i) + a / 2) / a; }
  geometria.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
  return geometria;
}

/** UNA LASTRA di metallo e vetro con la schermata vera: un dispositivo generico fatto a codice. Le proporzioni le decide la
 *  schermata. Il bordo è metallo satinato e prende i riflessi dello studio; sopra lo schermo c'è un vetro che non cambia i colori
 *  ma raccoglie la luce (un velo da ferma, un lampo quando gira). Rende un gruppo: muovi lui con lo scorrimento, e il suo
 *  `userData.dentro` per il respiro e il mouse (così non si pestano).
 *    userData.alto, userData.largo     la grandezza dello schermo (senza il bordo): per farla combaciare con un riquadro
 *    userData.cambia(immagine)         cambia la schermata di colpo (fallo quando la lastra è di spalle o di taglio)
 *    userData.sfuma(immagine, quanto)  la nuova schermata sopra la vecchia, da 0 a 1
 *  Opzioni: colore del metallo (grafite di base; 0xd9d6cf è un argento caldo), vetro (quanto riflette: 0,35 di base; oltre 0,6
 *  il velo di luce comincia a coprire la schermata, che è il prodotto e si deve leggere). */
export function lastra(schermata, { alto = 4, colore = 0x2b2c2f, vetro = 0.35, bordo = null, spessore = null, raggio = null } = {}) {
  const largo = alto * schermata.image.width / schermata.image.height, smusso = largo * 0.014;
  bordo ??= largo * 0.016; spessore ??= largo * 0.07; raggio ??= largo * 0.13;
  const gruppo = new THREE.Group(), dentro = new THREE.Group();
  const scocca = new THREE.ExtrudeGeometry(rettangoloTondo(largo + bordo * 2, alto + bordo * 2, raggio + bordo),
    { depth: spessore, bevelEnabled: true, bevelThickness: smusso, bevelSize: smusso, bevelSegments: 6, curveSegments: 32 });
  scocca.center();
  // Un metallo scuro riflette poco: di taglio e di spalle sembrerebbe una lastra nera piatta. Più è scuro, più gli si alza la luce
  // dello studio, così sul bordo passano i riflessi lunghi delle strisce anche sulla grafite.
  const tinta = new THREE.Color(colore), chiaro = 0.2126 * tinta.r + 0.7152 * tinta.g + 0.0722 * tinta.b;
  const corpo = new THREE.Mesh(scocca, new THREE.MeshPhysicalMaterial({ color: colore, metalness: 1, roughness: 0.3, clearcoat: 0.35, clearcoatRoughness: 0.3,
    envMapIntensity: THREE.MathUtils.clamp(0.09 / Math.max(chiaro, 0.02), 1, 3) }));
  const forma = stesa(new THREE.ShapeGeometry(rettangoloTondo(largo, alto, raggio), 32), largo, alto);
  const davanti = spessore / 2 + smusso;
  // La schiena: metallo satinato, più ruvido del bordo. Così quando la lastra è di spalle raccoglie tutto lo studio in una
  // sfumatura morbida (come il retro di un oggetto vero sotto un telo di luce) invece di specchiare il buio dietro la camera.
  const schiena = new THREE.Mesh(new THREE.ShapeGeometry(rettangoloTondo(largo + bordo * 2 - smusso, alto + bordo * 2 - smusso, raggio + bordo - smusso / 2), 32),
    new THREE.MeshPhysicalMaterial({ color: tinta.clone().lerp(new THREE.Color(0xffffff), 0.06), metalness: 1, roughness: 0.62, envMapIntensity: THREE.MathUtils.clamp(0.16 / Math.max(chiaro, 0.02), 1, 5) }));
  schiena.rotation.y = Math.PI; schiena.position.z = -davanti - largo * 0.001;
  const schermo = new THREE.Mesh(forma, new THREE.MeshBasicMaterial({ map: schermata, toneMapped: false }));
  const sopra = new THREE.Mesh(forma, new THREE.MeshBasicMaterial({ map: schermata, toneMapped: false, transparent: true, opacity: 0 }));
  // Il vetro: nero e lucidissimo, sommato allo schermo. Di fronte non si vede; inclinato raccoglie le luci dello studio.
  const lente = new THREE.Mesh(forma, new THREE.MeshPhysicalMaterial({ color: 0x000000, metalness: 0, roughness: 0.07, envMapIntensity: vetro,
    transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
  schermo.position.z = davanti + largo * 0.001;
  sopra.position.z = davanti + largo * 0.002;
  lente.position.z = davanti + largo * 0.003;
  sopra.visible = false;
  lente.visible = vetro > 0;
  schermo.renderOrder = 1; sopra.renderOrder = 2; lente.renderOrder = 3;
  dentro.add(corpo, schiena, schermo, sopra, lente);
  gruppo.add(dentro);
  gruppo.userData = { dentro, corpo, schermo, lente, largo, alto,
    cambia: (t) => { if (schermo.material.map !== t) { schermo.material.map = t; schermo.material.needsUpdate = true; } },
    sfuma: (t, quanto) => {
      if (sopra.material.map !== t) { sopra.material.map = t; sopra.material.needsUpdate = true; }
      sopra.material.opacity = quanto;
      sopra.visible = quanto > 0.001;
    } };
  return gruppo;
}

/** L'OMBRA A FORMA DELLA COSA. Dalla figura (anche ritagliata) esce la sua sagoma scura e morbida: è quella che attacca un piatto
 *  alla tavola. «morbida» da 0 a 1: stretta e netta se la cosa è appoggiata, larga e leggera se è sollevata. */
function sagoma(figura, { morbida = 0.35, forza = 0.5 } = {}) {
  const lato = 256, margine = 0.3, l = figura.width, a = figura.height, k = lato / Math.max(l, a);
  const c = tavolozza(lato * (1 + margine * 2), lato * (1 + margine * 2)), x = c.getContext("2d"), via = c.width * 2;
  x.shadowColor = `rgba(0,0,0,${forza})`;
  x.shadowBlur = lato * (0.03 + 0.2 * morbida);
  x.shadowOffsetX = via;                                 // si disegna la figura fuori dal foglio: sul foglio resta solo l'ombra
  x.drawImage(figura, (c.width - l * k) / 2 - via, (c.height - a * k) / 2, l * k, a * k);
  const t = new THREE.CanvasTexture(c);
  return { t, cresce: 1 + margine * 2 };
}

/** UN'IMMAGINE NELLO SPAZIO, con la sua ombra: un piano con la tua figura (anche ritagliata, con la trasparenza) e, attaccata
 *  sotto, la sua sagoma morbida. «largo» è in misure della scena. Rende il piano della figura: lo sposti, lo scali, ne cambi
 *  l'opacità (`.material.opacity`: l'ombra la segue da sola) come un oggetto qualsiasi. In più:
 *    userData.alza(quanto)   da 0 (appoggiata: ombra stretta, sotto) a 1 (sollevata: ombra più larga, più in là, più chiara)
 *    userData.gira(angolo)   la fa ruotare sul piano come un piatto sulla tavola: l'ombra resta dalla parte giusta
 *  L'ombra cade in basso a destra, come nelle foto illuminate da sinistra in alto: se le tue sono illuminate altrove, cambia «luce». */
export function piano(figura, largo = 1, { raggio = 0, ombra = true, forza = 0.5, luce = [0.045, -0.07] } = {}) {
  // «largo» è la larghezza della figura vera: se l'immagine è sfocata ha un margine attorno, e il piano è più grande di quel tanto.
  const img = figura.image, mar = figura.userData?.margine ? 1 / (1 - figura.userData.margine * 2) : 1, alto = largo * img.height / img.width;
  if (mar > 1) ombra = false;
  const geometria = raggio > 0 && mar === 1 ? stesa(new THREE.ShapeGeometry(rettangoloTondo(largo, alto, raggio), 20), largo, alto) : new THREE.PlaneGeometry(largo * mar, alto * mar);
  const m = new THREE.Mesh(geometria, new THREE.MeshBasicMaterial({ map: figura, transparent: true, toneMapped: false, depthWrite: false }));
  m.renderOrder = 1;
  let sotto = null, su = 0;
  if (ombra) {
    const { t, cresce } = sagoma(img, { forza }), lato = Math.max(largo, alto) * cresce;
    sotto = new THREE.Mesh(new THREE.PlaneGeometry(lato, lato), new THREE.MeshBasicMaterial({ map: t, transparent: true, toneMapped: false, depthWrite: false }));
    sotto.onBeforeRender = () => { sotto.material.opacity = (1 - su * 0.55) * m.material.opacity; };
    m.add(sotto);
  }
  const metti = () => {
    if (!sotto) return;
    const quanto = largo * (0.4 + 2.2 * su), c = Math.cos(-m.rotation.z), s = Math.sin(-m.rotation.z);
    sotto.position.set((luce[0] * c - luce[1] * s) * quanto, (luce[0] * s + luce[1] * c) * quanto, -0.01 - su * 0.4);
    sotto.rotation.z = -m.rotation.z;
    sotto.scale.setScalar(1 + su * 0.16);
  };
  m.userData = { ombra: sotto, largo, alto, alza: (quanto) => { su = quanto; metti(); }, gira: (angolo) => { m.rotation.z = angolo; metti(); } };
  metti();
  return m;
}

/** L'OMBRA DI UNA LASTRA sulla pagina: un rettangolo tondo, morbido, in due strati (uno largo e leggero, uno stretto e scuro).
 *  Non si attacca alla lastra: sta ferma sul piano della pagina, e la regia la sposta e la stringe quando la lastra gira. */
export function ombra(largo = 2, alto = 4, { forza = 0.3, morbida = 0.5 } = {}) {
  const k = 256 / Math.max(largo, alto), margine = 0.55, L = largo * k, A = alto * k;
  const c = tavolozza(L * (1 + margine * 2), A * (1 + margine * 2)), x = c.getContext("2d"), via = c.width * 2;
  const strato = (sfoca, f) => {
    x.shadowColor = `rgba(0,0,0,${f})`; x.shadowBlur = sfoca; x.shadowOffsetX = via;
    x.beginPath(); x.roundRect((c.width - L) / 2 - via, (c.height - A) / 2, L, A, L * 0.14); x.fill();
  };
  strato(256 * (0.1 + 0.3 * morbida), forza * 0.6);
  strato(256 * (0.03 + 0.08 * morbida), forza * 0.55);
  const m = new THREE.Mesh(new THREE.PlaneGeometry(largo * (1 + margine * 2), alto * (1 + margine * 2)),
    new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthWrite: false, toneMapped: false }));
  m.userData = { largo, alto };
  return m;
}

/** LA SUPERFICIE: un tavolo visto dall'alto, fatto a codice (assi di legno con le venature). È lei che fa sentire la camera che si
 *  muove: su un fondo di colore piatto un volo non si vede. Si mette dietro a tutto, a profondità 0.
 *    lato      quanto è grande una piastrella della trama, in misure della scena (dentro ci stanno «assi» assi)
 *    grande    quanto è grande tutto il tavolo
 *    base, calda   il colore del legno e quello delle venature chiare */
export function superficie({ lato = 8, grande = 160, assi = 4, base = "#17110d", calda = "255,205,160" } = {}) {
  const N = 1024, c = tavolozza(N, N), x = c.getContext("2d"), alta = N / assi;
  let seme = 7;
  const caso = () => (seme = (seme * 16807) % 2147483647) / 2147483647;      // sempre uguale: niente sorprese fra un giro e l'altro
  x.fillStyle = base;
  x.fillRect(0, 0, N, N);
  for (let a = 0; a < assi; a++) {
    x.fillStyle = `rgba(${calda},${(0.01 + caso() * 0.04).toFixed(3)})`;       // ogni asse ha il suo tono
    x.fillRect(0, a * alta, N, alta);
    for (let i = 0; i < 110; i++) {
      const y0 = a * alta + caso() * alta, onda = 1.5 + caso() * 5, fase = caso() * 6.283, giri = 1 + Math.floor(caso() * 3);
      x.strokeStyle = caso() > 0.45 ? `rgba(0,0,0,${(0.05 + caso() * 0.14).toFixed(3)})` : `rgba(${calda},${(0.015 + caso() * 0.05).toFixed(3)})`;
      x.lineWidth = 0.5 + caso() * 1.8;
      x.beginPath();
      for (let px = 0; px <= N; px += 16) { const y = y0 + Math.sin(px / N * 6.283 * giri + fase) * onda; if (px) x.lineTo(px, y); else x.moveTo(px, y); }
      x.stroke();
    }
    x.fillStyle = "rgba(0,0,0,0.5)";
    x.fillRect(0, a * alta, N, 2);                                            // la fuga fra un'asse e l'altra
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8;
  t.repeat.set(grande / lato, grande / lato);
  return new THREE.Mesh(new THREE.PlaneGeometry(grande, grande), new THREE.MeshBasicMaterial({ map: t, toneMapped: false }));
}

/** UNA POZZA DI LUCE. Su un fondo scuro le ombre non si vedono: a staccare gli oggetti è la luce che cade sulla superficie sotto
 *  di loro. Un cerchio chiaro e morbidissimo, sommato al fondo. Sta dietro agli oggetti, mai davanti al testo. */
export function alone(largo = 4, { forza = 0.16, colore = "255,244,226" } = {}) {
  const c = tavolozza(256, 256), x = c.getContext("2d"), g = x.createRadialGradient(128, 128, 0, 128, 128, 128);
  g.addColorStop(0, `rgba(${colore},${forza})`); g.addColorStop(0.5, `rgba(${colore},${forza * 0.32})`); g.addColorStop(1, `rgba(${colore},0)`);
  x.fillStyle = g;
  x.fillRect(0, 0, 256, 256);
  return new THREE.Mesh(new THREE.PlaneGeometry(largo, largo), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthWrite: false, toneMapped: false, blending: THREE.AdditiveBlending }));
}

/** Le curve per calcolare una posa da uno stato: tutte prendono e rendono un numero fra 0 e 1. */
export const curve = {
  stringi: (v) => Math.min(1, Math.max(0, v)),
  fra: (da, a, v) => Math.min(1, Math.max(0, (v - da) / (a - da))),          // 0 prima di «da», 1 dopo «a»
  dolce: (v) => v * v * (3 - 2 * v),                                          // parte e arriva piano
  frena: (v) => 1 - Math.pow(1 - v, 3),                                       // parte svelta e arriva piano
  posa: (v) => 1 + 2.2 * Math.pow(v - 1, 3) + 1.2 * Math.pow(v - 1, 2),       // arriva, supera di poco e si posa: il peso di una cosa vera
  mescola: (a, b, v) => a + (b - a) * v,
};
