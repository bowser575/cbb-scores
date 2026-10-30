import { useState } from 'react'
import { ChevronUpDown, WifiSlash } from '../components/icons'
import { Page } from '../components/Page'
import { Empty, Menu, Row, Section, Spinner, TeamLogo } from '../components/ui'
import { standings, type ConferenceStandings } from '../lib/espn'
import { Season } from '../lib/format'
import { useFavorites, useResource, useStored } from '../lib/hooks'

/** The ACC, when nothing else picks a conference. */
const DEFAULT_CONFERENCE = '2'

export function StandingsPage() {
  const [season, setSeason] = useState(Season.current)
  const [stored, setConference] = useStored<string | null>('standings-conference', null)
  const favorites = useFavorites()
  const { data, error, reload } = useResource(`standings|${season}`, () => standings(season))

  // Until a conference is picked, show the first starred team's.
  const starredConference = data?.find((c) => c.teams.some((t) => favorites.ids.includes(t.teamId)))?.id
  const conferenceId = stored ?? starredConference ?? DEFAULT_CONFERENCE
  const conference = data?.find((c) => c.id === conferenceId) ?? data?.[0]
  const items = [...(data ?? [])].sort((a, b) => a.short.localeCompare(b.short)).map((c) => ({ value: c.id, label: c.short }))

  return (
    <Page
      title={conference?.short ?? 'Standings'}
      subtitle={Season.label(season)}
      large
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
          {items.length > 0 && (
            <Menu items={items} value={conference?.id ?? conferenceId} onChange={setConference} label="Conference" className="glass glass-pill">
              {conference?.short ?? 'Conference'}
              <ChevronUpDown className="updown" />
            </Menu>
          )}
        </>
      }
    >
      {conference ? (
        <Table conference={conference} starred={favorites.ids} />
      ) : error ? (
        <Empty icon={<WifiSlash />} title="Couldn't Load Standings" message="Check your connection and try again." action={{ label: 'Retry', onClick: reload }} />
      ) : data ? (
        <Empty title="No Standings" message={`No standings for ${Season.label(season)}.`} />
      ) : (
        <Spinner block />
      )}
    </Page>
  )
}

function Table({ conference, starred }: { conference: ConferenceStandings; starred: string[] }) {
  return (
    <>
      <Section plain header={conference.name}>
        <div className="row standings-row standings-head" aria-hidden>
          <span className="rank-number">#</span>
          <span className="standings-team">Team</span>
          <span className="standings-num">Conf</span>
          <span className="standings-num gb">GB</span>
          <span className="standings-num">Ovr</span>
          <span className="standings-num standings-wide">Home</span>
          <span className="standings-num standings-wide">Away</span>
          <span className="standings-num streak">Strk</span>
        </div>
        {conference.teams.map((t, i) => (
          <Row key={t.teamId} to={`/standings/team/${t.teamId}`} state={{ back: conference.short }} className={`standings-row ${starred.includes(t.teamId) ? 'starred' : ''}`}>
            <span className="rank-number">{i + 1}</span>
            <TeamLogo id={t.teamId} size={22} />
            <span className="standings-team title">{t.name}</span>
            <span className="standings-num strong">{t.conference || '0-0'}</span>
            <span className="standings-num gb">{t.gamesBehind === '0' || !t.gamesBehind ? '–' : t.gamesBehind}</span>
            <span className="standings-num">{t.overall || '0-0'}</span>
            <span className="standings-num standings-wide">{t.home}</span>
            <span className="standings-num standings-wide">{t.road}</span>
            <span className={`standings-num streak ${t.streak.startsWith('W') ? 'win' : t.streak.startsWith('L') ? 'loss' : ''}`}>{t.streak || '–'}</span>
          </Row>
        ))}
      </Section>
      <p className="torvik-credit">GB is games behind the conference leader. Standings from ESPN.</p>
    </>
  )
}
