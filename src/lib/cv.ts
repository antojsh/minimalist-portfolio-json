import { work } from "@cv"

const MONTHS_IN_YEAR = 12

// Se usan los métodos UTC porque las fechas del JSON ("2020-10-21") se
// interpretan como medianoche UTC y en Colombia (UTC-5) caerían el día anterior.
const getMonthsBetween = (start: Date, end: Date) => {
  const months =
    (end.getUTCFullYear() - start.getUTCFullYear()) * MONTHS_IN_YEAR +
    (end.getUTCMonth() - start.getUTCMonth()) -
    (end.getUTCDate() < start.getUTCDate() ? 1 : 0)

  return Math.max(months, 0)
}

const pluralize = (count: number, singular: string, plural: string) =>
  `${count} ${count === 1 ? singular : plural}`

export const formatDuration = (startDate: string, endDate: string | null) => {
  const end = endDate == null ? new Date() : new Date(endDate)
  const months = getMonthsBetween(new Date(startDate), end)
  const years = Math.floor(months / MONTHS_IN_YEAR)
  const remainingMonths = months % MONTHS_IN_YEAR

  const parts: string[] = []
  if (years > 0) parts.push(pluralize(years, "año", "años"))
  if (remainingMonths > 0) parts.push(pluralize(remainingMonths, "mes", "meses"))

  return parts.length > 0 ? parts.join(" y ") : "Menos de un mes"
}

export const getYearsOfExperience = () => {
  const firstStart = Math.min(...work.map(({ startDate }) => Date.parse(startDate)))

  return Math.floor(
    getMonthsBetween(new Date(firstStart), new Date()) / MONTHS_IN_YEAR
  )
}

export const currentJob = work.find(({ endDate }) => endDate == null)

export const getHostname = (url: string) =>
  new URL(url).hostname.replace(/^www\./, "")
