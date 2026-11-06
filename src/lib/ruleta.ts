// Ruleta aleatoria: entradas, sorteo justo y dibujo de la rueda.
// Lo usan la página y el navegador, así que no depende de nada de Astro.

export const RULETA_REVIEW = "2026-11-05";

export const MAX_ENTRIES = 500;

export const PRESETS: { key: string; label: string; title: string; entries: string[] }[] = [
    { key: "nombres", label: "Nombres", title: "¿A quién le toca?", entries: ["Ana", "Carlos", "Valentina", "Andrés", "Laura", "Santiago", "Camila", "Mateo"] },
    { key: "paga", label: "¿Quién paga?", title: "¿Quién paga hoy?", entries: ["Yo", "Tú", "El de la izquierda", "El de la derecha", "El que llegó tarde", "Mitad y mitad"] },
    { key: "si-no", label: "Sí o no", title: "¿Lo hago?", entries: ["Sí", "No", "Sí", "No"] },
    { key: "numeros", label: "Del 1 al 10", title: "Número de la suerte", entries: Array.from({ length: 10 }, (_, i) => String(i + 1)) },
    { key: "comida", label: "¿Qué comemos?", title: "¿Qué comemos?", entries: ["Pizza", "Hamburguesa", "Sushi", "Arepas", "Pollo", "Corrientazo", "Empanadas", "Ensalada"] },
];

/** Una entrada por línea (o separadas por comas si todo viene en una línea), sin vacías */
export function parseEntries(text: string) {
    const lines = text.includes("\n") ? text.split(/\r?\n/) : text.split(",");
    return lines
        .map((line) => line.trim().slice(0, 60))
        .filter(Boolean)
        .slice(0, MAX_ENTRIES);
}

/** Saca los @usuarios únicos de comentarios pegados de Instagram, TikTok o X */
export function extractHandles(text: string, { exclude = "" } = {}) {
    const excluded = new Set(
        exclude
            .split(/[\s,]+/)
            .map((handle) => handle.replace(/^@/, "").toLowerCase())
            .filter(Boolean),
    );
    const seen = new Map<string, string>();
    for (const match of text.matchAll(/@([A-Za-z0-9._]{1,30})/g)) {
        const handle = match[1].replace(/\.+$/, "");
        const key = handle.toLowerCase();
        if (handle && !excluded.has(key) && !seen.has(key)) seen.set(key, `@${handle}`);
    }
    return [...seen.values()].slice(0, MAX_ENTRIES);
}

/** Índice al azar con el generador criptográfico del navegador, sin sesgo de módulo */
export function secureIndex(length: number) {
    if (length <= 1) return 0;
    const limit = Math.floor(0x1_0000_0000 / length) * length;
    const buffer = new Uint32Array(1);
    do crypto.getRandomValues(buffer);
    while (buffer[0] >= limit);
    return buffer[0] % length;
}

/** Fracción al azar en [0, 1) con el mismo generador */
export const secureFraction = () => secureIndex(1_000_000) / 1_000_000;

/** Fisher–Yates con el generador seguro */
export function shuffle<T>(items: T[]) {
    const copy = [...items];
    for (let i = copy.length - 1; i > 0; i--) {
        const j = secureIndex(i + 1);
        [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
}

/**
 * Rotación final (en grados, sentido horario) para que el puntero, arriba, quede sobre `index`.
 * `offset` es la posición dentro del segmento (0 a 1); se evita la raya entre dos segmentos.
 */
export function targetRotation(current: number, index: number, count: number, offset: number, turns: number) {
    const slice = 360 / count;
    const angle = (index + 0.12 + offset * 0.76) * slice;
    const landing = (360 - angle) % 360;
    const base = current - (current % 360);
    let target = base + turns * 360 + landing;
    while (target - current < turns * 360) target += 360;
    return target;
}

/** Qué segmento está bajo el puntero con una rotación dada */
export function indexAt(rotation: number, count: number) {
    const angle = (((360 - (rotation % 360)) % 360) + 360) % 360;
    return Math.min(count - 1, Math.floor(angle / (360 / count)));
}

/* Colores: bandera, rojos y neutros, con texto legible en cada uno */
export const PALETTE: { fill: string; text: string }[] = [
    { fill: "#c42a1a", text: "#ffffff" },
    { fill: "#fcd116", text: "#15191e" },
    { fill: "#15191e", text: "#ffffff" },
    { fill: "#f0a598", text: "#15191e" },
    { fill: "#003893", text: "#ffffff" },
    { fill: "#fffdf9", text: "#15191e" },
    { fill: "#e0705f", text: "#15191e" },
    { fill: "#2c4a6e", text: "#ffffff" },
];

export function colorAt(index: number, count: number) {
    let color = index % PALETTE.length;
    // Que el último no quede pegado a uno de su mismo color
    if (index === count - 1 && count > 1 && color === 0) color = 3;
    return PALETTE[color];
}

const escapeXml = (text: string) => text.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
const truncate = (text: string, max: number) => (text.length > max ? `${text.slice(0, max - 1)}…` : text);

/** Los segmentos de la rueda en SVG (centro en 500,500, radio 440) */
export function wheelSegments(entries: string[]) {
    const count = Math.max(entries.length, 1);
    const list = entries.length ? entries : ["Agrega nombres"];
    const cx = 500;
    const cy = 500;
    const r = 440;
    const slice = (Math.PI * 2) / count;
    const fontSize = count <= 6 ? 44 : count <= 10 ? 38 : count <= 16 ? 30 : count <= 24 ? 24 : count <= 40 ? 17 : count <= 70 ? 11 : 0;
    const maxChars = count <= 10 ? 16 : count <= 24 ? 20 : 24;

    return list
        .map((entry, index) => {
            const color = entries.length ? colorAt(index, count) : { fill: "#e4ddd1", text: "#616c76" };
            // Ángulos desde las 12, en sentido horario
            const start = index * slice - Math.PI / 2;
            const end = start + slice;
            const shape =
                count === 1
                    ? `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${color.fill}"/>`
                    : `<path d="M${cx},${cy} L${(cx + r * Math.cos(start)).toFixed(2)},${(cy + r * Math.sin(start)).toFixed(2)} A${r},${r} 0 ${slice > Math.PI ? 1 : 0} 1 ${(cx + r * Math.cos(end)).toFixed(2)},${(cy + r * Math.sin(end)).toFixed(2)} Z" fill="${color.fill}"/>`;
            const mid = ((index + 0.5) * 360) / count - 90;
            const label = fontSize
                ? `<text x="${cx + r - 34}" y="${cy}" transform="rotate(${mid.toFixed(3)} ${cx} ${cy})" fill="${color.text}" font-size="${fontSize}" text-anchor="end" dominant-baseline="central">${escapeXml(truncate(entry, maxChars))}</text>`
                : "";
            return `<g>${shape}${label}</g>`;
        })
        .join("");
}

/** Bombillos alrededor de la rueda */
export function wheelLights(count = 24) {
    return Array.from({ length: count }, (_, index) => {
        const angle = (index / count) * Math.PI * 2;
        const x = 500 + 470 * Math.cos(angle);
        const y = 500 + 470 * Math.sin(angle);
        return `<circle class="bulb ${index % 2 ? "odd" : "even"}" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="9"/>`;
    }).join("");
}

/* Compartir: las entradas viajan en el hash (#), así nunca llegan a ningún servidor */

export function encodeShare(title: string, entries: string[]) {
    const json = JSON.stringify({ t: title, e: entries });
    const bytes = new TextEncoder().encode(json);
    let binary = "";
    for (const byte of bytes) binary += String.fromCharCode(byte);
    return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function decodeShare(hash: string): { title: string; entries: string[] } | null {
    try {
        const base = hash.replace(/-/g, "+").replace(/_/g, "/");
        const binary = atob(base + "===".slice((base.length + 3) % 4));
        const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
        const data = JSON.parse(new TextDecoder().decode(bytes));
        if (!Array.isArray(data.e)) return null;
        return {
            title: String(data.t ?? "").slice(0, 80),
            entries: data.e.map((entry: unknown) => String(entry).slice(0, 60)).filter(Boolean).slice(0, MAX_ENTRIES),
        };
    } catch {
        return null;
    }
}
