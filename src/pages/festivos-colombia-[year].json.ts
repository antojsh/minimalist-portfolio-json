import type { APIRoute, GetStaticPaths } from "astro";
import { FESTIVOS_YEARS, LAST_REVIEW, WEEKDAYS, getHolidays, weekdayOf } from "@/lib/festivos";

export const getStaticPaths = (() =>
    FESTIVOS_YEARS.map((year) => ({ params: { year: String(year) } }))) satisfies GetStaticPaths;

export const GET: APIRoute = ({ site, params }) => {
    const YEAR = Number(params.year);
    const holidays = getHolidays(YEAR).map(({ date, name, kind, movedFrom }) => ({
        date,
        weekday: WEEKDAYS[weekdayOf(date)],
        name,
        type: kind,
        movedFrom: movedFrom ?? null,
    }));

    const data = {
        country: "CO",
        year: YEAR,
        total: holidays.length,
        updated: LAST_REVIEW,
        sources: ["Ley 51 de 1983 (Ley Emiliani)", "Ley 2578 de 2026"],
        url: new URL(`/festivos-colombia-${YEAR}`, site).href,
        holidays,
    };

    return new Response(JSON.stringify(data, null, 2), {
        headers: { "Content-Type": "application/json; charset=utf-8" },
    });
};
