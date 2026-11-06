// Salario mínimo en Colombia y lo que cuesta contratar a alguien que lo gana.
// Lo usan la página y el navegador, así que no depende de nada de Astro.

import { MINIMUM_WAGES, NEXT_MINIMUM_WAGE, isNextWageKnown, type MinimumWage } from "@/lib/prima";

/** Última vez que se revisaron los valores y las normas */
export const SALARIO_MINIMO_REVIEW = "2026-11-05";

/** Años anteriores, solo para la tabla del histórico */
const PAST_WAGES = [
    { year: 2021, salary: 908_526, transport: 106_454 },
    { year: 2022, salary: 1_000_000, transport: 117_172 },
    { year: 2023, salary: 1_160_000, transport: 140_606 },
    { year: 2024, salary: 1_300_000, transport: 162_000 },
    { year: 2025, salary: 1_423_500, transport: 200_000 },
];

export const nextWage = NEXT_MINIMUM_WAGE;
export const isRevealed = isNextWageKnown(NEXT_MINIMUM_WAGE);

/** El último salario mínimo que ya se conoce */
export const latestWage = (): MinimumWage => MINIMUM_WAGES[MINIMUM_WAGES.length - 1];

/** Histórico con el aumento de cada año frente al anterior */
export function wageHistory() {
    const all = [...PAST_WAGES, ...MINIMUM_WAGES.map(({ year, salary, transport }) => ({ year, salary, transport }))];
    return all.slice(1).map((wage, index) => ({ ...wage, increase: wage.salary / all[index].salary - 1 }));
}

/** Plazos de la Ley 278 de 1996 para fijar el salario del año siguiente */
export function wageCalendar(year: number) {
    const before = year - 1;
    return [
        { date: `${before}-12-01`, label: "Arranca la mesa", text: "Empresarios, sindicatos y Gobierno se sientan a negociar." },
        { date: `${before}-12-15`, label: "Plazo para el acuerdo", text: "Si no hay consenso, cada parte deja por escrito su propuesta." },
        { date: `${before}-12-30`, label: "Plazo para el decreto", text: "Sin acuerdo, el Gobierno lo fija por decreto." },
        { date: `${year}-01-01`, label: "Empieza a regir", text: "Todos los salarios mínimos se ajustan desde este día." },
    ];
}

/** Jornada máxima semanal según la Ley 2101 de 2021: 42 horas desde el 15 de julio de 2026 */
export const weeklyHours = (date: string) =>
    date >= "2026-07-15" ? 42 : date >= "2025-07-15" ? 44 : date >= "2024-07-15" ? 46 : 47;

/** Horas ordinarias del mes: la jornada semanal repartida en seis días, por 30 días */
export const monthlyHours = (date: string) => (weeklyHours(date) / 6) * 30;

export interface CostItem {
    key: string;
    label: string;
    rate: string;
    value: number;
    group: "pago" | "seguridad" | "prestaciones";
}

export interface CostOptions {
    /**
     * Exonerada de salud, SENA e ICBF (art. 114-1 del Estatuto Tributario): sociedades y personas
     * naturales con dos o más empleados, por quienes ganan menos de diez mínimos
     */
    exempt?: boolean;
    /** Tarifa de la ARL; la de riesgo I es 0,522 % */
    arl?: number;
}

const percent = (rate: number) => `${String(Math.round(rate * 10000) / 100).replace(".", ",")} %`;

/** Costo mensual de un empleado con el salario mínimo, con las prestaciones provisionadas mes a mes */
export function employerCost(wage: Pick<MinimumWage, "salary" | "transport">, { exempt = true, arl = 0.00522 }: CostOptions = {}) {
    const { salary, transport } = wage;
    const benefitBase = salary + transport;
    const items: CostItem[] = [
        { key: "salario", label: "Salario", rate: "", value: salary, group: "pago" },
        { key: "auxilio", label: "Auxilio de transporte", rate: "", value: transport, group: "pago" },
        { key: "pension", label: "Pensión", rate: "12 %", value: salary * 0.12, group: "seguridad" },
        { key: "salud", label: "Salud", rate: exempt ? "Exonerada" : "8,5 %", value: exempt ? 0 : salary * 0.085, group: "seguridad" },
        { key: "arl", label: "ARL, riesgo I", rate: percent(arl), value: salary * arl, group: "seguridad" },
        { key: "caja", label: "Caja de compensación", rate: "4 %", value: salary * 0.04, group: "seguridad" },
        { key: "icbf", label: "ICBF", rate: exempt ? "Exonerado" : "3 %", value: exempt ? 0 : salary * 0.03, group: "seguridad" },
        { key: "sena", label: "SENA", rate: exempt ? "Exonerado" : "2 %", value: exempt ? 0 : salary * 0.02, group: "seguridad" },
        { key: "cesantias", label: "Cesantías", rate: "8,33 %", value: benefitBase / 12, group: "prestaciones" },
        { key: "intereses", label: "Intereses de cesantías", rate: "1 %", value: benefitBase * 0.01, group: "prestaciones" },
        { key: "prima", label: "Prima de servicios", rate: "8,33 %", value: benefitBase / 12, group: "prestaciones" },
        { key: "vacaciones", label: "Vacaciones", rate: "4,17 %", value: salary / 24, group: "prestaciones" },
    ];
    const sum = (group?: CostItem["group"]) =>
        items.filter((item) => !group || item.group === group).reduce((total, item) => total + item.value, 0);
    const monthly = sum();
    return {
        items,
        pay: sum("pago"),
        social: sum("seguridad"),
        benefits: sum("prestaciones"),
        monthly,
        yearly: monthly * 12,
        /** Cuánto cuesta cada peso de salario */
        factor: monthly / salary,
    };
}

/** Lo que le llega al trabajador: salario menos 4 % de salud y 4 % de pensión, más el auxilio */
export const takeHome = (wage: Pick<MinimumWage, "salary" | "transport">) => wage.salary * 0.92 + wage.transport;

/** Salario y auxilio con un aumento hipotético, redondeados al peso */
export const withIncrease = (wage: Pick<MinimumWage, "salary" | "transport">, increase: number) => ({
    salary: Math.round(wage.salary * (1 + increase)),
    transport: Math.round(wage.transport * (1 + increase)),
});

/** "9,5 %" */
export const formatPercent = (rate: number, digits = 2) =>
    `${String(Math.round(rate * 100 * 10 ** digits) / 10 ** digits).replace(".", ",")} %`;
