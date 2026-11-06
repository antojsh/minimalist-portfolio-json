// ¿Debo declarar renta? Topes de las personas naturales y calendario de vencimientos.
// Lo usan la página y el navegador, así que no depende de nada de Astro.

import { MONTHS, WEEKDAYS, weekdayOf } from "@/lib/festivos";
import { isBusinessDay } from "@/lib/dias-habiles";
import { getUvt } from "@/lib/uvt";

export const RENTA_REVIEW = "2026-11-06";

/** Año en que se declara y año gravable (el año anterior) */
export const DECLARATION_YEAR = 2027;
export const TAXABLE_YEAR = DECLARATION_YEAR - 1;

export type ThresholdKey = "ingresos" | "patrimonio" | "tarjeta" | "compras" | "consignaciones";

/** Topes de los artículos 592, 593 y 594-3 del Estatuto Tributario, en UVT del año gravable */
export const THRESHOLDS: { key: ThresholdKey; uvt: number; label: string; question: string; hint: string; inclusive: boolean }[] = [
    {
        key: "ingresos",
        uvt: 1_400,
        label: "Ingresos brutos",
        question: `¿Cuánto recibiste en total durante ${TAXABLE_YEAR}?`,
        hint: "Salarios, honorarios, arriendos, intereses, ventas, pensiones. Todo, antes de descuentos.",
        inclusive: true,
    },
    {
        key: "patrimonio",
        uvt: 4_500,
        label: "Patrimonio bruto",
        question: `¿Cuánto valía todo lo que tenías el 31 de diciembre de ${TAXABLE_YEAR}?`,
        hint: "Casa, carro, ahorros, inversiones, cesantías. Sin restar las deudas.",
        inclusive: false,
    },
    {
        key: "tarjeta",
        uvt: 1_400,
        label: "Consumos con tarjeta de crédito",
        question: "¿Cuánto pagaste con tarjeta de crédito en el año?",
        hint: "La suma de todas tus compras con tarjetas de crédito.",
        inclusive: false,
    },
    {
        key: "compras",
        uvt: 1_400,
        label: "Compras y consumos",
        question: "¿Cuánto gastaste en total en compras y consumos?",
        hint: "Todo lo que compraste o consumiste, con cualquier medio de pago.",
        inclusive: false,
    },
    {
        key: "consignaciones",
        uvt: 1_400,
        label: "Consignaciones e inversiones",
        question: "¿Cuánto entró a tus cuentas en consignaciones, depósitos o inversiones?",
        hint: "Incluye transferencias que te hicieron y lo que invertiste en CDT o fondos.",
        inclusive: false,
    },
];

export const thresholdPesos = (uvt: number, year = TAXABLE_YEAR) => uvt * getUvt(year).value;

export interface RentaInput extends Partial<Record<ThresholdKey, number>> {
    /** Responsable de IVA al 31 de diciembre */
    iva?: boolean;
}

/** Qué topes superas; con uno basta para estar obligado a declarar */
export function mustFile(input: RentaInput, year = TAXABLE_YEAR) {
    const value = getUvt(year).value;
    const crossed = THRESHOLDS.filter(({ key, uvt, inclusive }) => {
        const amount = input[key] ?? 0;
        const limit = uvt * value;
        return inclusive ? amount >= limit : amount > limit;
    });
    return { must: crossed.length > 0 || Boolean(input.iva), crossed, iva: Boolean(input.iva) };
}

/* Calendario: Decreto 2229 de 2023, plazos permanentes por días hábiles (sin sábados) */

const ORDINALS = [
    "", "primer", "segundo", "tercer", "cuarto", "quinto", "sexto", "séptimo", "octavo", "noveno", "décimo",
    "décimo primer", "décimo segundo", "décimo tercer", "décimo cuarto", "décimo quinto", "décimo sexto",
    "décimo séptimo", "décimo octavo", "décimo noveno", "vigésimo",
];
const ORDINAL = (n: number) => ORDINALS[n];

function nthBusinessDay(year: number, month: number, n: number) {
    let count = 0;
    for (let day = 1; day <= 31; day++) {
        const date = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
        if (new Date(`${date}T00:00:00Z`).getUTCMonth() !== month - 1) break;
        if (isBusinessDay(date) && ++count === n) return date;
    }
    throw new Error(`No hay ${n} días hábiles en ${month}/${year}`);
}

export interface Deadline {
    /** "01-02" */
    digits: string;
    from: number;
    to: number;
    date: string;
    rule: string;
}

/** Los 50 vencimientos de renta de personas naturales para el año en que se declara */
export function deadlines(year = DECLARATION_YEAR): Deadline[] {
    const plan: [number, number, number][] = [
        [8, 7, 13], // agosto: del séptimo al décimo noveno día hábil
        [9, 1, 20], // septiembre: del primero al vigésimo
        [10, 1, 17], // octubre: del primero al décimo séptimo
    ];
    const list: Deadline[] = [];
    for (const [month, first, count] of plan) {
        for (let i = 0; i < count; i++) {
            const pair = list.length;
            const from = pair * 2 + 1;
            const to = (pair * 2 + 2) % 100;
            const n = first + i;
            list.push({
                digits: `${String(from).padStart(2, "0")}-${String(to).padStart(2, "0")}`,
                from,
                to,
                date: nthBusinessDay(year, month, n),
                rule: `${ORDINAL(n)} día hábil de ${MONTHS[month - 1]}`,
            });
        }
    }
    return list;
}

/** Vencimiento según los dos últimos dígitos del NIT (sin dígito de verificación) */
export function deadlineFor(lastTwo: number, year = DECLARATION_YEAR) {
    const pair = lastTwo === 0 ? 49 : Math.floor((lastTwo - 1) / 2);
    return deadlines(year)[pair];
}

export const formatDeadline = (date: string) =>
    `${WEEKDAYS[weekdayOf(date)]} ${Number(date.slice(8))} de ${MONTHS[Number(date.slice(5, 7)) - 1]}`;
