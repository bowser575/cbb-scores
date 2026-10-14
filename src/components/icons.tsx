import type { SVGProps } from 'react'

/* Hand-drawn stand-ins for the SF Symbols the iOS app uses. All share a 24×24 grid and round joins. */

type P = SVGProps<SVGSVGElement>

const base = (p: P): P => ({
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.75,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
  ...p,
})

export const Basketball = (p: P) => (
  <svg {...base(p)}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 3v18M3 12h18M5.6 5.6c3 2.6 3 10.2 0 12.8M18.4 5.6c-3 2.6-3 10.2 0 12.8" />
  </svg>
)

/** calendar.day — a filled tile showing today's date, used for the Scores tab. */
export const CalendarDay = ({ day, ...p }: P & { day: number }) => (
  <svg {...base({ stroke: 'none', ...p })}>
    <rect x="3" y="3" width="18" height="18" rx="4" fill="currentColor" />
    <text x="12" y="16.6" textAnchor="middle" fontSize="11" fontWeight="700" fill="var(--tab-glyph, #fff)" fontFamily="inherit">
      {day}
    </text>
  </svg>
)

export const ListNumber = (p: P) => (
  <svg {...base(p)}>
    <path d="M10 6h11M10 12h11M10 18h11" />
    <path d="M3.6 4.6 5 3.8v4.4" strokeWidth="1.4" />
    <path d="M3.4 10.6c.2-.5.7-.8 1.3-.8.7 0 1.2.4 1.2 1 0 .9-1.5 1.5-2.5 2.6h2.6" strokeWidth="1.4" />
    <path d="M3.5 16.2c.3-.3.7-.5 1.2-.5.7 0 1.2.4 1.2 1s-.5.9-1.1.9c.7 0 1.2.4 1.2 1s-.6 1.1-1.3 1.1c-.5 0-1-.2-1.3-.6" strokeWidth="1.4" />
  </svg>
)

export const Star = ({ filled, ...p }: P & { filled?: boolean }) => (
  <svg {...base(p)}>
    <path
      d="M12 3.3l2.6 5.4 5.9.8-4.3 4.1 1.1 5.9L12 16.7l-5.3 2.8 1.1-5.9-4.3-4.1 5.9-.8L12 3.3Z"
      fill={filled ? 'currentColor' : 'none'}
    />
  </svg>
)

export const Calendar = (p: P) => (
  <svg {...base(p)}>
    <rect x="3.5" y="4.5" width="17" height="16" rx="3.5" />
    <path d="M3.5 9h17" />
    <path d="M8 12.5h.01M12 12.5h.01M16 12.5h.01M8 16h.01M12 16h.01M16 16h.01" strokeWidth="2.2" />
  </svg>
)

export const Search = (p: P) => (
  <svg {...base({ strokeWidth: 2, ...p })}>
    <circle cx="10.5" cy="10.5" r="6.5" />
    <path d="M15.5 15.5 20 20" />
  </svg>
)

/** line.3.horizontal.decrease */
export const Filter = (p: P) => (
  <svg {...base({ strokeWidth: 1.9, ...p })}>
    <path d="M4 7h16M7 12h10M10 17h4" />
  </svg>
)

export const TV = (p: P) => (
  <svg {...base({ strokeWidth: 1.6, ...p })}>
    <rect x="3" y="4.5" width="18" height="12.5" rx="2" />
    <path d="M8.5 20h7" />
  </svg>
)

export const ChartLine = (p: P) => (
  <svg {...base(p)}>
    <path d="M3.5 19.5h17" />
    <path d="M5 15.5l4.5-5 3.5 3 6-7" />
  </svg>
)

export const ArrowsUpDown = (p: P) => (
  <svg {...base(p)}>
    <path d="M8 19V5M4.5 8.5 8 5l3.5 3.5M16 5v14M12.5 15.5 16 19l3.5-3.5" />
  </svg>
)

export const Clock = (p: P) => (
  <svg {...base(p)}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M12 7.5V12l3 2" />
  </svg>
)

export const Arena = (p: P) => (
  <svg {...base(p)}>
    <path d="M3.5 20.5h17M5 20.5V10M19 20.5V10M3.5 10 12 4.5l8.5 5.5" />
    <path d="M9 20.5v-5h6v5" />
  </svg>
)

export const People = (p: P) => (
  <svg {...base(p)}>
    <circle cx="9" cy="8.5" r="3.5" />
    <path d="M2.5 19.5c.6-3.3 3.2-5.3 6.5-5.3s5.9 2 6.5 5.3" />
    <path d="M15.5 5.3a3.3 3.3 0 0 1 0 6.4M17.5 14.6c2.1.6 3.5 2.4 4 4.9" />
  </svg>
)

export const ChevronRight = (p: P) => (
  <svg {...base({ viewBox: '0 0 8 14', strokeWidth: 2, ...p })}>
    <path d="M1.5 1.5 6.5 7l-5 5.5" />
  </svg>
)

export const ChevronLeft = (p: P) => (
  <svg {...base({ viewBox: '0 0 8 14', strokeWidth: 2, ...p })}>
    <path d="M6.5 1.5 1.5 7l5 5.5" />
  </svg>
)

export const ChevronDown = (p: P) => (
  <svg {...base({ viewBox: '0 0 12 8', strokeWidth: 2, ...p })}>
    <path d="M1.5 1.75 6 6.25l4.5-4.5" />
  </svg>
)

export const ChevronUpDown = (p: P) => (
  <svg {...base({ viewBox: '0 0 10 16', strokeWidth: 1.75, ...p })}>
    <path d="M1.75 5.5 5 2.25 8.25 5.5M1.75 10.5 5 13.75l3.25-3.25" />
  </svg>
)

export const Check = (p: P) => (
  <svg {...base({ viewBox: '0 0 16 14', strokeWidth: 2.25, ...p })}>
    <path d="M1.75 7.5 6 11.75l8.25-9.5" />
  </svg>
)

export const ClearCircle = (p: P) => (
  <svg viewBox="0 0 20 20" aria-hidden {...p}>
    <circle cx="10" cy="10" r="9" fill="currentColor" />
    <path d="m6.75 6.75 6.5 6.5m0-6.5-6.5 6.5" stroke="var(--bg-card)" strokeWidth="1.75" strokeLinecap="round" />
  </svg>
)

export const WifiSlash = (p: P) => (
  <svg {...base(p)}>
    <path d="M2.5 9a14 14 0 0 1 5.2-3.1M11 5.1A14 14 0 0 1 21.5 9M5.5 12.4a9.5 9.5 0 0 1 4-2.2M14.6 10.4a9.5 9.5 0 0 1 3.9 2M8.7 15.6a5 5 0 0 1 6.6 0" />
    <circle cx="12" cy="19" r=".9" fill="currentColor" />
    <path d="M3.5 3.5 20.5 20.5" />
  </svg>
)
