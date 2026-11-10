// Links de WhatsApp (wa.me) con mensaje prellenado. Lo usan la página y el navegador.
// Formato oficial: https://wa.me/<número en formato internacional, solo dígitos>?text=<mensaje codificado>

export const WHATSAPP_REVIEW = "2026-11-10";

export interface Country {
    iso: string;
    name: string;
    code: string;
    /** Dígitos del número nacional, para avisar si parece incompleto */
    digits: number[];
    /** Prefijo que WhatsApp exige después del código de país (Argentina usa 9 en celulares) */
    mobilePrefix?: string;
    example: string;
}

export const COUNTRIES: Country[] = [
    { iso: "CO", name: "Colombia", code: "57", digits: [10], example: "300 123 4567" },
    { iso: "MX", name: "México", code: "52", digits: [10], example: "55 1234 5678" },
    { iso: "AR", name: "Argentina", code: "54", digits: [10], mobilePrefix: "9", example: "11 2345 6789" },
    { iso: "CL", name: "Chile", code: "56", digits: [9], example: "9 1234 5678" },
    { iso: "PE", name: "Perú", code: "51", digits: [9], example: "912 345 678" },
    { iso: "EC", name: "Ecuador", code: "593", digits: [9], example: "99 123 4567" },
    { iso: "VE", name: "Venezuela", code: "58", digits: [10], example: "412 123 4567" },
    { iso: "ES", name: "España", code: "34", digits: [9], example: "612 34 56 78" },
    { iso: "US", name: "Estados Unidos", code: "1", digits: [10], example: "305 123 4567" },
    { iso: "PA", name: "Panamá", code: "507", digits: [8], example: "6123 4567" },
    { iso: "CR", name: "Costa Rica", code: "506", digits: [8], example: "8312 3456" },
    { iso: "GT", name: "Guatemala", code: "502", digits: [8], example: "5123 4567" },
    { iso: "DO", name: "República Dominicana", code: "1", digits: [10], example: "809 123 4567" },
    { iso: "BO", name: "Bolivia", code: "591", digits: [8], example: "7123 4567" },
    { iso: "PY", name: "Paraguay", code: "595", digits: [9], example: "981 123 456" },
    { iso: "UY", name: "Uruguay", code: "598", digits: [8], example: "94 123 456" },
];

export const getCountry = (iso: string) => COUNTRIES.find((country) => country.iso === iso) ?? COUNTRIES[0];

export const TEMPLATES = [
    { label: "Información", text: "Hola, quiero más información." },
    { label: "Pedido", text: "Hola, quiero hacer un pedido." },
    { label: "Cita", text: "Hola, quiero agendar una cita." },
    { label: "Precio", text: "Hola, ¿cuál es el precio de…?" },
    { label: "Desde Instagram", text: "Hola, vengo de Instagram y quiero más información." },
];

export interface LinkResult {
    url: string;
    /** Número completo, solo dígitos, como lo usa wa.me */
    number: string;
    /** Avisos que no impiden crear el link */
    warnings: string[];
}

/**
 * Limpia lo que escribe la persona: quita espacios, guiones, paréntesis, el "+" y el código de país
 * si lo repitió, y los ceros de marcación nacional. Devuelve el número nacional.
 */
export function cleanNational(phone: string, country: Country) {
    let digits = phone.replace(/\D/g, "");
    const withCode = country.code + (country.mobilePrefix ?? "");
    if (phone.trim().startsWith("+") || digits.length > Math.max(...country.digits)) {
        if (digits.startsWith(withCode)) digits = digits.slice(withCode.length);
        else if (digits.startsWith(country.code)) digits = digits.slice(country.code.length);
    }
    return digits.replace(/^0+/, "");
}

export function buildLink({ country, phone, text, withNumber = true }: { country: Country; phone: string; text: string; withNumber?: boolean }): LinkResult {
    const warnings: string[] = [];
    let number = "";
    if (withNumber) {
        const national = cleanNational(phone, country);
        if (!national) warnings.push("Escribe el número de WhatsApp.");
        else if (!country.digits.includes(national.length))
            warnings.push(`Los números de ${country.name} tienen ${country.digits.join(" u ")} dígitos y este tiene ${national.length}.`);
        if (country.iso === "CO" && national && !national.startsWith("3") && national.length === 10) warnings.push("Los celulares de Colombia empiezan por 3.");
        number = national ? country.code + (country.mobilePrefix ?? "") + national : "";
    }
    const query = text.trim() ? `?text=${encodeURIComponent(text.trim())}` : "";
    return { url: `https://wa.me/${number}${query}`, number, warnings };
}

/** "+57 300 123 4567" para mostrar el número como en el chat */
export function formatNumber(number: string, country: Country) {
    const prefix = country.code + (country.mobilePrefix ?? "");
    const national = number.startsWith(prefix) ? number.slice(prefix.length) : number;
    // Argentina y México agrupan por código de área de dos dígitos: 11 2345 6789, 55 1234 5678
    const groups = national.length === 10 ? (["AR", "MX"].includes(country.iso) ? [2, 4, 4] : [3, 3, 4]) : national.length === 9 ? [3, 3, 3] : [4, 4];
    let rest = national;
    const parts = groups.map((n) => {
        const part = rest.slice(0, n);
        rest = rest.slice(n);
        return part;
    });
    if (rest) parts.push(rest);
    return `+${country.code}${country.mobilePrefix ? ` ${country.mobilePrefix}` : ""} ${parts.filter(Boolean).join(" ")}`;
}
