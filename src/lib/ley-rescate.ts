// Ley de Rescate Económico (Proyecto de Ley 477 de 2026 Cámara): cifras del proyecto
// radicado el 29 de octubre de 2026 y las cuentas de las calculadoras del artículo.
// Lo usan la página y el navegador, así que no depende de nada de Astro.
// Todo va en pesos de 2026 (UVT y salario mínimo de 2026) para comparar contra hoy.

import { getMinimumWage } from "@/lib/prima";
import { solidarityRate } from "@/lib/liquidacion";

export const RESCATE_REVIEW = "2026-11-06";
export const RESCATE_PUBLISHED = "2026-11-06";

/** Estado del trámite: cámbialo cuando avance en el Congreso */
export const RESCATE_STATUS = {
    isLaw: false,
    label: "Proyecto en el Congreso",
    detail: "Radicado el 29 de octubre de 2026 con mensaje de urgencia. Si no se aprueba antes del 16 de diciembre, se hunde en esta legislatura.",
};

export const UVT_2026 = 52_374;
export const WAGE_2026 = getMinimumWage(2026);

/* ───────────── Renta de personas naturales (art. 241 E.T.) ───────────── */

export interface Bracket {
    from: number;
    to: number;
    rate: number;
    /** Impuesto acumulado de los tramos anteriores, en UVT */
    plus: number;
}

export const TABLE_241_NOW: Bracket[] = [
    { from: 0, to: 1_090, rate: 0, plus: 0 },
    { from: 1_090, to: 1_700, rate: 0.19, plus: 0 },
    { from: 1_700, to: 4_100, rate: 0.28, plus: 116 },
    { from: 4_100, to: 8_670, rate: 0.33, plus: 788 },
    { from: 8_670, to: 18_970, rate: 0.35, plus: 2_296 },
    { from: 18_970, to: 31_000, rate: 0.37, plus: 5_901 },
    { from: 31_000, to: Infinity, rate: 0.39, plus: 10_352 },
];

export const TABLE_241_NEW: Bracket[] = [
    { from: 0, to: 720, rate: 0, plus: 0 },
    { from: 720, to: 1_090, rate: 0.09, plus: 0 },
    { from: 1_090, to: 1_700, rate: 0.19, plus: 33 },
    { from: 1_700, to: 4_100, rate: 0.28, plus: 149 },
    { from: 4_100, to: 8_670, rate: 0.33, plus: 821 },
    { from: 8_670, to: Infinity, rate: 0.39, plus: 2_329 },
];

export function taxFromTable(table: Bracket[], uvt: number) {
    const bracket = [...table].reverse().find(({ from }) => uvt > from) ?? table[0];
    return { bracket, tax: bracket.rate ? (uvt - bracket.from) * bracket.rate + bracket.plus : 0 };
}

/** Cotización a salud del trabajador dependiente, por salarios mínimos */
const EMPLOYEE_HEALTH: [number, number][] = [
    [2, 0.04],
    [4, 0.055],
    [5, 0.06],
    [10, 0.065],
    [15, 0.07],
    [20, 0.075],
    [Infinity, 0.08],
];

/** Cotización a salud del independiente, por salarios mínimos del ingreso base */
const INDEPENDENT_HEALTH: [number, number][] = [
    [2, 0.125],
    [4, 0.13],
    [5, 0.135],
    [10, 0.14],
    [15, 0.145],
    [20, 0.15],
    [Infinity, 0.155],
];

const byRange = (table: [number, number][], times: number) => table.find(([upTo]) => times <= upTo)![1];

export const HEALTH_ROWS = EMPLOYEE_HEALTH.map(([upTo, employee], index) => ({
    from: index ? EMPLOYEE_HEALTH[index - 1][0] : 0,
    upTo,
    employee,
    independent: INDEPENDENT_HEALTH[index][1],
}));

/** La cotización se calcula máximo sobre 25 salarios mínimos */
const contributionBase = (salary: number) => Math.min(salary, 25 * WAGE_2026.salary);

export const healthNow = (salary: number, independent = false) => contributionBase(salary) * (independent ? 0.125 : 0.04);

export function healthNew(salary: number, independent = false) {
    const times = salary / WAGE_2026.salary;
    const rate = byRange(independent ? INDEPENDENT_HEALTH : EMPLOYEE_HEALTH, times);
    return { rate, value: contributionBase(salary) * rate };
}

/**
 * Salud, SENA e ICBF a cargo de la empresa (sociedades que hoy usan la exoneración del
 * art. 114-1 E.T.). Hoy no los paga por quien gana menos de 10 salarios mínimos.
 */
export function employerNow(salary: number) {
    return salary / WAGE_2026.salary < 10 ? 0 : 0.135;
}

export function employerNew(salary: number) {
    const times = salary / WAGE_2026.salary;
    if (times <= 2) return 0;
    if (times <= 3) return 0.06;
    return 0.135;
}

export interface RentaSide {
    income: number;
    health: number;
    pension: number;
    solidarity: number;
    net: number;
    exempt: number;
    dependents: number;
    taxableUvt: number;
    tax: number;
    bracket: Bracket;
}

const LIMITS = {
    now: { exempt25: 790, globalUvt: 1_340, dependentUvt: 72, table: TABLE_241_NOW },
    new: { exempt25: 630, globalUvt: 1_180, dependentUvt: 0, table: TABLE_241_NEW },
};

/**
 * Renta de un empleado con salario fijo, sin otros ingresos ni deducciones,
 * comparando la ley vigente con el proyecto. Usa la UVT de 2026 para los dos lados.
 */
export function rentaFor(salary: number, dependents: number, side: "now" | "new"): RentaSide {
    const limits = LIMITS[side];
    const income = salary * 12;
    const base = contributionBase(salary) * 12;
    const health = side === "now" ? healthNow(salary) * 12 : healthNew(salary).value * 12;
    const pension = base * 0.04;
    const solidarity = base * solidarityRate(salary, WAGE_2026);
    const net = Math.max(0, income - health - pension - solidarity);
    // Renta exenta del 25 %, con su tope y con el límite general del 40 % y de las UVT anuales
    const exempt = Math.min(net * 0.25, limits.exempt25 * UVT_2026, net * 0.4, limits.globalUvt * UVT_2026);
    // La deducción por dependiente de la Ley 2277 va por fuera del límite del 40 % (máx. 4)
    const dependentsValue = Math.min(4, dependents) * limits.dependentUvt * UVT_2026;
    const taxable = Math.max(0, net - exempt - dependentsValue);
    const taxableUvt = taxable / UVT_2026;
    const { tax, bracket } = taxFromTable(limits.table, taxableUvt);
    return {
        income,
        health,
        pension,
        solidarity,
        net,
        exempt,
        dependents: dependentsValue,
        taxableUvt,
        // La DIAN redondea al múltiplo de mil más cercano
        tax: Math.round((tax * UVT_2026) / 1_000) * 1_000,
        bracket,
    };
}

/** Sueldo mensual desde el que alguien empezaría a pagar renta (sin dependientes) */
export function firstTaxedSalary(side: "now" | "new") {
    let low = 1_000_000;
    let high = 30_000_000;
    while (high - low > 1_000) {
        const mid = (low + high) / 2;
        if (rentaFor(mid, 0, side).tax > 0) high = mid;
        else low = mid;
    }
    return Math.ceil(high / 10_000) * 10_000;
}

/* ───────────── IVA ───────────── */

export interface IvaGroup {
    id: string;
    label: string;
    examples: string;
    from: number;
    to: number;
    when: string;
    /** Gasto mensual de ejemplo de un hogar */
    sample: number;
}

export const IVA_GROUPS: IvaGroup[] = [
    { id: "despensa", label: "Café, chocolate, azúcar, aceite y pastas", examples: "Hoy pagan 5 %", from: 0.05, to: 0.19, when: "2028", sample: 120_000 },
    { id: "frutas", label: "Frutas, verduras y hortalizas", examples: "Hoy no pagan IVA", from: 0, to: 0.19, when: "2028", sample: 180_000 },
    { id: "prepagada", label: "Medicina prepagada", examples: "Hoy paga 5 %", from: 0.05, to: 0.19, when: "2028", sample: 0 },
    { id: "internacional", label: "Compras en Shein, Temu o Amazon", examples: "De menos de US$200, hoy sin IVA", from: 0, to: 0.19, when: "Al aprobarse", sample: 80_000 },
];

/** Lo que pagarías por lo mismo que hoy te cuesta `spent` */
export const newPrice = (spent: number, from: number, to: number) => (spent * (1 + to)) / (1 + from);

/** EfectIVA: tope mensual de devolución por persona */
export const EFECTIVA_CAP_UVT = 5.5;

/* ───────────── Licores, cerveza y cigarrillos ───────────── */

export interface ViceItem {
    id: string;
    label: string;
    unit: string;
    price: number;
    quantity: number;
    /** Alza estimada del precio al público */
    rise: number;
}

export const VICES: ViceItem[] = [
    { id: "cerveza", label: "Cerveza", unit: "cerveza", price: 3_500, quantity: 8, rise: 5_000 / 3_500 - 1 },
    { id: "licor", label: "Aguardiente, ron o vino", unit: "botella", price: 60_000, quantity: 1, rise: 0.326 },
    { id: "cigarrillos", label: "Cigarrillos", unit: "cajetilla", price: 12_000, quantity: 4, rise: 0.47 },
    { id: "vapeador", label: "Vapeador", unit: "recarga o desechable", price: 45_000, quantity: 2, rise: 0.53 },
];

/* ───────────── Cifras del contexto fiscal ───────────── */

export const FISCAL = {
    budget2027: 635,
    deficit2026: 7.2,
    deficit2027: 9.4,
    deficitWithLaw: 7.2,
    debt2026q2: 58.5,
    debt2027: 66.2,
    debtWithLaw: 64.1,
    adjustment2027: 2.2,
    adjustmentPesos: 45,
    adjustment2028: 3.58,
    adjustment2030: 4.09,
    inflation2027: 0.6,
    inflation2028: 1.4,
};

/** Si 2,2 % del PIB son $45 billones, el PIB de 2027 ronda los $2.045 billones */
export const GDP_2027 = FISCAL.adjustmentPesos / (FISCAL.adjustment2027 / 100);
export const POPULATION = 53_000_000;
