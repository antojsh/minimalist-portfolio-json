// Datos estructurados comunes de las herramientas (schema.org)

import { basics } from "@cv";

export interface ToolSeo {
    site: string;
    path: string;
    title: string;
    description: string;
    name: string;
    crumb: string;
    review: string;
    image?: string;
    category?: string;
    faqs: { question: string; answer: string }[];
    howTo?: { name: string; steps: { title: string; text: string }[] };
}

export function toolJsonLd({ site, path, title, description, name, crumb, review, image, category = "FinanceApplication", faqs, howTo }: ToolSeo) {
    const pageUrl = new URL(path, site).href;
    const personId = new URL("/#person", site).href;
    return {
        "@context": "https://schema.org",
        "@graph": [
            {
                "@type": "WebPage",
                "@id": `${pageUrl}#webpage`,
                url: pageUrl,
                name: title,
                description,
                inLanguage: "es-CO",
                isPartOf: { "@id": new URL("/#website", site).href },
                author: { "@id": personId },
                dateModified: review,
                ...(image ? { primaryImageOfPage: { "@type": "ImageObject", url: new URL(image, site).href, width: 1200, height: 630 } } : {}),
                mainEntity: { "@id": `${pageUrl}#herramienta` },
                breadcrumb: { "@id": `${pageUrl}#breadcrumb` },
            },
            {
                "@type": "WebApplication",
                "@id": `${pageUrl}#herramienta`,
                name,
                url: pageUrl,
                applicationCategory: category,
                operatingSystem: "Web",
                inLanguage: "es-CO",
                isAccessibleForFree: true,
                offers: { "@type": "Offer", price: 0, priceCurrency: "COP" },
                author: { "@id": personId },
            },
            ...(howTo
                ? [
                      {
                          "@type": "HowTo",
                          "@id": `${pageUrl}#como`,
                          name: howTo.name,
                          step: howTo.steps.map(({ title, text }, index) => ({ "@type": "HowToStep", position: index + 1, name: title, text })),
                      },
                  ]
                : []),
            {
                "@type": "FAQPage",
                "@id": `${pageUrl}#preguntas`,
                mainEntity: faqs.map(({ question, answer }) => ({
                    "@type": "Question",
                    name: question,
                    acceptedAnswer: { "@type": "Answer", text: answer },
                })),
            },
            {
                "@type": "BreadcrumbList",
                "@id": `${pageUrl}#breadcrumb`,
                itemListElement: [
                    { "@type": "ListItem", position: 1, name: "Inicio", item: site },
                    { "@type": "ListItem", position: 2, name: "Herramientas", item: new URL("/herramientas", site).href },
                    { "@type": "ListItem", position: 3, name: crumb, item: pageUrl },
                ],
            },
            {
                "@type": "Person",
                "@id": personId,
                name: basics.name,
                url: site,
                sameAs: basics.profiles.map(({ url }) => url),
            },
        ],
    };
}

/** "6 de noviembre de 2026" */
export function longDate(date: string) {
    const months = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
    return `${Number(date.slice(8))} de ${months[Number(date.slice(5, 7)) - 1]} de ${date.slice(0, 4)}`;
}
