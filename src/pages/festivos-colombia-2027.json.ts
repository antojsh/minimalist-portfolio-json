import type { APIRoute } from "astro";
import { LAST_REVIEW, WEEKDAYS, getHolidays, weekdayOf } from "@/lib/festivos";

const YEAR = 2027;

export const GET: APIRoute = ({ site }) => {
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
        url: new URL("/festivos-colombia-2027", site).href,
        holidays,
    };

    return new Response(JSON.stringify(data, null, 2), {
        headers: { "Content-Type": "application/json; charset=utf-8" },
    });
};
