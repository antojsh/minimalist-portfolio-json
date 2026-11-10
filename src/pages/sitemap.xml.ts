import type { APIRoute } from "astro";
import { FESTIVOS_YEARS, LAST_REVIEW } from "@/lib/festivos";
import { PRIMA_REVIEW } from "@/lib/prima";
import { LIQUIDACION_REVIEW } from "@/lib/liquidacion";
import { HORAS_EXTRA_REVIEW } from "@/lib/horas-extra";
import { RENTA_REVIEW } from "@/lib/renta";
import { RETENCION_REVIEW } from "@/lib/retencion";
import { UVT_REVIEW } from "@/lib/uvt";
import { IMPUESTOS_REVIEW } from "@/lib/impuestos";
import { NOVENA_REVIEW } from "@/lib/novena";
import { RULETA_REVIEW } from "@/lib/ruleta";
import { INTERES_REVIEW } from "@/lib/interes-compuesto";
import { CREDITO_REVIEW } from "@/lib/credito";
import { DIAS_HABILES_REVIEW } from "@/lib/dias-habiles";
import { SALARIO_MINIMO_REVIEW, nextWage } from "@/lib/salario-minimo";
import { getPublishedPosts } from "@/lib/blog";

// Páginas públicas del sitio. Agrega aquí las nuevas páginas indexables.
const pages: { path: string; changefreq: string; priority: string; lastmod?: string }[] = [
    { path: "/", changefreq: "monthly", priority: "1.0" },
    { path: "/herramientas", changefreq: "weekly", priority: "0.8", lastmod: "2026-11-10" },
    ...FESTIVOS_YEARS.map((year) => ({
        path: `/festivos-colombia-${year}`,
        changefreq: "monthly",
        priority: "0.9",
        lastmod: LAST_REVIEW,
    })),
    { path: "/calculadora-prima", changefreq: "monthly", priority: "0.9", lastmod: PRIMA_REVIEW },
    { path: "/liquidacion-laboral", changefreq: "monthly", priority: "0.9", lastmod: LIQUIDACION_REVIEW },
    { path: "/horas-extra", changefreq: "monthly", priority: "0.9", lastmod: HORAS_EXTRA_REVIEW },
    { path: "/declarar-renta", changefreq: "weekly", priority: "0.9", lastmod: RENTA_REVIEW },
    { path: "/retencion-en-la-fuente", changefreq: "monthly", priority: "0.9", lastmod: RETENCION_REVIEW },
    { path: "/uvt", changefreq: "weekly", priority: "0.9", lastmod: UVT_REVIEW },
    { path: "/calculadora-iva", changefreq: "monthly", priority: "0.8", lastmod: IMPUESTOS_REVIEW },
    { path: "/calculadora-4x1000", changefreq: "monthly", priority: "0.8", lastmod: IMPUESTOS_REVIEW },
    { path: "/novena-de-aguinaldos", changefreq: "weekly", priority: "0.9", lastmod: NOVENA_REVIEW },
    { path: "/ruleta", changefreq: "monthly", priority: "0.9", lastmod: RULETA_REVIEW },
    { path: "/interes-compuesto", changefreq: "monthly", priority: "0.9", lastmod: INTERES_REVIEW },
    { path: "/simulador-credito", changefreq: "monthly", priority: "0.9", lastmod: CREDITO_REVIEW },
    { path: "/dias-habiles", changefreq: "monthly", priority: "0.9", lastmod: DIAS_HABILES_REVIEW },
    { path: `/salario-minimo-${nextWage.year}`, changefreq: "weekly", priority: "0.9", lastmod: SALARIO_MINIMO_REVIEW },
];

export const GET: APIRoute = async ({ site }) => {
    const buildDate = new Date().toISOString().slice(0, 10);
    const posts = await getPublishedPosts();
    const blog = [
        { path: "/blog", changefreq: "weekly", priority: "0.6", lastmod: posts[0]?.date.toISOString().slice(0, 10) },
        ...posts.map(({ slug, date, updated }) => ({
            path: `/blog/${slug}`,
            changefreq: "weekly",
            priority: "0.8",
            lastmod: updated ?? date.toISOString().slice(0, 10),
        })),
    ];
    const urls = [...pages, ...blog]
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
