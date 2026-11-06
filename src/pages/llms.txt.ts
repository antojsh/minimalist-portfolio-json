import type { APIRoute } from "astro";
import { basics } from "@cv";
import { FESTIVOS_YEARS, LAST_REVIEW, formatLong, getHolidays, getLongWeekends } from "@/lib/festivos";
import { LIQUIDACION_REVIEW } from "@/lib/liquidacion";
import { PRIMA_REVIEW, calculatePrima, formatCOP, getMinimumWage, transportLimit } from "@/lib/prima";

// Resumen del sitio para buscadores con IA (propuesta llms.txt)
export const GET: APIRoute = ({ site }) => {
    const url = (path: string) => new URL(path, site).href;
    const wage = getMinimumWage(2026);
    const minimumPrima = calculatePrima({ salary: wage.salary, transport: true, start: "2026-07-01", end: "2026-12-31", wage });

    const body = `# ${basics.name}

> Desarrollador full stack en ${basics.location.city}, Colombia, con foco en frontend. Este sitio reúne su portafolio, guías de los festivos de Colombia (${FESTIVOS_YEARS.join(", ")}) y calculadoras de prima de servicios y de liquidación laboral.

## Páginas

- [Portafolio](${url("/")}): experiencia, proyectos personales y contacto.
${FESTIVOS_YEARS.map((year) => `- [Festivos en Colombia ${year}](${url(`/festivos-colombia-${year}`)}): los ${getHolidays(year).length} festivos con su día de la semana, ${getLongWeekends(year).length} puentes, Semana Santa, días hábiles, planes de vacaciones y la Ley Emiliani.`).join("\n")}
- [Calculadora de prima de servicios](${url("/calculadora-prima")}): calcula la prima de junio o diciembre con auxilio de transporte, pagos variables y días trabajados.
- [Calculadora de liquidación laboral](${url("/liquidacion-laboral")}): salario pendiente, cesantías, intereses, prima, vacaciones e indemnización por despido, con el detalle de cada cuenta.

## Datos

${FESTIVOS_YEARS.map((year) => `- Festivos ${year}: [iCalendar](${url(`/festivos-colombia-${year}.ics`)}) · [JSON](${url(`/festivos-colombia-${year}.json`)})`).join("\n")}

${FESTIVOS_YEARS.map(
    (year) => `## Festivos de Colombia en ${year}

Según la Ley 51 de 1983 (Ley Emiliani) y la Ley 2578 de 2026, revisado el ${LAST_REVIEW}.

${getHolidays(year)
    .map(({ date, name, movedFrom }) => `- ${date} (${formatLong(date)}): ${name}${movedFrom ? `, trasladado desde el ${formatLong(movedFrom)}` : ""}`)
    .join("\n")}`,
).join("\n\n")}

## Prima de servicios en Colombia (${wage.year})

Revisado el ${PRIMA_REVIEW}. Según el artículo 306 del Código Sustantivo del Trabajo, la prima equivale a 30 días de salario por año y se paga en dos partes: a más tardar el 30 de junio y el 20 de diciembre.

- Fórmula: (salario + auxilio de transporte + promedio de pagos variables) × días trabajados ÷ 360. Los días se cuentan con meses de 30; un semestre completo son 180.
- Salario mínimo ${wage.year}: ${formatCOP(wage.salary)} (${wage.salaryDecree}). Auxilio de transporte: ${formatCOP(wage.transport)} (${wage.transportDecree}), para quien gana hasta ${formatCOP(transportLimit(wage))}.
- Prima de un semestre completo con el salario mínimo: ${formatCOP(minimumPrima.total)}.
- Es proporcional al tiempo trabajado (sentencia C-042 de 2003) y no paga aportes a salud ni pensión (art. 307).

## Liquidación de un contrato de trabajo en Colombia

Revisado el ${LIQUIDACION_REVIEW}. Siempre se pagan salario pendiente, cesantías e intereses del año en curso, prima del semestre en curso y vacaciones no disfrutadas; la indemnización solo en despido sin justa causa o despido indirecto.

- Cesantías: (salario + auxilio de transporte) × días del año ÷ 360. Intereses: cesantías × días × 12 % ÷ 360.
- Vacaciones: 15 días hábiles por año, compensadas en dinero por año y fracción (art. 189): salario ÷ 30 × días pendientes, sin auxilio ni horas extra.
- Indemnización (art. 64, contrato indefinido): con menos de 10 salarios mínimos, 30 días por el primer año y 20 por cada año siguiente; con 10 o más, 20 y 15. Término fijo: salarios del tiempo que faltaba; obra o labor: tiempo faltante, mínimo 15 días. La Ley 2466 de 2025 no cambió estos valores.
- La liquidación se paga el último día; cada día de retraso sin buena fe genera un día de salario de sanción (art. 65).

`;

    return new Response(body, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
};
