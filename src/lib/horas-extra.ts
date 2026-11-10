// Horas extra y recargos en Colombia (arts. 160, 168 y 179 del Código Sustantivo del Trabajo,
// con los cambios de la Ley 2466 de 2025 y la jornada de la Ley 2101 de 2021).
// Lo usan la página y el navegador, así que no depende de nada de Astro.

import { addDays, getHolidays, weekdayOf } from "@/lib/festivos";
import { monthlyHours, weeklyHours } from "@/lib/salario-minimo";

/** Última vez que se revisaron los porcentajes y las normas */
export const HORAS_EXTRA_REVIEW = "2026-11-10";

/**
 * Hora en que empieza el trabajo nocturno. La Ley 2466 de 2025 la pasó de las 9:00 p. m.
 * (Ley 1846 de 2017) a las 7:00 p. m. desde el 25 de diciembre de 2025. Termina a las 6:00 a. m.
 */
export const nightStart = (date: string) => (date >= "2025-12-25" ? 19 : 21);
export const NIGHT_END = 6;

/** Recargo por trabajar en domingo o festivo (art. 179, Ley 2466): sube cada 1 de julio hasta el 100 % */
export const sundayRate = (date: string) =>
    date >= "2027-07-01" ? 1 : date >= "2026-07-01" ? 0.9 : date >= "2025-07-01" ? 0.8 : 0.75;

/** Recargos fijos del Código Sustantivo del Trabajo */
export const NIGHT_RATE = 0.35;
export const EXTRA_DAY_RATE = 0.25;
export const EXTRA_NIGHT_RATE = 0.75;

export type HourKey = "rn" | "rd" | "rdn" | "hed" | "hen" | "hedd" | "hend";

export interface HourKind {
    key: HourKey;
    label: string;
    /** Hora por fuera de la jornada ordinaria */
    extra: boolean;
    night: boolean;
    sunday: boolean;
}

/** Los siete tipos de hora que se pagan distinto, en el orden en que suelen aparecer en la nómina */
export const HOUR_KINDS: HourKind[] = [
    { key: "rn", label: "Recargo nocturno", extra: false, night: true, sunday: false },
    { key: "rd", label: "Recargo dominical o festivo", extra: false, night: false, sunday: true },
    { key: "rdn", label: "Recargo nocturno dominical o festivo", extra: false, night: true, sunday: true },
    { key: "hed", label: "Hora extra diurna", extra: true, night: false, sunday: false },
    { key: "hen", label: "Hora extra nocturna", extra: true, night: true, sunday: false },
    { key: "hedd", label: "Hora extra diurna dominical o festiva", extra: true, night: false, sunday: true },
    { key: "hend", label: "Hora extra nocturna dominical o festiva", extra: true, night: true, sunday: true },
];

export const kindOf = (key: HourKey) => HOUR_KINDS.find((kind) => kind.key === key)!;

/** Recargo total sobre la hora ordinaria. Los recargos se suman, no se multiplican */
export function surcharge({ extra, night, sunday }: Pick<HourKind, "extra" | "night" | "sunday">, date: string) {
    const base = extra ? (night ? EXTRA_NIGHT_RATE : EXTRA_DAY_RATE) : night ? NIGHT_RATE : 0;
    return base + (sunday ? sundayRate(date) : 0);
}

/** Valor de la hora ordinaria: salario mensual entre las horas de la jornada del mes */
export const hourlyValue = (salary: number, date: string) => salary / monthlyHours(date);

/**
 * Lo que se suma al salario por cada hora. Las extras se pagan completas (hora más recargo);
 * en los recargos la hora ya está pagada con el salario y solo se suma el porcentaje.
 */
export const addedPerHour = (kind: HourKind, salary: number, date: string) =>
    hourlyValue(salary, date) * (kind.extra ? 1 + surcharge(kind, date) : surcharge(kind, date));

export type HourCounts = Partial<Record<HourKey, number>>;

export function calculate({ salary, date, hours }: { salary: number; date: string; hours: HourCounts }) {
    const hourly = hourlyValue(salary, date);
    const lines = HOUR_KINDS.map((kind) => {
        const count = hours[kind.key] ?? 0;
        const rate = surcharge(kind, date);
        const perHour = addedPerHour(kind, salary, date);
        return { ...kind, hours: count, rate, perHour, fullHour: hourly * (1 + rate), value: perHour * count };
    });
    const extras = lines.filter((line) => line.extra);
    const total = lines.reduce((sum, line) => sum + line.value, 0);
    return {
        hourly,
        monthlyHours: monthlyHours(date),
        weeklyHours: weeklyHours(date),
        lines,
        extraHours: extras.reduce((sum, line) => sum + line.hours, 0),
        total,
        gross: salary + total,
    };
}

const holidayCache = new Map<number, Set<string>>();
export function isSundayOrHoliday(date: string) {
    const year = Number(date.slice(0, 4));
    if (!holidayCache.has(year)) holidayCache.set(year, new Set(getHolidays(year).map(({ date }) => date)));
    return weekdayOf(date) === 0 || holidayCache.get(year)!.has(date);
}

export interface ShiftSegment {
    /** Minutos desde la medianoche del día de entrada */
    from: number;
    to: number;
    key: HourKey | "ord";
}

const toMinutes = (time: string) => {
    const [h, m] = time.split(":").map(Number);
    return (h || 0) * 60 + (m || 0);
};

/**
 * Reparte un turno en tipos de hora, minuto a minuto: la fecha real de cada minuto decide si es
 * domingo o festivo, la hora decide si es nocturna y las primeras `ordinary` horas son ordinarias.
 * Si la salida es antes o igual que la entrada, el turno termina al día siguiente.
 */
export function splitShift({ date, start, end, ordinary }: { date: string; start: string; end: string; ordinary: number }) {
    const from = toMinutes(start);
    let to = toMinutes(end);
    if (to <= from) to += 24 * 60;
    const limit = Math.round(ordinary * 60);
    const hours: Record<HourKey | "ord", number> = { ord: 0, rn: 0, rd: 0, rdn: 0, hed: 0, hen: 0, hedd: 0, hend: 0 };
    const segments: ShiftSegment[] = [];

    for (let minute = from; minute < to; minute++) {
        const day = minute >= 24 * 60 ? addDays(date, 1) : date;
        const clock = (minute % (24 * 60)) / 60;
        const night = clock >= nightStart(day) || clock < NIGHT_END;
        const sunday = isSundayOrHoliday(day);
        const extra = minute - from >= limit;
        const key = HOUR_KINDS.find((kind) => kind.extra === extra && kind.night === night && kind.sunday === sunday)?.key ?? "ord";
        hours[key] += 1 / 60;
        const last = segments[segments.length - 1];
        if (last && last.key === key) last.to = minute + 1;
        else segments.push({ from: minute, to: minute + 1, key });
    }

    return { hours, segments, total: (to - from) / 60 };
}

/** Familia visual de cada tipo de hora en el reloj */
export const segmentTone = (key: HourKey | "ord") => (key === "ord" ? "ord" : kindOf(key).extra ? "ext" : "rec");

/**
 * Reloj de 24 horas (medianoche arriba) con la noche sombreada y el turno encima.
 * Devuelve el contenido de un <svg viewBox="0 0 320 320">.
 */
export function shiftDial(segments: ShiftSegment[], night: number) {
    const C = 160;
    const DAY = 24 * 60;
    const round = (n: number) => Math.round(n * 100) / 100;
    const point = (minute: number, r: number) => {
        const angle = (minute / DAY) * 2 * Math.PI - Math.PI / 2;
        return [round(C + r * Math.cos(angle)), round(C + r * Math.sin(angle))];
    };
    const arc = (from: number, to: number, r: number) => {
        if (to - from >= DAY) return `M${C} ${C - r} A${r} ${r} 0 1 1 ${C - 0.01} ${C - r}`;
        const [x1, y1] = point(from, r);
        const [x2, y2] = point(to, r);
        return `M${x1} ${y1} A${r} ${r} 0 ${to - from > DAY / 2 ? 1 : 0} 1 ${x2} ${y2}`;
    };

    const bands = [
        `<path class="band day" d="${arc(NIGHT_END * 60, night * 60, 132)}"/>`,
        `<path class="band night" d="${arc(night * 60, DAY + NIGHT_END * 60, 132)}"/>`,
    ];
    const ticks = Array.from({ length: 24 }, (_, hour) => {
        const [x1, y1] = point(hour * 60, hour % 6 === 0 ? 108 : 114);
        const [x2, y2] = point(hour * 60, 120);
        return `<line class="tick" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"/>`;
    });
    const labels = [0, 6, 12, 18].map((hour) => {
        const [x, y] = point(hour * 60, 94);
        return `<text class="hour" x="${x}" y="${y}" dominant-baseline="middle" text-anchor="middle">${hour}</text>`;
    });
    const sundays = segments
        .filter(({ key }) => key !== "ord" && kindOf(key).sunday)
        .map(({ from, to }) => `<path class="sun" d="${arc(from, to, 151)}"/>`);
    const shift = segments.map(({ from, to, key }) => `<path class="seg ${segmentTone(key)}" d="${arc(from, to, 132)}"/>`);
    const [nx, ny] = point(night * 60, 132);
    const [mx, my] = point(NIGHT_END * 60, 132);

    return [
        ...bands,
        ...ticks,
        ...labels,
        ...shift,
        ...sundays,
        `<circle class="edge" cx="${nx}" cy="${ny}" r="4"/>`,
        `<circle class="edge" cx="${mx}" cy="${my}" r="4"/>`,
    ].join("");
}

/** Las fechas en que cambiaron o cambiarán las reglas */
export const TIMELINE = [
    { date: "2025-07-01", title: "Dominical al 80 %", text: "Primer aumento del recargo por trabajar domingos y festivos, que venía en 75 %." },
    { date: "2025-07-15", title: "Jornada de 44 horas", text: "La hora ordinaria pasa a calcularse sobre 220 horas al mes." },
    { date: "2025-12-25", title: "Noche desde las 7:00 p. m.", text: "El recargo nocturno empieza dos horas antes: antes arrancaba a las 9:00 p. m." },
    { date: "2026-07-01", title: "Dominical al 90 %", text: "Segundo escalón del recargo dominical y festivo." },
    { date: "2026-07-15", title: "Jornada de 42 horas", text: "Último recorte de la Ley 2101: la hora vale el salario dividido entre 210." },
    { date: "2027-07-01", title: "Dominical al 100 %", text: "Trabajar un domingo o festivo se paga al doble de la hora ordinaria." },
];

/** "1,5 h", "2 h", "45 min" */
export function formatHours(hours: number) {
    if (hours > 0 && hours < 1) return `${Math.round(hours * 60)} min`;
    const rounded = Math.round(hours * 100) / 100;
    return `${String(rounded).replace(".", ",")} h`;
}

/** "7:00 p. m." */
export function formatClock(hour: number) {
    const h = hour % 24;
    const suffix = h < 12 ? "a. m." : "p. m.";
    return `${h % 12 === 0 ? 12 : h % 12}:00 ${suffix}`;
}

/** "+90 %" */
export const formatRate = (rate: number) => `${Math.round(rate * 100)} %`;
