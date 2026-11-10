// Pico y placa para carros particulares en las principales ciudades de Colombia.
// Las reglas salen de los decretos de cada alcaldía y cambian cada semestre o trimestre:
// cada rotación tiene fecha de inicio y de fin, y fuera de ellas la página dice "por confirmar"
// en vez de mostrar un dato viejo. Lo usan la página (en el build diario) y el navegador.
//
// Al actualizar: agrega la rotación nueva a la ciudad (no borres la anterior hasta que termine),
// cambia PICO_Y_PLACA_REVIEW y cita el decreto o el boletín oficial en `source`.

import { addDays, daysBetween, getHolidays, weekdayOf } from "@/lib/festivos";

/** Última vez que se revisaron los decretos de todas las ciudades */
export const PICO_Y_PLACA_REVIEW = "2026-11-10";

export type Digit = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;
/** Franja horaria "HH:MM" a "HH:MM" */
export type Window = [string, string];

export interface Rotation {
    /** Primer y último día en que rige (inclusive) */
    from: string;
    until: string | null;
    /** Horario de lunes a viernes */
    hours: Window[];
    /** Dígitos por día de la semana (1 = lunes … 5 = viernes), o "paridad" para el esquema par/impar */
    weekdays: Partial<Record<1 | 2 | 3 | 4 | 5, Digit[]>> | "paridad";
    /** Sábados con dígitos que rotan cada semana, a partir de un sábado de referencia */
    saturday?: { hours: Window[]; anchor: string; cycle: Digit[][] };
    source: { label: string; href?: string };
}

/** Temporadas en que cambia el horario (por ejemplo, 24 horas en vacaciones) */
export interface Season {
    from: string;
    until: string;
    hours: Window[];
    label: string;
}

export interface City {
    slug: string;
    name: string;
    /** "en Bogotá", "en el área metropolitana de Bucaramanga" */
    where: string;
    /** Ciudad sin pico y placa permanente para particulares */
    none?: boolean;
    rotations: Rotation[];
    seasons?: Season[];
    /** Qué dígito de la placa cuenta */
    plateDigit: string;
    exemptions: string[];
    notes: string[];
    authority: string;
}

const L: Window[] = [];

export const CITIES: City[] = [
    {
        slug: "bogota",
        name: "Bogotá",
        where: "en Bogotá",
        authority: "Secretaría Distrital de Movilidad",
        plateDigit: "último dígito de la placa",
        rotations: [
            {
                from: "2026-01-01",
                until: null,
                hours: [["06:00", "21:00"]],
                weekdays: "paridad",
                source: { label: "Secretaría Distrital de Movilidad", href: "https://bogota.gov.co/mi-ciudad/movilidad/2026-11/pico-y-placa-bogota-vehiculos-particulares-1-30-de-noviembre-de-2026" },
            },
        ],
        exemptions: [
            "Motocicletas.",
            "Vehículos eléctricos (Ley 1964 de 2019).",
            "Quienes pagan el pico y placa solidario, solo en movilidadbogota.gov.co.",
        ],
        notes: [
            "En los días pares no circulan las placas terminadas en 1, 2, 3, 4 y 5; en los impares, las terminadas en 6, 7, 8, 9 y 0.",
            "Los lunes festivos de regreso puede regir el pico y placa regional en las entradas a la ciudad: de 12:00 m. a 4:00 p. m. entran las placas pares y de 4:00 a 8:00 p. m. las impares.",
            "Los taxis tienen su propia rotación desde las 5:30 a. m.",
        ],
    },
    {
        slug: "medellin",
        name: "Medellín",
        where: "en Medellín",
        authority: "Secretaría de Movilidad de Medellín",
        plateDigit: "último dígito de la placa (en motos, el primero)",
        rotations: [
            {
                from: "2026-08-03",
                until: "2027-01-29",
                hours: [["05:00", "20:00"]],
                weekdays: { 1: [5, 8], 2: [1, 4], 3: [0, 2], 4: [3, 6], 5: [7, 9] },
                source: { label: "Alcaldía de Medellín, Decreto 1490 de 2026", href: "https://www.medellin.gov.co/es/sala-de-prensa/noticias/la-nueva-rotacion-del-pico-y-placa-en-medellin-comenzara-a-regir-a-partir-del-lunes-3-de-agosto/" },
            },
        ],
        exemptions: ["Vehículos eléctricos (Ley 1964 de 2019).", "Algunas vías están exentas; las define el decreto de cada semestre."],
        notes: [
            "Las motos también tienen pico y placa, con la misma rotación pero por el primer dígito de la placa.",
            "La rotación cambia cada semestre: la próxima empieza a finales de enero de 2027.",
            "Los taxis tienen una rotación aparte que cambia cada mes.",
        ],
    },
    {
        slug: "cali",
        name: "Cali",
        where: "en Cali",
        authority: "Secretaría de Movilidad de Cali",
        plateDigit: "último dígito de la placa",
        rotations: [
            {
                from: "2026-07-01",
                until: "2026-12-31",
                hours: [["06:00", "19:00"]],
                weekdays: { 1: [9, 0], 2: [1, 2], 3: [3, 4], 4: [5, 6], 5: [7, 8] },
                source: { label: "Alcaldía de Cali, Decreto 4112.010.20.0814 de 2026", href: "https://www.cali.gov.co/boletines/publicaciones/193096/pico-y-placa-rota-en-cali-para-el-segundo-semestre-de-2026-nueva-medida-rige-desde-el-1-de-julio/" },
            },
        ],
        exemptions: [
            "Motocicletas.",
            "Vehículos eléctricos e híbridos.",
            "Vehículos oficiales y de emergencia.",
            "Carros de personas con discapacidad.",
            "Carga de cinco toneladas o más.",
            "Quienes pagan la tasa por congestión.",
        ],
        notes: ["La rotación cambia cada semestre: la siguiente arranca en enero de 2027."],
    },
    {
        slug: "bucaramanga",
        name: "Bucaramanga",
        where: "en Bucaramanga y su área metropolitana",
        authority: "Dirección de Tránsito de Bucaramanga",
        plateDigit: "último dígito de la placa",
        rotations: [
            {
                from: "2026-10-05",
                until: "2027-01-03",
                hours: [["06:00", "20:00"]],
                weekdays: { 1: [5, 6], 2: [7, 8], 3: [9, 0], 4: [1, 2], 5: [3, 4] },
                saturday: {
                    hours: [["09:00", "13:00"]],
                    anchor: "2026-10-31",
                    cycle: [
                        [5, 6],
                        [7, 8],
                        [9, 0],
                        [1, 2],
                        [3, 4],
                    ],
                },
                source: { label: "Dirección de Tránsito de Bucaramanga, Resolución 854 de 2025", href: "https://www.vanguardia.com/area-metropolitana/bucaramanga/2026/10/03/asi-queda-el-pico-y-placa-en-bucaramanga-desde-este-lunes-conozca-la-nueva-rotacion/" },
            },
        ],
        exemptions: ["Vehículos eléctricos (Ley 1964 de 2019)."],
        notes: [
            "También rige en Floridablanca, Girón y Piedecuesta.",
            "Los sábados hay pico y placa de 9:00 a. m. a 1:00 p. m. y los dígitos avanzan cada semana. Confírmalo antes de salir.",
            "La rotación cambia cada trimestre: cada pareja de dígitos pasa al día siguiente.",
        ],
    },
    {
        slug: "cartagena",
        name: "Cartagena",
        where: "en Cartagena",
        authority: "Departamento Administrativo de Tránsito y Transporte (DATT)",
        plateDigit: "último dígito de la placa",
        rotations: [
            {
                from: "2026-10-05",
                until: "2027-01-22",
                hours: [
                    ["07:00", "09:00"],
                    ["18:00", "20:00"],
                ],
                weekdays: { 1: [1, 2], 2: [3, 4], 3: [5, 6], 4: [7, 8], 5: [9, 0] },
                source: { label: "Alcaldía de Cartagena, Decreto 0015 de 2026", href: "https://www.cartagena.gov.co/noticias/cambia-rotacion-pico-placa-para-motos-vehiculos-particulares-cartagena-0" },
            },
        ],
        seasons: [{ from: "2026-12-11", until: "2027-01-22", hours: [["00:00", "24:00"]], label: "temporada de fin de año" }],
        exemptions: ["Vehículos eléctricos (Ley 1964 de 2019)."],
        notes: [
            "Las motos tienen la misma rotación y además restricción nocturna de 11:00 p. m. a 5:00 a. m.",
            "En temporada alta (Semana Santa, mitad y fin de año) la restricción es de 24 horas.",
        ],
    },
    {
        slug: "barranquilla",
        name: "Barranquilla",
        where: "en Barranquilla",
        none: true,
        authority: "Secretaría de Tránsito y Seguridad Vial de Barranquilla",
        plateDigit: "último dígito de la placa",
        rotations: [],
        exemptions: [],
        notes: [
            "Los carros particulares no tienen pico y placa permanente: puedes circular cualquier día.",
            "La Alcaldía la activa solo en fechas especiales, como el Carnaval, con un decreto temporal.",
        ],
    },
];

export const getCity = (slug: string) => CITIES.find((city) => city.slug === slug);

export type Status = "aplica" | "fin-de-semana" | "festivo" | "sin-medida" | "por-confirmar";

export interface Day {
    date: string;
    status: Status;
    digits: Digit[];
    hours: Window[];
    season?: string;
}

const holidayCache = new Map<number, Map<string, string>>();
/** Nombre del festivo, si la fecha lo es */
export function holidayName(date: string) {
    const year = Number(date.slice(0, 4));
    if (!holidayCache.has(year)) holidayCache.set(year, new Map(getHolidays(year).map(({ date, name }) => [date, name])));
    return holidayCache.get(year)!.get(date);
}

export const ALL_DIGITS: Digit[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 0];

export function rotationOn(city: City, date: string) {
    return city.rotations.find(({ from, until }) => date >= from && (until == null || date <= until));
}

/** Qué placas no circulan un día y en qué horario */
export function dayFor(city: City, date: string): Day {
    if (city.none) return { date, status: "sin-medida", digits: [], hours: L };
    const rotation = rotationOn(city, date);
    if (!rotation) return { date, status: "por-confirmar", digits: [], hours: L };
    if (holidayName(date)) return { date, status: "festivo", digits: [], hours: L };

    const weekday = weekdayOf(date);
    const season = city.seasons?.find(({ from, until }) => date >= from && date <= until);
    if (weekday === 0) return { date, status: "fin-de-semana", digits: [], hours: L };
    if (weekday === 6) {
        const saturday = rotation.saturday;
        if (!saturday) return { date, status: "fin-de-semana", digits: [], hours: L };
        const weeks = Math.floor(daysBetween(saturday.anchor, date) / 7);
        const n = saturday.cycle.length;
        return { date, status: "aplica", digits: saturday.cycle[((weeks % n) + n) % n], hours: saturday.hours };
    }

    const digits: Digit[] =
        rotation.weekdays === "paridad"
            ? Number(date.slice(8)) % 2 === 0
                ? [1, 2, 3, 4, 5]
                : [6, 7, 8, 9, 0]
            : (rotation.weekdays[weekday as 1 | 2 | 3 | 4 | 5] ?? []);
    return { date, status: digits.length ? "aplica" : "fin-de-semana", digits, hours: season?.hours ?? rotation.hours, season: season?.label };
}

/** Días seguidos desde una fecha */
export const daysFrom = (city: City, start: string, count: number) =>
    Array.from({ length: count }, (_, index) => dayFor(city, addDays(start, index)));

/** Próximos días en que una placa tiene pico y placa */
export function nextFor(city: City, digit: Digit, start: string, { limit = 5, horizon = 60 } = {}) {
    return daysFrom(city, start, horizon)
        .filter((day) => day.status === "aplica" && day.digits.includes(digit))
        .slice(0, limit);
}

/** Semanas (lunes a domingo) que cubren un mes, para el calendario */
export function monthGrid(city: City, year: number, month: number) {
    const first = `${year}-${String(month).padStart(2, "0")}-01`;
    const start = addDays(first, -((weekdayOf(first) + 6) % 7));
    const weeks: (Day & { inMonth: boolean })[][] = [];
    for (let date = start; weeks.length < 6; ) {
        const week = Array.from({ length: 7 }, (_, index) => {
            const day = addDays(date, index);
            return { ...dayFor(city, day), inMonth: day.slice(0, 7) === first.slice(0, 7) };
        });
        if (!week.some((day) => day.inMonth)) break;
        weeks.push(week);
        date = addDays(date, 7);
    }
    return weeks;
}

/** "7:00 a. m.", "12:00 m.", "24:00" se lee como medianoche */
export function formatTime(time: string) {
    const [h, m] = time.split(":").map(Number);
    if (h === 12 && m === 0) return "12:00 m.";
    if (h === 0 || h === 24) return "12:00 a. m.";
    return `${h % 12 === 0 ? 12 : h % 12}:${String(m).padStart(2, "0")} ${h < 12 ? "a. m." : "p. m."}`;
}

/** "de 6:00 a. m. a 9:00 p. m." o "de 7:00 a 9:00 a. m. y de 6:00 a 8:00 p. m." */
export function formatHours(hours: Window[]) {
    if (hours.length === 1 && hours[0][0] === "00:00" && hours[0][1] === "24:00") return "todo el día";
    return hours.map(([from, to]) => `de ${formatTime(from)} a ${formatTime(to)}`).join(" y ");
}

/** "1, 2, 3, 4 y 5" */
export function formatDigits(digits: Digit[]) {
    if (digits.length < 2) return digits.join("");
    return `${digits.slice(0, -1).join(", ")} y ${digits[digits.length - 1]}`;
}

/** Cierra con punto sin duplicarlo cuando la frase termina en "a. m." o "p. m." */
export const endSentence = (text: string) => (text.endsWith(".") ? text : `${text}.`);

/** Frase corta para el estado del día */
export function describe(city: City, day: Day) {
    switch (day.status) {
        case "aplica":
            return endSentence(`No circulan placas terminadas en ${formatDigits(day.digits)}, ${formatHours(day.hours)}`);
        case "festivo":
            return `No hay pico y placa: es festivo (${holidayName(day.date)}).`;
        case "fin-de-semana":
            return "No hay pico y placa: es fin de semana.";
        case "sin-medida":
            return `No hay pico y placa para carros particulares ${city.where}.`;
        default:
            return `La rotación de esta fecha todavía no está confirmada por la ${city.authority}.`;
    }
}
