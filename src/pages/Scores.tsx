import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { MonthCalendar } from '../components/DatePicker'
import { GameRow } from '../components/GameRow'
import { Basketball, Calendar, ChevronLeft, ChevronRight, WifiSlash } from '../components/icons'
import { Disclaimer, Empty, GlassButton, Sheet, Spinner } from '../components/ui'
import { conferences } from '../lib/directory'
import { ALL_DIVISION_I, margin, NCAA_TOURNAMENT, scoreboard, type Game } from '../lib/espn'
import { fromYMD, todayYMD, ymd } from '../lib/format'
import { useFavorites, useResource, useStored } from '../lib/hooks'

/** The former single-choice preference, retained to migrate existing browser settings. */
type View = string

const CONFERENCE_LABELS: Record<string, string> = {
  'Am. East': 'America East',
  CUSA: 'Conference USA',
  Horizon: 'Horizon League',
  Ivy: 'Ivy League',
  Patriot: 'Patriot League',
  Summit: 'Summit League',
}

const conferenceItems = conferences
  .map((c) => ({ value: c.id, label: CONFERENCE_LABELS[c.short] ?? c.short }))
  .sort((a, b) => a.label.localeCompare(b.label))

const GROUPS = [
  { value: ALL_DIVISION_I, label: 'All conferences' },
  { value: NCAA_TOURNAMENT, label: 'NCAA Tournament' },
  ...conferenceItems,
]
const FILTERS = [
  { value: 'all', label: 'All games' },
  { value: 'live', label: 'Live' },
  { value: 'top25', label: 'Top 25' },
  { value: 'close', label: 'Close' },
] as const

const STATE_ORDER = { live: 0, pre: 1, final: 2 }

const dayFmt = new Intl.DateTimeFormat(undefined, { weekday: 'long', month: 'short', day: 'numeric' })

// The season's game days, kept across visits so stepping between days works immediately.
let knownCalendar: string[] = []

export function ScoresPage() {
  const [params, setParams] = useSearchParams()
  const requested = params.get('d')
  // Read the previous single-choice preference as the fallback for the new independent controls.
  const [legacyView] = useStored<View>('view', ALL_DIVISION_I)
  const [filter, setFilter] = useStored<string>(
    'score-filter',
    ['top25', 'close', 'live'].includes(legacyView) ? legacyView : 'all',
  )
  const [group, setGroup] = useStored<string>(
    'score-group',
    GROUPS.some((g) => g.value === legacyView) ? legacyView : ALL_DIVISION_I,
  )
  useEffect(() => { document.title = 'Scoreboard · CBB Scores' }, [])
  const [picking, setPicking] = useState(false)
  const favorites = useFavorites()

  const { data, error, reload } = useResource(
    `scores|${requested ?? '-'}|${group}`,
    () => scoreboard(requested, group),
    (b) => (b.games.some((g) => g.state === 'live') ? 20_000 : null),
  )

  if (data?.calendar.length) knownCalendar = data.calendar
  const selected = requested ?? data?.day ?? null
  const setDay = (d: string | null) => setParams(d ? { d } : {}, { replace: true })

  // Previous/next game day; plain calendar days when the season calendar isn't known.
  const step = (dir: -1 | 1) => {
    if (!selected) return
    const days = [...new Set([...knownCalendar, selected])].sort()
    const i = days.indexOf(selected) + dir
    if (knownCalendar.length && i >= 0 && i < days.length) return setDay(days[i])
    const d = fromYMD(selected)
    if (d) setDay(ymd(new Date(d.getFullYear(), d.getMonth(), d.getDate() + dir)))
  }

  const visible = useMemo(() => {
    const sorted = [...(data?.games ?? [])].sort(
      (a, b) => STATE_ORDER[a.state] - STATE_ORDER[b.state] || (a.date?.getTime() ?? 0) - (b.date?.getTime() ?? 0),
    )
    if (filter === 'top25') return sorted.filter((g) => g.away.rank != null || g.home.rank != null)
    if (filter === 'close') return sorted.filter((g) => g.state !== 'pre' && (margin(g) ?? 99) <= 5)
    if (filter === 'live') return sorted.filter((g) => g.state === 'live')
    return sorted
  }, [data, filter])

  const mine = visible.filter((g) => favorites.has(g.away.id) || favorites.has(g.home.id))
  const rest = visible.filter((g) => !mine.includes(g))
  const rows = (games: Game[]) => games.map((g) => (
    <GameRow key={g.id} game={g} to={`/scores/game/${g.id}`} back="Scoreboard" card />
  ))

  const date = selected ? fromYMD(selected) : null
  const isToday = selected === todayYMD()
  const dateLabel = date ? `${isToday ? 'Today · ' : ''}${dayFmt.format(date)}` : 'Choose a date'
  const week = Array.from({ length: 7 }, (_, i) => {
    const center = date ?? fromYMD(todayYMD())!
    return new Date(center.getFullYear(), center.getMonth(), center.getDate() + i - 3)
  })
  const filterLabel = FILTERS.find((f) => f.value === filter)?.label ?? 'All games'

  return (
    <div className="content scoreboard">
      <div className="scoreboard-heading">
        <div><h1>Scoreboard</h1><p>Men’s college basketball</p></div>
        <div className="scoreboard-date">
          <span>{dateLabel}</span>
          {selected && !isToday && (
            <button className="today-button" onClick={() => setDay(todayYMD())}>Today</button>
          )}
          <GlassButton label="Go to date" onClick={() => setPicking(true)}>
            <Calendar />
          </GlassButton>
        </div>
      </div>
      <div className="date-strip" role="group" aria-label="Choose game day">
        <button className="date-step" onClick={() => step(-1)} disabled={!selected} aria-label="Previous game day">
          <ChevronLeft />
        </button>
        {week.map((d) => (
          <button
            key={ymd(d)}
            className={`date-day ${ymd(d) === selected ? 'selected' : ''}`}
            onClick={() => setDay(ymd(d))}
            aria-pressed={ymd(d) === selected}
            aria-label={d.toDateString()}
          >
            <span>{d.toLocaleDateString(undefined, { weekday: 'short' })}</span><strong>{d.getDate()}</strong>
          </button>
        ))}
        <button className="date-step" onClick={() => step(1)} disabled={!selected} aria-label="Next game day">
          <ChevronRight />
        </button>
      </div>
      <div className="score-filters" role="group" aria-label="Filter games">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            className="score-filter"
            aria-pressed={filter === f.value}
            onClick={() => setFilter(f.value)}
          >
            {f.label}
            {f.value === 'live' && data ? ` · ${data.games.filter((g) => g.state === 'live').length}` : ''}
          </button>
        ))}
        <select aria-label="Conference or tournament" value={group} onChange={(e) => setGroup(e.target.value)}>
          {GROUPS.map((g) => <option key={g.value} value={g.value}>{g.label}</option>)}
        </select>
      </div>
      <div className="scoreboard-section-title">
        <h2>{filterLabel}</h2>
        <span aria-live="polite">
          {data && !error ? `${visible.length} ${visible.length === 1 ? 'game' : 'games'}` : error ? 'Scores unavailable' : 'Loading scores'}
        </span>
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
                : filter === 'live' ? 'No live games right now on this day.' : 'No games on this day.'
          }
        />
      ) : (
        <>
          {mine.length > 0 && (
            <section className="scoreboard-group">
              <h2>My Teams</h2>
              <div className="score-grid">{rows(mine)}</div>
            </section>
          )}
          {rest.length > 0 && (
            <section className="scoreboard-group">
              {mine.length > 0 && <h2>More games</h2>}
              <div className="score-grid">{rows(rest)}</div>
            </section>
          )}
        </>
      )}

      <Disclaimer />

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
    </div>
  )
}

function DateSheet({ initial, marked, onCancel, onGo }: { initial: string; marked: Set<string>; onCancel: () => void; onGo: (d: string) => void }) {
  const [day, setDay] = useState(initial)
  return (
    <>
      <div className="sheet-bar">
        <button className="glass glass-pill" onClick={onCancel}>
          Cancel
        </button>
        <span className="sheet-title">Go to Date</span>
        <button className="glass glass-pill prominent" onClick={() => onGo(day)}>
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
