// Simulador de crédito: cuota, intereses y tabla de amortización.
// Lo usan la página y el navegador, así que no depende de nada de Astro.

import { formatCOP, formatNumber } from "@/lib/prima";

/** Última vez que se revisaron las normas */
export const CREDITO_REVIEW = "2026-11-05";

/** Cómo viene expresada la tasa */
export type RateType = "ea" | "mv" | "nmv";

export const RATE_TYPES: { value: RateType; label: string; hint: string }[] = [
    { value: "ea", label: "E.A.", hint: "Efectiva anual" },
    { value: "mv", label: "M.V.", hint: "Mensual" },
    { value: "nmv", label: "N.A.M.V.", hint: "Nominal anual mes vencido" },
];

/** Tasa mensual efectiva a partir de cualquier forma de expresarla (en fracción: 0.24 = 24 %) */
export function monthlyRate(rate: number, type: RateType) {
    if (type === "mv") return rate;
    if (type === "nmv") return rate / 12;
    return (1 + rate) ** (1 / 12) - 1;
}

/** Las tres formas de la misma tasa */
export function equivalentRates(monthly: number) {
    return { ea: (1 + monthly) ** 12 - 1, mv: monthly, nmv: monthly * 12 };
}

/** Sistema francés (cuota fija) o abono constante a capital (cuota decreciente) */
export type Method = "fija" | "capital";

export interface CreditInput {
    amount: number;
    months: number;
    rate: number;
    rateType: RateType;
    method?: Method;
    /** Seguros y cuota de manejo que se suman a cada cuota */
    fees?: number;
    /** Abono extra a capital cada mes; reduce el plazo */
    extra?: number;
}

export interface Row {
    n: number;
    payment: number;
    interest: number;
    principal: number;
    extra: number;
    fees: number;
    balance: number;
}

/** Cuota fija: P × i ÷ (1 − (1 + i)^−n) */
export function fixedPayment(amount: number, monthly: number, months: number) {
    if (months <= 0) return 0;
    if (monthly === 0) return amount / months;
    return (amount * monthly) / (1 - (1 + monthly) ** -months);
}

export function simulate({ amount, months, rate, rateType, method = "fija", fees = 0, extra = 0 }: CreditInput) {
    const monthly = monthlyRate(rate, rateType);
    const base = fixedPayment(amount, monthly, months);
    const rows: Row[] = [];
    let balance = amount;

    for (let n = 1; n <= months && balance > 0.5; n++) {
        const interest = balance * monthly;
        let principal = method === "fija" ? base - interest : amount / months;
        principal = Math.min(principal, balance);
        const extraPaid = Math.min(extra, balance - principal);
        balance = Math.max(0, balance - principal - extraPaid);
        rows.push({ n, payment: interest + principal + fees, interest, principal, extra: extraPaid, fees, balance });
    }

    const sum = (key: keyof Row) => rows.reduce((total, row) => total + row[key], 0);
    const interest = sum("interest");
    const feesTotal = sum("fees");
    const extraTotal = sum("extra");
    const total = amount + interest + feesTotal;

    return {
        monthly,
        rates: equivalentRates(monthly),
        /** Primera cuota (en cuota fija, todas son iguales) */
        firstPayment: rows[0]?.payment ?? 0,
        lastPayment: rows[rows.length - 1]?.payment ?? 0,
        rows,
        months: rows.length,
        interest,
        fees: feesTotal,
        extra: extraTotal,
        total,
        /** Cuántos pesos pagas por cada peso prestado */
        factor: amount ? total / amount : 0,
        /** Mes en que dejas de pagar más intereses que capital */
        crossover: rows.find((row) => row.principal + row.extra >= row.interest)?.n ?? 1,
    };
}

/** Lo que te ahorras con un abono extra mensual frente al crédito sin abonos */
export function extraSavings(input: CreditInput) {
    const without = simulate({ ...input, extra: 0 });
    const withExtra = simulate(input);
    return {
        months: without.months - withExtra.months,
        interest: without.interest - withExtra.interest,
        without,
        withExtra,
    };
}

/** Agrupa la tabla por años cuando el crédito es largo */
export function byYear(rows: Row[]) {
    const years: Row[] = [];
    for (const row of rows) {
        const index = Math.floor((row.n - 1) / 12);
        const year = (years[index] ??= { n: index + 1, payment: 0, interest: 0, principal: 0, extra: 0, fees: 0, balance: 0 });
        year.payment += row.payment + row.extra;
        year.interest += row.interest;
        year.principal += row.principal;
        year.extra += row.extra;
        year.fees += row.fees;
        year.balance = row.balance;
    }
    return years;
}

/**
 * Gráfica de barras: cada barra es un mes (o un año en créditos largos),
 * con la parte de intereses arriba y la de capital abajo, y el saldo como línea.
 */
export function chartSVG(rows: Row[], amount: number) {
    const yearly = rows.length > 72;
    const bars = yearly ? byYear(rows) : rows;
    const width = 640;
    const height = 260;
    const pad = { top: 16, right: 8, bottom: 26, left: 8 };
    const plotW = width - pad.left - pad.right;
    const plotH = height - pad.top - pad.bottom;
    const max = Math.max(...bars.map((bar) => bar.interest + bar.principal + bar.extra), 1);
    const step = plotW / Math.max(bars.length, 1);
    const barW = Math.max(1, step * 0.72);
    const y = (value: number) => (value / max) * plotH;

    const rects = bars
        .map((bar, index) => {
            const x = pad.left + index * step + (step - barW) / 2;
            const capital = y(bar.principal + bar.extra);
            const interest = y(bar.interest);
            const bottom = pad.top + plotH;
            return `<rect class="c-capital" x="${x.toFixed(2)}" y="${(bottom - capital).toFixed(2)}" width="${barW.toFixed(2)}" height="${capital.toFixed(2)}"/><rect class="c-interest" x="${x.toFixed(2)}" y="${(bottom - capital - interest).toFixed(2)}" width="${barW.toFixed(2)}" height="${interest.toFixed(2)}"/>`;
        })
        .join("");

    // Saldo pendiente, en su propia escala (del monto prestado a cero)
    const points = [[pad.left, pad.top], ...bars.map((bar, index) => [pad.left + (index + 1) * step, pad.top + plotH - (bar.balance / amount) * plotH])]
        .map(([px, py]) => `${px.toFixed(1)},${py.toFixed(1)}`)
        .join(" ");

    const unit = yearly ? "Año" : "Mes";
    const ticks = [1, Math.ceil(bars.length / 2), bars.length]
        .filter((value, index, list) => list.indexOf(value) === index)
        .map((value) => {
            const x = pad.left + (value - 0.5) * step;
            const anchor = value === 1 ? "start" : value === bars.length ? "end" : "middle";
            return `<text x="${(value === 1 ? pad.left : value === bars.length ? width - pad.right : x).toFixed(1)}" y="${height - 6}" text-anchor="${anchor}">${unit} ${value}</text>`;
        })
        .join("");

    return `<svg viewBox="0 0 ${width} ${height}" preserveAspectRatio="none" role="img" aria-label="Composición de cada ${yearly ? "año" : "cuota"}: capital e intereses, y saldo pendiente">${rects}<polyline class="c-balance" points="${points}" fill="none"/>${ticks}</svg>`;
}

export const formatRate = (rate: number, digits = 2) =>
    `${(Math.round(rate * 100 * 10 ** digits) / 10 ** digits).toFixed(digits).replace(".", ",")} %`;

/** Lee "24,5" o "24.5" como 24.5 */
export const parseDecimal = (text: string) => Number(text.replace(/[^\d,.]/g, "").replace(",", ".")) || 0;

export const plazoLabel = (months: number) => {
    const years = Math.floor(months / 12);
    const rest = months % 12;
    if (!years) return `${months} ${months === 1 ? "mes" : "meses"}`;
    const y = `${years} ${years === 1 ? "año" : "años"}`;
    return rest ? `${y} y ${rest} ${rest === 1 ? "mes" : "meses"}` : y;
};

export { formatCOP, formatNumber };
export { parseCOP } from "@/lib/prima";
