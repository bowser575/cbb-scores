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

export const Trophy = ({ filled, ...p }: P & { filled?: boolean }) => (
  <svg {...base(p)}>
    <path d="M7 4h10v5.5a5 5 0 0 1-10 0V4Z" fill={filled ? 'currentColor' : 'none'} />
    <path d="M7 6H4.5v1.2A3.3 3.3 0 0 0 7.6 10.5M17 6h2.5v1.2a3.3 3.3 0 0 1-3.1 3.3M12 14.5V18M8.5 20.5h7M9.5 18h5" />
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
    <rect x="3.5" y="5" width="17" height="15.5" rx="3" />
    <path d="M3.5 9.5h17M8 3v4M16 3v4" />
  </svg>
)

export const Search = (p: P) => (
  <svg {...base({ strokeWidth: 2, ...p })}>
    <circle cx="10.5" cy="10.5" r="6.5" />
    <path d="M15.5 15.5 20 20" />
  </svg>
)

export const ChevronRight = (p: P) => (
  <svg {...base({ viewBox: '0 0 8 14', strokeWidth: 2, ...p })}>
    <path d="M1.5 1.5 6.5 7l-5 5.5" />
  </svg>
)

export const ChevronLeft = (p: P) => (
  <svg {...base({ viewBox: '0 0 12 21', strokeWidth: 2.5, ...p })}>
    <path d="M10 2 2 10.5 10 19" />
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

export const People = (p: P) => (
  <svg {...base(p)}>
    <circle cx="9" cy="8.5" r="3.5" />
    <path d="M2.5 19.5c.6-3.3 3.2-5.3 6.5-5.3s5.9 2 6.5 5.3" />
    <path d="M15.5 5.3a3.3 3.3 0 0 1 0 6.4M17.5 14.6c2.1.6 3.5 2.4 4 4.9" />
  </svg>
)
