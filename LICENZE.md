# Le librerie di questo sito, e le loro licenze

Stanno tutte nella cartella `libreria/`, copiate dal registro ufficiale npm: il sito non chiama server di altri.
Gli avvisi in testa ai file non si tolgono. Questo foglio resta nella cartella del sito.

| Libreria | Versione | A cosa serve | Licenza | Da dove |
|---|---|---|---|---|
| GSAP (`gsap.min.js`, `ScrollTrigger.min.js`, `SplitText.min.js`) | 3.15.1 | le scene legate allo scorrimento, le entrate, i titoli riga per riga | «Standard no charge license» di GSAP: gratis anche per uso commerciale, plugin compresi. Non è una licenza libera: vieta di usarla dentro strumenti visivi per costruire animazioni in concorrenza con Webflow. Testo: https://gsap.com/standard-license | npm `gsap` |
| Lenis (`lenis.min.js`, `lenis.css`) | 1.3.27 | lo scorrimento morbido, solo col mouse | MIT (`libreria/LICENZA-lenis.txt`) | npm `lenis` |
| Three.js (`three.module.min.js`, `three.core.min.js`), solo dove c'è il 3D | 0.180.0 | il 3D | MIT (`libreria/LICENZA-three.txt`) | npm `three` |

Lette il 10/11/2026. Se aggiorni una libreria: tutti i file di Three.js dalla stessa versione, e riscrivi la riga qui sopra.

**Nella cartella pubblicata** (la fa `costruisci.py`, dal 12/11/2026) i file sono uniti per arrivare prima su una rete lenta:
GSAP, ScrollTrigger e SplitText stanno dentro `gusto.<impronta>.js`, ognuno col suo avviso in testa; di Three.js ci sono solo i
pezzi che la pagina usa, dentro `tre3d.<impronta>.js`, con l'avviso in testa al file e `libreria/LICENZA-three.txt` accanto;
Lenis resta in `libreria/lenis.min.js` (lo chiama il motore, solo dove c'è il mouse). Gli attrezzi che li uniscono (esbuild, e
Three.js 0.180.0 da npm: la stessa versione) stanno fuori dal sito, in `sorgenti-e-attrezzi/attrezzi/veloce/`.
I caratteri pubblicati (`caratteri/*.<impronta>.woff2`) sono gli stessi, ridotti alle lettere che le pagine usano: la licenza
OFL lo permette, e non ci sono nomi riservati.

## I caratteri

| Cosa | Autore | Licenza | Da dove | Data |
|---|---|---|---|---|
| Fraunces (`caratteri/fraunces-normal-latin.woff2`, `fraunces-italic-latin.woff2`) | The Fraunces Project Authors (github.com/undercasetype/Fraunces) | SIL Open Font License 1.1, nessun nome riservato | dal repo del sito di oggi (`assets/fonts/`), ridotto all'alfabeto latino e ai pesi 380-640 | 11/11/2026 |
| Inter (`caratteri/inter-normal-latin.woff2`) | The Inter Project Authors (github.com/rsms/inter) | SIL Open Font License 1.1, nessun nome riservato | dal repo del sito di oggi (`assets/fonts/`), ridotto all'alfabeto latino e ai pesi 400-600 | 11/11/2026 |

## Il materiale di Gusto (non di altri)

- `img/tavola-*.avif`, `frigo-*`, `lista-*`, `dispensa-*`: schermate vere dell'app, con dati di prova (`GUSTO-LANCIO-30-GIORNI/immagini-prova/`, 15/10/2026), solo ridotte.
- `img/piatti/` (dove c'è): i piatti ritagliati dell'app (`Gusto-App/scripts/dish-cutouts/provini/`).
- `img/icona-*.png`: l'icona dell'app. `img/condivisione.jpg`: fatta per questa pagina dal materiale qui sotto.

## Il materiale generato con Higgsfield (11/11/2026)

Immagini e video generati per Gusto partendo dalle foto dei piatti dell'app (`OnboardingGusti`), col conto di Gusto su
Higgsfield (immagini: `marketing-studio/image`; video: Kling 3.0 Pro, da immagine). Sono illustrazioni: nel piè di pagina
c'è scritto «Le foto dei piatti sono illustrazioni». Prompt, costi e tentativi: `materiale.md` nella cartella di consegna.

- `film/` (direzione 1): i fotogrammi delle due riprese «la camera si alza» (larga per il computer, in piedi per il telefono).
- `piatto/` (direzione 2): i fotogrammi della ciotola che gira, ritagliati dal fondo; la caprese nella stessa ciotola.
- `tavole/`, `video/` (direzione 3): la tavola con pasta e ceci, caprese e orzo nella stessa inquadratura; la luce che si muove.

Prima di pubblicare: dove e come dichiarare le immagini generate, e il diritto di usarle in pubblicità, lo decide chi fa il
legale (`cosa-manca.md`).
