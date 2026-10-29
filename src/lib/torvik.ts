import type { Game } from './espn'

export interface Prediction {
  teams: Record<string, { score: number; winProbability: number }>
}

export interface TorvikFeed {
  updatedAt: string
  games: Record<string, Prediction>
}

export async function torvikPredictions(): Promise<TorvikFeed> {
  const response = await fetch(`${import.meta.env.BASE_URL}data/torvik.json`, { cache: 'no-cache' })
  if (!response.ok) throw new Error('Torvik predictions unavailable')
  const feed = await response.json()
  if (!feed.games || !Number.isFinite(Date.parse(feed.updatedAt))) throw new Error('Invalid Torvik feed')
  return feed
}

// Torvik schedules use US game dates; UTC and the viewer's local date can differ.
const gameDay = new Intl.DateTimeFormat('en-US', {
  timeZone: 'America/New_York', year: 'numeric', month: '2-digit', day: '2-digit',
})

export function predictionFor(game: Game, feed?: TorvikFeed): Prediction | undefined {
  if (!game.date || !feed) return undefined
  const parts = gameDay.formatToParts(game.date)
  const day = ['year', 'month', 'day'].map((type) => parts.find((p) => p.type === type)?.value).join('')
  const key = [day, ...[game.away.id, game.home.id].sort()].join('|')
  const prediction = feed.games[key]
  if (!prediction) return undefined
  // An invalid/stale feed must never take down the ESPN scoreboard.
  for (const id of [game.away.id, game.home.id]) {
    const team = prediction.teams?.[id]
    if (!team || !Number.isFinite(team.score) || team.score <= 0 ||
      !Number.isFinite(team.winProbability) || team.winProbability < 0 || team.winProbability > 1) return undefined
  }
  return prediction
}
