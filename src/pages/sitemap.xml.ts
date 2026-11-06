import type { APIRoute } from "astro";
import { FESTIVOS_YEARS, LAST_REVIEW } from "@/lib/festivos";
import { PRIMA_REVIEW } from "@/lib/prima";
import { LIQUIDACION_REVIEW } from "@/lib/liquidacion";
import { INTERES_REVIEW } from "@/lib/interes-compuesto";
import { CREDITO_REVIEW } from "@/lib/credito";
import { DIAS_HABILES_REVIEW } from "@/lib/dias-habiles";
import { SALARIO_MINIMO_REVIEW, nextWage } from "@/lib/salario-minimo";

// Páginas públicas del sitio. Agrega aquí las nuevas páginas indexables.
const pages: { path: string; changefreq: string; priority: string; lastmod?: string }[] = [
    { path: "/", changefreq: "monthly", priority: "1.0" },
    ...FESTIVOS_YEARS.map((year) => ({
        path: `/festivos-colombia-${year}`,
        changefreq: "monthly",
        priority: "0.9",
        lastmod: LAST_REVIEW,
    })),
    { path: "/calculadora-prima", changefreq: "monthly", priority: "0.9", lastmod: PRIMA_REVIEW },
    { path: "/liquidacion-laboral", changefreq: "monthly", priority: "0.9", lastmod: LIQUIDACION_REVIEW },
    { path: "/interes-compuesto", changefreq: "monthly", priority: "0.9", lastmod: INTERES_REVIEW },
    { path: "/simulador-credito", changefreq: "monthly", priority: "0.9", lastmod: CREDITO_REVIEW },
    { path: "/dias-habiles", changefreq: "monthly", priority: "0.9", lastmod: DIAS_HABILES_REVIEW },
    { path: `/salario-minimo-${nextWage.year}`, changefreq: "weekly", priority: "0.9", lastmod: SALARIO_MINIMO_REVIEW },
];

export const GET: APIRoute = ({ site }) => {
    const buildDate = new Date().toISOString().slice(0, 10);
    const urls = pages
        .map(
            ({ path, changefreq, priority, lastmod = buildDate }) => `  <url>
    <loc>${new URL(path, site).href}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`,
        )
        .join("\n");

    return new Response(
        `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`,
        { headers: { "Content-Type": "application/xml; charset=utf-8" } },
    );
};
