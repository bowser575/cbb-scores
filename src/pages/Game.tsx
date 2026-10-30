import { useState, type CSSProperties, type ReactNode } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Arena, Basketball, Calendar, Clock, People, TV, WifiSlash } from '../components/icons'
import { GameFlow, WinChance, awayChanceNow } from '../components/GameFlow'
import { BackButton, Page } from '../components/Page'
import { Disclaimer, Empty, Segmented, Spinner, TeamLogo, UpsetBadge } from '../components/ui'
import {
  betResult,
  BOX_COLUMNS,
  favoriteLine,
  formatPrice,
  formatSpread,
  isUpset,
  lineLabel,
  projection,
  statusText,
  summary,
  type BoxTeam,
  type Game,
  type GameSummary,
  type Play,
  type TeamSide,
} from '../lib/espn'
import { useResource } from '../lib/hooks'
import { pregameHomeChance, torvikPredictions } from '../lib/torvik'

type Tab = 'box' | 'team' | 'plays'

export function GamePage() {
  const { id = '', tab: navTab = 'scores' } = useParams()
  const { data, error, reload } = useResource(`game|${id}`, () => summary(id), (s) => (s.game.state === 'live' ? 20_000 : null))
  const [tab, setTab] = useState<Tab>('box')
  const [showProjection, setShowProjection] = useState(false)
  const { data: feed } = useResource('torvik', torvikPredictions)

  const g = data?.game
  const title = g ? `${g.away.name} ${g.neutral ? 'vs' : '@'} ${g.home.name}` : ''
  const proj = g?.state === 'pre' ? projection(g) : null
  const started = g && !(g.state === 'pre' && Object.keys(data.boxes).length === 0)
  const pregame = g ? pregameHomeChance(g, feed) : null
  const awayChance = g && data ? awayChanceNow(g, data.plays, pregame?.chance ?? null) : null

  return (
    <Page title={title} leading={<BackButton />} wide>
      {data && g ? (
        <>
          <Header s={data} navTab={navTab} back={title} projected={showProjection ? proj : null} />
          {proj && (
            <button className="prominent-button" onClick={() => setShowProjection((v) => !v)}>
              {showProjection ? 'Hide Projected Score' : 'Show Projected Score'}
            </button>
          )}
          {pregame && awayChance != null && g.state !== 'final' && <WinChance game={g} awayChance={awayChance} source={pregame.source} />}
          {started && <GameFlow game={g} plays={data.plays} pregameHome={pregame?.chance ?? null} />}
          {started ? (
            <>
              <div className="controls">
                <Segmented
                  label="Section"
                  options={[
                    { value: 'box', label: 'Box Score' },
                    { value: 'team', label: 'Team Stats' },
                    { value: 'plays', label: 'Plays' },
                  ]}
                  value={tab}
                  onChange={setTab}
                />
              </div>
              {tab === 'box' && <BoxScore s={data} />}
              {tab === 'team' && <TeamStats s={data} />}
              {tab === 'plays' && <Plays s={data} />}
            </>
          ) : null}
          <OddsCard g={g} />
          <GameInfo s={data} />
          <Disclaimer />
        </>
      ) : error ? (
        <Empty icon={<WifiSlash />} title="Couldn't Load Game" message="Check your connection and try again." action={{ label: 'Retry', onClick: reload }} />
      ) : (
        <Spinner block />
      )}
    </Page>
  )
}

/* ---------- header ---------- */

const headerDayFmt = new Intl.DateTimeFormat(undefined, { weekday: 'long' })

function Header({
  s,
  navTab,
  back,
  projected,
}: {
  s: GameSummary
  navTab: string
  back: string
  projected: { away: number; home: number } | null
}) {
  const g = s.game
  const upset = isUpset(g)

  const teamCol = (t: TeamSide) => (
    <Link to={`/${navTab}/team/${t.id}`} state={{ back }} className="gh-team">
      <TeamLogo id={t.id} size={56} />
      <span className="gh-abbr">
        {t.rank && <span className="rank-badge">{t.rank}</span>}
        {t.abbr}
      </span>
      <span className="gh-record">{t.record}</span>
    </Link>
  )

  const score = (t: TeamSide, p?: number) =>
    g.state === 'pre' ? (
      <span className={`gh-score proj ${p == null ? 'hidden' : ''}`}>{p ?? ''}</span>
    ) : (
      <span className={`gh-score ${g.state === 'final' && !t.winner ? 'lost' : ''}`}>{t.score}</span>
    )

  return (
    <section className="card game-header">
      <div className="gh-top">
        {teamCol(g.away)}
        {score(g.away, projected?.away)}
        <div className={`gh-status ${g.state}`}>
          {g.state === 'pre' ? (
            <>
              <span>{g.date ? headerDayFmt.format(g.date) : ''}</span>
              <span>{statusText(g)}</span>
              {g.tv && (
                <span className="gh-tv">
                  <TV />
                  {g.tv.split(', ')[0]}
                </span>
              )}
              {projected && <span className="gh-proj-label">Projected</span>}
            </>
          ) : (
            <span className="gh-state">{statusText(g)}</span>
          )}
          {upset && <UpsetBadge live={g.state === 'live'} />}
        </div>
        {score(g.home, projected?.home)}
        {teamCol(g.home)}
      </div>
      {g.state !== 'pre' && <LineScore g={g} />}
    </section>
  )
}

/* ---------- odds ---------- */

/** Spread, total and moneyline for each team, laid out like a sportsbook. Once the game is final, the bets that won are lit. */
function OddsCard({ g }: { g: Game }) {
  const o = g.odds
  if (!o) return null
  const result = betResult(g)
  const { spread, total } = o
  const hasMoney = o.awayMoneyline != null || o.homeMoneyline != null

  const notes: string[] = []
  if (result?.cover) notes.push(result.cover === 'push' ? 'Spread pushed' : `${g[result.cover].abbr} covered by ${result.coverBy}`)
  if (result?.total) {
    notes.push(
      result.total === 'push'
        ? `Total pushed at ${result.points}`
        : `${result.total === 'over' ? 'Over' : 'Under'} by ${result.totalBy} · ${result.points} points`,
    )
  }
  const opened = [
    o.openSpread != null && o.openSpread !== spread ? favoriteLine(g, o.openSpread) : null,
    o.openTotal != null && o.openTotal !== total ? `O/U ${o.openTotal}` : null,
  ].filter(Boolean)
  if (opened.length) notes.push(`Opened ${opened.join(' · ')}`)

  return (
    <section className="card odds">
      <div className="odds-head">
        <span>Odds</span>
        {o.provider && <span className="odds-provider">{o.provider}</span>}
      </div>
      {spread != null || total != null || hasMoney ? (
        <table className="odds-table">
          <thead>
            <tr>
              <td />
              {spread != null && <th scope="col">Spread</th>}
              {total != null && <th scope="col">Total</th>}
              {hasMoney && <th scope="col">Money</th>}
            </tr>
          </thead>
          <tbody>
            {(['away', 'home'] as const).map((side) => {
              const t = g[side]
              const home = side === 'home'
              const ml = home ? o.homeMoneyline : o.awayMoneyline
              return (
                <tr key={side}>
                  <th scope="row">
                    <span className="odds-team">
                      <TeamLogo id={t.id} size={24} />
                      <span className="odds-abbr">{t.abbr}</span>
                    </span>
                  </th>
                  {spread != null && (
                    <OddsCell
                      main={formatSpread(home ? spread : -spread)}
                      price={home ? o.homeSpreadOdds : o.awaySpreadOdds}
                      hit={result?.cover === side}
                    />
                  )}
                  {total != null && (
                    <OddsCell
                      main={`${home ? 'U' : 'O'} ${total}`}
                      price={home ? o.underOdds : o.overOdds}
                      hit={result?.total === (home ? 'under' : 'over')}
                    />
                  )}
                  {hasMoney && <OddsCell main={ml != null ? formatPrice(ml) : '–'} hit={result != null && t.winner} />}
                </tr>
              )
            })}
          </tbody>
        </table>
      ) : (
        <p className="odds-line">{lineLabel(g)}</p>
      )}
      {notes.length > 0 && (
        <div className="odds-notes">
          {notes.map((n) => (
            <span key={n}>{n}</span>
          ))}
        </div>
      )}
    </section>
  )
}

function OddsCell({ main, price, hit }: { main: string; price?: number | null; hit: boolean }) {
  return (
    <td>
      <span className={`odds-cell ${hit ? 'hit' : ''}`}>
        <span className="odds-main">{main}</span>
        {price != null && <span className="odds-price">{formatPrice(price)}</span>}
        {hit && <span className="sr-only">, won</span>}
      </span>
    </td>
  )
}

const infoDateFmt = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' })

/** Date, time, TV, venue — icon rows like the iOS app's game info card. */
function GameInfo({ s }: { s: GameSummary }) {
  const g = s.game
  const cells: { icon: ReactNode; text: string; wide?: boolean }[] = []
  if (g.date) cells.push({ icon: <Calendar />, text: infoDateFmt.format(g.date) })
  if (g.date && g.timeValid) cells.push({ icon: <Clock />, text: timeFmt.format(g.date) })
  if (g.tv) cells.push({ icon: <TV />, text: g.tv, wide: true })
  if (s.venue) cells.push({ icon: <Arena />, text: s.venue, wide: true })
  if (s.attendance) cells.push({ icon: <People />, text: `${s.attendance.toLocaleString()} attendance`, wide: true })
  if (g.note) cells.push({ icon: <Basketball />, text: g.note, wide: true })
  if (!cells.length) return null
  return (
    <section className="card info-card">
      {cells.map((c) => (
        <div key={c.text} className={`info-cell ${c.wide ? 'wide' : ''}`}>
          {c.icon}
          <span>{c.text}</span>
        </div>
      ))}
    </section>
  )
}

const timeFmt = new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit', timeZoneName: 'short' })

function periodLabel(i: number) {
  return i === 0 ? '1st' : i === 1 ? '2nd' : i === 2 ? 'OT' : `${i - 1}OT`
}

function LineScore({ g }: { g: Game }) {
  const n = Math.max(g.away.linescores.length, g.home.linescores.length)
  if (n === 0) return null
  return (
    <table className="linescore">
      <thead>
        <tr>
          <th />
          {Array.from({ length: n }, (_, i) => (
            <th key={i}>{periodLabel(i)}</th>
          ))}
          <th>T</th>
        </tr>
      </thead>
      <tbody>
        {[g.away, g.home].map((t) => (
          <tr key={t.id}>
            <th scope="row">{t.abbr}</th>
            {Array.from({ length: n }, (_, i) => (
              <td key={i}>{t.linescores[i] ?? ''}</td>
            ))}
            <td className="total">{t.score}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

/* ---------- box score ---------- */

function BoxScore({ s }: { s: GameSummary }) {
  const [home, setHome] = useState(false)
  const g = s.game
  const team = home ? g.home : g.away
  const box = s.boxes[team.id]

  return (
    <>
      <div className="controls">
        <Segmented
          label="Team"
          options={[
            { value: false, label: g.away.name },
            { value: true, label: g.home.name },
          ]}
          value={home}
          onChange={setHome}
        />
      </div>
      {box?.players.length ? <BoxTable box={box} /> : <p className="quiet">No box score yet.</p>}
    </>
  )
}

const WIDE = new Set(['FG', '3PT', 'FT'])
const SHOOTING = WIDE

/** "26-57" → "46%" */
function percent(madeAttempted: string): string {
  const [made, att] = madeAttempted.split('-').map(Number)
  return att > 0 ? `${Math.round((made / att) * 100)}%` : ''
}

function BoxTable({ box }: { box: BoxTeam }) {
  const hasStarters = box.players.some((p) => p.starter)
  const starters = hasStarters ? box.players.filter((p) => p.starter) : box.players.filter((p) => !p.dnp)
  const bench = hasStarters ? box.players.filter((p) => !p.starter && !p.dnp) : []
  // Players who didn't get in are listed on one line instead of a row each.
  const dnp = box.players.filter((p) => p.dnp && !p.starter)
  const hasTotals = box.totals.some(Boolean)

  const groupHeader = (label: string) => (
    <tr className="box-group">
      <th scope="col">{label}</th>
      {BOX_COLUMNS.map((c) => (
        <th key={c} scope="col" className={WIDE.has(c) ? 'wide' : undefined}>
          {c}
        </th>
      ))}
    </tr>
  )

  const playerRows = (list: BoxTeam['players']) =>
    list.map((p) => (
      <tr key={p.id}>
        <th scope="row">
          <span className="box-name full">{p.name}</span>
          <span className="box-name short">{p.shortName}</span>
          {p.jersey && <span className="box-jersey">#{p.jersey}</span>}
        </th>
        {p.dnp ? (
          <td colSpan={BOX_COLUMNS.length} className="dnp">
            DNP
          </td>
        ) : (
          p.stats.map((v, i) => <td key={i}>{v}</td>)
        )}
      </tr>
    ))

  return (
    <div className="card box">
      <div className="box-scroll">
        <table className="box-table">
          <tbody>
            {groupHeader(hasStarters ? 'Starters' : 'Players')}
            {playerRows(starters)}
            {bench.length > 0 && groupHeader('Bench')}
            {playerRows(bench)}
            {hasTotals && (
              <>
                <tr className="box-totals">
                  <th scope="row">Team</th>
                  {box.totals.map((v, i) => (
                    <td key={i}>{v}</td>
                  ))}
                </tr>
                <tr className="box-pct">
                  <th scope="row" aria-label="Shooting percentage" />
                  {box.totals.map((v, i) => (
                    <td key={i}>{SHOOTING.has(BOX_COLUMNS[i]) ? percent(v) : ''}</td>
                  ))}
                </tr>
              </>
            )}
          </tbody>
        </table>
      </div>
      {dnp.length > 0 && (
        <p className="box-dnp">
          <span>Did not play</span> {dnp.map((p) => p.name).join(', ')}
        </p>
      )}
    </div>
  )
}

/* ---------- team stats ---------- */

function TeamStats({ s }: { s: GameSummary }) {
  const g = s.game
  if (!s.teamStats.length) return <p className="quiet">Team stats appear once the game starts.</p>
  return (
    <section className="card compare">
      <div className="compare-head">
        <TeamLogo id={g.away.id} size={26} />
        <span>{g.away.abbr}</span>
        <span className="spacer" />
        <span>{g.home.abbr}</span>
        <TeamLogo id={g.home.id} size={26} />
      </div>
      {s.teamStats.map((l) => {
        const better = leader(l.label, l.away, l.home)
        return (
          <div key={l.label} className="compare-row">
            <span className={`compare-value ${better === 'away' ? 'lead' : ''}`}>{l.away}</span>
            <span className="compare-label">{l.label}</span>
            <span className={`compare-value end ${better === 'home' ? 'lead' : ''}`}>{l.home}</span>
          </div>
        )
      })}
    </section>
  )
}

/** Which side gets the bold value. Made–attempted pairs are left alone; their % rows decide. */
function leader(label: string, away: string, home: string): 'away' | 'home' | null {
  if (/\d-\d/.test(away) || /\d-\d/.test(home)) return null
  const a = parseFloat(away)
  const h = parseFloat(home)
  if (!Number.isFinite(a) || !Number.isFinite(h) || a === h) return null
  const lowerWins = /^(turnovers|fouls|personal fouls)$/i.test(label)
  return a > h !== lowerWins ? 'away' : 'home'
}

/* ---------- plays ---------- */

function Plays({ s }: { s: GameSummary }) {
  const [scoringOnly, setScoringOnly] = useState(false)
  const g = s.game
  const colors: Record<string, string> = { [g.away.id]: `#${g.away.color}`, [g.home.id]: `#${g.home.color}` }

  const sections: { period: string; plays: Play[] }[] = []
  for (const p of [...s.plays].reverse()) {
    if (scoringOnly && !p.scoring) continue
    const last = sections[sections.length - 1]
    if (last?.period === p.period) last.plays.push(p)
    else sections.push({ period: p.period, plays: [p] })
  }

  return (
    <>
      <div className="controls">
        <Segmented
          label="Plays"
          options={[
            { value: false, label: 'All Plays' },
            { value: true, label: 'Scoring' },
          ]}
          value={scoringOnly}
          onChange={setScoringOnly}
        />
      </div>
      {sections.length === 0 && <p className="quiet">No plays yet.</p>}
      {sections.map((sec, i) => (
        <section key={`${sec.period}-${i}`} className="section">
          <h2 className="section-header">{sec.period}</h2>
          <div className="list">
            {sec.plays.map((p) => (
              <div
                key={p.id}
                className={`play ${p.scoring ? 'scoring' : ''}`}
                style={{ '--team': (p.teamId && colors[p.teamId]) || 'transparent' } as CSSProperties}
              >
                <span className="play-clock num">{p.clock}</span>
                <span className="play-bar" />
                <span className="play-text">{p.text}</span>
                {p.scoring && (
                  <span className="play-score num">
                    {p.awayScore}–{p.homeScore}
                  </span>
                )}
              </div>
            ))}
          </div>
        </section>
      ))}
    </>
  )
}
