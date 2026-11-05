import { getCollection } from "astro:content";

export const getPublishedPosts = async () =>
    (await getCollection("blog", ({ data }) => !data.draft)).sort(
        (a, b) => b.data.date.getTime() - a.data.date.getTime(),
    );

export const formatPostDate = (date: Date) =>
    new Intl.DateTimeFormat("es", {
        day: "numeric",
        month: "long",
        year: "numeric",
        timeZone: "UTC",
    }).format(date);
