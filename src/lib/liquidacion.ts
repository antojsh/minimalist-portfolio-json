// Liquidación de un contrato de trabajo en Colombia (Código Sustantivo del Trabajo).
// Lo usan la página y el navegador, así que no depende de nada de Astro.

import { addDays, formatLong } from "@/lib/festivos";
import { days360, getMinimumWage, transportLimit, type MinimumWage } from "@/lib/prima";

/** Última vez que se revisaron las normas */
export const LIQUIDACION_REVIEW = "2026-11-05";

export type ContractType = "indefinido" | "fijo" | "obra";

export type Ending =
    | "despido-sin-justa-causa"
    | "renuncia"
    | "despido-con-justa-causa"
    | "fin-del-plazo"
    | "mutuo-acuerdo"
    | "despido-indirecto"
    | "periodo-de-prueba";

export const CONTRACT_TYPES: { value: ContractType; label: string; hint: string }[] = [
    { value: "indefinido", label: "Indefinido", hint: "Sin fecha de terminación" },
    { value: "fijo", label: "Término fijo", hint: "Con fecha de terminación" },
    { value: "obra", label: "Obra o labor", hint: "Hasta que termine un trabajo" },
];

export const ENDINGS: { value: Ending; label: string; hint: string }[] = [
    { value: "despido-sin-justa-causa", label: "Me despidieron sin justa causa", hint: "Hay indemnización" },
    { value: "renuncia", label: "Renuncié", hint: "Sin indemnización" },
    { value: "despido-con-justa-causa", label: "Me despidieron con justa causa", hint: "Sin indemnización" },
    { value: "fin-del-plazo", label: "Se acabó el plazo o la obra", hint: "Con aviso a tiempo, sin indemnización" },
    { value: "mutuo-acuerdo", label: "Lo acordamos los dos", hint: "Sin indemnización, salvo lo que pacten" },
    { value: "despido-indirecto", label: "Renuncié por culpa del empleador", hint: "Se indemniza como un despido" },
    { value: "periodo-de-prueba", label: "Terminó en el periodo de prueba", hint: "Sin indemnización" },
];

/** Formas de terminar que dan derecho a la indemnización del art. 64 */
export const isCompensated = (ending: Ending) =>
    ending === "despido-sin-justa-causa" || ending === "despido-indirecto";

export interface LiquidacionInput {
    contract: ContractType;
    ending: Ending;
    start: string;
    end: string;
    /** Fecha pactada de terminación (término fijo) o fecha estimada de la obra */
    agreedEnd?: string;
    salary: number;
    integral?: boolean;
    transport: boolean;
    /** Promedio mensual de horas extra y trabajo en dominicales o festivos */
    overtime?: number;
    /** Promedio mensual de comisiones, recargos nocturnos y otros pagos que son salario */
    variable?: number;
    /** Días de vacaciones (hábiles) pendientes. Si no se indica, solo los del año de servicio en curso */
    vacationPending?: number;
    /** Días del último periodo que todavía no te han pagado */
    unpaidSalaryDays: number;
    /** Días de licencia no remunerada o suspensión en el año de la terminación */
    unpaidLeave?: number;
    /** Las cesantías del año anterior no llegaron al fondo */
    previousSeveranceOwed?: boolean;
}

export interface Item {
    key: "salario" | "cesantias" | "intereses" | "prima" | "vacaciones" | "indemnizacion" | "cesantias-anteriores" | "descuentos";
    label: string;
    value: number;
    formula: string;
    note: string;
}

export const DAILY = 30;

/** Porcentaje del Fondo de Solidaridad Pensional según los salarios mínimos que ganas */
export function solidarityRate(salary: number, wage: MinimumWage) {
    const times = salary / wage.salary;
    if (times < 4) return 0;
    if (times < 16) return 0.01;
    if (times < 17) return 0.012;
    if (times < 18) return 0.014;
    if (times < 19) return 0.016;
    if (times < 20) return 0.018;
    return 0.02;
}

const fmt = (value: number) => String(Math.round(value)).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
const fmtDays = (value: number) => (Number.isInteger(value) ? String(value) : value.toFixed(2).replace(".", ","));
const later = (a: string, b: string) => (a > b ? a : b);

/**
 * Vacaciones pendientes por defecto: lo normal es haber disfrutado las de cada año cumplido,
 * así que solo se deben las del año de servicio en curso (15 días hábiles por año, en proporción).
 */
export function defaultVacationDays(serviceDays: number) {
    if (serviceDays <= 0) return 0;
    const current = serviceDays % 360;
    return current === 0 ? 15 : (current * 15) / 360;
}

export function calculateLiquidacion(input: LiquidacionInput) {
    const {
        contract,
        ending,
        start,
        end,
        agreedEnd,
        salary,
        integral = false,
        overtime = 0,
        variable = 0,
        unpaidSalaryDays,
        unpaidLeave = 0,
        previousSeveranceOwed = false,
    } = input;

    const year = Number(end.slice(0, 4));
    const wage = getMinimumWage(year);
    const transport = input.transport && !integral && salary <= transportLimit(wage);
    const transportAid = transport ? wage.transport : 0;

    // Bases: cesantías y prima llevan todo lo que es salario más el auxilio;
    // las vacaciones no llevan horas extra ni auxilio (art. 192); la indemnización, todo lo salarial
    const fullSalary = salary + overtime + variable;
    const benefitBase = fullSalary + transportAid;
    const vacationBase = salary + variable;
    const dailySalary = fullSalary / DAILY;

    const serviceDays = Math.max(0, days360(start, end) - unpaidLeave);
    const leaveIn = (days: number) => Math.min(days, unpaidLeave);

    const severanceStart = later(start, `${year}-01-01`);
    const severanceDays = Math.max(0, days360(severanceStart, end) - leaveIn(days360(severanceStart, end)));

    const semesterStart = Number(end.slice(5, 7)) <= 6 ? `${year}-01-01` : `${year}-07-01`;
    const primaStart = later(start, semesterStart);
    const primaDays = Math.max(0, days360(primaStart, end) - leaveIn(days360(primaStart, end)));

    const items: Item[] = [];

    // Salario pendiente
    if (unpaidSalaryDays > 0) {
        const pay = (salary * unpaidSalaryDays) / DAILY;
        const aid = (transportAid * unpaidSalaryDays) / DAILY;
        items.push({
            key: "salario",
            label: "Salario pendiente",
            value: Math.round(pay + aid),
            formula: `${fmt(salary)} × ${unpaidSalaryDays} ÷ 30${aid ? ` + auxilio ${fmt(aid)}` : ""}`,
            note: `${unpaidSalaryDays} ${unpaidSalaryDays === 1 ? "día" : "días"} trabajados que no te han pagado.`,
        });
    }

    if (!integral) {
        const severance = (benefitBase * severanceDays) / 360;
        items.push({
            key: "cesantias",
            label: "Cesantías",
            value: Math.round(severance),
            formula: `${fmt(benefitBase)} × ${severanceDays} ÷ 360`,
            note: `Del ${formatLong(severanceStart)} a tu último día. Las de años anteriores deberían estar en tu fondo.`,
        });
        items.push({
            key: "intereses",
            label: "Intereses de cesantías",
            value: Math.round((severance * severanceDays * 0.12) / 360),
            formula: `${fmt(severance)} × ${severanceDays} × 12 % ÷ 360`,
            note: "El 12 % anual sobre las cesantías, proporcional a los días.",
        });
        items.push({
            key: "prima",
            label: "Prima de servicios",
            value: Math.round((benefitBase * primaDays) / 360),
            formula: `${fmt(benefitBase)} × ${primaDays} ÷ 360`,
            note: `Del semestre en curso: del ${formatLong(primaStart)} a tu último día.`,
        });

        // Si las cesantías del año pasado nunca llegaron al fondo, se pagan directo con sus intereses
        if (previousSeveranceOwed && start < `${year}-01-01`) {
            const previousStart = later(start, `${year - 1}-01-01`);
            const previousDays = days360(previousStart, `${year - 1}-12-31`);
            const previous = (benefitBase * previousDays) / 360;
            const interest = (previous * previousDays * 0.12) / 360;
            items.push({
                key: "cesantias-anteriores",
                label: `Cesantías de ${year - 1} sin consignar`,
                value: Math.round(previous + interest),
                formula: `${fmt(benefitBase)} × ${previousDays} ÷ 360 + intereses`,
                note: "Estimado con tu salario actual. Debieron consignarse antes del 15 de febrero.",
            });
        }
    }

    // Vacaciones: 15 días hábiles por año, se compensan en dinero por año y fracción (art. 189)
    const vacationEarned = (serviceDays * 15) / 360;
    const vacationDefault = input.vacationPending == null;
    // Nunca más de lo que se ganó en todo el contrato
    const vacationPending = Math.min(vacationEarned, Math.max(0, input.vacationPending ?? defaultVacationDays(serviceDays)));
    const round2 = (value: number) => fmtDays(Math.round(value * 100) / 100);
    const vacationValue = integral ? (salary * vacationPending) / DAILY : (vacationBase * vacationPending) / DAILY;
    items.push({
        key: "vacaciones",
        label: "Vacaciones pendientes",
        value: Math.round(vacationValue),
        formula: `${fmt(integral ? salary : vacationBase)} × ${round2(vacationPending)} ÷ 30`,
        note: vacationDefault
            ? `Los ${round2(vacationPending)} días del año de servicio en curso. Supone que ya disfrutaste los de cada año cumplido.`
            : `${round2(vacationPending)} días pendientes, de ${round2(vacationEarned)} que ganaste en todo el contrato.`,
    });

    // Indemnización por despido sin justa causa (art. 64)
    let compensationDays = 0;
    let compensationNote = "";
    const years = serviceDays / 360;
    if (isCompensated(ending)) {
        if (contract === "indefinido") {
            const high = integral || salary >= wage.salary * 10;
            const [first, next] = high ? [20, 15] : [30, 20];
            compensationDays = years <= 1 ? first : first + next * (years - 1);
            compensationNote = `${first} días por el primer año${years > 1 ? ` y ${next} por cada año siguiente, en proporción` : ""}${high ? " (ganas 10 mínimos o más)" : ""}.`;
        } else if (agreedEnd && agreedEnd > end) {
            const remaining = days360(addDays(end, 1), agreedEnd);
            compensationDays = contract === "obra" ? Math.max(15, remaining) : remaining;
            compensationNote =
                contract === "obra"
                    ? `El tiempo que faltaba para terminar la obra, mínimo 15 días.`
                    : `Los salarios del tiempo que faltaba para que se venciera el contrato.`;
        } else if (contract === "obra") {
            compensationDays = 15;
            compensationNote = "Mínimo 15 días si no sabes cuánto faltaba de la obra.";
        }
    }
    if (compensationDays > 0) {
        const roundedDays = Math.round(compensationDays * 100) / 100;
        items.push({
            key: "indemnizacion",
            label: "Indemnización por despido",
            value: Math.round(dailySalary * compensationDays),
            formula: `${fmt(dailySalary)} × ${fmtDays(roundedDays)} días`,
            note: compensationNote,
        });
    }

    // Descuentos del trabajador sobre el salario pendiente: salud 4 %, pensión 4 % y solidaridad
    const unpaidPay = (salary * unpaidSalaryDays) / DAILY;
    const contributionBase = integral ? unpaidPay * 0.7 : unpaidPay;
    const deductionRate = 0.08 + solidarityRate(salary, wage);
    const deductions = Math.round(contributionBase * deductionRate);
    if (deductions > 0) {
        items.push({
            key: "descuentos",
            label: "Salud y pensión",
            value: -deductions,
            formula: `${fmt(contributionBase)} × ${String(Math.round(deductionRate * 1000) / 10).replace(".", ",")} %`,
            note: "Solo sobre el salario pendiente. Las prestaciones no pagan aportes.",
        });
    }

    const total = items.reduce((sum, item) => sum + item.value, 0);

    return {
        wage,
        items,
        total,
        serviceDays,
        severanceStart,
        severanceDays,
        primaStart,
        primaDays,
        vacationEarned,
        vacationPending,
        compensationDays,
        dailySalary,
        transportAid,
    };
}

export { days360, formatCOP, formatNumber, parseCOP } from "@/lib/prima";
