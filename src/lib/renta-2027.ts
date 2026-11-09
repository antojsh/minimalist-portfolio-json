// Declaración de renta 2027 (año gravable 2026): lo que ya está definido, lo que falta
// y los alivios que bajan la base. Lo usan el artículo del blog y el sitemap.
// Lo que depende de la DIAN se marca como pendiente: cuando salga, cambia `known` y la fuente.

import { MONTHS, WEEKDAYS, weekdayOf } from "@/lib/festivos";
import { isBusinessDay } from "@/lib/dias-habiles";
import { DECLARATION_YEAR, TAXABLE_YEAR, deadlines } from "@/lib/renta";
import { NEXT_UVT, NEXT_UVT_ESTIMATE, getUvt, isNextUvtKnown } from "@/lib/uvt";

export const RENTA_2027_PUBLISHED = "2026-11-09";
export const RENTA_2027_REVIEW = "2026-11-09";

export const UVT_TAXABLE = getUvt(TAXABLE_YEAR);

/** Último día hábil de un mes, sin sábados */
export function lastBusinessDay(year: number, month: number) {
    for (let day = 31; day > 0; day--) {
        const date = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
        if (new Date(`${date}T00:00:00Z`).getUTCMonth() !== month - 1) continue;
        if (isBusinessDay(date)) return date;
    }
    throw new Error(`Sin días hábiles en ${month}/${year}`);
}

/** "martes 10 de agosto" */
export const formatDay = (date: string) =>
    `${WEEKDAYS[weekdayOf(date)]} ${Number(date.slice(8))} de ${MONTHS[Number(date.slice(5, 7)) - 1]}`;

/** "10 ago" */
export const shortDay = (date: string) => `${Number(date.slice(8))} ${MONTHS[Number(date.slice(5, 7)) - 1].slice(0, 3)}`;

const list = deadlines(DECLARATION_YEAR);
export const FIRST_DEADLINE = list[0];
export const LAST_DEADLINE = list[list.length - 1];

/** Primer y último vencimiento de cada mes, para el resumen del calendario */
export const DEADLINE_MONTHS = [8, 9, 10].map((month) => {
    const rows = list.filter(({ date }) => Number(date.slice(5, 7)) === month);
    return {
        month: MONTHS[month - 1],
        from: rows[0],
        to: rows[rows.length - 1],
    };
});

/** Los certificados de ingresos y retenciones se entregan a más tardar el último día hábil de marzo */
export const CERTIFICATES_DUE = lastBusinessDay(DECLARATION_YEAR, 3);

/**
 * Sanción mínima: 10 UVT del año en que se liquida la sanción, o sea, la UVT 2027.
 * Mientras la DIAN no la publique se muestra la estimación con el IPC.
 */
export const MIN_PENALTY = isNextUvtKnown
    ? { value: 10 * (NEXT_UVT.value as number), estimated: false }
    : { value: Math.round((10 * NEXT_UVT_ESTIMATE.low) / 100) * 100, estimated: true };

export interface StatusItem {
    label: string;
    known: boolean;
    detail: string;
}

/** Lo que ya se sabe y lo que falta. Cambia `known` cuando la DIAN publique cada cosa. */
export const STATUS: StatusItem[] = [
    {
        label: "Topes para saber si declaras",
        known: true,
        detail: `Se calculan con la UVT de ${TAXABLE_YEAR}, que es fija desde diciembre de ${TAXABLE_YEAR - 1}.`,
    },
    {
        label: "Tabla del impuesto y alivios",
        known: true,
        detail: `Rige la Ley 2277 de 2022. Ninguna reforma posterior cambió el año gravable ${TAXABLE_YEAR}.`,
    },
    {
        label: "Fechas por cédula",
        known: true,
        detail: "El Decreto 2229 de 2023 las fija en días hábiles para todos los años. Solo cambiarían si sale un decreto nuevo.",
    },
    {
        label: `UVT ${DECLARATION_YEAR}`,
        known: isNextUvtKnown,
        detail: isNextUvtKnown
            ? `${NEXT_UVT.resolution}. Sirve para las sanciones, no para los topes.`
            : "La DIAN la publica en noviembre o diciembre. Sirve para las sanciones, no para los topes.",
    },
    {
        label: "Calendario oficial publicado por la DIAN",
        known: false,
        detail: "Suele salir a finales de diciembre. Si confirma lo que dice el decreto, las fechas de aquí no cambian.",
    },
    {
        label: "Formulario 210 y su instructivo",
        known: false,
        detail: `La DIAN prescribe el formulario del año gravable ${TAXABLE_YEAR} en los primeros meses de ${DECLARATION_YEAR}.`,
    },
    {
        label: "Declaración sugerida",
        known: false,
        detail: "El borrador prellenado con tu información exógena aparece en el portal de la DIAN antes de los vencimientos.",
    },
];

export interface Relief {
    label: string;
    rule: string;
    /** Tope en UVT al año; null si no tiene un tope fijo en UVT */
    capUvt: number | null;
    /** Va por fuera del límite del 40 % y 1.340 UVT */
    outsideLimit: boolean;
    paper: string;
}

/** Rentas exentas y deducciones más usadas por los empleados (Ley 2277 de 2022) */
export const RELIEFS: Relief[] = [
    {
        label: "Renta exenta del 25 % del salario",
        rule: "El 25 % de lo que queda del ingreso laboral después de aportes y demás alivios.",
        capUvt: 790,
        outsideLimit: false,
        paper: "Sale del certificado de ingresos y retenciones.",
    },
    {
        label: "Intereses del crédito de vivienda o leasing habitacional",
        rule: "Lo que pagaste de intereses en el año por la vivienda.",
        capUvt: 1_200,
        outsideLimit: false,
        paper: "Certificado del banco.",
    },
    {
        label: "Medicina prepagada y seguros de salud",
        rule: "Lo que pagaste por ti, tu pareja o tus hijos. Máximo 16 UVT al mes.",
        capUvt: 192,
        outsideLimit: false,
        paper: "Certificado de la empresa de salud.",
    },
    {
        label: "Dependiente económico (10 %)",
        rule: "10 % del ingreso laboral bruto. Máximo 32 UVT al mes.",
        capUvt: 384,
        outsideLimit: false,
        paper: "Prueba de la dependencia: registro civil, certificado de estudio o de invalidez.",
    },
    {
        label: "Aportes voluntarios a pensión y cuentas AFC o AVC",
        rule: "Hasta el 30 % del ingreso del año.",
        capUvt: 3_800,
        outsideLimit: false,
        paper: "Certificado del fondo o del banco.",
    },
    {
        label: "Deducción por dependientes de la Ley 2277",
        rule: "72 UVT por cada dependiente, hasta cuatro. Solo para ingresos de un contrato laboral.",
        capUvt: 288,
        outsideLimit: true,
        paper: "Prueba de cada dependiente.",
    },
    {
        label: "1 % de las compras con factura electrónica",
        rule: "Compras personales pagadas con tarjeta, transferencia u otro medio electrónico.",
        capUvt: 240,
        outsideLimit: true,
        paper: "Facturas electrónicas a tu nombre y con tu cédula.",
    },
    {
        label: "50 % del 4x1000",
        rule: "La mitad del gravamen a los movimientos financieros que te cobraron.",
        capUvt: null,
        outsideLimit: false,
        paper: "Certificado del banco.",
    },
];

/** Límite general de rentas exentas y deducciones de la cédula general (art. 336 E.T.) */
export const GLOBAL_LIMIT = { share: 0.4, uvt: 1_340 };

export interface Milestone {
    when: string;
    text: string;
    /** Ya pasó o ya se conoce */
    done: boolean;
}

/** El año de la renta, de diciembre a octubre */
export const TIMELINE: Milestone[] = [
    {
        when: `Nov-dic ${TAXABLE_YEAR}`,
        text: `La DIAN publica la UVT ${DECLARATION_YEAR} y el calendario tributario.`,
        done: isNextUvtKnown,
    },
    {
        when: `31 dic ${TAXABLE_YEAR}`,
        text: "Se cierra el año gravable. Tu patrimonio se mide con lo que tengas ese día.",
        done: false,
    },
    {
        when: `Hasta ${shortDay(CERTIFICATES_DUE)} ${DECLARATION_YEAR}`,
        text: "Tu empleador debe entregarte el certificado de ingresos y retenciones (formulario 220).",
        done: false,
    },
    {
        when: `Abr-jun ${DECLARATION_YEAR}`,
        text: "Bancos, empresas y notarías le reportan a la DIAN lo que saben de ti: la información exógena.",
        done: false,
    },
    {
        when: `Jul-ago ${DECLARATION_YEAR}`,
        text: "Aparece la declaración sugerida en el portal de la DIAN. Revísala antes de firmarla.",
        done: false,
    },
    {
        when: `${shortDay(FIRST_DEADLINE.date)} - ${shortDay(LAST_DEADLINE.date)} ${DECLARATION_YEAR}`,
        text: "Vencimientos según los dos últimos dígitos de tu cédula. Se presenta y se paga el mismo día.",
        done: false,
    },
];
