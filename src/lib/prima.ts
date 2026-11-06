// Prima de servicios en Colombia (art. 306 del Código Sustantivo del Trabajo).
// Lo usan la página y el navegador, así que no depende de nada de Astro.

import { addDays, getHolidays, isWeekend } from "@/lib/festivos";

/** Última vez que se revisaron los valores y las normas */
export const PRIMA_REVIEW = "2026-11-05";

export interface MinimumWage {
    year: number;
    salary: number;
    transport: number;
    salaryDecree: string;
    transportDecree: string;
}

/**
 * Salario mínimo del año que viene. Mientras sea null, la página /salario-minimo-2027 muestra
 * que todavía no se sabe. Cuando salgan los decretos de diciembre, llena estos valores y listo:
 * la página, la prima y la liquidación lo empiezan a usar solos.
 */
export const NEXT_MINIMUM_WAGE = {
    year: 2027,
    salary: null as number | null,
    transport: null as number | null,
    salaryDecree: "",
    transportDecree: "",
};

const KNOWN_WAGES: MinimumWage[] = [
    {
        year: 2026,
        salary: 1_750_905,
        transport: 249_095,
        salaryDecree: "Decreto 1469 de 2025",
        transportDecree: "Decreto 1470 de 2025",
    },
];

export const isNextWageKnown = (next = NEXT_MINIMUM_WAGE): next is MinimumWage =>
    next.salary != null && next.transport != null;

export const MINIMUM_WAGES: MinimumWage[] = isNextWageKnown(NEXT_MINIMUM_WAGE)
    ? [...KNOWN_WAGES, NEXT_MINIMUM_WAGE]
    : KNOWN_WAGES;

export const getMinimumWage = (year: number) =>
    MINIMUM_WAGES.find((wage) => wage.year === year) ?? MINIMUM_WAGES[MINIMUM_WAGES.length - 1];

/** El auxilio de transporte se paga a quien gana hasta dos salarios mínimos */
export const transportLimit = (wage: MinimumWage) => wage.salary * 2;

export interface Semester {
    year: number;
    half: 1 | 2;
    start: string;
    end: string;
    /** Plazo legal: 30 de junio o 20 de diciembre */
    deadline: string;
}

export function getSemester(year: number, half: 1 | 2): Semester {
    return half === 1
        ? { year, half, start: `${year}-01-01`, end: `${year}-06-30`, deadline: `${year}-06-30` }
        : { year, half, start: `${year}-07-01`, end: `${year}-12-31`, deadline: `${year}-12-20` };
}

/** El semestre cuya prima se paga ahora o se pagó hace poco */
export function currentSemester(today: string): Semester {
    const year = Number(today.slice(0, 4));
    return getSemester(year, Number(today.slice(5, 7)) <= 6 ? 1 : 2);
}

/** Último día hábil hasta el plazo: si el plazo cae en fin de semana o festivo, el anterior */
export function lastBusinessDay(date: string) {
    const holidays = new Set(getHolidays(Number(date.slice(0, 4))).map((holiday) => holiday.date));
    let day = date;
    while (isWeekend(day) || holidays.has(day)) day = addDays(day, -1);
    return day;
}

/**
 * Días entre dos fechas con el año comercial de 360 días (meses de 30), contando ambos extremos.
 * Así se liquidan las prestaciones en Colombia: un semestre completo son 180 días.
 */
export function days360(start: string, end: string) {
    const [y1, m1, d1] = start.split("-").map(Number);
    const [y2, m2, d2] = end.split("-").map(Number);
    const lastOfMonth = new Date(Date.UTC(y2, m2, 0)).getUTCDate();
    const from = Math.min(d1, 30);
    const to = d2 === lastOfMonth ? 30 : Math.min(d2, 30);
    return Math.max(0, (y2 - y1) * 360 + (m2 - m1) * 30 + (to - from) + 1);
}

export interface PrimaInput {
    salary: number;
    /** Promedio mensual de horas extra, recargos, comisiones y otros pagos que son salario */
    variable?: number;
    transport: boolean;
    start: string;
    end: string;
    /** Licencias no remuneradas y suspensiones: no cuentan como tiempo trabajado */
    unpaidDays?: number;
    wage: MinimumWage;
}

export function calculatePrima({ salary, variable = 0, transport, start, end, unpaidDays = 0, wage }: PrimaInput) {
    const transportAid = transport ? wage.transport : 0;
    const base = salary + variable + transportAid;
    const days = Math.max(0, days360(start, end) - unpaidDays);
    return { transportAid, base, days, total: Math.round((base * days) / 360) };
}

/** "1.750.905": agrupa de a tres con punto, igual en el servidor y en cualquier navegador */
export const formatNumber = (value: number) => String(Math.round(value)).replace(/\B(?=(\d{3})+(?!\d))/g, ".");

/** "$1.750.905" */
export const formatCOP = (value: number) => `$${formatNumber(value)}`;

/** Lee "1.750.905", "1750905" o "$ 1'750.905" como número */
export const parseCOP = (text: string) => Number(text.replace(/\D/g, "")) || 0;
