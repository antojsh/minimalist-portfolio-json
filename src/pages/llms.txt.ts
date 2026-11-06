import type { APIRoute } from "astro";
import { basics } from "@cv";
import { FESTIVOS_YEARS, LAST_REVIEW, formatLong, getHolidays, getLongWeekends } from "@/lib/festivos";
import { LIQUIDACION_REVIEW } from "@/lib/liquidacion";
import { countBetween } from "@/lib/dias-habiles";
import { SALARIO_MINIMO_REVIEW, employerCost, isRevealed, latestWage, nextWage } from "@/lib/salario-minimo";
import { PRIMA_REVIEW, calculatePrima, formatCOP, getMinimumWage, transportLimit } from "@/lib/prima";

// Resumen del sitio para buscadores con IA (propuesta llms.txt)
export const GET: APIRoute = ({ site }) => {
    const url = (path: string) => new URL(path, site).href;
    const wage = getMinimumWage(2026);
    const latest = latestWage();
    const hiring = employerCost(latest);
    const minimumPrima = calculatePrima({ salary: wage.salary, transport: true, start: "2026-07-01", end: "2026-12-31", wage });

    const body = `# ${basics.name}

> Desarrollador full stack en ${basics.location.city}, Colombia, con foco en frontend. Este sitio reúne su portafolio, guías de los festivos de Colombia (${FESTIVOS_YEARS.join(", ")}) y calculadoras de prima de servicios, liquidación laboral, salario mínimo, días hábiles, crédito e interés compuesto, además de una ruleta para sorteos.

## Páginas

- [Portafolio](${url("/")}): experiencia, proyectos personales y contacto.
- [Herramientas](${url("/herramientas")}): índice de todas las herramientas gratis del sitio.
${FESTIVOS_YEARS.map((year) => `- [Festivos en Colombia ${year}](${url(`/festivos-colombia-${year}`)}): los ${getHolidays(year).length} festivos con su día de la semana, ${getLongWeekends(year).length} puentes, Semana Santa, días hábiles, planes de vacaciones y la Ley Emiliani.`).join("\n")}
- [Calculadora de prima de servicios](${url("/calculadora-prima")}): calcula la prima de junio o diciembre con auxilio de transporte, pagos variables y días trabajados.
- [Salario mínimo ${nextWage.year}](${url(`/salario-minimo-${nextWage.year}`)}): ${isRevealed ? "el valor oficial" : "cuándo se define"}, simulador del aumento, salario mínimo vigente y costo de contratar a alguien con el mínimo.
- [Contador de días hábiles](${url("/dias-habiles")}): días hábiles y calendario entre dos fechas, y fecha de vencimiento de un plazo en días hábiles, con los festivos de Colombia. ${FESTIVOS_YEARS.map((year) => `${year}: ${countBetween(`${year}-01-01`, `${year}-12-31`, { includeStart: true }).business} días hábiles`).join("; ")}.
- [Simulador de crédito](${url("/simulador-credito")}): cuota mensual con tasa E.A., M.V. o N.A.M.V., cuota fija o abono constante a capital, seguros, abonos extra y tabla de amortización descargable. Cuota fija = monto × i ÷ (1 − (1 + i)^−n), con i = (1 + E.A.)^(1/12) − 1.
- [Calculadora de interés compuesto](${url("/interes-compuesto")}): cuánto tendrás con aportes periódicos, cuánto ahorrar para una meta o en cuánto tiempo llegas; con capitalización nominal o efectiva, aportes que suben cada año, inflación, comisiones, impuestos, gráfica año a año, regla del 72 y costo de esperar. Funciona en varias monedas.
- [Ruleta aleatoria](${url("/ruleta")}): ruleta de nombres para sorteos, rifas y decisiones; elige con crypto.getRandomValues, saca @usuarios únicos de comentarios de Instagram, quita ganadores para sorteos múltiples, pantalla completa y enlace para compartir. Todo en el navegador.
- [Novena de aguinaldos](${url("/novena-de-aguinaldos")}): texto completo de la novena tradicional colombiana (del 16 al 24 de diciembre): oración para todos los días, las nueve consideraciones, oraciones a la Virgen, a San José y al Niño Jesús, gozos, villancicos tradicionales, cómo rezarla paso a paso y juegos de aguinaldo.
- [¿Debo declarar renta?](${url("/declarar-renta")}): topes del año gravable 2026 (ingresos desde 1.400 UVT, patrimonio de más de 4.500 UVT, tarjeta, compras y consignaciones de más de 1.400 UVT; UVT 2026 de $52.374) y calendario 2027 de personas naturales por los dos últimos dígitos del NIT, del 10 de agosto al 26 de octubre de 2027 (Decreto 2229 de 2023).
- [Retención en la fuente](${url("/retencion-en-la-fuente")}): salarios con la depuración y la tabla del art. 383 (desde 95 UVT de base mensual) y pagos a terceros con las tarifas del Decreto 572 de 2025 (compras 2,5 % desde 10 UVT, servicios 4 % o 6 % desde 2 UVT, honorarios 10 % u 11 %).
- [UVT y conversor](${url("/uvt")}): UVT 2026 de $52.374 (Resolución DIAN 238 de 2025), UVT 2027 por confirmar, conversor de UVT a pesos y valores clave en pesos.
- [Calculadora de IVA](${url("/calculadora-iva")}): agregar IVA (× 1,19) o quitarlo (÷ 1,19), con tarifas del 19 %, 5 % u otra.
- [Calculadora del 4x1000](${url("/calculadora-4x1000")}): GMF del 0,4 % con la exención de 350 UVT al mes ($18.330.900 en 2026).
- [Calculadora de liquidación laboral](${url("/liquidacion-laboral")}): salario pendiente, cesantías, intereses, prima, vacaciones e indemnización por despido, con el detalle de cada cuenta.
- [Blog](${url("/blog")}): artículos de desarrollo y de economía de Colombia explicados fácil.
- [La Ley de Rescate Económico, explicada fácil](${url("/blog/ley-de-rescate-economico")}): el Proyecto de Ley 477 de 2026 del gobierno de Abelardo de la Espriella (radicado el 29 de octubre de 2026, aún no es ley). IVA del 5 % y frutas y verduras a 19 % desde 2028; tramo nuevo de renta del 9 % entre 720 y 1.090 UVT; aporte a salud de 4 % a 8 % según el salario desde 2027; parafiscales solo exonerados hasta 2 mínimos; renta de empresas de 35 % a 31 %; régimen RUGE; recortes de gasto y regla fiscal con alerta en 63 % de deuda. Con calculadoras de mercado, renta, salud y vicios.

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

## Salario mínimo en Colombia

Revisado el ${SALARIO_MINIMO_REVIEW}. ${isRevealed ? `El salario mínimo de ${nextWage.year} es ${formatCOP(latest.salary)} (${latest.salaryDecree}).` : `El salario mínimo de ${nextWage.year} todavía no se conoce: la Comisión de Concertación negocia desde el 1 de diciembre, tiene hasta el 15 para un acuerdo y, si no lo hay, el Gobierno lo decreta a más tardar el 30 de diciembre (Ley 278 de 1996).`}

- Salario mínimo vigente (${latest.year}): ${formatCOP(latest.salary)}, más ${formatCOP(latest.transport)} de auxilio de transporte.
- Costo mensual de un empleado con el mínimo para una empresa exonerada de salud, SENA e ICBF (art. 114-1 E.T.): ${formatCOP(hiring.monthly)}, con pensión 12 %, ARL riesgo I 0,522 %, caja 4 % y prestaciones provisionadas (cesantías, intereses, prima y vacaciones).

## Liquidación de un contrato de trabajo en Colombia

Revisado el ${LIQUIDACION_REVIEW}. Siempre se pagan salario pendiente, cesantías e intereses del año en curso, prima del semestre en curso y vacaciones no disfrutadas; la indemnización solo en despido sin justa causa o despido indirecto.

- Cesantías: (salario + auxilio de transporte) × días del año ÷ 360. Intereses: cesantías × días × 12 % ÷ 360.
- Vacaciones: 15 días hábiles por año, compensadas en dinero por año y fracción (art. 189): salario ÷ 30 × días pendientes, sin auxilio ni horas extra.
- Indemnización (art. 64, contrato indefinido): con menos de 10 salarios mínimos, 30 días por el primer año y 20 por cada año siguiente; con 10 o más, 20 y 15. Término fijo: salarios del tiempo que faltaba; obra o labor: tiempo faltante, mínimo 15 días. La Ley 2466 de 2025 no cambió estos valores.
- La liquidación se paga el último día; cada día de retraso sin buena fe genera un día de salario de sanción (art. 65).

`;

    return new Response(body, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
};
