import { useState, type CSSProperties } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Calendar, ChevronRight, ChevronUpDown, People, Star, WifiSlash } from '../components/icons'
import { BackButton, Page } from '../components/Page'
import { Empty, GlassButton, Menu, Rank, Section, Segmented, Spinner, TeamLogo } from '../components/ui'
import { splitName, teamsById } from '../lib/directory'
import { roster, schedule, statusText, type Game, type Roster, type TeamSchedule } from '../lib/espn'
import { monthDay, Season } from '../lib/format'
import { useFavorites, useResource } from '../lib/hooks'
import { formatChance, predictionFor, torvikPredictions, type TorvikFeed } from '../lib/torvik'

type Tab = 'schedule' | 'roster'

export function TeamPage() {
  const { id = '', tab: navTab = 'teams' } = useParams()
  const info = teamsById.get(id)
  const favorites = useFavorites()
  const [tab, setTab] = useState<Tab>('schedule')
  const [season, setSeason] = useState(Season.current)
  const starred = favorites.has(id)

  const sched = useResource(`schedule|${id}|${season}`, () => schedule(id, season))
  const ros = useResource(tab === 'roster' ? `roster|${id}|${season}` : null, () => roster(id, season))
  const { data: feed } = useResource('torvik', torvikPredictions)
  const torvik = feed && (feed.season == null || feed.season === season) ? feed : undefined

  const title = info?.name ?? 'Team'
  const names = info ? splitName(info) : null
  const subtitle = [names?.mascot, teamSubtitle(sched.data, id)].filter(Boolean).join(' · ')

  return (
    <Page
      title={title}
      leading={<BackButton />}
      trailing={
        <>
          <Menu
            items={Season.all.map((y) => ({ value: y, label: Season.label(y) }))}
            value={season}
            onChange={setSeason}
            label="Season"
            className="glass glass-pill"
          >
            {Season.label(season)}
            <ChevronUpDown className="updown" />
          </Menu>
          <GlassButton
            label={starred ? 'Remove from My Teams' : 'Add to My Teams'}
            onClick={() => favorites.toggle(id)}
            pressed={starred}
            className="star-button"
          >
            <Star filled={starred} />
          </GlassButton>
        </>
      }
    >
      <section className="card team-header">
        <TeamLogo id={id} size={72} />
        <div className="team-name">{names?.school ?? title}</div>
        <div className="team-sub">{subtitle}</div>
      </section>

      <TorvikOutlook schedule={sched.data} teamId={id} feed={torvik} />

      <div className="controls">
        <Segmented
          label="View"
          options={[
            { value: 'schedule', label: 'Schedule' },
            { value: 'roster', label: 'Roster' },
          ]}
          value={tab}
          onChange={setTab}
        />
      </div>

      {tab === 'schedule' ? (
        <ScheduleList result={sched} teamId={id} season={season} navTab={navTab} back={title} feed={torvik} />
      ) : (
        <RosterList key={`${id}|${season}`} result={ros} season={season} />
      )}
    </Page>
  )
}

function teamSubtitle(s: TeamSchedule | undefined, teamId: string): string | null {
  if (!s) return null
  let record = s.record
  if (!record) {
    const finals = s.games.filter((g) => g.state === 'final')
    const wins = finals.filter((g) => (g.home.id === teamId ? g.home : g.away).winner).length
    if (finals.length) record = `${wins}-${finals.length - wins}`
  }
  const parts = [record, s.standing].filter(Boolean)
  return parts.length ? parts.join(' · ') : null
}

/** The team's chance in a game, from Torvik's feed. */
function chanceIn(game: Game, teamId: string, feed?: TorvikFeed) {
  const prediction = predictionFor(game, feed)
  if (!prediction) return null
  const me = prediction.teams[teamId]
  const opp = prediction.teams[game.home.id === teamId ? game.away.id : game.home.id]
  return me && opp ? { chance: me.winProbability, score: Math.round(me.score), oppScore: Math.round(opp.score) } : null
}

/** T-Rank ratings and a projected final record: wins so far plus Torvik's win chance in every game left. */
function TorvikOutlook({ schedule: s, teamId, feed }: { schedule?: TeamSchedule; teamId: string; feed?: TorvikFeed }) {
  const rating = feed?.ratings?.[teamId]
  if (!feed || !s) return null
  let wins = 0
  let losses = 0
  let projected = 0
  let left = 0
  let unknown = 0
  for (const g of s.games) {
    const me = g.home.id === teamId ? g.home : g.away
    if (g.state === 'final') {
      if (me.winner) wins++
      else losses++
      continue
    }
    const c = chanceIn(g, teamId, feed)
    if (!c) {
      unknown++
      continue
    }
    projected += c.chance
    left++
  }
  if (!rating && !left) return null
  const projWins = Math.round(wins + projected)
  const projLosses = wins + losses + left - projWins

  return (
    <section className="card torvik-outlook">
      {left > 0 && (
        <div className="outlook-stat">
          <span className="outlook-value num">{projWins}–{projLosses}</span>
          <span className="outlook-label">Projected record</span>
        </div>
      )}
      {rating && (
        <>
          <div className="outlook-stat">
            <span className="outlook-value num">#{rating.rank}</span>
            <span className="outlook-label">T-Rank</span>
          </div>
          <div className="outlook-stat">
            <span className="outlook-value num">{rating.adjOE.toFixed(1)}</span>
            <span className="outlook-label">Adj. offense · #{rating.adjOERank}</span>
          </div>
          <div className="outlook-stat">
            <span className="outlook-value num">{rating.adjDE.toFixed(1)}</span>
            <span className="outlook-label">Adj. defense · #{rating.adjDERank}</span>
          </div>
          <div className="outlook-stat">
            <span className="outlook-value num">{rating.tempo.toFixed(1)}</span>
            <span className="outlook-label">Tempo</span>
          </div>
        </>
      )}
      <p className="outlook-note">
        {left > 0 && `${wins}–${losses} so far, plus Torvik's win chance in ${left} game${left === 1 ? '' : 's'} left`}
        {left > 0 && unknown > 0 && ` (${unknown} without a prediction not counted)`}
        {left > 0 && '. '}
        Data from <a href="https://barttorvik.com/" target="_blank" rel="noreferrer">Bart Torvik</a>.
      </p>
    </section>
  )
}

type Res<T> = { data: T | undefined; error: boolean; reload: () => void }

function ScheduleList({ result, teamId, season, navTab, back, feed }: { result: Res<TeamSchedule>; teamId: string; season: number; navTab: string; back: string; feed?: TorvikFeed }) {
  if (result.error) return <LoadError reload={result.reload} />
  if (!result.data) return <Spinner block />
  if (!result.data.games.length) return <Empty icon={<Calendar />} title="No Games" message={`No schedule for ${Season.label(season)}.`} />
  return (
    <Section>
      {result.data.games.map((g) => (
        <ScheduleRow key={g.id} game={g} teamId={teamId} to={`/${navTab}/game/${g.id}`} back={back} feed={feed} />
      ))}
    </Section>
  )
}

function ScheduleRow({ game, teamId, to, back, feed }: { game: Game; teamId: string; to: string; back: string; feed?: TorvikFeed }) {
  const me = game.home.id === teamId ? game.home : game.away
  const opp = game.home.id === teamId ? game.away : game.home
  const where = me.isHome || game.neutral ? 'vs' : '@'
  const proj = game.state === 'pre' ? chanceIn(game, teamId, feed) : null

  return (
    <Link to={to} state={{ back }} className="row row-link sched-row">
      <span className="sched-date">{monthDay(game.date)}</span>
      <TeamLogo id={opp.id} size={24} />
      <span className="sched-where">{where}</span>
      <Rank rank={opp.rank} />
      <span className="sched-opp">{opp.name}</span>
      {game.state === 'final' ? (
        <span className="sched-result">
          <b className={me.winner ? 'win' : 'loss'}>{me.winner ? 'W' : 'L'}</b>
          <span className="num">
            {me.score}–{opp.score}
          </span>
        </span>
      ) : game.state === 'live' ? (
        <span className="sched-result live num">
          {me.score}–{opp.score}
        </span>
      ) : (
        <span className="sched-upcoming">
          <span>{statusText(game)}</span>
          {game.tv && <span className="sched-tv">{game.tv}</span>}
          {proj && (
            <span className={`sched-proj ${proj.chance >= 0.5 ? 'fav' : ''}`} title="Torvik projected score and win chance">
              {proj.score}–{proj.oppScore} · {formatChance(proj.chance)}
            </span>
          )}
        </span>
      )}
      <ChevronRight className="chevron" />
    </Link>
  )
}

const POSITION_ORDER = ['Guard', 'Forward', 'Center']

function RosterList({ result, season }: { result: Res<Roster>; season: number }) {
  if (result.error) return <LoadError reload={result.reload} />
  if (!result.data) return <Spinner block />
  const { coach, players } = result.data
  if (!players.length) return <Empty icon={<People />} title="No Roster" message={`No roster for ${Season.label(season)}.`} />

  const positions = [...new Set(players.map((p) => p.position))].sort((a, b) => {
    const ia = POSITION_ORDER.indexOf(a)
    const ib = POSITION_ORDER.indexOf(b)
    return (ia < 0 ? 9 : ia) - (ib < 0 ? 9 : ib) || a.localeCompare(b)
  })

  return (
    <>
      {coach && (
        <Section>
          <div className="row labeled">
            <span>Head Coach</span>
            <span className="secondary">{coach}</span>
          </div>
        </Section>
      )}
      {positions.map((pos) => (
        <Section key={pos} header={`${pos}s`}>
          {players
            .filter((p) => p.position === pos)
            .map((p) => (
              <div key={p.id} className="row roster-row" style={{ '--sep-inset': '62px' } as CSSProperties}>
                <span className="jersey num">{p.jersey && `#${p.jersey}`}</span>
                <span className="title">{p.name}</span>
                <span className="secondary">{[p.height, p.year].filter(Boolean).join(' · ')}</span>
              </div>
            ))}
        </Section>
      ))}
    </>
  )
}

function LoadError({ reload }: { reload: () => void }) {
  return <Empty icon={<WifiSlash />} title="Couldn't Load" message="Check your connection and try again." action={{ label: 'Retry', onClick: reload }} />
}
