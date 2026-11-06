import { getCollection } from "astro:content";

export interface PostSummary {
    slug: string;
    title: string;
    description: string;
    date: Date;
    tags: string[];
}

/**
 * Artículos que son páginas .astro propias (llevan calculadoras o gráficas que el
 * Markdown no permite). Viven en src/pages/blog/<slug>.astro.
 */
const PAGE_POSTS: PostSummary[] = [
    {
        slug: "ley-de-rescate-economico",
        title: "La Ley de Rescate Económico, explicada fácil",
        description:
            "Qué propone el gobierno de Abelardo de la Espriella en IVA, renta, salud y gasto público, cuánto te cambia el bolsillo y qué podría pasar con la economía. Con calculadoras.",
        date: new Date("2026-11-06"),
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
