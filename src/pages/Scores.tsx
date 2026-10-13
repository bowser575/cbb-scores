import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { MonthCalendar } from '../components/DatePicker'
import { GameRow } from '../components/GameRow'
import { Basketball, Calendar, ChevronDown, ChevronLeft, ChevronRight, WifiSlash } from '../components/icons'
import { Page } from '../components/Page'
import { Empty, Menu, Section, Segmented, Sheet, Spinner, type MenuItem } from '../components/ui'
import { conferences } from '../lib/directory'
import { ALL_DIVISION_I, margin, NCAA_TOURNAMENT, scoreboard, type Game } from '../lib/espn'
import { fromYMD, monthDay, todayYMD, weekday } from '../lib/format'
import { useFavorites, useResource, useStored } from '../lib/hooks'

type Filter = 'all' | 'top25' | 'close'

const FILTERS: { value: Filter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'top25', label: 'Top 25' },
  { value: 'close', label: 'Close' },
]

const GROUPS: MenuItem<string>[] = [
  { value: ALL_DIVISION_I, label: 'All Division I' },
  { value: NCAA_TOURNAMENT, label: 'NCAA Tournament' },
  'divider',
  ...conferences.map((c) => ({ value: c.id, label: c.short })),
]

const STATE_ORDER = { live: 0, pre: 1, final: 2 }

// The season's game days, kept across visits so the strip doesn't flash empty.
let knownCalendar: string[] = []

export function ScoresPage() {
  const [params, setParams] = useSearchParams()
  const requested = params.get('d')
  const [group, setGroup] = useStored('group', ALL_DIVISION_I)
  const [filter, setFilter] = useStored<Filter>('filter', 'all')
  const [picking, setPicking] = useState(false)
  const favorites = useFavorites()

  const { data, error, reload } = useResource(
    `scores|${requested ?? '-'}|${group}`,
    () => scoreboard(requested, group),
    (b) => (b.games.some((g) => g.state === 'live') ? 20_000 : null),
  )

  if (data?.calendar.length) knownCalendar = data.calendar
  const selected = requested ?? data?.day ?? null

  const days = useMemo(() => {
    const all = new Set(knownCalendar)
    if (selected) all.add(selected)
    return [...all].sort()
  }, [selected, data])

  const setDay = useCallback((d: string) => setParams({ d }, { replace: true }), [setParams])

  const visible = useMemo(() => {
    const sorted = [...(data?.games ?? [])].sort(
      (a, b) => STATE_ORDER[a.state] - STATE_ORDER[b.state] || (a.date?.getTime() ?? 0) - (b.date?.getTime() ?? 0),
    )
    if (filter === 'top25') return sorted.filter((g) => g.away.rank != null || g.home.rank != null)
    if (filter === 'close') return sorted.filter((g) => g.state !== 'pre' && (margin(g) ?? 99) <= 5)
    return sorted
  }, [data, filter])

  const groupName =
    group === ALL_DIVISION_I ? 'All D-I' : group === NCAA_TOURNAMENT ? 'NCAA Tourney' : (conferences.find((c) => c.id === group)?.short ?? 'Conference')

  const mine = visible.filter((g) => favorites.has(g.away.id) || favorites.has(g.home.id))
  const rest = visible.filter((g) => !mine.includes(g))
  const rows = (games: Game[]) => games.map((g) => <GameRow key={g.id} game={g} to={`/scores/game/${g.id}`} back="Scores" />)

  return (
    <Page
      title="Scores"
      large
      leading={
        <button className="icon-button" onClick={() => setPicking(true)} aria-label="Go to date">
          <Calendar />
        </button>
      }
      trailing={
        <Menu items={GROUPS} value={group} onChange={setGroup} label="Conference" className="nav-menu">
          {groupName}
          <ChevronDown className="menu-chevron" />
        </Menu>
      }
    >
      <DateStrip days={days} selected={selected} onSelect={setDay} />
      <div className="controls">
        <Segmented label="Filter" options={FILTERS} value={filter} onChange={setFilter} />
      </div>

      {error ? (
        <Empty
          icon={<WifiSlash />}
          title="Couldn't Load Scores"
          message="Check your connection and try again."
          action={{ label: 'Retry', onClick: reload }}
        />
      ) : !data ? (
        <Spinner block />
      ) : visible.length === 0 ? (
        <Empty
          icon={<Basketball />}
          title="No Games"
          message={
            filter === 'top25'
              ? 'No Top 25 teams play on this day.'
              : filter === 'close'
                ? 'No close games (5 points or fewer) yet.'
                : 'No games on this day.'
          }
        />
      ) : (
        <>
          {mine.length > 0 && <Section header="My Teams">{rows(mine)}</Section>}
          {rest.length > 0 && <Section header={mine.length ? 'All Games' : undefined}>{rows(rest)}</Section>}
        </>
      )}

      <Sheet open={picking} onClose={() => setPicking(false)} label="Go to date">
        <DateSheet
          initial={selected ?? todayYMD()}
          marked={new Set(knownCalendar)}
          onCancel={() => setPicking(false)}
          onGo={(d) => {
            setPicking(false)
            setDay(d)
          }}
        />
      </Sheet>
    </Page>
  )
}

function DateSheet({ initial, marked, onCancel, onGo }: { initial: string; marked: Set<string>; onCancel: () => void; onGo: (d: string) => void }) {
  const [day, setDay] = useState(initial)
  return (
    <>
      <div className="sheet-bar">
        <button className="text-button" onClick={onCancel}>
          Cancel
        </button>
        <span className="sheet-title">Go to Date</span>
        <button className="text-button strong" onClick={() => onGo(day)}>
          Go
        </button>
      </div>
      <div className="sheet-body">
        <MonthCalendar value={day} onChange={setDay} marked={marked} />
        <button className="today-button" onClick={() => onGo(todayYMD())}>
          Today
        </button>
      </div>
    </>
  )
}

/** Horizontally scrolling list of game days, like a sports app's date bar. */
function DateStrip({ days, selected, onSelect }: { days: string[]; selected: string | null; onSelect: (d: string) => void }) {
  const scroller = useRef<HTMLDivElement>(null)
  const first = useRef(true)
  const today = todayYMD()

  useLayoutEffect(() => {
    const el = scroller.current
    const pill = el?.querySelector<HTMLElement>('[aria-pressed="true"]')
    if (!el || !pill) return
    const left = pill.offsetLeft - (el.clientWidth - pill.offsetWidth) / 2
    // Animate short hops only; jumping months away should be instant.
    const near = Math.abs(left - el.scrollLeft) < el.clientWidth
    el.scrollTo({ left, behavior: first.current || !near ? 'auto' : 'smooth' })
    first.current = false
  }, [selected, days])

  // Mouse users get arrows; touch and trackpads just swipe.
  const [edges, setEdges] = useState({ start: true, end: true })
  const measure = useCallback(() => {
    const el = scroller.current
    if (el) setEdges({ start: el.scrollLeft <= 4, end: el.scrollLeft + el.clientWidth >= el.scrollWidth - 4 })
  }, [])
  useEffect(measure, [measure, days])
  const page = (dir: number) => scroller.current?.scrollBy({ left: dir * scroller.current.clientWidth * 0.8, behavior: 'smooth' })

  if (days.length === 0) return <div className="strip-placeholder" />
  return (
    <div className="strip-wrap">
      <button className="strip-arrow start" onClick={() => page(-1)} disabled={edges.start} aria-label="Earlier dates">
        <ChevronLeft />
      </button>
      <div className="strip" ref={scroller} onScroll={measure}>
        {days.map((d) => {
          const date = fromYMD(d)
          return (
            <button key={d} className="strip-day" aria-pressed={d === selected} onClick={() => onSelect(d)}>
              <span className="strip-weekday">{d === today ? 'Today' : weekday(date)}</span>
              <span className="strip-date">{monthDay(date)}</span>
            </button>
          )
        })}
      </div>
      <button className="strip-arrow end" onClick={() => page(1)} disabled={edges.end} aria-label="Later dates">
        <ChevronRight />
      </button>
    </div>
  )
}
