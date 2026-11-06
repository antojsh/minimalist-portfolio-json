// Días hábiles y días entre fechas en Colombia, con los festivos calculados desde la ley.
// Lo usan la página y el navegador, así que no depende de nada de Astro.

import { MONTHS, addDays, daysBetween, getHolidays, toDate, weekdayOf, type Holiday } from "@/lib/festivos";

/** Última vez que se revisaron las normas */
export const DIAS_HABILES_REVIEW = "2026-11-05";

/** La Ley Emiliani rige desde 1984; antes de eso los festivos eran otros */
export const MIN_DATE = "1984-01-01";
export const MAX_DATE = "2100-12-31";

export interface BusinessOptions {
    /** Cuenta los sábados como hábiles (comercio, algunas empresas) */
    saturdays?: boolean;
}

const holidayCache = new Map<number, Map<string, Holiday>>();

function holidaysOf(year: number) {
    let map = holidayCache.get(year);
    if (!map) {
        map = new Map(getHolidays(year).map((holiday) => [holiday.date, holiday]));
        holidayCache.set(year, map);
    }
    return map;
}

export const holidayOn = (date: string) => holidaysOf(Number(date.slice(0, 4))).get(date);

export type DayKind = "habil" | "sabado" | "domingo" | "festivo";

export function dayKind(date: string, { saturdays = false }: BusinessOptions = {}): DayKind {
    const weekday = weekdayOf(date);
    if (weekday === 0) return "domingo";
    if (holidayOn(date)) return "festivo";
    if (weekday === 6 && !saturdays) return "sabado";
    return "habil";
}

export const isBusinessDay = (date: string, options: BusinessOptions = {}) => dayKind(date, options) === "habil";

export interface CountOptions extends BusinessOptions {
    /** Cuenta también el primer día. Por defecto se empieza al día siguiente, como los plazos legales */
    includeStart?: boolean;
}

/** Años, meses y días entre dos fechas, como se dice en la calle: "1 año, 2 meses y 3 días" */
export function calendarParts(start: string, end: string) {
    const [y1, m1, d1] = start.split("-").map(Number);
    const [y2, m2] = end.split("-").map(Number);
    // Suma meses completos al inicio (sin pasarse del último día del mes) hasta no pasarse del final
    const shift = (months: number) => {
        const last = new Date(Date.UTC(y1, m1 - 1 + months + 1, 0)).getUTCDate();
        return new Date(Date.UTC(y1, m1 - 1 + months, Math.min(d1, last))).toISOString().slice(0, 10);
    };
    let months = (y2 - y1) * 12 + (m2 - m1);
    if (shift(months) > end) months -= 1;
    const days = daysBetween(shift(months), end);
    return { years: Math.floor(months / 12), months: months % 12, days };
}

export function countBetween(start: string, end: string, { saturdays = false, includeStart = false }: CountOptions = {}) {
    const [from, to] = start <= end ? [start, end] : [end, start];
    const first = includeStart ? from : addDays(from, 1);
    const counts: Record<DayKind, number> = { habil: 0, sabado: 0, domingo: 0, festivo: 0 };
    const holidays: Holiday[] = [];
    const byMonth = new Map<string, { key: string; label: string; business: number; calendar: number }>();

    for (let date = first; date <= to; date = addDays(date, 1)) {
        const kind = dayKind(date, { saturdays });
        counts[kind] += 1;
        const holiday = holidayOn(date);
        if (holiday) holidays.push(holiday);

        const key = date.slice(0, 7);
        let month = byMonth.get(key);
        if (!month) {
            month = { key, label: `${MONTHS[Number(key.slice(5)) - 1]} ${key.slice(0, 4)}`, business: 0, calendar: 0 };
            byMonth.set(key, month);
        }
        month.calendar += 1;
        if (kind === "habil") month.business += 1;
    }

    const calendar = Math.max(0, daysBetween(first, to) + 1);
    return {
        from,
        to,
        reversed: start > end,
        calendar,
        business: counts.habil,
        saturdays: counts.sabado,
        sundays: counts.domingo,
        /** Festivos que caen entre semana (o en sábado si los sábados cuentan) y quitan un día hábil */
        holidaysOff: counts.festivo,
        holidays,
        weeks: Math.floor(calendar / 7),
        weekRemainder: calendar % 7,
        parts: calendarParts(from, to),
        byMonth: [...byMonth.values()],
    };
}

/**
 * Suma (o resta) días hábiles a una fecha. Se cuenta desde el día siguiente:
 * 10 días hábiles desde un lunes sin festivos terminan el viernes de la semana siguiente.
 */
export function addBusinessDays(start: string, amount: number, options: BusinessOptions = {}) {
    const step = amount < 0 ? -1 : 1;
    const skipped: Holiday[] = [];
    let date = start;
    let left = Math.abs(amount);
    while (left > 0) {
        date = addDays(date, step);
        if (isBusinessDay(date, options)) left -= 1;
        else {
            const holiday = holidayOn(date);
            if (holiday && weekdayOf(date) !== 0) skipped.push(holiday);
        }
    }
    return { date, calendar: Math.abs(daysBetween(start, date)), skipped };
}

/** Siguiente día hábil desde una fecha (la misma si ya es hábil) */
export function nextBusinessDay(date: string, options: BusinessOptions = {}) {
    let day = date;
    while (!isBusinessDay(day, options)) day = addDays(day, 1);
    return day;
}

/** Días hábiles de cada mes de un año */
export function businessDaysByMonth(year: number, options: BusinessOptions = {}) {
    return MONTHS.map((name, index) => {
        const month = String(index + 1).padStart(2, "0");
        const last = new Date(Date.UTC(year, index + 1, 0)).getUTCDate();
        const start = `${year}-${month}-01`;
        const end = `${year}-${month}-${last}`;
        const result = countBetween(start, end, { ...options, includeStart: true });
        return { name, month: index, business: result.business, holidays: result.holidays.filter((h) => weekdayOf(h.date) !== 0) };
    });
}

export const isValidDate = (date: string) =>
    /^\d{4}-\d{2}-\d{2}$/.test(date) && !Number.isNaN(toDate(date).getTime()) && date >= MIN_DATE && date <= MAX_DATE;

/** "1 año, 2 meses y 3 días" */
export function formatParts({ years, months, days }: { years: number; months: number; days: number }) {
    const parts = [
        years ? `${years} ${years === 1 ? "año" : "años"}` : "",
        months ? `${months} ${months === 1 ? "mes" : "meses"}` : "",
        days || (!years && !months) ? `${days} ${days === 1 ? "día" : "días"}` : "",
    ].filter(Boolean);
    return parts.length > 1 ? `${parts.slice(0, -1).join(", ")} y ${parts[parts.length - 1]}` : parts[0];
}

export const plural = (count: number, one: string, many: string) =>
    `${String(count).replace(/\B(?=(\d{3})+(?!\d))/g, ".")} ${count === 1 ? one : many}`;
