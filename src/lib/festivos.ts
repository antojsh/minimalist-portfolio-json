// Festivos de Colombia calculados a partir de la ley, para cualquier año.
// Se usa en el build (página y archivos de datos) y en el navegador (¿hoy es festivo?).
//
// Las fechas son texto AAAA-MM-DD y todo se calcula en UTC, así el resultado no
// depende de la zona horaria de quien construye o de quien visita la página.

export type HolidayKind = "fijo" | "trasladable" | "semana-santa";

export interface Holiday {
    /** Día en que se descansa */
    date: string;
    name: string;
    kind: HolidayKind;
    /** Fecha original, cuando la Ley Emiliani lo corre al lunes */
    movedFrom?: string;
    /** Año desde el que es festivo (solo para los más recientes) */
    since?: number;
}

export interface RestBlock {
    start: string;
    end: string;
    days: number;
    holidays: Holiday[];
}

export interface VacationPlan extends RestBlock {
    /** Días hábiles que hay que pedir para unir los descansos */
    leave: string[];
}

// Última vez que se revisaron las leyes de festivos
export const LAST_REVIEW = "2026-11-05";

/** Años con página publicada; agrega el siguiente cuando haga falta */
export const FESTIVOS_YEARS = [2026, 2027, 2028];

/**
 * Recargo por trabajar un domingo o festivo (Ley 2466 de 2025): sube cada 1 de julio
 * hasta llegar al 100 %. Devuelve el porcentaje del primer y del segundo semestre.
 */
export function sundaySurcharge(year: number): [number, number] {
    const at = (y: number) => (y <= 2024 ? 75 : y === 2025 ? 80 : y === 2026 ? 90 : 100);
    return [at(year - 1), at(year)];
}

export const MONTHS = [
    "enero",
    "febrero",
    "marzo",
    "abril",
    "mayo",
    "junio",
    "julio",
    "agosto",
    "septiembre",
    "octubre",
    "noviembre",
    "diciembre",
];

export const MONTHS_SHORT = MONTHS.map((month) => month.slice(0, 3));

export const WEEKDAYS = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];

const DAY_MS = 86_400_000;

export const toDate = (date: string) => new Date(`${date}T00:00:00Z`);
const toISO = (date: Date) => date.toISOString().slice(0, 10);
const fromParts = (year: number, month: number, day: number) =>
    toISO(new Date(Date.UTC(year, month - 1, day)));

export const addDays = (date: string, days: number) =>
    toISO(new Date(toDate(date).getTime() + days * DAY_MS));
export const daysBetween = (from: string, to: string) =>
    Math.round((toDate(to).getTime() - toDate(from).getTime()) / DAY_MS);
export const weekdayOf = (date: string) => toDate(date).getUTCDay();
export const dayOf = (date: string) => toDate(date).getUTCDate();
export const monthOf = (date: string) => toDate(date).getUTCMonth();
export const isWeekend = (date: string) => weekdayOf(date) === 0 || weekdayOf(date) === 6;

/** Hoy en Colombia: UTC−5 todo el año, sin horario de verano */
export const todayInColombia = (now = new Date()) =>
    toISO(new Date(now.getTime() - 5 * 3_600_000));

/** Domingo de Pascua en el calendario gregoriano (algoritmo de Meeus/Jones/Butcher) */
export function getEaster(year: number) {
    const a = year % 19;
    const b = Math.floor(year / 100);
    const c = year % 100;
    const d = Math.floor(b / 4);
    const e = b % 4;
    const f = Math.floor((b + 8) / 25);
    const g = Math.floor((b - f + 1) / 3);
    const h = (19 * a + b - d - g + 15) % 30;
    const i = Math.floor(c / 4);
    const k = c % 4;
    const l = (32 + 2 * e + 2 * i - h - k) % 7;
    const m = Math.floor((a + 11 * h + 22 * l) / 451);
    const month = Math.floor((h + l - 7 * m + 114) / 31);
    const day = ((h + l - 7 * m + 114) % 31) + 1;
    return fromParts(year, month, day);
}

// Ley 51 de 1983: se celebran siempre en su fecha
const FIXED = [
    { month: 1, day: 1, name: "Año Nuevo" },
    { month: 5, day: 1, name: "Día del Trabajo" },
    { month: 7, day: 20, name: "Día de la Independencia" },
    { month: 8, day: 7, name: "Batalla de Boyacá" },
    { month: 12, day: 8, name: "Inmaculada Concepción" },
    { month: 12, day: 25, name: "Navidad" },
];

// Ley 51 de 1983 (Ley Emiliani): si no caen lunes, se corren al lunes siguiente.
// La Ley 2578 de 2026 sumó el 9 de julio con la misma regla.
const MOVABLE = [
    { month: 1, day: 6, name: "Día de los Reyes Magos" },
    { month: 3, day: 19, name: "Día de San José" },
    { month: 6, day: 29, name: "San Pedro y San Pablo" },
    { month: 7, day: 9, name: "Virgen de Chiquinquirá", since: 2026 },
    { month: 8, day: 15, name: "Asunción de la Virgen" },
    { month: 10, day: 12, name: "Día de la Raza" },
    { month: 11, day: 1, name: "Día de Todos los Santos" },
    { month: 11, day: 11, name: "Independencia de Cartagena" },
];

// También se corren al lunes, pero dependen del Domingo de Pascua
const EASTER_MOVABLE = [
    { offset: 39, name: "Ascensión del Señor" },
    { offset: 60, name: "Corpus Christi" },
    { offset: 68, name: "Sagrado Corazón de Jesús" },
];

export function getHolidays(year: number): Holiday[] {
    const easter = getEaster(year);
    const toMonday = (date: string) => addDays(date, (8 - weekdayOf(date)) % 7);

    const movable = [
        ...MOVABLE.filter(({ since }) => since == null || year >= since).map(
            ({ month, day, name, since }) => ({ original: fromParts(year, month, day), name, since }),
        ),
        ...EASTER_MOVABLE.map(({ offset, name }) => ({
            original: addDays(easter, offset),
            name,
            since: undefined,
        })),
    ].map(({ original, name, since }) => {
        const holiday: Holiday = { date: toMonday(original), name, kind: "trasladable" };
        if (holiday.date !== original) holiday.movedFrom = original;
        if (since != null) holiday.since = since;
        return holiday;
    });

    const holidays: Holiday[] = [
        ...FIXED.map(({ month, day, name }): Holiday => ({
            date: fromParts(year, month, day),
            name,
            kind: "fijo",
        })),
        { date: addDays(easter, -3), name: "Jueves Santo", kind: "semana-santa" },
        { date: addDays(easter, -2), name: "Viernes Santo", kind: "semana-santa" },
        ...movable,
    ];

    return holidays.sort((a, b) => a.date.localeCompare(b.date));
}

/** Días seguidos sin trabajar (fines de semana y festivos) que tocan el año */
export function getRestBlocks(year: number): RestBlock[] {
    const holidays = new Map(
        [year - 1, year, year + 1]
            .flatMap((current) => getHolidays(current))
            .map((holiday) => [holiday.date, holiday] as const),
    );
    const blocks: RestBlock[] = [];
    let current: RestBlock | undefined;

    // Se recorre un poco más allá del año para no partir los bloques de fin de año
    for (let date = `${year - 1}-12-24`; date <= `${year + 1}-01-07`; date = addDays(date, 1)) {
        const holiday = holidays.get(date);
        if (holiday == null && !isWeekend(date)) {
            current = undefined;
            continue;
        }
        if (current == null) {
            current = { start: date, end: date, days: 0, holidays: [] };
            blocks.push(current);
        }
        current.end = date;
        current.days += 1;
        if (holiday) current.holidays.push(holiday);
    }

    return blocks.filter(({ start, end }) => end >= `${year}-01-01` && start <= `${year}-12-31`);
}

/** Puentes: tres días o más de descanso seguidos gracias a un festivo del año */
export const getLongWeekends = (year: number) =>
    getRestBlocks(year).filter(
        ({ days, holidays }) =>
            days >= 3 && holidays.some(({ date }) => date.startsWith(`${year}-`)),
    );

/**
 * Dónde rinden más los días de vacaciones: une bloques de descanso pidiendo
 * pocos días hábiles. Solo propone planes que cuesten uno o dos días, o que
 * junten al menos dos festivos entre semana.
 */
export function getVacationPlans(year: number, { maxLeave = 5, limit = 6 } = {}) {
    const blocks = getRestBlocks(year).filter(
        ({ start, end }) => start >= `${year}-01-01` && end <= `${year}-12-31`,
    );
    const candidates: VacationPlan[] = [];

    for (let i = 0; i < blocks.length; i++) {
        const leave: string[] = [];
        for (let j = i + 1; j < blocks.length; j++) {
            for (let date = addDays(blocks[j - 1].end, 1); date < blocks[j].start; date = addDays(date, 1)) {
                leave.push(date);
            }
            if (leave.length > maxLeave) break;

            const holidays = blocks.slice(i, j + 1).flatMap((block) => block.holidays);
            const onWeekdays = holidays.filter(({ date }) => !isWeekend(date)).length;
            if (onWeekdays === 0 || (leave.length > 2 && onWeekdays < 2)) continue;

            const { start } = blocks[i];
            const { end } = blocks[j];
            candidates.push({ start, end, days: daysBetween(start, end) + 1, holidays, leave: [...leave] });
        }
    }

    const score = ({ days, leave }: VacationPlan) => days / leave.length;
    candidates.sort(
        (a, b) => score(b) - score(a) || b.days - a.days || a.start.localeCompare(b.start),
    );

    const plans: VacationPlan[] = [];
    for (const plan of candidates) {
        if (plans.length === limit) break;
        if (plans.some(({ start, end }) => start <= plan.end && plan.start <= end)) continue;
        plans.push(plan);
    }

    return plans.sort((a, b) => a.start.localeCompare(b.start));
}

/** Días hábiles de lunes a viernes, sin contar festivos */
export function countWorkdays(year: number) {
    const holidays = new Set(getHolidays(year).map(({ date }) => date));
    let count = 0;
    for (let date = `${year}-01-01`; date <= `${year}-12-31`; date = addDays(date, 1)) {
        if (!isWeekend(date) && !holidays.has(date)) count += 1;
    }
    return count;
}

/** El día de la semana número `nth` del mes (−1 es el último). `weekday`: 0 = domingo */
function nthWeekday(year: number, month: number, weekday: number, nth: number) {
    if (nth > 0) {
        const first = fromParts(year, month, 1);
        return addDays(first, ((weekday - weekdayOf(first) + 7) % 7) + (nth - 1) * 7);
    }
    const last = fromParts(year, month + 1, 0);
    return addDays(last, -((weekdayOf(last) - weekday + 7) % 7));
}

/** Fechas que se celebran pero no dan día libre */
export const getSpecialDates = (year: number) => [
    { date: fromParts(year, 3, 8), name: "Día de la Mujer" },
    { date: nthWeekday(year, 4, 6, -1), name: "Día del Niño", rule: "Último sábado de abril" },
    { date: nthWeekday(year, 5, 0, 2), name: "Día de la Madre", rule: "Segundo domingo de mayo" },
    { date: nthWeekday(year, 6, 0, 3), name: "Día del Padre", rule: "Tercer domingo de junio" },
    { date: nthWeekday(year, 9, 6, 3), name: "Amor y Amistad", rule: "Tercer sábado de septiembre" },
    { date: fromParts(year, 10, 31), name: "Halloween" },
    { date: fromParts(year, 12, 7), name: "Noche de velitas" },
    { date: fromParts(year, 12, 24), name: "Nochebuena" },
    { date: fromParts(year, 12, 31), name: "Fin de año" },
];

/** "lunes 11" */
export const formatWeekdayDay = (date: string) => `${WEEKDAYS[weekdayOf(date)]} ${dayOf(date)}`;

/** "lunes 11 de enero" */
export const formatLong = (date: string) => `${formatWeekdayDay(date)} de ${MONTHS[monthOf(date)]}`;

/** "lun 11 ene" */
export const formatShort = (date: string) =>
    `${WEEKDAYS[weekdayOf(date)].slice(0, 3)} ${dayOf(date)} ${MONTHS_SHORT[monthOf(date)]}`;

/** "del sábado 20 al domingo 28 de marzo" */
export function formatRange(start: string, end: string) {
    const from = monthOf(start) === monthOf(end) ? formatWeekdayDay(start) : formatLong(start);
    return `del ${from} al ${formatLong(end)}`;
}

/** Une con comas e "y" (o "e" antes de i/hi, como pide la gramática) */
export function joinList(items: string[]) {
    if (items.length < 2) return items.join("");
    const last = items[items.length - 1];
    const and = /^h?i(?![aeouáéóú])/i.test(last) ? "e" : "y";
    return `${items.slice(0, -1).join(", ")} ${and} ${last}`;
}

/** Agrupa días seguidos: "el martes 23 y el miércoles 24 de marzo", "del martes 1 al viernes 4 de junio" */
export function formatDays(dates: string[]) {
    const runs: string[][] = [];
    for (const date of dates) {
        const run = runs[runs.length - 1];
        if (run && daysBetween(run[run.length - 1], date) === 1) run.push(date);
        else runs.push([date]);
    }

    return joinList(
        runs.map((run) => {
            const first = run[0];
            const last = run[run.length - 1];
            if (run.length === 1) return `el ${formatLong(first)}`;
            if (run.length > 2) return formatRange(first, last);
            const from = monthOf(first) === monthOf(last) ? formatWeekdayDay(first) : formatLong(first);
            return `el ${from} y el ${formatLong(last)}`;
        }),
    );
}

export const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);
