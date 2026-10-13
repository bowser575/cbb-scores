import { useState, type CSSProperties } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Basketball, WifiSlash } from '../components/icons'
import { BackButton, Page } from '../components/Page'
import { Empty, Rank, Segmented, Spinner, TeamLogo, UpsetBadge } from '../components/ui'
import { BOX_COLUMNS, isUpset, projection, statusText, summary, type BoxTeam, type Game, type GameSummary, type Play, type TeamSide } from '../lib/espn'
import { monthDay } from '../lib/format'
import { useResource } from '../lib/hooks'

type Tab = 'box' | 'team' | 'plays'

export function GamePage() {
  const { id = '', tab: navTab = 'scores' } = useParams()
  const { data, error, reload } = useResource(`game|${id}`, () => summary(id), (s) => (s.game.state === 'live' ? 20_000 : null))
  const [tab, setTab] = useState<Tab>('box')

  const g = data?.game
  const title = g ? `${g.away.abbr} ${g.neutral ? 'vs' : 'at'} ${g.home.abbr}` : ''

  return (
    <Page title={title} leading={<BackButton />}>
      {data && g ? (
        <>
          <Header s={data} navTab={navTab} back={title} />
          {g.state === 'pre' && Object.keys(data.boxes).length === 0 ? (
            <Pregame game={g} />
          ) : (
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
          )}
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

function Header({ s, navTab, back }: { s: GameSummary; navTab: string; back: string }) {
  const g = s.game
  const proj = g.state === 'pre' ? projection(g) : null
  const upset = isUpset(g)

  const meta = [
    g.note,
    s.venue,
    g.tv && `TV: ${g.tv}`,
    g.oddsDetails && `Line: ${g.oddsDetails}${g.overUnder != null ? ` · O/U ${g.overUnder}` : ''}`,
    s.attendance && `Attendance: ${s.attendance.toLocaleString()}`,
  ].filter(Boolean)

  const teamCol = (t: TeamSide) => (
    <Link to={`/${navTab}/team/${t.id}`} state={{ back }} className="gh-team">
      <TeamLogo id={t.id} size={52} />
      <span className="gh-name">
        <Rank rank={t.rank} />
        {t.name}
      </span>
      <span className="gh-record">{t.record}</span>
    </Link>
  )

  const score = (t: TeamSide, projected?: number) =>
    g.state === 'pre' ? (
      <span className="gh-score proj">{projected ?? ''}</span>
    ) : (
      <span className={`gh-score ${g.state === 'final' && !t.winner ? 'lost' : ''}`}>{t.score}</span>
    )

  return (
    <section className="card game-header">
      <div className="gh-top">
        {teamCol(g.away)}
        {score(g.away, proj?.away)}
        <div className={`gh-status ${g.state}`}>
          {g.state === 'pre' && <span>{monthDay(g.date)}</span>}
          <span className="gh-state">{statusText(g)}</span>
          {proj && <span className="gh-proj-label">Projected</span>}
          {upset && <UpsetBadge live={g.state === 'live'} />}
        </div>
        {score(g.home, proj?.home)}
        {teamCol(g.home)}
      </div>

      {g.state !== 'pre' && <LineScore g={g} />}

      {meta.length > 0 && (
        <div className="gh-meta">
          {meta.map((m) => (
            <div key={m as string}>{m}</div>
          ))}
        </div>
      )}
    </section>
  )
}

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

function Pregame({ game }: { game: Game }) {
  return (
    <section className="card pregame">
      <Basketball className="pregame-icon" />
      <div className="pregame-title">{game.timeValid ? `Tip-off at ${statusText(game)}` : 'Tip-off time TBD'}</div>
      <div className="pregame-text">The box score and plays appear once the game starts.</div>
    </section>
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

function BoxTable({ box }: { box: BoxTeam }) {
  const hasStarters = box.players.some((p) => p.starter)
  const starters = hasStarters ? box.players.filter((p) => p.starter) : box.players
  const bench = hasStarters ? box.players.filter((p) => !p.starter) : []
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
          <span className="box-name">{p.name}</span>
          <span className="box-pos">{p.position}</span>
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
              <tr className="box-totals">
                <th scope="row">Team</th>
                {box.totals.map((v, i) => (
                  <td key={i}>{v}</td>
                ))}
              </tr>
            )}
          </tbody>
        </table>
      </div>
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
