import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { ChevronLeft } from './icons'
import { tabInfo } from './tabs'

export interface BackState {
  back?: string
}

/**
 * A screen with an iOS 26 navigation bar: floating glass buttons over the content and, with
 * `large`, a big title that hands off to a small centered one once it scrolls under the bar.
 */
export function Page({
  title,
  subtitle,
  large,
  wide,
  leading,
  trailing,
  children,
}: {
  title: string
  subtitle?: ReactNode
  large?: boolean
  /** Use a wider column on big screens (box scores). */
  wide?: boolean
  leading?: ReactNode
  trailing?: ReactNode
  children: ReactNode
}) {
  const [scrolled, setScrolled] = useState(false)
  const [titleInBar, setTitleInBar] = useState(!large)
  const bar = useRef<HTMLElement>(null)
  const largeTitle = useRef<HTMLHeadingElement>(null)

  useEffect(() => {
    document.title = title ? `${title} · Hoops` : 'Hoops'
  }, [title])

  useEffect(() => {
    let frame = 0
    const update = () => {
      frame = 0
      setScrolled(window.scrollY > 1)
      if (large && largeTitle.current && bar.current) {
        const barBottom = bar.current.getBoundingClientRect().bottom
        const titleRect = largeTitle.current.getBoundingClientRect()
        setTitleInBar(titleRect.top + titleRect.height * 0.6 < barBottom)
      }
    }
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update)
    }
    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
    }
  }, [large])

  return (
    <>
      <header ref={bar} className={`navbar ${scrolled ? 'scrolled' : ''} ${wide ? 'wide' : ''}`}>
        <div className="navbar-inner">
          <div className="navbar-leading">{leading}</div>
          <div className={`navbar-title ${titleInBar ? 'shown' : ''}`} aria-hidden={large || undefined}>
            {title}
          </div>
          <div className="navbar-trailing">{trailing}</div>
        </div>
      </header>
      <div className={`content ${wide ? 'wide' : ''}`}>
        {large ? (
          <div className="title-block">
            <h1 ref={largeTitle} className="large-title">
              {title}
            </h1>
            {subtitle && <div className="large-subtitle">{subtitle}</div>}
          </div>
        ) : (
          <h1 className="sr-only">{title}</h1>
        )}
        {children}
      </div>
    </>
  )
}

/** Round glass back button. Returns to the previous screen, or the tab's root on a fresh page load. */
export function BackButton() {
  const navigate = useNavigate()
  const location = useLocation()
  const { tab } = useParams()
  const root = tabInfo(tab)
  const fromState = (location.state as BackState | null)?.back
  // Only pop history when we know what's underneath; otherwise go to the tab's root.
  const canPop = location.key !== 'default' && !!fromState
  const label = canPop ? fromState! : root.label

  return (
    <button
      className="glass glass-circle"
      onClick={() => (canPop ? navigate(-1) : navigate(`/${root.id}`))}
      aria-label={`Back to ${label}`}
      title={label}
    >
      <ChevronLeft className="back-chevron" />
    </button>
  )
}
