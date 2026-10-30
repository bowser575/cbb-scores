import { ChevronUpDown, WifiSlash } from '../components/icons'
import { Page } from '../components/Page'
import { Empty, Menu, Row, Section, Spinner, TeamLogo } from '../components/ui'
import { teamsById } from '../lib/directory'
import { polls, type Poll, type RankedTeam } from '../lib/espn'
import { longDate } from '../lib/format'
import { useResource, useStored } from '../lib/hooks'
import { torvikPredictions, type Rating, type TorvikFeed } from '../lib/torvik'

const POLLS = [
  { value: 'ap', label: 'AP Top 25' },
  { value: 'usa', label: 'Coaches Poll' },
  { value: 'trank', label: 'T-Rank' },
]

export function RankingsPage() {
  const [pollType, setPollType] = useStored('poll', 'ap')
  const { data, error, reload } = useResource('polls', polls)
  const trank = pollType === 'trank'
  const torvik = useResource(trank ? 'torvik' : null, torvikPredictions)
  const poll = trank ? undefined : (data?.find((p) => p.type === pollType) ?? data?.[0])
  const label = POLLS.find((p) => p.value === pollType)?.label ?? 'AP Top 25'
  const updated = trank ? (torvik.data ? new Date(torvik.data.updatedAt) : null) : (poll?.date ?? null)

  return (
    <Page
      title={label}
      subtitle={updated ? `Updated ${longDate(updated)}` : ' '}
      large
      trailing={
        <Menu items={POLLS} value={pollType} onChange={setPollType} label="Poll" className="glass glass-pill">
          {pollType === 'ap' ? 'AP' : trank ? 'T-Rank' : 'Coaches'}
          <ChevronUpDown className="updown" />
        </Menu>
      }
    >
      {trank ? (
        torvik.data?.ratings && Object.keys(torvik.data.ratings).length ? (
          <TRank feed={torvik.data} ap={data?.find((p) => p.type === 'ap')} />
        ) : torvik.error ? (
          <Empty icon={<WifiSlash />} title="Couldn't Load T-Rank" message="Check your connection and try again." action={{ label: 'Retry', onClick: torvik.reload }} />
        ) : torvik.data ? (
          <Empty title="No T-Rank Yet" message="Torvik's ratings haven't been published for this season." />
        ) : (
          <Spinner block />
        )
      ) : poll ? (
        <>
          <Section plain>
            {poll.ranks.map((t) => (
              <RankRow key={t.teamId} team={t} />
            ))}
          </Section>
          {poll.others.length > 0 && (
            <Section header="Others Receiving Votes">
              <div className="row others">{poll.others.map((o) => `${o.name} ${o.points}`).join(', ')}</div>
            </Section>
          )}
        </>
      ) : error ? (
        <Empty icon={<WifiSlash />} title="Couldn't Load Rankings" message="Check your connection and try again." action={{ label: 'Retry', onClick: reload }} />
      ) : data ? (
        <Empty title="No Rankings" message="Polls haven't been released yet." />
      ) : (
        <Spinner block />
      )}
    </Page>
  )
}

/* ---------- T-Rank ---------- */

type Sort = 'rank' | 'offense' | 'defense' | 'tempo' | 'overrated' | 'underrated'

const SORTS: { value: Sort; label: string }[] = [
  { value: 'rank', label: 'T-Rank' },
  { value: 'offense', label: 'Adj. Offense' },
  { value: 'defense', label: 'Adj. Defense' },
  { value: 'tempo', label: 'Tempo' },
  { value: 'overrated', label: 'Overrated by AP' },
  { value: 'underrated', label: 'Underrated by AP' },
]

/** Teams outside the Top 25 and the votes count as this AP spot when measuring the gap. */
const UNRANKED = 50

interface Entry {
  id: string
  rating: Rating
  /** AP rank, or the order among others receiving votes counted from 26. */
  ap: number | null
  /** T-Rank minus AP spot: positive when the poll has the team higher than Torvik does. */
  gap: number
}

function TRank({ feed, ap }: { feed: TorvikFeed; ap?: Poll }) {
  const [sort, setSort] = useStored<Sort>('trank-sort', 'rank')
  const apRanks = new Map<string, number>()
  ap?.ranks.forEach((t) => apRanks.set(t.teamId, t.rank))
  ap?.others.forEach((o, i) => o.teamId && apRanks.set(o.teamId, 26 + i))

  let entries: Entry[] = Object.entries(feed.ratings ?? {}).map(([id, rating]) => {
    const rank = apRanks.get(id) ?? null
    return { id, rating, ap: rank, gap: rating.rank - (rank ?? UNRANKED) }
  })
  if (sort === 'overrated') entries = entries.filter((e) => e.ap != null && e.ap <= 25 && e.gap > 0).sort((a, b) => b.gap - a.gap)
  else if (sort === 'underrated') entries = entries.filter((e) => e.rating.rank <= 25 && e.gap < 0).sort((a, b) => a.gap - b.gap)
  else if (sort === 'offense') entries.sort((a, b) => b.rating.adjOE - a.rating.adjOE)
  else if (sort === 'defense') entries.sort((a, b) => a.rating.adjDE - b.rating.adjDE)
  else if (sort === 'tempo') entries.sort((a, b) => b.rating.tempo - a.rating.tempo)
  else entries.sort((a, b) => a.rating.rank - b.rating.rank)
  const gapView = sort === 'overrated' || sort === 'underrated'

  return (
    <>
      <div className="controls trank-controls">
        <Menu items={SORTS} value={sort} onChange={setSort} label="Sort" className="glass glass-pill">
          {SORTS.find((s) => s.value === sort)?.label}
          <ChevronUpDown className="updown" />
        </Menu>
        <span className="trank-hint">
          {sort === 'overrated'
            ? 'AP Top 25 teams T-Rank has lower'
            : sort === 'underrated'
              ? 'T-Rank Top 25 teams the AP has lower'
              : 'Points per 100 possessions vs. average D-I'}
        </span>
      </div>
      {entries.length ? (
        <Section plain>
          <div className="row trank-row trank-head" aria-hidden>
            <span className="rank-number">#</span>
            <span className="trank-team">Team</span>
            <span className="trank-num">AdjO</span>
            <span className="trank-num">AdjD</span>
            <span className="trank-num trank-tempo">Tempo</span>
            <span className="trank-num">AP</span>
          </div>
          {entries.map((e) => (
            <TRankRow key={e.id} entry={e} gapView={gapView} />
          ))}
        </Section>
      ) : (
        <Empty title="No Gaps" message={ap ? 'The AP poll and T-Rank agree on every team here.' : 'The AP poll hasn’t loaded.'} />
      )}
      <p className="torvik-credit">
        Ratings by <a href="https://barttorvik.com/trank.php" target="_blank" rel="noreferrer">Bart Torvik</a>, fetched{' '}
        {new Date(feed.updatedAt).toLocaleString()}.
      </p>
    </>
  )
}

function TRankRow({ entry: { id, rating, ap, gap }, gapView }: { entry: Entry; gapView: boolean }) {
  return (
    <Row to={`/rankings/team/${id}`} state={{ back: 'T-Rank' }} className="trank-row">
      <span className="rank-number">{rating.rank}</span>
      <TeamLogo id={id} size={28} />
      <span className="trank-team title">{teamsById.get(id)?.name ?? id}</span>
      <span className="trank-num">
        {rating.adjOE.toFixed(1)}
        <small>{rating.adjOERank}</small>
      </span>
      <span className="trank-num">
        {rating.adjDE.toFixed(1)}
        <small>{rating.adjDERank}</small>
      </span>
      <span className="trank-num trank-tempo">{rating.tempo.toFixed(1)}</span>
      <span className="trank-num">
        {ap != null && ap <= 25 ? ap : <span className="trank-nr">{ap != null ? 'RV' : 'NR'}</span>}
        {gapView && <small className={gap > 0 ? 'over' : 'under'}>{gap > 0 ? `+${gap}` : gap}</small>}
      </span>
    </Row>
  )
}

/* ---------- polls ---------- */

function RankRow({ team }: { team: RankedTeam }) {
  const sub = team.firstPlaceVotes > 0 ? `${team.record} · ${team.firstPlaceVotes} first-place` : team.record
  return (
    <Row to={`/rankings/team/${team.teamId}`} state={{ back: 'Rankings' }} inset={98}>
      <span className="rank-number">{team.rank}</span>
      <TeamLogo id={team.teamId} size={32} />
      <span className="stack">
        <span className="title">{team.name}</span>
        <span className="subtitle">{sub}</span>
      </span>
      <Trend team={team} />
    </Row>
  )
}

function Trend({ team }: { team: RankedTeam }) {
  if (team.isNew) return <span className="trend new">New</span>
  if (team.trend > 0)
    return (
      <span className="trend up">
        <TrendArrow up />
        {team.trend}
      </span>
    )
  if (team.trend < 0)
    return (
      <span className="trend down">
        <TrendArrow />
        {-team.trend}
      </span>
    )
  return <span className="trend flat">–</span>
}

const TrendArrow = ({ up }: { up?: boolean }) => (
  <svg viewBox="0 0 10 8" aria-label={up ? 'Up' : 'Down'}>
    <path d={up ? 'M5 0.5 9.5 7.5H.5Z' : 'M5 7.5 9.5.5H.5Z'} fill="currentColor" />
  </svg>
)
