import type { Game } from './espn'

export interface Prediction {
  teams: Record<string, { score: number; winProbability: number }>
}

/** Torvik's adjusted efficiencies: points per 100 possessions against an average D-I team. */
export interface Rating {
  rank: number
  adjOE: number
  adjOERank: number
  adjDE: number
  adjDERank: number
  barthag: number
  tempo: number
}

export interface TorvikFeed {
  season?: number
  updatedAt: string
  games: Record<string, Prediction>
  ratings?: Record<string, Rating>
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

/* ---------- win probability ---------- */

/** Standard deviation of a college game's final margin around its expected margin, in points. */
const MARGIN_SD = 11

const normal = (z: number) => {
  // Abramowitz–Stegun 7.1.26 erf approximation; accurate to ~1e-7, plenty for a percentage.
  const x = Math.abs(z) / Math.SQRT2
  const t = 1 / (1 + 0.3275911 * x)
  const erf = 1 - ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x)
  return z >= 0 ? (1 + erf) / 2 : (1 - erf) / 2
}

/** Inverse of `normal`, by bisection: only called once per game. */
const inverseNormal = (p: number) => {
  let lo = -8
  let hi = 8
  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2
    if (normal(mid) < p) lo = mid
    else hi = mid
  }
  return (lo + hi) / 2
}

/** A chance as a whole percent, without rounding a long shot to a flat 0% or 100%. */
export const formatChance = (p: number) => (p < 0.005 ? '<1%' : p > 0.995 ? '>99%' : `${Math.round(p * 100)}%`)

/** The home team's pregame chance: Torvik's when the feed has the game, else implied by the betting line. */
export function pregameHomeChance(game: Game, feed?: TorvikFeed): { chance: number; source: 'torvik' | 'line' } | null {
  const prediction = predictionFor(game, feed)
  if (prediction) return { chance: prediction.teams[game.home.id].winProbability, source: 'torvik' }
  const spread = game.odds?.spread
  if (spread != null) return { chance: normal(-spread / MARGIN_SD), source: 'line' }
  return null
}

/**
 * The home team's chance to win with `secondsLeft` to play (regulation is 2400) and a `lead` for home.
 * The pregame chance is turned into an expected margin, of which the unplayed share is still to come;
 * the uncertainty left shrinks with the square root of the time left.
 */
export function liveHomeChance(pregame: number, lead: number, secondsLeft: number): number {
  const share = Math.max(0, secondsLeft) / 2400
  if (share === 0) return lead > 0 ? 1 : lead < 0 ? 0 : 0.5
  const expected = MARGIN_SD * inverseNormal(Math.min(0.999, Math.max(0.001, pregame)))
  return normal((lead + expected * share) / (MARGIN_SD * Math.sqrt(share)))
}
