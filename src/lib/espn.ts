import { teamsById } from './directory'
import { parseDate, ymd } from './format'

/* ESPN's public site API for men's college basketball. */

const BASE = 'https://site.api.espn.com/apis/site/v2/sports/basketball/mens-college-basketball'

/** groups=50 is all of Division I, groups=100 is the NCAA Tournament, other ids are conferences. */
export const ALL_DIVISION_I = '50'
export const NCAA_TOURNAMENT = '100'

// ESPN payloads are loosely shaped; parsing below reads them defensively.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type J = any

export type GameState = 'pre' | 'live' | 'final'

export interface TeamSide {
  id: string
  name: string
  abbr: string
  color: string
  rank: number | null
  record: string
  score: string
  winner: boolean
  isHome: boolean
  linescores: string[]
}

export interface Game {
  id: string
  date: Date | null
  state: GameState
  detail: string
  isHalftime: boolean
  away: TeamSide
  home: TeamSide
  neutral: boolean
  note: string
  tv: string
  timeValid: boolean
  oddsDetails: string | null
  overUnder: number | null
}

export interface Scoreboard {
  games: Game[]
  day: string | null
  calendar: string[]
}

export interface BoxPlayer {
  id: string
  name: string
  position: string
  starter: boolean
  dnp: boolean
  stats: string[]
}

export interface BoxTeam {
  players: BoxPlayer[]
  totals: string[]
}

export interface StatLine {
  label: string
  away: string
  home: string
}

export interface Play {
  id: string
  text: string
  clock: string
  period: string
  scoring: boolean
  awayScore: number
  homeScore: number
  teamId: string | null
}

export interface GameSummary {
  game: Game
  boxes: Record<string, BoxTeam>
  teamStats: StatLine[]
  plays: Play[]
  venue: string
  attendance: number | null
}

export interface RankedTeam {
  teamId: string
  rank: number
  name: string
  record: string
  firstPlaceVotes: number
  trend: number
  isNew: boolean
}

export interface Poll {
  type: string
  name: string
  date: Date | null
  ranks: RankedTeam[]
  others: { name: string; points: number }[]
}

export interface TeamSchedule {
  season: number
  games: Game[]
  record: string | null
  standing: string | null
}

export interface RosterPlayer {
  id: string
  name: string
  jersey: string
  position: string
  height: string
  year: string
}

export interface Roster {
  season: number
  coach: string | null
  players: RosterPlayer[]
}

export const BOX_COLUMNS = ['MIN', 'PTS', 'REB', 'AST', 'FG', '3PT', 'FT', 'STL', 'BLK', 'TO', 'PF']

async function get(path: string): Promise<J> {
  const res = await fetch(BASE + path, { cache: 'no-store' })
  if (!res.ok) throw new Error(`ESPN ${res.status}`)
  return res.json()
}

const str = (v: unknown): string | null => (typeof v === 'string' ? v : typeof v === 'number' ? String(v) : null)
const int = (v: unknown): number | null => {
  const n = typeof v === 'number' ? v : typeof v === 'string' ? Number(v) : NaN
  return Number.isFinite(n) ? Math.trunc(n) : null
}

/* ---------- parsing ---------- */

function parseTeam(c: J): TeamSide {
  const t = c?.team ?? {}
  const id = str(t.id) ?? ''
  const rank = int(c?.curatedRank?.current) ?? int(c?.rank)
  return {
    id,
    name: t.shortDisplayName ?? t.location ?? t.displayName ?? '',
    abbr: t.abbreviation ?? '',
    color: t.color ?? teamsById.get(id)?.color ?? '888888',
    rank: rank != null && rank >= 1 && rank <= 25 ? rank : null,
    record: c?.records?.[0]?.summary ?? c?.record?.[0]?.summary ?? c?.record?.[0]?.displayValue ?? '',
    score: str(c?.score?.displayValue) ?? str(c?.score) ?? '',
    winner: c?.winner === true,
    isHome: c?.homeAway === 'home',
    linescores: (c?.linescores ?? []).map((l: J) => str(l.displayValue) ?? str(l.value) ?? ''),
  }
}

function parseGame(ev: J): Game {
  const c = ev?.competitions?.[0] ?? {}
  const type = (c.status ?? ev?.status)?.type ?? {}
  const competitors: J[] = c.competitors ?? []
  const away = competitors.find((x) => x.homeAway === 'away') ?? competitors[competitors.length - 1]
  const home = competitors.find((x) => x.homeAway === 'home') ?? competitors[0]
  const state: GameState = type.state === 'in' ? 'live' : type.state === 'post' ? 'final' : 'pre'
  const tv = (c.broadcasts ?? []).flatMap((b: J) => {
    const names = (b.names ?? []).filter((n: unknown) => typeof n === 'string')
    return names.length ? names : [b.media?.shortName].filter(Boolean)
  })
  return {
    id: str(ev?.id) ?? str(c.id) ?? '',
    date: parseDate(ev?.date ?? c.date),
    state,
    detail: type.shortDetail ?? type.detail ?? '',
    isHalftime: type.name === 'STATUS_HALFTIME',
    away: parseTeam(away),
    home: parseTeam(home),
    neutral: c.neutralSite === true,
    note: c.notes?.[0]?.headline ?? '',
    tv: tv.join(', '),
    timeValid: c.timeValid !== false,
    oddsDetails: c.odds?.[0]?.details ?? null,
    overUnder: typeof c.odds?.[0]?.overUnder === 'number' ? c.odds[0].overUnder : null,
  }
}

/* ---------- endpoints ---------- */

export async function scoreboard(date: string | null, group: string): Promise<Scoreboard> {
  const j = await get(`/scoreboard?groups=${group}&limit=400${date ? `&dates=${date}` : ''}`)
  const calendar: string[] = (j.leagues?.[0]?.calendar ?? [])
    .map((e: J) => (typeof e === 'string' ? e : e?.startDate))
    .filter((s: unknown): s is string => typeof s === 'string' && s.length >= 10)
    .map((s: string) => s.slice(0, 10).replaceAll('-', ''))
  const games: Game[] = (j.events ?? []).map(parseGame)
  // With no date requested ESPN picks the game day itself, but doesn't always say which.
  const firstDate = games.find((g) => g.date)?.date
  const day = j.day?.date?.replaceAll('-', '') ?? (date ?? (firstDate ? ymd(firstDate) : null))
  return { games, day, calendar }
}

export async function summary(gameId: string): Promise<GameSummary> {
  const s = await get(`/summary?event=${gameId}`)
  const game = parseGame({ id: gameId, competitions: [s.header?.competitions?.[0] ?? {}] })
  if (game.oddsDetails == null) {
    game.oddsDetails = s.pickcenter?.[0]?.details ?? null
    game.overUnder = typeof s.pickcenter?.[0]?.overUnder === 'number' ? s.pickcenter[0].overUnder : null
  }

  const boxes: Record<string, BoxTeam> = {}
  for (const p of s.boxscore?.players ?? []) {
    const st = p.statistics?.[0] ?? {}
    const names: string[] = st.names ?? []
    const indices = BOX_COLUMNS.map((c) => names.indexOf(c))
    const pick = (stats: J[] = []) => indices.map((i) => (i >= 0 ? str(stats[i]) ?? '' : ''))
    const players: BoxPlayer[] = (st.athletes ?? []).map((a: J, i: number) => ({
      id: str(a.athlete?.id) ?? String(i),
      name: a.athlete?.shortName ?? a.athlete?.displayName ?? '',
      position: a.athlete?.position?.abbreviation ?? '',
      starter: a.starter === true,
      dnp: a.didNotPlay === true || !(a.stats ?? []).length,
      stats: pick(a.stats),
    }))
    boxes[str(p.team?.id) ?? ''] = { players, totals: pick(st.totals) }
  }

  const teamStats: StatLine[] = []
  const teams: J[] = s.boxscore?.teams ?? []
  const a = teams.find((t) => str(t.team?.id) === game.away.id)
  const h = teams.find((t) => str(t.team?.id) === game.home.id)
  if (a && h) {
    const skip = new Set(['Team Turnovers', 'Total Turnovers', 'Technical Fouls', 'Total Technical Fouls', 'Flagrant Fouls'])
    const homeValues = new Map<string, string>()
    for (const x of h.statistics ?? []) if (x.label) homeValues.set(x.label, x.displayValue ?? '')
    for (const x of a.statistics ?? []) {
      const hv = homeValues.get(x.label)
      if (!x.label || skip.has(x.label) || hv == null) continue
      const pct = x.label.includes('%') ? '%' : ''
      teamStats.push({ label: x.label, away: (x.displayValue ?? '') + pct, home: hv + pct })
    }
  }

  const plays: Play[] = (s.plays ?? []).map((p: J, i: number) => ({
    id: str(p.id) ?? String(i),
    text: p.text ?? '',
    clock: p.clock?.displayValue ?? '',
    period: p.period?.displayValue ?? '',
    scoring: p.scoringPlay === true,
    awayScore: int(p.awayScore) ?? 0,
    homeScore: int(p.homeScore) ?? 0,
    teamId: str(p.team?.id),
  }))

  const venue = s.gameInfo?.venue ?? {}
  const place = [venue.address?.city, venue.address?.state].filter(Boolean).join(', ')
  return {
    game,
    boxes,
    teamStats,
    plays,
    venue: [venue.fullName, place].filter(Boolean).join(' · '),
    attendance: int(s.gameInfo?.attendance) || null,
  }
}

export async function polls(): Promise<Poll[]> {
  const j = await get('/rankings')
  return (j.rankings ?? []).map((r: J) => ({
    type: r.type ?? '',
    name: r.name ?? '',
    date: parseDate(r.date),
    ranks: (r.ranks ?? []).map((x: J) => ({
      teamId: str(x.team?.id) ?? '',
      rank: int(x.current) ?? 0,
      name: x.team?.nickname ?? x.team?.location ?? '',
      record: x.recordSummary ?? '',
      firstPlaceVotes: int(x.firstPlaceVotes) ?? 0,
      trend: int(String(x.trend ?? '').replace('+', '')) ?? 0,
      isNew: (int(x.previous) ?? 0) === 0,
    })),
    others: (r.others ?? [])
      .filter((x: J) => (int(x.points) ?? 0) > 0)
      .map((x: J) => ({ name: x.team?.nickname ?? x.team?.location ?? '', points: int(x.points) ?? 0 })),
  }))
}

export async function schedule(team: string, season: number): Promise<TeamSchedule> {
  const [regular, post] = await Promise.all([
    get(`/teams/${team}/schedule?season=${season}&seasontype=2`),
    get(`/teams/${team}/schedule?season=${season}&seasontype=3`).catch(() => ({})),
  ])
  const seen = new Set<string>()
  const games = [...(regular.events ?? []), ...(post.events ?? [])]
    .map(parseGame)
    .filter((g) => !seen.has(g.id) && seen.add(g.id))
    .sort((x, y) => (x.date?.getTime() ?? 0) - (y.date?.getTime() ?? 0))
  return {
    season,
    games,
    record: regular.team?.recordSummary || null,
    standing: regular.team?.standingSummary || null,
  }
}

const jerseyOrder = (j: string) => (/^\d+$/.test(j) ? Number(j) : 999)

export async function roster(team: string, season: number): Promise<Roster> {
  const j = await get(`/teams/${team}/roster?season=${season}`)
  const coach = j.coach?.[0]
  const coachName = [coach?.firstName, coach?.lastName].filter(Boolean).join(' ')
  // Some sports group athletes by position ({position, items}); basketball is usually flat.
  const athletes: J[] = (j.athletes ?? []).flatMap((a: J) => (Array.isArray(a.items) ? a.items : [a]))
  const players = athletes
    .map((a, i) => ({
      id: str(a.id) ?? String(i),
      name: a.displayName ?? '',
      jersey: str(a.jersey) ?? '',
      position: a.position?.displayName ?? 'Other',
      height: a.displayHeight ?? '',
      year: a.experience?.abbreviation ?? '',
    }))
    .sort((x, y) => jerseyOrder(x.jersey) - jerseyOrder(y.jersey))
  return { season, coach: coachName || null, players }
}

/* ---------- derived game info ---------- */

export function statusText(g: Game): string {
  if (g.state === 'live') return g.isHalftime ? 'Halftime' : g.detail
  if (g.state === 'final') return g.detail || 'Final'
  return g.timeValid && g.date ? timeFormatter.format(g.date) : 'TBD'
}

const timeFormatter = new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' })

/** Predicted score from the betting line: favorite = (O/U + spread) / 2, underdog = (O/U − spread) / 2. */
export function projection(g: Game): { away: number; home: number } | null {
  const ou = g.overUnder
  const details = g.oddsDetails
  if (!ou || ou <= 0 || !details) return null
  if (details.toUpperCase() === 'EVEN') {
    const half = Math.round(ou / 2)
    return { away: half, home: half }
  }
  const [abbr, value] = details.split(' ')
  const spread = Math.abs(Number(value))
  if (!abbr || !Number.isFinite(spread)) return null
  const favorite = Math.round((ou + spread) / 2)
  const underdog = Math.round((ou - spread) / 2)
  if (abbr === g.home.abbr) return { away: underdog, home: favorite }
  if (abbr === g.away.abbr) return { away: favorite, home: underdog }
  return null
}

/** A ranked team trailing or beaten by a team ranked 3+ spots worse, or unranked. */
export function isUpset(g: Game): boolean {
  if (g.state === 'pre') return false
  const a = Number(g.away.score)
  const h = Number(g.home.score)
  if (!Number.isFinite(a) || !Number.isFinite(h) || a === h) return false
  const [lead, trail] = a > h ? [g.away, g.home] : [g.home, g.away]
  if (trail.rank == null) return false
  return (lead.rank ?? 99) - trail.rank >= 3
}

export function margin(g: Game): number | null {
  const a = Number.parseInt(g.away.score)
  const h = Number.parseInt(g.home.score)
  return Number.isFinite(a) && Number.isFinite(h) ? Math.abs(a - h) : null
}

/* ---------- logos ---------- */

/** Sized through ESPN's image combiner; dark mode uses ESPN's dark-background variants. */
export function logoURL(teamId: string, size: number, dark: boolean): string {
  const px = Math.ceil(size * 2)
  return `https://a.espncdn.com/combiner/i?img=/i/teamlogos/ncaa/${dark ? '500-dark' : '500'}/${teamId}.png&w=${px}&h=${px}`
}
