import { useDeferredValue, useMemo, useState } from 'react'
import { ClearCircle, Search, Star } from '../components/icons'
import { Page } from '../components/Page'
import { Empty, Row, Section, TeamLogo } from '../components/ui'
import { splitName, teams, type TeamInfo } from '../lib/directory'
import { useFavorites } from '../lib/hooks'

// Survives leaving the screen, so coming back from a team keeps the search.
let lastQuery = ''

export function TeamsPage() {
  const [query, setQueryState] = useState(lastQuery)
  const setQuery = (q: string) => setQueryState((lastQuery = q))
  const [focused, setFocused] = useState(false)
  const deferred = useDeferredValue(query)
  const favorites = useFavorites()

  const term = deferred.trim().toLowerCase()
  const matches = useMemo(
    () => (term ? teams.filter((t) => `${t.full} ${t.abbr}`.toLowerCase().includes(term)) : teams),
    [term],
  )
  const mine = teams.filter((t) => favorites.has(t.id))

  return (
    <Page title="Teams" large>
      <div className={`search ${focused || query ? 'active' : ''}`}>
        <Search className="search-icon" />
        <input
          type="search"
          placeholder="Search teams"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
          enterKeyHint="search"
          aria-label="Search teams"
        />
        {query && (
          <button className="search-clear" onClick={() => setQuery('')} aria-label="Clear search">
            <ClearCircle />
          </button>
        )}
      </div>

      {!term &&
        (mine.length ? (
          <Section header="My Teams">
            {mine.map((t) => (
              <TeamRow key={t.id} team={t} starred />
            ))}
          </Section>
        ) : (
          <Section>
            <div className="row hint">
              <Star className="hint-icon" />
              <span>Open a team and tap the star to pin its games to the top of Scores.</span>
            </div>
          </Section>
        ))}

      {matches.length ? (
        <Section header={term ? undefined : 'All Teams'}>
          {matches.map((t) => (
            <TeamRow key={t.id} team={t} starred={favorites.has(t.id)} />
          ))}
        </Section>
      ) : (
        <Empty icon={<Search />} title={`No Results for “${query.trim()}”`} message="Check the spelling or try a new search." />
      )}
    </Page>
  )
}

function TeamRow({ team, starred }: { team: TeamInfo; starred: boolean }) {
  const { school, mascot } = splitName(team)
  return (
    <Row to={`/teams/team/${team.id}`} state={{ back: 'Teams' }} inset={58}>
      <TeamLogo id={team.id} size={30} />
      <span className="team-line">
        <span className="title">{school}</span>
        <span className="secondary">{mascot}</span>
      </span>
      {starred && <Star filled className="star-mark" />}
    </Row>
  )
}
