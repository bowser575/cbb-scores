import { useState } from 'react'
import { fromYMD, todayYMD, ymd } from '../lib/format'
import { ChevronLeft, ChevronRight } from './icons'

const monthFmt = new Intl.DateTimeFormat(undefined, { month: 'long', year: 'numeric' })
const weekdayLetters = Array.from({ length: 7 }, (_, i) =>
  new Intl.DateTimeFormat(undefined, { weekday: 'short' }).format(new Date(2024, 0, 7 + i)),
)

/** The graphical month calendar from UIDatePicker. */
export function MonthCalendar({ value, onChange, marked }: { value: string; onChange: (day: string) => void; marked?: Set<string> }) {
  const initial = fromYMD(value) ?? new Date()
  const [month, setMonth] = useState(() => new Date(initial.getFullYear(), initial.getMonth(), 1))
  const today = todayYMD()

  const lead = month.getDay()
  const count = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate()
  const cells: (string | null)[] = [
    ...Array<null>(lead).fill(null),
    ...Array.from({ length: count }, (_, i) => ymd(new Date(month.getFullYear(), month.getMonth(), i + 1))),
  ]
  const shift = (n: number) => setMonth(new Date(month.getFullYear(), month.getMonth() + n, 1))

  return (
    <div className="cal">
      <div className="cal-head">
        <span className="cal-month">{monthFmt.format(month)}</span>
        <button className="icon-button" onClick={() => shift(-1)} aria-label="Previous month">
          <ChevronLeft className="cal-chev" />
        </button>
        <button className="icon-button" onClick={() => shift(1)} aria-label="Next month">
          <ChevronRight className="cal-chev" />
        </button>
      </div>
      <div className="cal-grid" role="grid">
        {weekdayLetters.map((w) => (
          <span key={w} className="cal-weekday">
            {w}
          </span>
        ))}
        {cells.map((day, i) =>
          day ? (
            <button
              key={day}
              className={['cal-day', day === value && 'selected', day === today && 'today', marked?.has(day) && 'marked']
                .filter(Boolean)
                .join(' ')}
              onClick={() => onChange(day)}
              aria-pressed={day === value}
              aria-label={fromYMD(day)?.toDateString()}
            >
              <span>{Number(day.slice(6))}</span>
            </button>
          ) : (
            <span key={`e${i}`} />
          ),
        )}
      </div>
    </div>
  )
}
