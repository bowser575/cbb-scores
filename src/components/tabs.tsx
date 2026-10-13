import type { ReactNode } from 'react'
import { Basketball, Star, Trophy } from './icons'

export type TabId = 'scores' | 'rankings' | 'teams'

export const TABS: { id: TabId; label: string; icon: (active: boolean) => ReactNode }[] = [
  { id: 'scores', label: 'Scores', icon: () => <Basketball /> },
  { id: 'rankings', label: 'Rankings', icon: (on) => <Trophy filled={on} /> },
  { id: 'teams', label: 'Teams', icon: (on) => <Star filled={on} /> },
]
