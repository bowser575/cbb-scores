/** ESPN dates look like "2026-11-01T14:30Z" (usually no seconds). */
export function parseDate(s: unknown): Date | null {
  if (typeof s !== 'string') return null
  const d = new Date(s)
  return Number.isNaN(d.getTime()) ? null : d
}

const pad = (n: number) => String(n).padStart(2, '0')

/** Local calendar day as yyyyMMdd. */
export function ymd(d: Date): string {
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`
}

export function fromYMD(s: string): Date | null {
  if (!/^\d{8}$/.test(s)) return null
  return new Date(Number(s.slice(0, 4)), Number(s.slice(4, 6)) - 1, Number(s.slice(6, 8)))
}

export const todayYMD = () => ymd(new Date())

const monthDayFmt = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' })
const weekdayFmt = new Intl.DateTimeFormat(undefined, { weekday: 'short' })
const longDateFmt = new Intl.DateTimeFormat(undefined, { month: 'long', day: 'numeric', year: 'numeric' })

export const monthDay = (d: Date | null) => (d ? monthDayFmt.format(d) : '')
export const weekday = (d: Date | null) => (d ? weekdayFmt.format(d) : '')
export const longDate = (d: Date | null) => (d ? longDateFmt.format(d) : '')

export const Season = {
  first: 2003,

  /** ESPN names a season by the year it ends (Nov 2026 – Apr 2027 is 2027). */
  get current(): number {
    const now = new Date()
    return now.getMonth() >= 6 ? now.getFullYear() + 1 : now.getFullYear()
  },

  get all(): number[] {
    const out: number[] = []
    for (let y = this.current; y >= this.first; y--) out.push(y)
    return out
  },

  label(year: number): string {
    return `${year - 1}–${String(year).slice(2)}`
  },
}
