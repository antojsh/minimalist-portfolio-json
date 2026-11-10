// Salario neto en Colombia: lo que le llega al trabajador después de salud, pensión,
// Fondo de Solidaridad Pensional y retención en la fuente, más el auxilio de transporte.
// Lo usan la página y el navegador, así que no depende de nada de Astro.

import { getMinimumWage, transportLimit } from "@/lib/prima";
import { solidarityRate } from "@/lib/liquidacion";
import { salaryWithholding } from "@/lib/retencion";
import { employerCost } from "@/lib/salario-minimo";

/** Última vez que se revisaron los porcentajes y las normas */
export const SALARIO_NETO_REVIEW = "2026-11-10";

/** Tope del ingreso base de cotización: 25 salarios mínimos (art. 18 de la Ley 100 de 1993) */
export const IBC_CAP = 25;
/** Un salario integral no puede ser menor a 13 mínimos: 10 de salario y 3 de factor prestacional */
export const INTEGRAL_MIN = 13;

export interface NetInput {
    /** Salario mensual pactado */
    salary: number;
    /** Otros pagos que son salario: horas extra, recargos, comisiones */
    other?: number;
    integral?: boolean;
    /** Deducciones que solo bajan la retención */
    dependents?: boolean;
    housing?: number;
    prepaid?: number;
    /** Aportes voluntarios a pensión o AFC descontados por nómina */
    voluntary?: number;
    year: number;
    uvt: number;
}

export interface NetLine {
    key: string;
    label: string;
    value: number;
    note: string;
}

export function netSalary(input: NetInput) {
    const { salary, other = 0, integral = false, voluntary = 0, year } = input;
    const wage = getMinimumWage(year);
    const gross = salary + other;
    // El auxilio se paga a quien gana hasta dos mínimos; nunca con salario integral
    const transport = !integral && salary > 0 && salary <= transportLimit(wage) ? wage.transport : 0;

    // Ingreso base de cotización: el 70 % si es integral y con tope de 25 mínimos
    const ibc = Math.min(integral ? gross * 0.7 : gross, IBC_CAP * wage.salary);
    const health = ibc * 0.04;
    const pension = ibc * 0.04;
    const solidarityPct = solidarityRate(ibc, wage);
    const solidarity = ibc * solidarityPct;
    const withholding = gross > 0 ? salaryWithholding({ ...input, other }).withholding : 0;

    const lines: NetLine[] = [
        { key: "salud", label: "Salud", value: health, note: "4 % del salario" },
        { key: "pension", label: "Pensión", value: pension, note: "4 % del salario" },
        { key: "solidaridad", label: "Fondo de Solidaridad Pensional", value: solidarity, note: `${String(Math.round(solidarityPct * 1000) / 10).replace(".", ",")} % desde 4 mínimos` },
        { key: "retencion", label: "Retención en la fuente", value: withholding, note: "Tabla del art. 383" },
        { key: "voluntarios", label: "Aportes voluntarios", value: voluntary, note: "Siguen siendo tu plata" },
    ];
    const deductions = lines.reduce((sum, line) => sum + line.value, 0);
    const net = gross + transport - deductions;

    return {
        wage,
        gross,
        transport,
        ibc,
        health,
        pension,
        solidarity,
        withholding,
        voluntary,
        lines,
        deductions,
        net,
        half: net / 2,
        /** Qué parte de lo que ganas se va en descuentos */
        share: gross ? deductions / (gross + transport) : 0,
    };
}

/** Lo que paga la empresa por ese salario; solo para salarios ordinarios */
export function companyCost(input: NetInput) {
    const { wage, transport, gross } = netSalary(input);
    return employerCost({ salary: gross, transport }, { exempt: gross < 10 * wage.salary });
}

/**
 * El salario que hay que pedir para recibir `target` al mes. El neto no sube siempre con el salario:
 * se pierde el auxilio al pasar de dos mínimos y el Fondo de Solidaridad entra de golpe en cuatro,
 * así que se busca el salario más bajo tramo por tramo entre esos saltos.
 */
export function salaryForNet(target: number, input: Omit<NetInput, "salary">) {
    if (target <= 0) return 0;
    const wage = getMinimumWage(input.year);
    const factor = input.integral ? 0.7 : 1;
    const jumps = [2, 4, 16, 17, 18, 19, 20].map((times) => (times === 2 ? transportLimit(wage) + 1 : Math.ceil((times * wage.salary) / factor)));
    const ceiling = Math.max(target * 4, 100 * wage.salary);
    const edges = [0, ...jumps.filter((jump) => jump < ceiling), ceiling];
    // Medio peso de holgura para que el neto mostrado (redondeado) sea justo el que se pidió
    const net = (salary: number) => netSalary({ ...input, salary }).net + 0.5;

    for (let i = 0; i < edges.length - 1; i++) {
        let low = edges[i];
        let high = edges[i + 1] - 1;
        if (net(high) < target) continue;
        while (low < high) {
            const mid = Math.floor((low + high) / 2);
            if (net(mid) >= target) high = mid;
            else low = mid + 1;
        }
        return low;
    }
    return ceiling;
}

/** Salarios que más se buscan, para la tabla */
export const COMMON_SALARIES = [2_000_000, 2_500_000, 3_000_000, 3_500_000, 4_000_000, 5_000_000, 6_000_000, 8_000_000, 10_000_000, 12_000_000, 15_000_000, 20_000_000];
