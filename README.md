# FlowChat

Een gratis AI-chatwebsite met echte lokale inferentie: React, TypeScript en Transformers.js draaien **Qwen2.5-0.5B-Instruct** in een aparte browserworker. Geen account, API-sleutel, AI-server of betaalde dienst. Dit is een open model, geen OpenAI GPT of ChatGPT.

Websiteadres: https://gidosluiter.github.io/proxy/

## Gebruik

Open de website in een recente browser en schrijf je eerste vraag. Het model wordt dan gedownload, of gebruik **Download AI-model** vooraf. De eerste download is ongeveer **520 MB inclusief tokenizer**; de WASM-runtime is circa 27 MB. Gebruik bij voorkeur een moderne computer met voldoende vrij geheugen. Antwoorden kunnen op oudere apparaten traag zijn. De desktop-inferentie is afzonderlijk gecontroleerd; mobiele UI-tests garanderen geen geschikte hardware voor het model.

Antwoorden verschijnen tijdens het genereren. **Stop** onderbreekt ook downloaden en initialisatie. Nieuw gesprek, gesprekken wisselen, opnieuw genereren, hernoemen, verwijderen, thema's, kopiëren en JSON-export zijn beschikbaar. Maximaal 20 gesprekken met 60 berichten per gesprek; input is beperkt tot 2000 tekens en modelcontext is begrensd. Het kleine model kan fouten maken, heeft geen live internetkennis en geeft geen garantie op Nederlands taalniveau.

Je berichten blijven op je apparaat. Modelbestanden worden bij de eerste start opgehaald bij Hugging Face, die je IP-adres bij die download kan zien. Wijzigingen in een ander tabblad synchroniseren de geschiedenis en stoppen een lopend antwoord. Gesprekken staan in lokale browseropslag; exporteer belangrijke informatie. Modelbestanden gebruiken de browsercache. De browser kan deze cache verwijderen als ruimte nodig is; dan volgt opnieuw een download. Wis sitegegevens via je browser om zowel gesprekken als modelcache te verwijderen.

## Ontwikkelen en draaien

Node.js **24 of nieuwer**.

```sh
npm run install:deps
npm run dev
```

De install-helper voert een normale `npm ci` uit met `ONNXRUNTIME_NODE_INSTALL=skip`: deze browserapp heeft geen optionele native GPU-onderdelen nodig. De lockfile en pakketintegriteitscontroles blijven van kracht. Voor een handmatige installatie op Linux: `ONNXRUNTIME_NODE_INSTALL=skip npm ci`.

Vite draait op 5173; Express op 3000. De chat heeft geen backend-API nodig. De behouden oorspronkelijke proxy staat op `/legacy/` en gebruikt `/api/` op de Node-server.

```sh
npm run build
npm start
npm test
npx playwright install chromium
npm run test:e2e
npm run build:pages
npm run test:e2e:pages
```

De build kopieert bijpassende ONNX WASM-runtimebestanden uit de vergrendelde dependency naar de gegenereerde `public/runtime/`-map. Het model en de runtime gebruiken single-threaded WASM; WebGPU, SharedArrayBuffer en COOP/COEP zijn niet vereist. Berichten worden als veilige Markdown weergegeven; remote afbeeldingen en ruwe HTML worden niet uitgevoerd. De Node-server houdt een CSP met exacte modelhosts en WASM-toestemming.

## GitHub Pages

De `Deploy GitHub Pages` workflow installeert dependencies, voert de unit- en desktop/mobiele Pages-tests uit, uploadt het gebouwde artifact en publiceert wijzigingen op `main`. Project-assets blijven onder `/proxy/`. **Settings → Pages → Source moet GitHub Actions zijn.** De Codex-integratie mag deze beheerinstelling mogelijk niet wijzigen; alleen een eigenaar kan die dan opslaan. Een workflow in de repository alleen activeert Pages niet.

De chat draait volledig in de browser en werkt op statische hosting. De oorspronkelijke [FlowProxy](docs/legacy-proxy.md) heeft onder `/legacy/` een directe-linkversie op Pages; voor de echte leesproxy is Node-hosting nodig. [Chatvalidatie](docs/chat-validation.md) onderscheidt echte inferentie, gecontroleerde UI-fixtures en live publicatie.

## Node- en Docker-deployment

```sh
docker build -t flowchat .
docker run --rm -p 3000:3000 flowchat
```

Of gebruik buildcommand `npm run install:deps && npm run build` en startcommand `npm start`. Docker draait als niet-rootgebruiker. De chat gebruikt geen servergeheimen. De legacy-proxy bewaart zijn domeinbeleid, DNS/IP-controle en beperkingen; zie de aparte documentatie.

Appcode is MIT. Transformers.js, het Qwen-model en de overige open-source dependencies behouden hun eigen licenties. Modelrevision: `22942cb7d7ba4cc81bb4673549ca4d4614469b5e`.
