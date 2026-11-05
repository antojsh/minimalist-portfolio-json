import type { APIRoute } from "astro";
import { basics } from "@cv";
import { LAST_REVIEW, formatLong, getHolidays, getLongWeekends } from "@/lib/festivos";

// Resumen del sitio para buscadores con IA (propuesta llms.txt)
export const GET: APIRoute = ({ site }) => {
    const url = (path: string) => new URL(path, site).href;
    const holidays = getHolidays(2027);

    const body = `# ${basics.name}

> Desarrollador full stack en ${basics.location.city}, Colombia, con foco en frontend. Este sitio reúne su portafolio y una guía de los festivos de Colombia en 2027.

## Páginas

- [Portafolio](${url("/")}): experiencia, proyectos personales y contacto.
- [Festivos en Colombia 2027](${url("/festivos-colombia-2027")}): los ${holidays.length} festivos con su día de la semana, ${getLongWeekends(2027).length} puentes, Semana Santa, días hábiles, planes de vacaciones y la Ley Emiliani.

## Datos

- [Festivos 2027 en iCalendar](${url("/festivos-colombia-2027.ics")})
- [Festivos 2027 en JSON](${url("/festivos-colombia-2027.json")})

## Festivos de Colombia en 2027

Según la Ley 51 de 1983 (Ley Emiliani) y la Ley 2578 de 2026, revisado el ${LAST_REVIEW}.

${holidays.map(({ date, name, movedFrom }) => `- ${date} (${formatLong(date)}): ${name}${movedFrom ? `, trasladado desde el ${formatLong(movedFrom)}` : ""}`).join("\n")}
`;

    return new Response(body, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
};
