import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { ChevronLeft } from './icons'
import { TABS, type TabId } from './tabs'

export interface BackState {
  back?: string
}

/**
 * A screen with an iOS navigation bar. With `large`, the title sits big under the bar and
 * moves into the bar once it scrolls away; the bar turns translucent once content scrolls under it.
 */
export function Page({
  title,
  large,
  leading,
  trailing,
  children,
}: {
  title: string
  large?: boolean
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
      <header ref={bar} className={`navbar ${scrolled ? 'scrolled' : ''}`}>
        <div className="navbar-inner">
          <div className="navbar-leading">{leading}</div>
          <div className={`navbar-title ${titleInBar ? 'shown' : ''}`} aria-hidden={large || undefined}>
            {title}
          </div>
          <div className="navbar-trailing">{trailing}</div>
        </div>
      </header>
      <div className="content">
        {large && (
          <h1 ref={largeTitle} className="large-title">
            {title}
          </h1>
        )}
        {!large && <h1 className="sr-only">{title}</h1>}
        {children}
      </div>
    </>
  )
}

/** "‹ Scores" — returns to the previous screen, or to the tab's root on a fresh page load. */
export function BackButton() {
  const navigate = useNavigate()
  const location = useLocation()
  const { tab } = useParams<{ tab: TabId }>()
  const root = TABS.find((t) => t.id === tab) ?? TABS[0]
  const fromState = (location.state as BackState | null)?.back
  // Only pop history when we know what's underneath; otherwise go to the tab's root.
  const canPop = location.key !== 'default' && !!fromState
  const label = canPop ? fromState! : root.label

  return (
    <button
      className="back-button"
      onClick={() => (canPop ? navigate(-1) : navigate(`/${root.id}`))}
      aria-label={`Back to ${label}`}
    >
      <ChevronLeft className="back-chevron" />
      <span className="back-label">{label.length > 14 ? 'Back' : label}</span>
    </button>
  )
}
