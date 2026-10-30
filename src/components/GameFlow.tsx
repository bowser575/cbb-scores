import { useId, useMemo, useState, type CSSProperties, type PointerEvent } from 'react'
import { secondsLeft, type Game, type Play } from '../lib/espn'
import { formatChance, liveHomeChance } from '../lib/torvik'
import { Segmented, TeamLogo } from './ui'

/* Game flow and win probability charts, drawn from play-by-play. */

const W = 600
const H = 180
const REGULATION = 2400

interface Point {
  t: number
  away: number
  home: number
  /** The away team's win chance at this point, when there's a pregame chance to start from. */
  chance: number | null
}

/** Seconds left in regulation, or in the overtime under way, after `t` seconds played. */
function leftAfter(t: number): number {
  if (t < REGULATION) return REGULATION - t
  const into = (t - REGULATION) % 300
  return into === 0 ? 0 : 300 - into
}

/** The away team's live chance: from the header clock while live, else after the last play. */
export function awayChanceNow(game: Game, plays: Play[], pregameHome: number | null): number | null {
  if (pregameHome == null) return null
  const a = Number.parseInt(game.away.score)
  const h = Number.parseInt(game.home.score)
  if (game.state === 'pre' || !Number.isFinite(a) || !Number.isFinite(h)) return 1 - pregameHome
  if (game.state === 'final') return a > h ? 1 : a < h ? 0 : 0.5
  let left: number | null = game.clock != null && game.period > 0 ? secondsLeft(game.period, game.clock) : null
  if (left == null) {
    const last = [...plays].reverse().find((p) => p.elapsed != null)
    left = last?.elapsed != null ? leftAfter(last.elapsed) : REGULATION
  }
  return 1 - liveHomeChance(pregameHome, h - a, left)
}

const clockLabel = (t: number) => {
  const ot = t > REGULATION ? Math.ceil((t - REGULATION) / 300) : 0
  const half = t < 1200 ? '1st' : ot === 0 ? '2nd' : ot === 1 ? 'OT' : `${ot}OT`
  const left = ot ? REGULATION + ot * 300 - t : t < 1200 ? 1200 - t : REGULATION - t
  return `${half} ${Math.floor(left / 60)}:${String(Math.round(left % 60)).padStart(2, '0')}`
}

export function GameFlow({ game, plays, pregameHome }: { game: Game; plays: Play[]; pregameHome: number | null }) {
  const [mode, setMode] = useState<'margin' | 'chance'>('margin')
  const [hover, setHover] = useState<number | null>(null)
  const clip = useId().replace(/:/g, '')

  const points = useMemo(() => {
    const out: Point[] = [{ t: 0, away: 0, home: 0, chance: pregameHome == null ? null : 1 - pregameHome }]
    for (const p of plays) {
      if (p.elapsed == null || p.elapsed < out[out.length - 1].t) continue
      const chance = pregameHome == null ? null : 1 - liveHomeChance(pregameHome, p.homeScore - p.awayScore, leftAfter(p.elapsed))
      out.push({ t: p.elapsed, away: p.awayScore, home: p.homeScore, chance })
    }
    return out
  }, [plays, pregameHome])

  if (points.length < 3) return null
  const showChance = mode === 'chance' && pregameHome != null
  const last = points[points.length - 1].t
  const end = last <= REGULATION ? REGULATION : REGULATION + Math.ceil((last - REGULATION) / 300) * 300
  const maxLead = Math.max(10, ...points.map((p) => Math.abs(p.away - p.home)))
  const x = (t: number) => (t / end) * W
  const value = (p: Point) => (showChance ? (p.chance ?? 0.5) : p.away - p.home)
  // Away leads (or away chance above 50%) are drawn above the middle line.
  const y = (v: number) => (showChance ? H - v * H : H / 2 - (v / maxLead) * (H / 2 - 4))
  const mid = H / 2

  // A step line: scores change at a play and hold until the next one.
  let line = `M${x(0)},${y(value(points[0]))}`
  for (let i = 1; i < points.length; i++) line += `H${x(points[i].t)}V${y(value(points[i]))}`
  if (game.state === 'final') line += `H${x(last)}`
  const area = `${line}H${x(last)}V${mid}H0Z`

  const nearest = hover == null ? null : points.reduce((best, p) => (Math.abs(p.t - hover) < Math.abs(best.t - hover) ? p : best))
  const onMove = (e: PointerEvent<HTMLDivElement>) => {
    const box = e.currentTarget.getBoundingClientRect()
    setHover(Math.max(0, Math.min(1, (e.clientX - box.left) / box.width)) * end)
  }

  const biggest = (side: 'away' | 'home') => Math.max(0, ...points.map((p) => (side === 'away' ? p.away - p.home : p.home - p.away)))
  const leadChanges = points.reduce(
    (acc, p) => {
      const sign = Math.sign(p.away - p.home)
      if (sign !== 0) {
        if (acc.last !== 0 && sign !== acc.last) acc.changes++
        acc.last = sign
      }
      return acc
    },
    { last: 0, changes: 0 },
  ).changes

  const style = { '--away': `#${game.away.color}`, '--home': `#${game.home.color}` } as CSSProperties
  return (
    <section className="card flow" style={style}>
      <div className="flow-head">
        <span>Game Flow</span>
        {pregameHome != null && (
          <Segmented
            label="Chart"
            options={[
              { value: 'margin', label: 'Margin' },
              { value: 'chance', label: 'Win %' },
            ]}
            value={mode}
            onChange={setMode}
          />
        )}
      </div>
      <div className="flow-chart" onPointerMove={onMove} onPointerLeave={() => setHover(null)}>
        <span className="flow-team top">
          <TeamLogo id={game.away.id} size={18} />
          {game.away.abbr}
        </span>
        <span className="flow-team bottom">
          <TeamLogo id={game.home.id} size={18} />
          {game.home.abbr}
        </span>
        <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" role="img" aria-label={showChance ? 'Win probability over time' : 'Score margin over time'}>
          <defs>
            <clipPath id={`${clip}-top`}>
              <rect x="0" y="0" width={W} height={mid} />
            </clipPath>
            <clipPath id={`${clip}-bottom`}>
              <rect x="0" y={mid} width={W} height={mid} />
            </clipPath>
          </defs>
          <line className="flow-half" x1={x(1200)} x2={x(1200)} y1="0" y2={H} />
          {end > REGULATION && <line className="flow-half" x1={x(REGULATION)} x2={x(REGULATION)} y1="0" y2={H} />}
          <line className="flow-mid" x1="0" x2={W} y1={mid} y2={mid} />
          <path className="flow-area away" d={area} clipPath={`url(#${clip}-top)`} />
          <path className="flow-area home" d={area} clipPath={`url(#${clip}-bottom)`} />
          <path className="flow-line" d={line} />
        </svg>
        {nearest && (
          <>
            <span className="flow-cursor" style={{ left: `${(nearest.t / end) * 100}%` }} />
            <span className={`flow-tip ${nearest.t / end > 0.6 ? 'flip' : ''}`} style={{ left: `${(nearest.t / end) * 100}%` }}>
              <b className="num">
                {game.away.abbr} {nearest.away}–{nearest.home} {game.home.abbr}
              </b>
              <span>
                {nearest.t === 0 ? 'Tip-off' : clockLabel(nearest.t)}
                {nearest.chance != null && ` · ${game.away.abbr} ${formatChance(nearest.chance)}`}
              </span>
            </span>
          </>
        )}
      </div>
      <div className="flow-axis">
        <span>1st half</span>
        <span>2nd half</span>
        {end > REGULATION && <span>OT</span>}
      </div>
      <div className="flow-stats">
        <span>
          Largest lead: {game.away.abbr} {biggest('away')} · {game.home.abbr} {biggest('home')}
        </span>
        <span>{leadChanges} lead change{leadChanges === 1 ? '' : 's'}</span>
      </div>
    </section>
  )
}

/** Each team's chance as a split bar, before tip-off and while live. */
export function WinChance({ game, awayChance, source }: { game: Game; awayChance: number; source: 'torvik' | 'line' }) {
  const away = formatChance(awayChance)
  const home = formatChance(1 - awayChance)
  const style = { '--away': `#${game.away.color}`, '--home': `#${game.home.color}`, '--split': `${awayChance * 100}%` } as CSSProperties
  const note =
    game.state === 'live'
      ? `Live estimate from ${source === 'torvik' ? "Torvik's pregame odds" : 'the pregame line'}, the score and time left`
      : source === 'torvik'
        ? 'Torvik pregame prediction'
        : 'Implied by the betting line'
  return (
    <section className="card win-chance" style={style}>
      <div className="wc-head">
        <span>Win Probability</span>
        {game.state === 'live' && <span className="wc-live">Live</span>}
      </div>
      <div className="wc-teams">
        <span className="wc-team">
          <TeamLogo id={game.away.id} size={22} />
          {game.away.abbr} <b className="num">{away}</b>
        </span>
        <span className="wc-team end">
          <b className="num">{home}</b> {game.home.abbr}
          <TeamLogo id={game.home.id} size={22} />
        </span>
      </div>
      <div className="wc-bar" role="img" aria-label={`${game.away.name} ${away}, ${game.home.name} ${home}`}>
        <span className="wc-away" />
        <span className="wc-home" />
      </div>
      <p className="wc-note">{note}</p>
    </section>
  )
}
