// Contador de palabras y caracteres, y conversiones de mayúsculas y minúsculas pensadas para el español.
// Lo usan la página y el navegador; todo se calcula en el equipo de quien lo usa.

export const TEXTO_REVIEW = "2026-11-10";

/** Palabras por minuto para estimar tiempos (lectura silenciosa y en voz alta, en español) */
export const READING_WPM = 230;
export const SPEAKING_WPM = 150;

const hasSegmenter = typeof Intl !== "undefined" && "Segmenter" in Intl;
const graphemes = hasSegmenter ? new Intl.Segmenter("es", { granularity: "grapheme" }) : null;
const wordSegmenter = hasSegmenter ? new Intl.Segmenter("es", { granularity: "word" }) : null;

/** Caracteres como los ve una persona: un emoji o una letra con tilde cuentan como uno */
export function characters(text: string) {
    if (graphemes) {
        let count = 0;
        for (const _ of graphemes.segment(text)) count++;
        return count;
    }
    return [...text].length;
}

/** Palabras: letras o números seguidos, sin signos de puntuación ni emojis */
export function words(text: string): string[] {
    if (wordSegmenter) return [...wordSegmenter.segment(text)].filter((segment) => segment.isWordLike).map((segment) => segment.segment);
    return text.match(/[\p{L}\p{N}]+(?:['’][\p{L}\p{N}]+)*/gu) ?? [];
}

// Palabras vacías del español: no cuentan como palabras clave
const STOPWORDS = new Set(
    "a al algo algún alguna algunas alguno algunos ante antes aquí así aun aunque cada como con contra cual cuales cuando de del desde donde dos e el ella ellas ello ellos en entre era eran es esa esas ese eso esos esta estaba estado estas este esto estos fue fueron ha había han hasta hay la las le les lo los más me mi mis mucho muy nada ni no nos nosotros o os otra otras otro otros para pero poco por porque que qué quien se sea ser si sí sido sin sobre son su sus también tan te tiene tienen todo todos tu tus un una uno unos unas usted y ya yo él ésta éste"
        .split(" "),
);

export interface Stats {
    characters: number;
    charactersNoSpaces: number;
    words: number;
    uniqueWords: number;
    sentences: number;
    paragraphs: number;
    lines: number;
    /** Minutos */
    reading: number;
    speaking: number;
    averageWordLength: number;
    keywords: { word: string; count: number; density: number }[];
}

export function analyze(text: string, { keywordLimit = 8 } = {}): Stats {
    const list = words(text);
    const lower = list.map((word) => word.toLocaleLowerCase("es"));
    const frequency = new Map<string, number>();
    for (const word of lower) if (word.length >= 3 && !STOPWORDS.has(word) && !/^\d+$/.test(word)) frequency.set(word, (frequency.get(word) ?? 0) + 1);

    const trimmed = text.trim();
    // Oraciones: terminan en punto, signo de cierre o puntos suspensivos; un texto sin punto final es una oración
    const sentences = trimmed ? trimmed.split(/(?<=[.!?…])\s+|\n+/).filter((part) => /[\p{L}\p{N}]/u.test(part)).length : 0;

    return {
        characters: characters(text),
        charactersNoSpaces: characters(text.replace(/\s/g, "")),
        words: list.length,
        uniqueWords: new Set(lower).size,
        sentences,
        paragraphs: trimmed ? trimmed.split(/\n\s*\n/).filter((part) => part.trim()).length : 0,
        lines: text ? text.split("\n").length : 0,
        reading: list.length / READING_WPM,
        speaking: list.length / SPEAKING_WPM,
        averageWordLength: list.length ? list.reduce((sum, word) => sum + characters(word), 0) / list.length : 0,
        keywords: [...frequency.entries()]
            .filter(([, count]) => count > 1)
            .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "es"))
            .slice(0, keywordLimit)
            .map(([word, count]) => ({ word, count, density: count / list.length })),
    };
}

/** Límites de caracteres más buscados */
export const LIMITS = [
    { key: "x", label: "Post en X (Twitter)", max: 280 },
    { key: "bio", label: "Bio de Instagram", max: 150 },
    { key: "instagram", label: "Descripción de Instagram", max: 2200 },
    { key: "linkedin", label: "Publicación de LinkedIn", max: 3000 },
    { key: "youtube", label: "Título de YouTube", max: 100 },
    { key: "seo-title", label: "Título para Google", max: 60, note: "aprox." },
    { key: "seo-description", label: "Meta descripción", max: 160, note: "aprox." },
    { key: "sms", label: "SMS", max: 160, note: "70 con tildes o emojis" },
];

/** Un SMS admite 160 caracteres solo si todo está en el alfabeto GSM-7 (sin tildes salvo é, ñ, ü…) */
const GSM7 = /^[@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞÆæßÉ !"#¤%&'()*+,\-./0-9:;<=>?¡A-ZÄÖÑÜ§¿a-zäöñüà^{}\\[~\]|€]*$/;
export const smsLimit = (text: string) => (GSM7.test(text) ? 160 : 70);

/* Conversiones */

const SMALL_WORDS = new Set("a al ante bajo con contra de del desde e el en entre hacia hasta la las lo los mediante o para por según sin so sobre tras u un una unas unos y".split(" "));

const upper = (text: string) => text.toLocaleUpperCase("es");
const lower = (text: string) => text.toLocaleLowerCase("es");

export const TRANSFORMS = [
    { key: "mayusculas", label: "MAYÚSCULAS", apply: upper },
    { key: "minusculas", label: "minúsculas", apply: lower },
    {
        key: "oracion",
        label: "Tipo oración",
        // Mayúscula al inicio, después de punto, ? ! … o salto de línea, saltando ¿ ¡ comillas, paréntesis y emojis
        apply: (text: string) => lower(text).replace(/(^|[.!?…]\s+|\n)([^\p{L}\p{N}]*?)(\p{L})/gu, (_, before, open, letter) => before + open + upper(letter)),
    },
    {
        key: "titulo",
        label: "Tipo Título",
        apply: (text: string) => {
            let first = true;
            return lower(text).replace(/[\p{L}\p{N}]+|[.!?…:\n]/gu, (token) => {
                if (/^[.!?…:\n]$/.test(token)) {
                    first = true;
                    return token;
                }
                const result = first || !SMALL_WORDS.has(token) ? upper(token.charAt(0)) + token.slice(1) : token;
                first = false;
                return result;
            });
        },
    },
    {
        key: "invertir",
        label: "iNVERTIR",
        apply: (text: string) => [...text].map((char) => (char === upper(char) ? lower(char) : upper(char))).join(""),
    },
    {
        key: "tildes",
        label: "Quitar tildes",
        // Quita acentos y diéresis pero conserva la ñ
        apply: (text: string) =>
            text
                .normalize("NFD")
                .replace(/([nN])̃/g, "$1")
                .replace(/\p{M}/gu, "")
                .replace(/([nN])/g, "$1̃")
                .normalize("NFC"),
    },
    {
        key: "espacios",
        label: "Limpiar espacios",
        // Un solo espacio entre palabras, sin espacios al final de las líneas ni más de una línea en blanco seguida
        apply: (text: string) =>
            text
                .replace(/[^\S\n]+/g, " ")
                .replace(/ *\n */g, "\n")
                .replace(/\n{3,}/g, "\n\n")
                .trim(),
    },
] as const;

export type TransformKey = (typeof TRANSFORMS)[number]["key"];
export const transform = (key: TransformKey, text: string) => TRANSFORMS.find((t) => t.key === key)!.apply(text);

/** "1 min 30 s", "menos de 1 s" */
export function formatDuration(minutes: number) {
    const seconds = Math.round(minutes * 60);
    if (seconds < 1) return "0 s";
    if (seconds < 60) return `${seconds} s`;
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return s ? `${m} min ${s} s` : `${m} min`;
}

export const formatInt = (value: number) => String(Math.round(value)).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
