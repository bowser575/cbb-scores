import type { ReactNode } from 'react'
import { CalendarDay, ListNumber, Star } from './icons'

export type TabId = 'scores' | 'rankings' | 'teams' | 'search'

export const TABS: { id: TabId; label: string; icon: (active: boolean) => ReactNode }[] = [
  { id: 'scores', label: 'Scores', icon: () => <CalendarDay day={new Date().getDate()} /> },
  { id: 'rankings', label: 'Rankings', icon: () => <ListNumber /> },
  { id: 'teams', label: 'My Teams', icon: (on) => <Star filled={on} /> },
]

/** iOS 26 puts search in its own round button beside the tab bar. */
export const SEARCH_TAB = { id: 'search' as TabId, label: 'Search' }

export const tabInfo = (id: string | undefined) => TABS.find((t) => t.id === id) ?? (id === 'search' ? SEARCH_TAB : TABS[0])
