import { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ClearCircle, Search, Star } from '../components/icons'
import { Page } from '../components/Page'
import { Empty, Row, Section, TeamLogo } from '../components/ui'
import { splitName, teams, type TeamInfo } from '../lib/directory'
import { useFavorites } from '../lib/hooks'

/** Starred teams. Their games are pinned to the top of Scores. */
export function TeamsPage() {
  const favorites = useFavorites()
  const navigate = useNavigate()
  const mine = teams.filter((t) => favorites.has(t.id))

  return (
    <Page title="My Teams" large subtitle={mine.length ? `${mine.length} starred` : undefined}>
      {mine.length ? (
        <Section footer="Games involving these teams are pinned to the top of Scores.">
          {mine.map((t) => (
            <TeamRow key={t.id} team={t} tab="teams" back="My Teams" />
          ))}
        </Section>
      ) : (
        <Empty
          icon={<Star />}
          title="No Teams Yet"
          message="Find a team and tap the star to follow it. Its games will show first in Scores."
          action={{ label: 'Search Teams', onClick: () => navigate('/search') }}
        />
      )}
    </Page>
  )
}

// Survives leaving the screen, so coming back from a team keeps the search.
let lastQuery = ''

export function SearchPage() {
  const [query, setQueryState] = useState(lastQuery)
  const setQuery = (q: string) => setQueryState((lastQuery = q))
  const deferred = useDeferredValue(query)
  const favorites = useFavorites()
  const input = useRef<HTMLInputElement>(null)

  // Opening Search from the tab bar is a request to type (skipped on touch, where it'd pop the keyboard).
  useEffect(() => {
    if (!lastQuery && window.matchMedia('(hover: hover)').matches) input.current?.focus()
  }, [])

  const term = deferred.trim().toLowerCase()
  const matches = useMemo(
    () => (term ? teams.filter((t) => `${t.full} ${t.name} ${t.abbr}`.toLowerCase().includes(term)) : teams),
    [term],
  )

  return (
    <Page title="Search" large>
      <div className="search">
        <Search className="search-icon" />
        <input
          ref={input}
          type="search"
          placeholder="Teams"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
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

      {matches.length ? (
        <Section header={term ? `${matches.length} ${matches.length === 1 ? 'Team' : 'Teams'}` : 'All Teams'}>
          {matches.map((t) => (
            <TeamRow key={t.id} team={t} starred={favorites.has(t.id)} tab="search" back="Search" />
          ))}
        </Section>
      ) : (
        <Empty icon={<Search />} title={`No Results for “${query.trim()}”`} message="Check the spelling or try a new search." />
      )}
    </Page>
  )
}

function TeamRow({ team, starred, tab, back }: { team: TeamInfo; starred?: boolean; tab: string; back: string }) {
  const { school, mascot } = splitName(team)
  return (
    <Row to={`/${tab}/team/${team.id}`} state={{ back }} inset={60}>
      <TeamLogo id={team.id} size={30} />
      <span className="team-line">
        <span className="title">{school}</span>
        <span className="secondary">{mascot}</span>
      </span>
      {starred && <Star filled className="star-mark" />}
    </Row>
  )
}
