// IL FLUIDO CHE SEGUE IL MOUSE: una macchia liquida che nasce dove passa il puntatore, si allarga, gira e svanisce. Da sola non
// è niente; serve come MASCHERA (dove passa il mouse si scopre un'altra immagine: un volto che diventa casco, un piatto crudo che
// diventa cotto, il giorno che diventa sera) o come SPOSTAMENTO (l'immagine si piega come acqua). È in quasi tutti i siti
// immersivi da premio, ed è tutto calcolato dalla scheda grafica, senza librerie.
//   import { fluido, rivela } from "./moduli/fluido.js";
//   const acqua = fluido(p.renderer);                         128 celle di lato (64 sul telefono: passa { lato: 64 })
//   const quadro = rivela(immagineA, immagineB, acqua);       un piano che mostra A, e B dove passa il fluido
//   quadro.userData.copri(larghezza, altezza)                 lo fa grande quanto vuoi (per esempio tutto lo schermo), senza deformare le immagini
//   nel ciclo:  acqua.avanza(dt)
//   acqua.scia(x, y)       un punto del puntatore, da 0 a 1 (0,0 in basso a sinistra): lo chiami da pointermove, o lo muovi tu
//                          con lo scorrimento sul telefono, dove il mouse non c'è
import * as THREE from "three";

const VS = `varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`;
const PORTA = `uniform sampler2D uVel, uFonte; uniform vec2 uPasso; uniform float uDt, uResta; varying vec2 vUv;
  void main() { vec2 da = vUv - uDt * texture2D(uVel, vUv).xy * uPasso; gl_FragColor = uResta * texture2D(uFonte, da); }`;
const GOCCIA = `uniform sampler2D uBase; uniform vec2 uPunto; uniform vec3 uValore; uniform float uRaggio; varying vec2 vUv;
  void main() { vec2 d = vUv - uPunto; gl_FragColor = vec4(texture2D(uBase, vUv).xyz + exp(-dot(d, d) / uRaggio) * uValore, 1.0); }`;
const DIVERGE = `uniform sampler2D uVel; uniform vec2 uPasso; varying vec2 vUv;
  void main() { float s = texture2D(uVel, vUv - vec2(uPasso.x, 0.0)).x, d = texture2D(uVel, vUv + vec2(uPasso.x, 0.0)).x, g = texture2D(uVel, vUv - vec2(0.0, uPasso.y)).y, a = texture2D(uVel, vUv + vec2(0.0, uPasso.y)).y;
    gl_FragColor = vec4(0.5 * (d - s + a - g), 0.0, 0.0, 1.0); }`;
const PREME = `uniform sampler2D uPres, uDiv; uniform vec2 uPasso; varying vec2 vUv;
  void main() { float s = texture2D(uPres, vUv - vec2(uPasso.x, 0.0)).x, d = texture2D(uPres, vUv + vec2(uPasso.x, 0.0)).x, g = texture2D(uPres, vUv - vec2(0.0, uPasso.y)).x, a = texture2D(uPres, vUv + vec2(0.0, uPasso.y)).x;
    gl_FragColor = vec4((s + d + g + a - texture2D(uDiv, vUv).x) * 0.25, 0.0, 0.0, 1.0); }`;
const TOGLIE = `uniform sampler2D uPres, uVel; uniform vec2 uPasso; varying vec2 vUv;
  void main() { float s = texture2D(uPres, vUv - vec2(uPasso.x, 0.0)).x, d = texture2D(uPres, vUv + vec2(uPasso.x, 0.0)).x, g = texture2D(uPres, vUv - vec2(0.0, uPasso.y)).x, a = texture2D(uPres, vUv + vec2(0.0, uPasso.y)).x;
    gl_FragColor = vec4(texture2D(uVel, vUv).xy - vec2(d - s, a - g) * 0.5, 0.0, 1.0); }`;
const SCALA = `uniform sampler2D uFonte; uniform float uResta; varying vec2 vUv; void main() { gl_FragColor = uResta * texture2D(uFonte, vUv); }`;

export function fluido(renderer, { lato = 128, fine = 384, raggio = 0.0028, forza = 5200, resta = 0.975, scorre = 0.985, giri = 18 } = {}) {
  const foglio = (n) => new THREE.WebGLRenderTarget(n, n, { type: THREE.HalfFloatType, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, depthBuffer: false });
  const coppia = (n) => { let a = foglio(n), b = foglio(n); return { get ora() { return a; }, get poi() { return b; }, gira: () => { [a, b] = [b, a]; } }; };
  const vel = coppia(lato), tinta = coppia(fine), pres = coppia(lato), div = foglio(lato);
  const scena = new THREE.Scene(), camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1), quadro = new THREE.Mesh(new THREE.PlaneGeometry(2, 2));
  scena.add(quadro);
  const passo = new THREE.Vector2(1 / lato, 1 / lato);
  const mat = (fs, uniforms) => new THREE.ShaderMaterial({ vertexShader: VS, fragmentShader: fs, uniforms, depthTest: false, depthWrite: false });
  const M = {
    porta: mat(PORTA, { uVel: { value: null }, uFonte: { value: null }, uPasso: { value: passo }, uDt: { value: 0.016 }, uResta: { value: 1 } }),
    goccia: mat(GOCCIA, { uBase: { value: null }, uPunto: { value: new THREE.Vector2() }, uValore: { value: new THREE.Vector3() }, uRaggio: { value: raggio } }),
    diverge: mat(DIVERGE, { uVel: { value: null }, uPasso: { value: passo } }),
    preme: mat(PREME, { uPres: { value: null }, uDiv: { value: null }, uPasso: { value: passo } }),
    toglie: mat(TOGLIE, { uPres: { value: null }, uVel: { value: null }, uPasso: { value: passo } }),
    scala: mat(SCALA, { uFonte: { value: null }, uResta: { value: 0.8 } }),
  };
  const disegna = (m, dove) => { quadro.material = m; const prima = renderer.getRenderTarget(); renderer.setRenderTarget(dove); renderer.render(scena, camera); renderer.setRenderTarget(prima); };
  const gocce = [], ultimo = { x: -1, y: -1 };
  const f = {
    get densita() { return tinta.ora.texture; },
    get velocita() { return vel.ora.texture; },
    /** Un colpo nel fluido: dove (da 0 a 1), di quanto si è mosso, e quanta «tinta» lascia. */
    tocca: (x, y, dx = 0, dy = 0, quanta = 1) => { if (gocce.length < 12) gocce.push([x, y, dx, dy, quanta]); },
    /** Il puntatore che passa: tiene da solo il conto di dove era prima. */
    scia: (x, y, quanta = 1) => { if (ultimo.x >= 0) f.tocca(x, y, x - ultimo.x, y - ultimo.y, quanta); ultimo.x = x; ultimo.y = y; },
    avanza: (dt) => {
      dt = Math.min(dt, 0.033);
      for (const [x, y, dx, dy, quanta] of gocce.splice(0)) {
        M.goccia.uniforms.uPunto.value.set(x, y);
        M.goccia.uniforms.uBase.value = vel.ora.texture; M.goccia.uniforms.uValore.value.set(dx * forza, dy * forza, 0); disegna(M.goccia, vel.poi); vel.gira();
        M.goccia.uniforms.uBase.value = tinta.ora.texture; M.goccia.uniforms.uValore.value.set(quanta, quanta, quanta); disegna(M.goccia, tinta.poi); tinta.gira();
      }
      M.diverge.uniforms.uVel.value = vel.ora.texture; disegna(M.diverge, div);
      M.scala.uniforms.uFonte.value = pres.ora.texture; disegna(M.scala, pres.poi); pres.gira();
      M.preme.uniforms.uDiv.value = div.texture;
      for (let i = 0; i < giri; i++) { M.preme.uniforms.uPres.value = pres.ora.texture; disegna(M.preme, pres.poi); pres.gira(); }
      M.toglie.uniforms.uPres.value = pres.ora.texture; M.toglie.uniforms.uVel.value = vel.ora.texture; disegna(M.toglie, vel.poi); vel.gira();
      M.porta.uniforms.uDt.value = dt; M.porta.uniforms.uVel.value = vel.ora.texture;
      M.porta.uniforms.uFonte.value = vel.ora.texture; M.porta.uniforms.uResta.value = scorre; disegna(M.porta, vel.poi); vel.gira();
      M.porta.uniforms.uVel.value = vel.ora.texture; M.porta.uniforms.uFonte.value = tinta.ora.texture; M.porta.uniforms.uResta.value = resta; disegna(M.porta, tinta.poi); tinta.gira();
    },
  };
  return f;
}

/** UN'IMMAGINE CHE NE SCOPRE UN'ALTRA dove passa il fluido. A e B sono due immagini preparate con `immagine()` di tre.js.
 *  «bordo» è quanto è morbido il confine; «piega» quanto il fluido sposta l'immagine mentre passa; «opacita» (da 0 a 1, anche
 *  dopo: `quadro.material.uniforms.uOpacita.value`) serve a far prendere al piano il posto di un video o di una foto, piano.
 *  Per cambiare piatto per sempre: a metà del passaggio metti B in A (`uniforms.uA.value = B`), e B resta quello che si scopre. */
export function rivela(A, B, acqua, { bordo = 0.22, piega = 0.00045, luce = 0.22, opacita = 1 } = {}) {
  const materia = new THREE.ShaderMaterial({
    uniforms: { uOpacita: { value: opacita }, uA: { value: A }, uB: { value: B }, uTinta: { value: null }, uVel: { value: null }, uScalaA: { value: new THREE.Vector2(1, 1) }, uScalaB: { value: new THREE.Vector2(1, 1) }, uBordo: { value: bordo }, uPiega: { value: piega }, uLuce: { value: luce } },
    vertexShader: `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: `
      uniform sampler2D uA, uB, uTinta, uVel; uniform vec2 uScalaA, uScalaB; uniform float uOpacita, uBordo, uPiega, uLuce; varying vec2 vUv;
      void main() {
        float t = texture2D(uTinta, vUv).r; vec2 v = texture2D(uVel, vUv).xy * uPiega;
        float m = smoothstep(0.5 - uBordo, 0.5 + uBordo, t);
        vec2 a = (vUv - 0.5 - v) * uScalaA + 0.5, b = (vUv - 0.5 - v * 0.4) * uScalaB + 0.5;
        vec3 c = mix(texture2D(uA, a).rgb, texture2D(uB, b).rgb, m);
        c += m * (1.0 - m) * 4.0 * uLuce;                                   // sul confine un filo di luce, come il bordo di una goccia
        gl_FragColor = vec4(c, uOpacita);
        #include <colorspace_fragment>
      }`,
  });
  materia.transparent = true;
  const quadro = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), materia);
  quadro.onBeforeRender = () => { materia.uniforms.uTinta.value = acqua.densita; materia.uniforms.uVel.value = acqua.velocita; };
  const adatta = (t, scala, forma) => { const f = t.image.width / t.image.height; if (f > forma) scala.set(forma / f, 1); else scala.set(1, f / forma); };
  quadro.userData.copri = (largo, alto) => { quadro.scale.set(largo, alto, 1); adatta(A, materia.uniforms.uScalaA.value, largo / alto); adatta(B, materia.uniforms.uScalaB.value, largo / alto); };
  return quadro;
}
