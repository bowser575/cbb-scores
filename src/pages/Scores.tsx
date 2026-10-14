import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { MonthCalendar } from '../components/DatePicker'
import { GameRow } from '../components/GameRow'
import { Basketball, Calendar, ChevronLeft, ChevronRight, Filter, WifiSlash } from '../components/icons'
import { Page } from '../components/Page'
import { Disclaimer, Empty, GlassButton, Menu, Section, Sheet, Spinner, type MenuItem } from '../components/ui'
import { conferences } from '../lib/directory'
import { ALL_DIVISION_I, margin, NCAA_TOURNAMENT, scoreboard, type Game } from '../lib/espn'
import { fromYMD, todayYMD, ymd } from '../lib/format'
import { useFavorites, useResource, useStored } from '../lib/hooks'

/** One pick in the filter menu: Top 25, close games, or a group (all D-I, the tournament, a conference). */
type View = 'top25' | 'close' | string

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

// Ordered so the common picks sit nearest the button, which opens the menu upward.
const VIEWS: MenuItem<View>[] = [
  ...conferenceItems,
  'divider',
  { value: NCAA_TOURNAMENT, label: 'NCAA Tournament' },
  { value: ALL_DIVISION_I, label: 'Division I' },
  { value: 'close', label: 'Close Games' },
  { value: 'top25', label: 'Top 25' },
]

const viewLabel = (v: View) => VIEWS.find((i): i is { value: View; label: string } => i !== 'divider' && i.value === v)?.label ?? 'Scores'

const STATE_ORDER = { live: 0, pre: 1, final: 2 }

const dayFmt = new Intl.DateTimeFormat(undefined, { weekday: 'long', month: 'short', day: 'numeric' })

// The season's game days, kept across visits so stepping between days works immediately.
let knownCalendar: string[] = []

export function ScoresPage() {
  const [params, setParams] = useSearchParams()
  const requested = params.get('d')
  const [view, setView] = useStored<View>('view', ALL_DIVISION_I)
  const [picking, setPicking] = useState(false)
  const favorites = useFavorites()

  const group = view === 'top25' || view === 'close' ? ALL_DIVISION_I : view
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
    if (view === 'top25') return sorted.filter((g) => g.away.rank != null || g.home.rank != null)
    if (view === 'close') return sorted.filter((g) => g.state !== 'pre' && (margin(g) ?? 99) <= 5)
    return sorted
  }, [data, view])

  const mine = visible.filter((g) => favorites.has(g.away.id) || favorites.has(g.home.id))
  const rest = visible.filter((g) => !mine.includes(g))
  const rows = (games: Game[]) => games.map((g) => <GameRow key={g.id} game={g} to={`/scores/game/${g.id}`} back={viewLabel(view)} />)

  const date = selected ? fromYMD(selected) : null
  const isToday = selected === todayYMD()
  const subtitle = date ? `${isToday ? 'Today · ' : ''}${dayFmt.format(date)}` : ' '

  return (
    <Page
      title={viewLabel(view)}
      subtitle={subtitle}
      large
      leading={
        requested && !isToday ? (
          <button className="glass glass-pill" onClick={() => setDay(null)}>
            Today
          </button>
        ) : null
      }
      trailing={
        <>
          <GlassButton label="Go to date" onClick={() => setPicking(true)}>
            <Calendar />
          </GlassButton>
          <div className="glass glass-pill stepper" role="group" aria-label="Change day">
            <button onClick={() => step(-1)} aria-label="Previous day">
              <ChevronLeft />
            </button>
            <button onClick={() => step(1)} aria-label="Next day">
              <ChevronRight />
            </button>
          </div>
        </>
      }
    >
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
            view === 'top25'
              ? 'No Top 25 teams play on this day.'
              : view === 'close'
                ? 'No close games (5 points or fewer) yet.'
                : 'No games on this day.'
          }
        />
      ) : (
        <>
          {mine.length > 0 && (
            <Section header="My Teams" plain>
              {rows(mine)}
            </Section>
          )}
          {rest.length > 0 && (
            <Section header={mine.length ? 'All Games' : undefined} plain>
              {rows(rest)}
            </Section>
          )}
          <Disclaimer aboveFab />
        </>
      )}

      <div className="fab">
        <Menu items={VIEWS} value={view} onChange={setView} label="Filter games" className="glass glass-circle">
          <Filter />
        </Menu>
      </div>

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
