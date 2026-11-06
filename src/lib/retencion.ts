// Retención en la fuente: salarios (art. 383 E.T., procedimiento 1) y pagos a terceros
// (tarifas y bases del Decreto 572 de 2025, vigentes desde el 1 de julio de 2026).
// Lo usan la página y el navegador, así que no depende de nada de Astro.

import { getMinimumWage } from "@/lib/prima";
import { solidarityRate } from "@/lib/liquidacion";

export const RETENCION_REVIEW = "2026-11-06";

/** Tabla del artículo 383: desde (UVT), tarifa marginal, impuesto acumulado (UVT) */
export const TABLE_383: { from: number; to: number; rate: number; plus: number }[] = [
    { from: 0, to: 95, rate: 0, plus: 0 },
    { from: 95, to: 150, rate: 0.19, plus: 0 },
    { from: 150, to: 360, rate: 0.28, plus: 10 },
    { from: 360, to: 640, rate: 0.33, plus: 69 },
    { from: 640, to: 945, rate: 0.35, plus: 162 },
    { from: 945, to: 2_300, rate: 0.37, plus: 268 },
    { from: 2_300, to: Infinity, rate: 0.39, plus: 770 },
];

/** Retención en UVT para una base gravable mensual en UVT */
export function table383(baseUvt: number) {
    const row = [...TABLE_383].reverse().find(({ from }) => baseUvt > from) ?? TABLE_383[0];
    return { row, tax: row.rate ? (baseUvt - row.from) * row.rate + row.plus : 0 };
}

export interface SalaryInput {
    /** Salario y demás pagos laborales del mes */
    salary: number;
    /** Otros pagos laborales del mes: horas extra, comisiones, bonificaciones */
    other?: number;
    integral?: boolean;
    /** Tiene dependientes económicos */
    dependents?: boolean;
    /** Intereses de crédito de vivienda o leasing habitacional pagados en el mes */
    housing?: number;
    /** Medicina prepagada o seguro de salud del mes */
    prepaid?: number;
    /** Aportes voluntarios a pensión y a cuentas AFC o AVC del mes */
    voluntary?: number;
    uvt: number;
    year: number;
}

export interface Line {
    key: string;
    label: string;
    value: number;
    note?: string;
}

/** Depuración mensual y retención del procedimiento 1 */
export function salaryWithholding(input: SalaryInput) {
    const { salary, other = 0, integral = false, dependents = false, housing = 0, prepaid = 0, voluntary = 0, uvt, year } = input;
    const wage = getMinimumWage(year);
    const gross = salary + other;

    // Ingresos no constitutivos de renta: aportes obligatorios del trabajador
    const contributionBase = integral ? gross * 0.7 : gross;
    const health = contributionBase * 0.04;
    const pension = contributionBase * 0.04;
    const solidarity = contributionBase * solidarityRate(contributionBase, wage);
    const notIncome = health + pension + solidarity;
    const net = gross - notIncome;

    // Deducciones con sus topes mensuales
    const dependentsDeduction = dependents ? Math.min(gross * 0.1, 32 * uvt) : 0;
    const housingDeduction = Math.min(housing, 100 * uvt);
    const prepaidDeduction = Math.min(prepaid, 16 * uvt);
    const deductions = dependentsDeduction + housingDeduction + prepaidDeduction;

    // Rentas exentas: aportes voluntarios (30 % del ingreso y 3.800 UVT al año) y el 25 % del art. 206
    const voluntaryExempt = Math.min(voluntary, gross * 0.3, (3_800 / 12) * uvt);
    const exempt25 = Math.min(Math.max(0, net - deductions - voluntaryExempt) * 0.25, (790 / 12) * uvt);

    // Límite global: 40 % del ingreso neto y 1.340 UVT al año
    const benefits = deductions + voluntaryExempt + exempt25;
    const limit = Math.min(net * 0.4, (1_340 / 12) * uvt);
    const allowed = Math.min(benefits, limit);
    const base = Math.max(0, net - allowed);
    const baseUvt = base / uvt;
    const { row, tax } = table383(baseUvt);
    const withholding = Math.round(tax * uvt);

    const lines: Line[] = [
        { key: "bruto", label: "Ingreso laboral del mes", value: gross },
        { key: "salud", label: "Aporte a salud (4 %)", value: -health, note: "Ingreso no constitutivo de renta" },
        { key: "pension", label: "Aporte a pensión (4 %)", value: -pension, note: "Ingreso no constitutivo de renta" },
        ...(solidarity ? [{ key: "solidaridad", label: "Fondo de Solidaridad Pensional", value: -solidarity, note: "Ingreso no constitutivo de renta" }] : []),
        ...(dependentsDeduction ? [{ key: "dependientes", label: "Deducción por dependientes", value: -dependentsDeduction, note: "10 % del ingreso, máximo 32 UVT" }] : []),
        ...(housingDeduction ? [{ key: "vivienda", label: "Intereses de vivienda", value: -housingDeduction, note: "Máximo 100 UVT al mes" }] : []),
        ...(prepaidDeduction ? [{ key: "prepagada", label: "Medicina prepagada", value: -prepaidDeduction, note: "Máximo 16 UVT al mes" }] : []),
        ...(voluntaryExempt ? [{ key: "voluntarios", label: "Aportes voluntarios y AFC", value: -voluntaryExempt, note: "Máximo 30 % del ingreso" }] : []),
        { key: "exenta", label: "Renta exenta del 25 %", value: -exempt25, note: "Máximo 790 UVT al año" },
        ...(benefits > limit ? [{ key: "limite", label: "Ajuste por el límite del 40 %", value: benefits - limit, note: "Deducciones y exentas no pueden pasar del 40 % ni de 1.340 UVT al año" }] : []),
    ];

    return {
        gross,
        notIncome,
        net,
        deductions,
        voluntaryExempt,
        exempt25,
        benefits,
        limit,
        allowed,
        base,
        baseUvt,
        row,
        taxUvt: tax,
        withholding,
        effective: gross ? withholding / gross : 0,
        lines,
    };
}

/** Salario mensual a partir del cual empieza la retención, sin deducciones (búsqueda binaria) */
export function salaryThreshold(uvt: number, year: number) {
    let low = 0;
    let high = 1_000 * uvt;
    for (let i = 0; i < 60; i++) {
        const mid = (low + high) / 2;
        if (salaryWithholding({ salary: mid, uvt, year }).withholding > 0) high = mid;
        else low = mid;
    }
    return Math.ceil(high / 1_000) * 1_000;
}

/* Pagos a terceros */

export type PayeeKind = "declarante" | "no-declarante";

export interface Concept {
    key: string;
    label: string;
    group: "Compras" | "Servicios" | "Honorarios" | "Arrendamientos" | "Otros";
    /** Base mínima en UVT; 0 si se retiene desde el primer peso */
    base: number;
    rate: number;
    /** Tarifa si quien recibe el pago no declara renta */
    rateNoDeclarante?: number;
    note?: string;
}

export const CONCEPTS: Concept[] = [
    { key: "compras", label: "Compras generales", group: "Compras", base: 10, rate: 0.025, rateNoDeclarante: 0.035 },
    { key: "tarjeta", label: "Compras con tarjeta débito o crédito", group: "Compras", base: 0, rate: 0.015 },
    { key: "agricolas", label: "Productos agrícolas o pecuarios sin procesar", group: "Compras", base: 70, rate: 0.015 },
    { key: "cafe", label: "Café pergamino o cereza", group: "Compras", base: 70, rate: 0.005 },
    { key: "combustibles", label: "Combustibles derivados del petróleo", group: "Compras", base: 0, rate: 0.001 },
    { key: "servicios", label: "Servicios en general", group: "Servicios", base: 2, rate: 0.04, rateNoDeclarante: 0.06 },
    { key: "carga", label: "Transporte de carga", group: "Servicios", base: 2, rate: 0.01 },
    { key: "pasajeros", label: "Transporte terrestre de pasajeros", group: "Servicios", base: 10, rate: 0.035 },
    { key: "hoteles", label: "Hoteles y restaurantes", group: "Servicios", base: 2, rate: 0.035 },
    { key: "temporales", label: "Empresas de servicios temporales", group: "Servicios", base: 2, rate: 0.01, note: "Sobre el AIU" },
    { key: "vigilancia", label: "Vigilancia y aseo", group: "Servicios", base: 2, rate: 0.02, note: "Sobre el AIU" },
    { key: "honorarios-pn", label: "Honorarios y comisiones a persona natural", group: "Honorarios", base: 0, rate: 0.1, note: "11 % si los contratos del año suman más de 3.300 UVT" },
    { key: "honorarios-pj", label: "Honorarios y comisiones a persona jurídica", group: "Honorarios", base: 0, rate: 0.11 },
    { key: "inmuebles", label: "Arrendamiento de bienes inmuebles", group: "Arrendamientos", base: 10, rate: 0.035 },
    { key: "muebles", label: "Arrendamiento de bienes muebles", group: "Arrendamientos", base: 0, rate: 0.04 },
    { key: "construccion", label: "Contratos de construcción y urbanización", group: "Otros", base: 10, rate: 0.02 },
];

export function thirdPartyWithholding(concept: Concept, amount: number, kind: PayeeKind, uvt: number) {
    const rate = kind === "no-declarante" && concept.rateNoDeclarante ? concept.rateNoDeclarante : concept.rate;
    const minimum = concept.base * uvt;
    const applies = amount >= minimum && amount > 0;
    return { rate, minimum, applies, withholding: applies ? Math.round(amount * rate) : 0 };
}
