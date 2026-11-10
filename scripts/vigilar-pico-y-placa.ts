// Vigilante semanal del pico y placa. Lo corre la GitHub Action "Vigilar pico y placa".
//
// 1. Sin IA: avisa si una rotación ya venció o vence en los próximos días.
// 2. Baja los titulares recientes de Google News de cada ciudad (con el dominio real de cada medio).
// 3. Un modelo de lenguaje (API compatible con OpenAI) decide si alguno anuncia un cambio y, si los titulares traen los datos, propone la
//    rotación nueva. Cita los titulares por su id, así que no puede inventar fuentes.
// 4. Si la propuesta pasa la validación y tiene respaldo (un dominio .gov.co o dos medios distintos),
//    abre un PR por ciudad con el cambio escrito en src/lib/pico-y-placa.ts. Lo demás va a un issue.
// Nunca hace merge: el dato llega a producción solo cuando una persona aprueba el PR.
//
// Uso local (sin tocar git): npx --yes tsx@4 scripts/vigilar-pico-y-placa.ts
//   PICO_HOY=2026-12-20        simula otra fecha
//   PICO_FAKE_LLM=a.json       usa una respuesta guardada en vez de llamar a la API
//   PICO_CREATE_PR=1           crea ramas y PRs (solo en la Action)

import { execFileSync } from "node:child_process";
import { appendFileSync, readFileSync, writeFileSync } from "node:fs";
import { CITIES, PICO_Y_PLACA_REVIEW, formatHours, rotationOn, type Digit, type Rotation, type Window } from "@/lib/pico-y-placa";
import { addDays, todayInColombia } from "@/lib/festivos";

const LIB = "src/lib/pico-y-placa.ts";
const HORIZON_DAYS = 21;
const NEWS_DAYS = 14;
const today = process.env.PICO_HOY || todayInColombia();
const horizon = addDays(today, HORIZON_DAYS);

interface Headline {
    id: string;
    title: string;
    link: string;
    date: string;
    outlet: string;
    domain: string;
}

interface Proposal {
    from: string;
    until: string | null;
    hours: Window[];
    weekdays: Record<string, number[]> | "paridad";
    saturday?: { hours: Window[]; anchor: string; cycle: number[][] };
}

interface Verdict {
    slug: string;
    changed: boolean;
    confidence: "alta" | "media" | "baja";
    summary: string;
    evidence: string[];
    proposal?: Proposal | null;
}

/* 1. Vencimientos */

const expiry: string[] = [];
for (const city of CITIES.filter((city) => !city.none)) {
    const current = rotationOn(city, today);
    const last = [...city.rotations].sort((a, b) => (b.until ?? "9999").localeCompare(a.until ?? "9999"))[0];
    if (!current) expiry.push(`- **${city.name}**: no hay rotación vigente para hoy (${today}). La página muestra "por confirmar".`);
    else if (last?.until && last.until <= horizon) expiry.push(`- **${city.name}**: la última rotación cargada vence el ${last.until}. Hay que buscar el decreto de la siguiente.`);
}

/* 2. Titulares */

const decode = (text: string) =>
    text
        .replace(/<!\[CDATA\[|\]\]>/g, "")
        .replace(/&amp;/g, "&")
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .trim();

async function headlines(slug: string, name: string): Promise<Headline[]> {
    const query = `"pico y placa" ${name} (rotación OR decreto OR cambia OR nuevo) when:${NEWS_DAYS}d`;
    const url = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=es-419&gl=CO&ceid=CO:es-419`;
    try {
        const response = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0 (compatible; pico-y-placa-monitor)" } });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const xml = await response.text();
        return [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].slice(0, 12).map(([, item], index) => {
            const source = item.match(/<source url="([^"]*)">([\s\S]*?)<\/source>/);
            let domain = "";
            try {
                domain = new URL(source?.[1] ?? "").hostname.replace(/^www\./, "");
            } catch {}
            return {
                id: `${slug}-${index + 1}`,
                title: decode(item.match(/<title>([\s\S]*?)<\/title>/)?.[1] ?? ""),
                link: decode(item.match(/<link>([\s\S]*?)<\/link>/)?.[1] ?? ""),
                date: new Date(item.match(/<pubDate>([\s\S]*?)<\/pubDate>/)?.[1] ?? Date.now()).toISOString().slice(0, 10),
                outlet: decode(source?.[2] ?? domain),
                domain,
            };
        });
    } catch (error) {
        console.warn(`No se pudieron leer las noticias de ${name}: ${(error as Error).message}`);
        return [];
    }
}

const news: Record<string, Headline[]> = Object.fromEntries(await Promise.all(CITIES.map(async (city) => [city.slug, await headlines(city.slug, city.name)] as const)));
const byId = new Map(Object.values(news).flat().map((headline) => [headline.id, headline]));
console.log(`Titulares: ${CITIES.map(({ slug, name }) => `${name} ${news[slug].length}`).join(", ")}`);

/* 3. Modelo de lenguaje */

const rules = CITIES.map((city) => ({
    slug: city.slug,
    ciudad: city.name,
    sinMedida: Boolean(city.none),
    rotaciones: city.rotations.map(({ from, until, hours, weekdays, saturday }) => ({ from, until, hours, weekdays, saturday })),
    temporadas: city.seasons,
}));

async function askModel(): Promise<Verdict[] | null> {
    if (process.env.PICO_FAKE_LLM) return JSON.parse(readFileSync(process.env.PICO_FAKE_LLM, "utf8")).ciudades;
    const key = process.env.LLM_API_KEY;
    if (!key) {
        console.log("Sin LLM_API_KEY: solo se revisan vencimientos.");
        return null;
    }
    const titles = Object.fromEntries(Object.entries(news).map(([slug, items]) => [slug, items.map(({ id, title, date, outlet, domain }) => ({ id, date, outlet, domain, title }))]));
    const prompt = `Hoy es ${today} en Colombia. Estas son las reglas de pico y placa para carros particulares que publica un sitio web. En "weekdays", la clave es el día (1 = lunes … 5 = viernes) y el valor, los últimos dígitos de placa que NO circulan; "paridad" significa que los días pares del mes no circulan 1-5 y los impares 6-0. "hours" son franjas [inicio, fin] en 24 horas.

${JSON.stringify(rules)}

Titulares de noticias de los últimos ${NEWS_DAYS} días, por ciudad, cada uno con un id:

${JSON.stringify(titles)}

Para cada ciudad decide si los titulares anuncian algo que vuelva obsoletas esas reglas: una rotación nueva de dígitos, otro horario, otra fecha de inicio o de fin, una suspensión, o que una ciudad sin medida la empiece a aplicar. Las notas del día a día que repiten la regla vigente NO son un cambio. Sin evidencia clara, changed=false.

Si changed=true y los titulares traen TODOS los datos de la rotación nueva (dígitos de cada día, horario y fecha de inicio), llena "proposal" con el mismo formato de las reglas. Si falta cualquier dato, proposal=null. No completes ni supongas datos.

En "evidence" pon solo ids de los titulares de arriba que sustentan el cambio.

Responde solo JSON:
{"ciudades":[{"slug":"medellin","changed":false,"confidence":"alta|media|baja","summary":"qué cambia, en español","evidence":["medellin-3"],"proposal":null}]}`;

    // Cualquier API compatible con OpenAI: cambia LLM_BASE_URL para usar otro proveedor
    const base = (process.env.LLM_BASE_URL || "https://api.openai.com/v1").replace(/\/+$/, "");
    const response = await fetch(`${base}/chat/completions`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
        body: JSON.stringify({
            model: process.env.LLM_MODEL || "gpt-6-luna",
            messages: [
                { role: "system", content: "Eres un verificador cuidadoso de normas de tránsito en Colombia. Nunca inventas datos. Respondes solo JSON válido." },
                { role: "user", content: prompt },
            ],
            response_format: { type: "json_object" },
        }),
    });
    if (!response.ok) throw new Error(`El modelo respondió ${response.status}: ${await response.text()}`);
    const data = await response.json();
    return (JSON.parse(data.choices[0].message.content).ciudades ?? []) as Verdict[];
}

/* 4. Validación */

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const TIME = /^([01]\d|2[0-4]):[0-5]\d$/;
const isDigit = (value: unknown): value is Digit => Number.isInteger(value) && (value as number) >= 0 && (value as number) <= 9;

function validate(proposal: Proposal, slug: string): string[] {
    const errors: string[] = [];
    const city = CITIES.find((city) => city.slug === slug);
    if (!city || city.none) errors.push("ciudad sin medida o desconocida: requiere revisión manual");
    if (!DATE.test(proposal.from) || Number.isNaN(Date.parse(proposal.from))) errors.push(`fecha de inicio inválida: ${proposal.from}`);
    if (proposal.from < addDays(today, -30)) errors.push(`la fecha de inicio ${proposal.from} es de hace más de un mes`);
    if (proposal.until != null && (!DATE.test(proposal.until) || proposal.until <= proposal.from)) errors.push(`fecha de fin inválida: ${proposal.until}`);
    if (city?.rotations.some(({ from }) => from === proposal.from)) errors.push(`ya existe una rotación que empieza el ${proposal.from}`);

    const checkHours = (hours: Window[], label: string) => {
        if (!Array.isArray(hours) || !hours.length) errors.push(`${label}: sin horario`);
        else for (const window of hours) if (!Array.isArray(window) || !TIME.test(window[0]) || !TIME.test(window[1]) || window[0] >= window[1]) errors.push(`${label}: franja inválida ${JSON.stringify(window)}`);
    };
    checkHours(proposal.hours, "horario");

    if (proposal.weekdays !== "paridad") {
        const days = Object.keys(proposal.weekdays ?? {});
        if (days.some((day) => !["1", "2", "3", "4", "5"].includes(day))) errors.push(`días inválidos: ${days.join(", ")}`);
        const digits = Object.values(proposal.weekdays ?? {}).flat();
        if (!digits.every(isDigit)) errors.push(`dígitos inválidos: ${digits.join(", ")}`);
        if (new Set(digits).size !== digits.length) errors.push("un dígito se repite en dos días");
        if (days.length === 5 && digits.length !== 10) errors.push(`con los 5 días deberían estar los 10 dígitos y hay ${digits.length}`);
    }
    if (proposal.saturday) {
        checkHours(proposal.saturday.hours, "sábados");
        if (!DATE.test(proposal.saturday.anchor)) errors.push("sábados: fecha de referencia inválida");
        if (!proposal.saturday.cycle?.flat().every(isDigit)) errors.push("sábados: dígitos inválidos");
    }
    return errors;
}

/** Respaldo suficiente: un dominio oficial o dos medios distintos */
function backing(evidence: Headline[]) {
    const official = evidence.find(({ domain }) => domain.endsWith(".gov.co"));
    const outlets = new Set(evidence.map(({ domain, outlet }) => domain || outlet));
    return { ok: Boolean(official) || outlets.size >= 2, official, outlets: outlets.size };
}

/* 5. Escribir la rotación en la librería */

function insertRotation(source: string, slug: string, rotation: Rotation) {
    const start = source.indexOf(`slug: "${slug}"`);
    const anchor = source.indexOf("rotations: [", start);
    if (start < 0 || anchor < 0) throw new Error(`No encontré las rotaciones de ${slug}`);
    const at = anchor + "rotations: [".length;
    const literal = JSON.stringify(rotation, null, 4)
        // Listas cortas en una línea: [5, 8] y ["05:00", "20:00"]
        .replace(/\[\s*([^[\]{}]*?)\s*\]/g, (_, items: string) => `[${items.split(/,\s*/).join(", ")}]`)
        .replace(/"([a-z]+)":/g, "$1:")
        .split("\n")
        .map((line) => `            ${line}`)
        .join("\n");
    // La rotación nueva va primero: si se cruza con la anterior, gana la nueva desde su fecha
    return `${source.slice(0, at)}\n${literal},${source.slice(at)}`.replace(/PICO_Y_PLACA_REVIEW = "[^"]*"/, `PICO_Y_PLACA_REVIEW = "${today}"`);
}

const git = (...args: string[]) => execFileSync("git", args, { stdio: "inherit" });
const gh = (...args: string[]) => execFileSync("gh", args, { encoding: "utf8" }).trim();

function openPullRequest(slug: string, verdict: Verdict, rotation: Rotation, evidence: Headline[]) {
    const city = CITIES.find((city) => city.slug === slug)!;
    const branch = `pico-y-placa/${slug}-${rotation.from}`;
    if (gh("pr", "list", "--state", "all", "--head", branch, "--json", "number", "--jq", ".[0].number")) {
        console.log(`Ya existe un PR para ${branch}`);
        return null;
    }
    const original = readFileSync(LIB, "utf8");
    git("checkout", "-B", branch, "origin/main");
    writeFileSync(LIB, insertRotation(readFileSync(LIB, "utf8"), slug, rotation));
    git("add", LIB);
    git("-c", "user.name=github-actions[bot]", "-c", "user.email=41898282+github-actions[bot]@users.noreply.github.com", "commit", "-m", `feat(pico-y-placa): nueva rotación de ${city.name} desde ${rotation.from}`);
    git("push", "--force", "origin", branch);
    const body = `El vigilante (${process.env.LLM_MODEL || "gpt-6-luna"}) detectó una rotación nueva en **${city.name}** (confianza ${verdict.confidence}).

${verdict.summary}

**Propuesta:** desde el ${rotation.from}${rotation.until ? ` hasta el ${rotation.until}` : ""}, ${formatHours(rotation.hours)}.
${rotation.weekdays === "paridad" ? "Esquema par/impar." : Object.entries(rotation.weekdays).map(([day, digits]) => `- ${["", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes"][Number(day)]}: ${digits!.join(" y ")}`).join("\n")}

**Evidencia:**
${evidence.map(({ title, link, outlet, date }) => `- ${date} [${title}](${link}) (${outlet})`).join("\n")}

### Antes de hacer merge
- [ ] Confirmé los dígitos, el horario y las fechas con el decreto o el boletín oficial de la ${city.authority}.
- [ ] Cambié \`source\` por el enlace oficial si el de la evidencia es de un medio.
- [ ] Si la rotación anterior termina antes, ajusté su \`until\`.

El merge a main publica el cambio.`;
    const url = gh("pr", "create", "--base", "main", "--head", branch, "--title", `Pico y placa ${city.name}: rotación desde ${rotation.from}`, "--body", body);
    git("checkout", "main");
    writeFileSync(LIB, original);
    return url;
}

/* Ejecución */

let verdicts: Verdict[] | null = null;
let aiError = "";
try {
    verdicts = await askModel();
} catch (error) {
    aiError = (error as Error).message;
    console.error(aiError);
}

const prs: string[] = [];
const manual: string[] = [];

for (const verdict of (verdicts ?? []).filter((verdict) => verdict.changed)) {
    const city = CITIES.find(({ slug }) => slug === verdict.slug);
    const name = city?.name ?? verdict.slug;
    const evidence = (verdict.evidence ?? []).map((id) => byId.get(id)).filter((headline): headline is Headline => Boolean(headline));
    const links = evidence.map(({ title, link, outlet }) => `  - [${title}](${link}) (${outlet})`).join("\n") || "  - (sin titulares válidos)";
    const support = backing(evidence);
    const problems = verdict.proposal ? validate(verdict.proposal, verdict.slug) : ["los titulares no traen todos los datos de la rotación"];
    if (!support.ok) problems.push("sin fuente oficial ni dos medios distintos");

    if (verdict.proposal && !problems.length) {
        const proposal = verdict.proposal;
        const main = support.official ?? evidence[0];
        const rotation: Rotation = {
            from: proposal.from,
            until: proposal.until,
            hours: proposal.hours,
            weekdays: proposal.weekdays as Rotation["weekdays"],
            ...(proposal.saturday ? { saturday: proposal.saturday as Rotation["saturday"] } : {}),
            source: { label: `${main.outlet}: ${main.title}`.slice(0, 160), href: main.link },
        };
        if (process.env.PICO_CREATE_PR) {
            const url = openPullRequest(verdict.slug, verdict, rotation, evidence);
            if (url) prs.push(`- **${name}**: ${url}`);
        } else {
            console.log(`\n[simulación] PR para ${name}. Así quedaría la librería:\n`);
            const updated = insertRotation(readFileSync(LIB, "utf8"), verdict.slug, rotation);
            // PICO_WRITE_TO=ruta guarda la librería modificada para probar que compila
            if (process.env.PICO_WRITE_TO) writeFileSync(process.env.PICO_WRITE_TO, updated);
            const at = updated.indexOf(`slug: "${verdict.slug}"`);
            console.log(updated.slice(updated.indexOf("rotations: [", at), updated.indexOf("rotations: [", at) + 700));
            prs.push(`- **${name}**: (simulación) PR con la rotación desde ${rotation.from}`);
        }
    } else {
        manual.push(`- **${name}** (confianza ${verdict.confidence}): ${verdict.summary}\n  - No se abrió PR: ${problems.join("; ")}.\n${links}`);
    }
}

/* Informe para el issue */

const sections: string[] = [];
if (expiry.length) sections.push(`## Rotaciones por vencer\n\n${expiry.join("\n")}`);
if (manual.length) sections.push(`## Posibles cambios que hay que revisar a mano\n\n${manual.join("\n")}`);
if (prs.length) sections.push(`## PRs abiertos\n\n${prs.join("\n")}`);
if (aiError) sections.push(`## El modelo falló\n\n\`\`\`\n${aiError.slice(0, 1500)}\n\`\`\``);

const found = expiry.length > 0 || manual.length > 0 || aiError !== "";
if (sections.length) {
    const allNews = CITIES.map(({ slug, name }) => {
        const items = news[slug] ?? [];
        return `**${name}**\n${items.length ? items.map(({ title, link, date, outlet }) => `- ${date} [${title}](${link}) (${outlet})`).join("\n") : "- Sin titulares"}`;
    }).join("\n\n");
    const report = `Revisión automática del ${today}. Las reglas se revisaron a mano por última vez el ${PICO_Y_PLACA_REVIEW}.

${sections.join("\n\n")}

Para actualizar a mano: confirma con el decreto o el boletín oficial y agrega la rotación nueva en \`${LIB}\` (con \`from\`, \`until\` y \`source\`), y cambia \`PICO_Y_PLACA_REVIEW\`.

<details><summary>Titulares revisados</summary>

${allNews}

</details>
`;
    writeFileSync("reporte-pico-y-placa.md", report);
    console.log(`\n${report}`);
} else {
    console.log("Sin vencimientos cercanos ni cambios detectados.");
}

// El issue solo se abre si hay algo que hacer a mano; los PRs avisan por su cuenta
if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `found=${found}\n`);
