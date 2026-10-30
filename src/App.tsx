import { useLayoutEffect, useRef } from 'react'
import {
  createHashRouter,
  Navigate,
  Outlet,
  ScrollRestoration,
  useLocation,
  useNavigate,
  useNavigationType,
} from 'react-router-dom'
import { Search, WifiSlash } from './components/icons'
import { TABS, type TabId } from './components/tabs'
import { Empty } from './components/ui'
import { GamePage } from './pages/Game'
import { RankingsPage } from './pages/Rankings'
import { ScoresPage } from './pages/Scores'
import { StandingsPage } from './pages/Standings'
import { TeamPage } from './pages/Team'
import { SearchPage, TeamsPage } from './pages/Teams'

const ROOTS: TabId[] = [...TABS.map((t) => t.id), 'search']
const tabOf = (pathname: string): TabId => ROOTS.find((id) => pathname.startsWith(`/${id}`)) ?? 'scores'

function Layout() {
  const location = useLocation()
  const navigate = useNavigate()
  const navType = useNavigationType()
  const tab = tabOf(location.pathname)

  // Like a UITabBarController: each tab remembers where you were.
  const lastPath = useRef<Record<string, string>>({})
  lastPath.current[tab] = location.pathname + location.search

  // Tapping the current tab pops to its root; another tab returns to where it was.
  const go = (id: TabId) => navigate(id === tab ? `/${id}` : (lastPath.current[id] ?? `/${id}`))

  // Push/pop transition between screens of the same tab; tab switches are instant.
  const prev = useRef(location.pathname)
  const screen = useRef<HTMLDivElement>(null)
  useLayoutEffect(() => {
    const from = prev.current
    prev.current = location.pathname
    const el = screen.current
    if (!el || from === location.pathname || tabOf(from) !== tab) return
    const cls = navType === 'POP' ? 'enter-pop' : 'enter-push'
    el.classList.remove('enter-pop', 'enter-push')
    void el.offsetWidth
    el.classList.add(cls)
  }, [location.pathname, navType, tab])

  return (
    <div className="app">
      <header className="site-header">
        <div className="site-header-inner">
          <a className="brand" href="#/scores" aria-label="CBB Scores home" onClick={(e) => { e.preventDefault(); go('scores') }}>CBB Scores<span>.</span></a>
          <nav className="tabbar" aria-label="Sections">
            {[...TABS, { id: 'search' as TabId, label: 'Search', icon: () => <Search /> }].map((t) => (
              <a
                key={t.id}
                href={`#/${t.id}`}
                className={`tab ${t.id === tab ? 'active' : ''}`}
                aria-current={t.id === tab ? 'page' : undefined}
                onClick={(e) => { e.preventDefault(); go(t.id) }}
              >
                {t.icon(t.id === tab)}
                <span>{t.label}</span>
              </a>
            ))}
          </nav>
        </div>
      </header>
      <main className="main">
        <div ref={screen} className="screen" key={location.pathname}>
          <Outlet />
        </div>
      </main>
      {/* Tab roots keep their scroll across tab switches; pushed screens start at the top. */}
      <ScrollRestoration getKey={(loc) => (ROOTS.some((id) => loc.pathname === `/${id}`) ? loc.pathname + loc.search : loc.key)} />
    </div>
  )
}

function Crash() {
  return (
    <div className="content crash">
      <Empty
        icon={<WifiSlash />}
        title="Something Went Wrong"
        message="This page hit an unexpected error."
        action={{ label: 'Reload', onClick: () => window.location.reload() }}
      />
    </div>
  )
}

export const router = createHashRouter([
  {
    element: <Layout />,
    errorElement: <Crash />,
    children: [
      { index: true, element: <Navigate to="/scores" replace /> },
      { path: 'scores', element: <ScoresPage /> },
      { path: 'rankings', element: <RankingsPage /> },
      { path: 'standings', element: <StandingsPage /> },
      { path: 'teams', element: <TeamsPage /> },
      { path: 'search', element: <SearchPage /> },
      { path: ':tab/game/:id', element: <GamePage /> },
      { path: ':tab/team/:id', element: <TeamPage /> },
      { path: '*', element: <Navigate to="/scores" replace /> },
    ],
  },
])
