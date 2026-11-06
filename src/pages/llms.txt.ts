import type { APIRoute } from "astro";
import { basics } from "@cv";
import { LAST_REVIEW, formatLong, getHolidays, getLongWeekends } from "@/lib/festivos";
import { PRIMA_REVIEW, calculatePrima, formatCOP, getMinimumWage, transportLimit } from "@/lib/prima";

// Resumen del sitio para buscadores con IA (propuesta llms.txt)
export const GET: APIRoute = ({ site }) => {
    const url = (path: string) => new URL(path, site).href;
    const holidays = getHolidays(2027);
    const wage = getMinimumWage(2026);
    const minimumPrima = calculatePrima({ salary: wage.salary, transport: true, start: "2026-07-01", end: "2026-12-31", wage });

    const body = `# ${basics.name}

> Desarrollador full stack en ${basics.location.city}, Colombia, con foco en frontend. Este sitio reúne su portafolio, una guía de los festivos de Colombia en 2027 y una calculadora de la prima de servicios.

## Páginas

- [Portafolio](${url("/")}): experiencia, proyectos personales y contacto.
- [Festivos en Colombia 2027](${url("/festivos-colombia-2027")}): los ${holidays.length} festivos con su día de la semana, ${getLongWeekends(2027).length} puentes, Semana Santa, días hábiles, planes de vacaciones y la Ley Emiliani.
- [Calculadora de prima de servicios](${url("/calculadora-prima")}): calcula la prima de junio o diciembre con auxilio de transporte, pagos variables y días trabajados.

## Datos

- [Festivos 2027 en iCalendar](${url("/festivos-colombia-2027.ics")})
- [Festivos 2027 en JSON](${url("/festivos-colombia-2027.json")})

## Festivos de Colombia en 2027

Según la Ley 51 de 1983 (Ley Emiliani) y la Ley 2578 de 2026, revisado el ${LAST_REVIEW}.

${holidays.map(({ date, name, movedFrom }) => `- ${date} (${formatLong(date)}): ${name}${movedFrom ? `, trasladado desde el ${formatLong(movedFrom)}` : ""}`).join("\n")}

## Prima de servicios en Colombia (${wage.year})

Revisado el ${PRIMA_REVIEW}. Según el artículo 306 del Código Sustantivo del Trabajo, la prima equivale a 30 días de salario por año y se paga en dos partes: a más tardar el 30 de junio y el 20 de diciembre.

- Fórmula: (salario + auxilio de transporte + promedio de pagos variables) × días trabajados ÷ 360. Los días se cuentan con meses de 30; un semestre completo son 180.
- Salario mínimo ${wage.year}: ${formatCOP(wage.salary)} (${wage.salaryDecree}). Auxilio de transporte: ${formatCOP(wage.transport)} (${wage.transportDecree}), para quien gana hasta ${formatCOP(transportLimit(wage))}.
- Prima de un semestre completo con el salario mínimo: ${formatCOP(minimumPrima.total)}.
- Es proporcional al tiempo trabajado (sentencia C-042 de 2003) y no paga aportes a salud ni pensión (art. 307).

`;

    return new Response(body, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
};
