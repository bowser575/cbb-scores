import { WifiSlash } from '../components/icons'
import { Page } from '../components/Page'
import { Empty, Row, Section, Segmented, Spinner, TeamLogo } from '../components/ui'
import { polls, type RankedTeam } from '../lib/espn'
import { longDate } from '../lib/format'
import { useResource, useStored } from '../lib/hooks'

export function RankingsPage() {
  const [pollType, setPollType] = useStored('poll', 'ap')
  const { data, error, reload } = useResource('polls', polls)
  const poll = data?.find((p) => p.type === pollType) ?? data?.[0]

  return (
    <Page title="Rankings" large>
      <div className="controls">
        <Segmented
          label="Poll"
          options={[
            { value: 'ap', label: 'AP Top 25' },
            { value: 'usa', label: 'Coaches Poll' },
          ]}
          value={pollType}
          onChange={setPollType}
        />
      </div>

      {poll ? (
        <>
          <Section footer={poll.date && `Updated ${longDate(poll.date)}`}>
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

function RankRow({ team }: { team: RankedTeam }) {
  const sub = team.firstPlaceVotes > 0 ? `${team.record} · ${team.firstPlaceVotes} first-place` : team.record
  return (
    <Row to={`/rankings/team/${team.teamId}`} state={{ back: 'Rankings' }} inset={96}>
      <span className="rank-number">{team.rank}</span>
      <TeamLogo id={team.teamId} size={30} />
      <span className="stack">
        <span className="title">{team.name}</span>
        <span className="subtitle">{sub}</span>
      </span>
      <Trend team={team} />
    </Row>
  )
}

function Trend({ team }: { team: RankedTeam }) {
  if (team.isNew) return <span className="trend new">NEW</span>
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
