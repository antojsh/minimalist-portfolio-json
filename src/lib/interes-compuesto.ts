// Interés compuesto con aportes periódicos, inflación, comisiones e impuestos.
// Lo usan la página y el navegador, así que no depende de nada de Astro.

/** Última vez que se revisó el contenido */
export const INTERES_REVIEW = "2026-11-05";

export type Compounding = "ea" | 365 | 12 | 4 | 2 | 1;

export const COMPOUNDINGS: { value: Compounding; label: string }[] = [
    { value: "ea", label: "Efectiva anual (E.A.)" },
    { value: 365, label: "Nominal, diaria" },
    { value: 12, label: "Nominal, mensual" },
    { value: 4, label: "Nominal, trimestral" },
    { value: 2, label: "Nominal, semestral" },
    { value: 1, label: "Nominal, anual" },
];

/** Cada cuántos meses se hace un aporte */
export type Frequency = 1 | 3 | 6 | 12;

export const FREQUENCIES: { value: Frequency; label: string; per: string }[] = [
    { value: 1, label: "Mensual", per: "al mes" },
    { value: 3, label: "Trimestral", per: "al trimestre" },
    { value: 6, label: "Semestral", per: "al semestre" },
    { value: 12, label: "Anual", per: "al año" },
];

export interface CompoundInput {
    initial: number;
    contribution: number;
    frequency?: Frequency;
    /** Aportar al inicio del periodo (rinde un periodo más) o al final */
    timing?: "inicio" | "fin";
    /** Cuánto sube el aporte cada año, en fracción */
    growth?: number;
    /** Tasa anual en fracción: 0.1 = 10 % */
    rate: number;
    compounding?: Compounding;
    months: number;
    /** Inflación anual esperada, para mostrar el valor en dinero de hoy */
    inflation?: number;
    /** Comisión anual de administración sobre el saldo */
    fee?: number;
    /** Parte de los rendimientos que se va en impuestos */
    tax?: number;
}

export interface YearRow {
    year: number;
    /** Aportado en el año (el capital inicial va en el año 1) */
    contributed: number;
    interest: number;
    fees: number;
    totalContributed: number;
    totalInterest: number;
    balance: number;
    /** Saldo en dinero de hoy */
    real: number;
}

/** Tasa efectiva anual a partir de una nominal con su capitalización */
export const effectiveAnnual = (rate: number, compounding: Compounding = "ea") =>
    compounding === "ea" ? rate : (1 + rate / compounding) ** compounding - 1;

export function simulate(input: CompoundInput) {
    const {
        initial,
        contribution,
        frequency = 1,
        timing = "fin",
        growth = 0,
        rate,
        compounding = "ea",
        months,
        inflation = 0,
        fee = 0,
        tax = 0,
    } = input;

    const ea = effectiveAnnual(rate, compounding);
    const monthly = (1 + ea) ** (1 / 12) - 1;
    const keep = (1 - fee) ** (1 / 12);
    // Rentabilidad que de verdad te queda, después de impuestos y comisión
    const netAnnual = ((1 + monthly * (1 - tax)) * keep) ** 12 - 1;
    const realAnnual = (1 + netAnnual) / (1 + inflation) - 1;

    let balance = initial;
    let totalContributed = initial;
    let totalInterest = 0;
    const balances: number[] = [];
    const years: YearRow[] = [];
    let year: YearRow | undefined;

    for (let month = 1; month <= months; month++) {
        if (!year || (month - 1) % 12 === 0) {
            year = {
                year: years.length + 1,
                contributed: years.length ? 0 : initial,
                interest: 0,
                fees: 0,
                totalContributed,
                totalInterest,
                balance,
                real: 0,
            };
            years.push(year);
        }
        const amount = contribution * (1 + growth) ** Math.floor((month - 1) / 12);
        const due = timing === "inicio" ? (month - 1) % frequency === 0 : month % frequency === 0;

        if (due && timing === "inicio") balance += amount;
        const interest = balance * monthly * (1 - tax);
        balance += interest;
        const charged = balance * (1 - keep);
        balance -= charged;
        if (due && timing === "fin") balance += amount;

        if (due) {
            totalContributed += amount;
            year.contributed += amount;
        }
        totalInterest += interest - charged;
        year.interest += interest;
        year.fees += charged;
        year.totalContributed = totalContributed;
        year.totalInterest = totalInterest;
        year.balance = balance;
        year.real = balance / (1 + inflation) ** (month / 12);
        balances.push(balance);
    }

    return {
        ea,
        monthly,
        netAnnual,
        realAnnual,
        balance,
        real: balance / (1 + inflation) ** (months / 12),
        totalContributed,
        totalInterest,
        years,
        balances,
        /** Cuántas veces se multiplicó lo que pusiste */
        multiple: totalContributed ? balance / totalContributed : 0,
    };
}

export type Simulation = ReturnType<typeof simulate>;

/** Aporte periódico necesario para llegar a una meta (el resultado es lineal en el aporte) */
export function contributionForGoal(input: CompoundInput, goal: number) {
    const without = simulate({ ...input, contribution: 0 }).balance;
    const perUnit = simulate({ ...input, contribution: 1 }).balance - without;
    if (without >= goal) return 0;
    return perUnit > 0 ? (goal - without) / perUnit : Infinity;
}

/** Meses que tarda en llegar a una meta, con un tope de 100 años */
export function monthsToGoal(input: CompoundInput, goal: number) {
    if (input.initial >= goal) return 0;
    const { balances } = simulate({ ...input, months: 1200 });
    const index = balances.findIndex((balance) => balance >= goal);
    return index < 0 ? Infinity : index + 1;
}

/** Años para duplicar el dinero: exacto y con la regla del 72 */
export const doublingYears = (annual: number) => ({
    exact: annual > 0 ? Math.log(2) / Math.log(1 + annual) : Infinity,
    rule72: annual > 0 ? 72 / (annual * 100) : Infinity,
});

/** Momentos clave del ahorro */
export function milestones(sim: Simulation) {
    // El año en que los intereses del año superan lo que aportas en ese año
    const workingYear = sim.years.find((row, index) => index > 0 && row.interest - row.fees > row.contributed && row.contributed > 0)?.year;
    // El año en que lo ganado en intereses supera todo lo que has puesto
    const crossover = sim.years.find((row) => row.totalInterest > row.totalContributed)?.year;
    // Cifras redondas que cruzas en el camino
    const rounds = [1e6, 1e7, 5e7, 1e8, 2.5e8, 5e8, 1e9, 2e9, 5e9, 1e10]
        .filter((value) => value > (sim.years[0]?.totalContributed ?? 0) && value <= sim.balance)
        .slice(-3)
        .map((value) => ({ value, month: sim.balances.findIndex((balance) => balance >= value) + 1 }));
    return { workingYear, crossover, rounds };
}

/* Formato de dinero, con la moneda que elija la persona */

export const CURRENCIES = {
    COP: { symbol: "$", label: "Peso colombiano" },
    USD: { symbol: "US$", label: "Dólar" },
    EUR: { symbol: "€", label: "Euro" },
    MXN: { symbol: "MX$", label: "Peso mexicano" },
    CLP: { symbol: "CLP$", label: "Peso chileno" },
    PEN: { symbol: "S/", label: "Sol peruano" },
    ARS: { symbol: "AR$", label: "Peso argentino" },
} as const;

export type Currency = keyof typeof CURRENCIES;

const group = (value: number) => String(Math.round(Math.abs(value))).replace(/\B(?=(\d{3})+(?!\d))/g, ".");

export const formatMoney = (value: number, currency: Currency = "COP") =>
    `${value < 0 ? "−" : ""}${CURRENCIES[currency].symbol}${group(value)}`;

/** "$120 M", "$1,2 mil M", "$350 mil" */
export function formatCompact(value: number, currency: Currency = "COP") {
    const symbol = CURRENCIES[currency].symbol;
    const abs = Math.abs(value);
    const short = (n: number) => (n >= 100 ? String(Math.round(n)) : n.toFixed(n >= 10 ? 0 : 1).replace(".", ",").replace(",0", ""));
    if (abs >= 1e9) return `${symbol}${short(abs / 1e9)} mil M`;
    if (abs >= 1e6) return `${symbol}${short(abs / 1e6)} M`;
    if (abs >= 1e3) return `${symbol}${short(abs / 1e3)} mil`;
    return `${symbol}${Math.round(abs)}`;
}

export const formatPct = (rate: number, digits = 2) =>
    `${(Math.round(rate * 100 * 10 ** digits) / 10 ** digits).toFixed(digits).replace(/\.?0+$/, "").replace(".", ",")} %`;

export const parseAmount = (text: string) => Number(text.replace(/\D/g, "")) || 0;
export const parseDecimal = (text: string) => Number(text.replace(/[^\d,.-]/g, "").replace(",", ".")) || 0;
export const formatAmount = (value: number) => (value ? group(value) : "");

export function formatDuration(months: number) {
    if (!Number.isFinite(months)) return "más de 100 años";
    const years = Math.floor(months / 12);
    const rest = months % 12;
    const y = years ? `${years} ${years === 1 ? "año" : "años"}` : "";
    const m = rest ? `${rest} ${rest === 1 ? "mes" : "meses"}` : "";
    return [y, m].filter(Boolean).join(" y ") || "0 meses";
}

/* Gráfica de crecimiento */

export interface ChartGeometry {
    width: number;
    height: number;
    left: number;
    right: number;
    top: number;
    bottom: number;
    max: number;
}

/**
 * Áreas apiladas por año: capital inicial, aportes e intereses, y el valor en dinero de hoy
 * como línea punteada. Devuelve el SVG y la geometría para el tooltip.
 */
export function growthChart(sim: Simulation, initial: number, currency: Currency = "COP", showReal = true) {
    const width = 720;
    const height = 340;
    const geometry = { width, height, left: 64, right: 12, top: 14, bottom: 30, max: 0 };
    const points = [
        { year: 0, initial, contributed: initial, balance: initial, real: initial },
        ...sim.years.map((row) => ({
            year: row.year,
            initial,
            contributed: row.totalContributed,
            balance: Math.max(row.balance, 0),
            real: row.real,
        })),
    ];
    const rawMax = Math.max(...points.map((p) => Math.max(p.balance, p.contributed)), 1);
    // Escala redonda: 1, 2 o 5 por potencia de diez
    const magnitude = 10 ** Math.floor(Math.log10(rawMax));
    const max = [1, 1.25, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10].map((n) => n * magnitude).find((n) => n >= rawMax) ?? rawMax;
    geometry.max = max;

    const plotW = width - geometry.left - geometry.right;
    const plotH = height - geometry.top - geometry.bottom;
    const last = points[points.length - 1].year || 1;
    const x = (year: number) => geometry.left + (year / last) * plotW;
    const y = (value: number) => geometry.top + plotH - (Math.min(value, max) / max) * plotH;

    const area = (top: (p: (typeof points)[number]) => number, bottom: (p: (typeof points)[number]) => number) => {
        const upper = points.map((p) => `${x(p.year).toFixed(1)},${y(top(p)).toFixed(1)}`);
        const lower = [...points].reverse().map((p) => `${x(p.year).toFixed(1)},${y(bottom(p)).toFixed(1)}`);
        return `M${upper.join("L")}L${lower.join("L")}Z`;
    };

    const grid = [0.25, 0.5, 0.75, 1]
        .map((f) => {
            const gy = y(max * f).toFixed(1);
            return `<line class="g-grid" x1="${geometry.left}" x2="${width - geometry.right}" y1="${gy}" y2="${gy}"/><text class="g-label" x="${geometry.left - 8}" y="${gy}" dy="4" text-anchor="end">${formatCompact(max * f, currency)}</text>`;
        })
        .join("");

    const tickEvery = last <= 10 ? 1 : last <= 20 ? 2 : last <= 40 ? 5 : 10;
    const ticks = points
        .filter((p) => p.year % tickEvery === 0)
        .map((p) => `<text class="g-label" x="${x(p.year).toFixed(1)}" y="${height - 8}" text-anchor="middle">${p.year}</text>`)
        .join("");

    const realLine = showReal
        ? `<polyline class="g-real" fill="none" points="${points.map((p) => `${x(p.year).toFixed(1)},${y(p.real).toFixed(1)}`).join(" ")}"/>`
        : "";

    const svg = `<svg viewBox="0 0 ${width} ${height}" role="img" aria-label="Crecimiento del ahorro año a año">${grid}<path class="g-interest" d="${area((p) => Math.max(p.balance, p.contributed), (p) => p.contributed)}"/><path class="g-contrib" d="${area((p) => Math.min(p.contributed, p.balance), (p) => Math.min(p.initial, p.contributed))}"/><path class="g-initial" d="${area((p) => Math.min(p.initial, p.contributed), () => 0)}"/>${realLine}<line class="g-axis" x1="${geometry.left}" x2="${width - geometry.right}" y1="${y(0)}" y2="${y(0)}"/>${ticks}<text class="g-label" x="${width - geometry.right}" y="${height - 8}" text-anchor="end" dx="0" dy="0"></text><g class="g-hover" data-hover><line class="g-cursor" y1="${geometry.top}" y2="${geometry.top + plotH}"/><circle class="g-dot" r="5"/></g></svg>`;

    return { svg, geometry, points };
}
