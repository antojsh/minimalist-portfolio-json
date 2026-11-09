import { getCollection } from "astro:content";
import { RESCATE_REVIEW } from "@/lib/ley-rescate";
import { RENTA_2027_REVIEW } from "@/lib/renta-2027";

export interface PostSummary {
    slug: string;
    title: string;
    description: string;
    date: Date;
    /** Última revisión ("2026-11-06"), para el sitemap */
    updated?: string;
    tags: string[];
}

/**
 * Artículos que son páginas .astro propias (llevan calculadoras o gráficas que el
 * Markdown no permite). Viven en src/pages/blog/<slug>.astro.
 */
const PAGE_POSTS: PostSummary[] = [
    {
        slug: "declaracion-de-renta-2027",
        title: "Declaración de renta 2027: fechas, topes y todo lo que ya se sabe",
        description:
            "Quién declara en 2027, los topes en pesos del año gravable 2026, las fechas por cédula, cuánto pagarías y qué falta por confirmar. Con calculadora.",
        date: new Date("2026-11-09"),
        updated: RENTA_2027_REVIEW,
        tags: ["Impuestos", "Renta", "Colombia"],
    },
    {
        slug: "ley-de-rescate-economico",
        title: "La Ley de Rescate Económico, explicada fácil",
        description:
            "Qué propone el gobierno de Abelardo de la Espriella en IVA, renta, salud y gasto público, cuánto te cambia el bolsillo y qué podría pasar con la economía. Con calculadoras.",
        date: new Date("2026-11-06"),
        updated: RESCATE_REVIEW,
        tags: ["Economía", "Impuestos", "Colombia"],
    },
];

export const getPublishedPosts = async (): Promise<PostSummary[]> => {
    const markdown = (await getCollection("blog", ({ data }) => !data.draft)).map(({ slug, data }) => ({
        slug,
        title: data.title,
        description: data.description,
        date: data.date,
        tags: data.tags,
    }));
    return [...markdown, ...PAGE_POSTS].sort((a, b) => b.date.getTime() - a.date.getTime());
};

export const formatPostDate = (date: Date) =>
    new Intl.DateTimeFormat("es", {
        day: "numeric",
        month: "long",
        year: "numeric",
        timeZone: "UTC",
    }).format(date);
