import type { APIRoute } from "astro";
import { LAST_REVIEW, addDays, formatLong, getHolidays } from "@/lib/festivos";

const YEAR = 2027;

// RFC 5545: texto escapado, líneas de máximo 75 bytes y fin de línea CRLF
const escape = (text: string) => text.replace(/([\,;])/g, "\$1");
const compact = (date: string) => date.replaceAll("-", "");
const encoder = new TextEncoder();

const fold = (line: string) => {
    const parts: string[] = [];
    let current = "";
    for (const char of line) {
        const limit = parts.length === 0 ? 75 : 74;
        if (encoder.encode(current + char).length > limit) {
            parts.push(current);
            current = char;
        } else {
            current += char;
        }
    }
    return [...parts, current].join("\r\n ");
};

export const GET: APIRoute = ({ site }) => {
    const host = new URL(site ?? "https://antojsh.dev").hostname;
    const events = getHolidays(YEAR).flatMap(({ date, name, movedFrom }) => [
        "BEGIN:VEVENT",
        `UID:${date}-festivo@${host}`,
        `DTSTAMP:${compact(LAST_REVIEW)}T000000Z`,
        `DTSTART;VALUE=DATE:${compact(date)}`,
        `DTEND;VALUE=DATE:${compact(addDays(date, 1))}`,
        `SUMMARY:${escape(`${name} (festivo)`)}`,
        `DESCRIPTION:${escape(
            movedFrom
                ? `Festivo en Colombia. Se corre del ${formatLong(movedFrom)} por la Ley Emiliani.`
                : "Festivo en Colombia.",
        )}`,
        "TRANSP:TRANSPARENT",
        "END:VEVENT",
    ]);

    const lines = [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        `PRODID:-//${host}//Festivos Colombia ${YEAR}//ES`,
        "CALSCALE:GREGORIAN",
        "METHOD:PUBLISH",
        `X-WR-CALNAME:Festivos Colombia ${YEAR}`,
        "X-WR-TIMEZONE:America/Bogota",
        ...events,
        "END:VCALENDAR",
    ];

    return new Response(`${lines.map(fold).join("\r\n")}\r\n`, {
        headers: { "Content-Type": "text/calendar; charset=utf-8" },
    });
};
