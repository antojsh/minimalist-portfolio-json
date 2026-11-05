import type { APIRoute } from "astro";

// Páginas públicas del sitio. Agrega aquí las nuevas páginas indexables.
const pages = [
    { path: "/", changefreq: "monthly", priority: "1.0" },
    { path: "/festivos-colombia-2027", changefreq: "monthly", priority: "0.9" },
];

export const GET: APIRoute = ({ site }) => {
    const lastmod = new Date().toISOString().slice(0, 10);
    const urls = pages
        .map(
            ({ path, changefreq, priority }) => `  <url>
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
