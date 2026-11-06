// Unidad de Valor Tributario (UVT): valores por año y conversiones.
// Lo usan las páginas y el navegador, así que no depende de nada de Astro.

/** Última vez que se revisaron los valores */
export const UVT_REVIEW = "2026-11-06";

export interface UvtYear {
    year: number;
    value: number;
    resolution: string;
}

/**
 * UVT del año que viene. Mientras sea null, las páginas muestran que está por confirmar.
 * Cuando la DIAN publique la resolución (noviembre o diciembre), llena estos dos valores y listo.
 */
export const NEXT_UVT = {
    year: 2027,
    value: null as number | null,
    resolution: "",
};

/**
 * Estimación de la UVT 2027 con la variación del IPC de ingresos medios (octubre 2025 a octubre 2026)
 * que publicó el DANE: 6,29 % a 6,30 % según el redondeo. Solo se muestra mientras no hay resolución.
 */
export const NEXT_UVT_ESTIMATE = { low: 55_668, high: 55_674, ipc: "6,3 %" };

const KNOWN: UvtYear[] = [
    { year: 2020, value: 35_607, resolution: "" },
    { year: 2021, value: 36_308, resolution: "" },
    { year: 2022, value: 38_004, resolution: "" },
    { year: 2023, value: 42_412, resolution: "" },
    { year: 2024, value: 47_065, resolution: "" },
    { year: 2025, value: 49_799, resolution: "" },
    { year: 2026, value: 52_374, resolution: "Resolución DIAN 238 de 2025" },
];

export const isNextUvtKnown = NEXT_UVT.value != null;

export const UVT_YEARS: UvtYear[] = isNextUvtKnown ? [...KNOWN, NEXT_UVT as UvtYear] : KNOWN;

/** UVT de un año; si todavía no existe, la última conocida */
export const getUvt = (year: number) =>
    UVT_YEARS.find((uvt) => uvt.year === year) ?? UVT_YEARS[UVT_YEARS.length - 1];

/** La UVT vigente con la que se calculan retenciones y topes hoy */
export const currentUvt = (today: string) => getUvt(Number(today.slice(0, 4)));

/** Pesos redondeados al peso, como los publica la DIAN */
export const uvtToPesos = (uvt: number, value: number) => Math.round(uvt * value);
export const pesosToUvt = (pesos: number, value: number) => pesos / value;

/** Aumento de la UVT frente al año anterior */
export function uvtHistory() {
    return UVT_YEARS.map((uvt, index) => ({
        ...uvt,
        increase: index ? uvt.value / UVT_YEARS[index - 1].value - 1 : null,
    }));
}

/** Valores que la gente más busca, expresados en UVT */
export const KEY_VALUES: { uvt: number; label: string; detail: string; per?: string }[] = [
    { uvt: 1_400, label: "Tope de ingresos para declarar renta", detail: "Ingresos brutos del año (art. 593 E.T.)" },
    { uvt: 4_500, label: "Tope de patrimonio para declarar renta", detail: "Patrimonio bruto al 31 de diciembre" },
    { uvt: 350, label: "Retiros sin 4x1000", detail: "Exención mensual del GMF (art. 879 E.T.)", per: "al mes" },
    { uvt: 95, label: "Salario desde el que hay retención", detail: "Ingreso laboral gravado (art. 383 E.T.)", per: "al mes" },
    { uvt: 3_500, label: "Tope para no ser responsable de IVA", detail: "Ingresos brutos del año (art. 437 E.T.)" },
    { uvt: 10, label: "Sanción mínima", detail: "Ninguna sanción tributaria puede ser menor (art. 639 E.T.)" },
    { uvt: 10, label: "Base de retención en compras", detail: "Desde julio de 2026 (Decreto 572 de 2025)" },
    { uvt: 2, label: "Base de retención en servicios", detail: "Desde julio de 2026 (Decreto 572 de 2025)" },
    { uvt: 100_000, label: "Tope del Régimen Simple", detail: "Ingresos brutos del año anterior" },
];

/** "52.374" */
export const formatNumber = (value: number) => String(Math.round(value)).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
export const formatCOP = (value: number) => `${value < 0 ? "−" : ""}$${formatNumber(Math.abs(value))}`;

/** UVT con hasta dos decimales: "1.400", "95,5", "0,25" */
export const formatUvt = (value: number) => {
    const [int, dec = ""] = (Math.round(value * 100) / 100).toFixed(2).split(".");
    const trimmed = dec.replace(/0+$/, "");
    return `${formatNumber(Number(int))}${trimmed ? `,${trimmed}` : ""}`;
};

export const parseCOP = (text: string) => Number(text.replace(/\D/g, "")) || 0;
export const parseDecimal = (text: string) => Number(text.replace(/\./g, "").replace(",", ".").replace(/[^\d.]/g, "")) || 0;
