import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { Link, type To } from 'react-router-dom'
import { logoURL } from '../lib/espn'
import { useDarkMode } from '../lib/hooks'
import { Check, ChevronRight } from './icons'

/* ---------- team logo ---------- */

export function TeamLogo({ id, size = 28 }: { id: string; size?: number }) {
  const dark = useDarkMode()
  const [failed, setFailed] = useState<'dark' | 'all' | null>(null)
  const style = { width: size, height: size }
  if (!id || failed === 'all') return <span className="logo logo-empty" style={style} />
  const useDark = dark && failed !== 'dark'
  return (
    <img
      className="logo"
      style={style}
      src={logoURL(id, size, useDark)}
      alt=""
      loading="lazy"
      decoding="async"
      onError={() => setFailed(useDark ? 'dark' : 'all')}
    />
  )
}

/* ---------- segmented control ---------- */

export function Segmented<T extends string | boolean>({
  options,
  value,
  onChange,
  label,
}: {
  options: { value: T; label: ReactNode }[]
  value: T
  onChange: (value: T) => void
  label: string
}) {
  const index = Math.max(0, options.findIndex((o) => o.value === value))
  return (
    <div className="seg" role="radiogroup" aria-label={label} style={{ '--n': options.length, '--i': index } as CSSProperties}>
      <span className="seg-thumb" aria-hidden />
      {options.map((o, i) => (
        <button
          key={String(o.value)}
          role="radio"
          aria-checked={i === index}
          className={i === index ? 'on' : i === index + 1 ? 'after-on' : undefined}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

/* ---------- inset grouped lists ---------- */

export function Section({ header, footer, children, flush }: { header?: ReactNode; footer?: ReactNode; children: ReactNode; flush?: boolean }) {
  return (
    <section className="section">
      {header && <h2 className="section-header">{header}</h2>}
      {flush ? children : <div className="list">{children}</div>}
      {footer && <div className="section-footer">{footer}</div>}
    </section>
  )
}

export function Row({
  to,
  state,
  children,
  className = '',
  inset,
}: {
  to?: To
  state?: unknown
  children: ReactNode
  className?: string
  /** Where the separator above the next row starts, to line up with text instead of an icon. */
  inset?: number
}) {
  const style = inset != null ? ({ '--sep-inset': `${inset}px` } as CSSProperties) : undefined
  if (to) {
    return (
      <Link to={to} state={state} className={`row row-link ${className}`} style={style}>
        {children}
        <ChevronRight className="chevron" />
      </Link>
    )
  }
  return (
    <div className={`row ${className}`} style={style}>
      {children}
    </div>
  )
}

/* ---------- status ---------- */

export function Spinner({ block }: { block?: boolean }) {
  const s = (
    <span className="spinner" role="progressbar" aria-label="Loading">
      {Array.from({ length: 8 }, (_, i) => (
        <i key={i} style={{ '--i': i } as CSSProperties} />
      ))}
    </span>
  )
  return block ? <div className="spinner-block">{s}</div> : s
}

export function Empty({ icon, title, message, action }: { icon?: ReactNode; title: string; message?: string; action?: { label: string; onClick: () => void } }) {
  return (
    <div className="empty">
      {icon && <div className="empty-icon">{icon}</div>}
      <div className="empty-title">{title}</div>
      {message && <div className="empty-message">{message}</div>}
      {action && (
        <button className="text-button" onClick={action.onClick}>
          {action.label}
        </button>
      )}
    </div>
  )
}

export function UpsetBadge({ live }: { live?: boolean }) {
  return (
    <span className={`upset ${live ? 'live' : ''}`}>
      <i />
      Upset
    </span>
  )
}

export function Rank({ rank }: { rank: number | null }) {
  return rank ? <span className="rank">{rank}</span> : null
}

/* ---------- pull-down menu ---------- */

export type MenuItem<T> = { value: T; label: string } | 'divider'

export function Menu<T extends string | number>({
  items,
  value,
  onChange,
  children,
  label,
  className = '',
  align = 'end',
}: {
  items: MenuItem<T>[]
  value: T
  onChange: (value: T) => void
  children: ReactNode
  label: string
  className?: string
  align?: 'start' | 'end'
}) {
  const [open, setOpen] = useState(false)
  const button = useRef<HTMLButtonElement>(null)
  const panel = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState<CSSProperties>({})

  useLayoutEffect(() => {
    if (!open || !button.current) return
    const r = button.current.getBoundingClientRect()
    const top = r.bottom + 6
    setPos({
      top,
      maxHeight: `min(${window.innerHeight - top - 16}px, 480px)`,
      ...(align === 'end' ? { right: Math.max(8, window.innerWidth - r.right) } : { left: Math.max(8, r.left) }),
      transformOrigin: align === 'end' ? 'top right' : 'top left',
    })
  }, [open, align])

  useEffect(() => {
    if (!open) return
    panel.current?.querySelector<HTMLElement>('[aria-checked="true"]')?.scrollIntoView({ block: 'center' })
    const close = (e: Event) => {
      if (e.type === 'keydown' && (e as KeyboardEvent).key !== 'Escape') return
      if (e.type === 'pointerdown' && (panel.current?.contains(e.target as Node) || button.current?.contains(e.target as Node))) return
      setOpen(false)
    }
    const onResize = () => setOpen(false)
    document.addEventListener('pointerdown', close)
    document.addEventListener('keydown', close)
    window.addEventListener('resize', onResize)
    return () => {
      document.removeEventListener('pointerdown', close)
      document.removeEventListener('keydown', close)
      window.removeEventListener('resize', onResize)
    }
  }, [open])

  return (
    <>
      <button
        ref={button}
        className={`menu-button ${className}`}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={label}
        onClick={() => setOpen((o) => !o)}
      >
        {children}
      </button>
      {open &&
        createPortal(
          <div ref={panel} className="menu" role="menu" style={pos}>
            {items.map((item, i) =>
              item === 'divider' ? (
                <div key={`d${i}`} className="menu-divider" />
              ) : (
                <button
                  key={String(item.value)}
                  role="menuitemradio"
                  aria-checked={item.value === value}
                  className="menu-item"
                  onClick={() => {
                    onChange(item.value)
                    setOpen(false)
                    button.current?.focus()
                  }}
                >
                  <span className="menu-check">{item.value === value && <Check />}</span>
                  {item.label}
                </button>
              ),
            )}
          </div>,
          document.body,
        )}
    </>
  )
}

/* ---------- modal sheet ---------- */

export function Sheet({ open, onClose, children, label }: { open: boolean; onClose: () => void; children: ReactNode; label: string }) {
  const [closing, setClosing] = useState(false)
  const [mounted, setMounted] = useState(open)

  if (open && !mounted) setMounted(true)
  if (open && closing) setClosing(false)
  if (!open && mounted && !closing) setClosing(true)

  useEffect(() => {
    if (!mounted) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    document.documentElement.classList.add('modal-open')
    return () => {
      document.removeEventListener('keydown', onKey)
      document.documentElement.classList.remove('modal-open')
    }
  }, [mounted, onClose])

  if (!mounted) return null
  return createPortal(
    <div
      className={`sheet-root ${closing ? 'closing' : ''}`}
      onAnimationEnd={(e) => {
        if (closing && e.target === e.currentTarget.lastElementChild) {
          setClosing(false)
          setMounted(false)
        }
      }}
    >
      <div className="sheet-backdrop" onClick={onClose} />
      <div className="sheet" role="dialog" aria-modal="true" aria-label={label}>
        {children}
      </div>
    </div>,
    document.body,
  )
}
