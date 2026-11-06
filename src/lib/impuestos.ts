// IVA y gravamen a los movimientos financieros (4x1000).
// Lo usan las páginas y el navegador, así que no depende de nada de Astro.

export const IMPUESTOS_REVIEW = "2026-11-06";

/** Tarifas de IVA en Colombia (arts. 468 y 468-1 del E.T.) */
export const IVA_RATES = [
    { rate: 0.19, label: "19 %", hint: "Tarifa general" },
    { rate: 0.05, label: "5 %", hint: "Algunos alimentos, medicina prepagada, vivienda VIS en ciertos casos" },
    { rate: 0, label: "0 %", hint: "Bienes exentos" },
];

/** Agregar IVA a un valor sin IVA */
export function addIva(base: number, rate: number) {
    const iva = base * rate;
    return { base, iva, total: base + iva };
}

/** Quitar el IVA de un precio que ya lo incluye */
export function removeIva(total: number, rate: number) {
    const base = total / (1 + rate);
    return { base, iva: total - base, total };
}

/* 4x1000 */

export const GMF_RATE = 0.004;
/** Retiros exentos al mes, por persona (art. 879 numeral 1 del E.T.) */
export const GMF_EXEMPT_UVT = 350;

/**
 * 4x1000 de un retiro o transferencia. `exemptLeft` es lo que te queda del cupo exento del mes
 * (350 UVT si la cuenta está marcada como exenta y no has usado nada).
 */
export function gmf(amount: number, exemptLeft = 0) {
    const exempt = Math.min(amount, Math.max(0, exemptLeft));
    const taxed = amount - exempt;
    return { amount, exempt, taxed, tax: taxed * GMF_RATE };
}

/** Cuánto sale de la cuenta para que lleguen `net` pesos (el banco cobra el 4x1000 aparte) */
export const grossForNet = (net: number) => net * (1 + GMF_RATE);

/** Cuánto puedes mover si tienes `balance` y el 4x1000 sale de ese mismo saldo */
export const maxMovable = (balance: number) => balance / (1 + GMF_RATE);

export const formatNumber = (value: number) => String(Math.round(value)).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
export const formatCOP = (value: number) => `$${formatNumber(value)}`;
export const parseCOP = (text: string) => Number(text.replace(/\D/g, "")) || 0;
