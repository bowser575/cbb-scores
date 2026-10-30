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
  odds: Odds | null
  /** 1 and 2 are halves, 3+ overtimes; 0 before tip-off. */
  period: number
  /** Seconds left in the period, when ESPN sends the clock. */
  clock: number | null
}

/** The betting line from ESPN's sportsbook. Prices are American odds (-110, +270). */
export interface Odds {
  provider: string | null
  /** Favorite and spread as ESPN writes it: "DUKE -7.5", or "EVEN". */
  details: string | null
  /** The home team's spread: negative when the home team is favored, 0 for a pick'em. */
  spread: number | null
  total: number | null
  awaySpreadOdds: number | null
  homeSpreadOdds: number | null
  overOdds: number | null
  underOdds: number | null
  awayMoneyline: number | null
  homeMoneyline: number | null
  /** Where the line opened, when ESPN has it. */
  openSpread: number | null
  openTotal: number | null
}

export interface Scoreboard {
  games: Game[]
  day: string | null
  calendar: string[]
}

export interface BoxPlayer {
  id: string
  /** Full name ("Yaxel Lendeborg") and short form ("Y. Lendeborg") for narrow screens. */
  name: string
  shortName: string
  jersey: string
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
  /** Seconds of game time played when this happened (halves are 20:00, overtimes 5:00). */
  elapsed: number | null
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
  others: { teamId: string; name: string; points: number }[]
}

export interface TeamSchedule {
  season: number
  games: Game[]
  record: string | null
  standing: string | null
}

export interface Standing {
  teamId: string
  name: string
  seed: number | null
  conference: string
  overall: string
  gamesBehind: string
  winPercent: number
  streak: string
  home: string
  road: string
}

export interface ConferenceStandings {
  id: string
  name: string
  short: string
  season: number
  teams: Standing[]
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

/** ESPN's own box score columns and order. */
export const BOX_COLUMNS = ['MIN', 'PTS', 'FG', '3PT', 'FT', 'REB', 'AST', 'TO', 'STL', 'BLK', 'OREB', 'DREB', 'PF']

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

/** A spread or total: 7.5, "+7.5", "o145.5", "PK", or a quote object holding one. */
function line(v: J): number | null {
  if (v != null && typeof v === 'object') return line(v.line ?? v.american ?? v.alternateDisplayValue)
  if (typeof v === 'number') return Number.isFinite(v) ? v : null
  if (typeof v !== 'string') return null
  const s = v.trim().replace(/^[ou]\s*/i, '')
  if (/^(pk|pick|even)/i.test(s)) return 0
  const n = Number(s)
  return s && Number.isFinite(n) ? n : null
}

/** American odds: -110, "+270", "EVEN", or a quote object holding one. Anything inside ±100 isn't American odds. */
function price(v: J): number | null {
  if (v != null && typeof v === 'object') return price(v.american ?? v.alternateDisplayValue ?? v.odds)
  const n = typeof v === 'number' ? v : typeof v === 'string' ? (/^even$/i.test(v.trim()) ? 100 : Number(v.trim())) : NaN
  return Number.isFinite(n) && Math.abs(n) >= 100 ? n : null
}

const negate = (n: number | null) => (n == null ? null : -n)
const positive = (n: number | null) => (n != null && n > 0 ? n : null)

/** The home team's spread. `details` names the favorite; the sign of the bare `spread` isn't reliable, so it only gives the size. */
function homeSpread(o: J, details: string | null, away: TeamSide, home: TeamSide): number | null {
  if (details) {
    if (/^(even|pk|pick)/i.test(details)) return 0
    const m = /^(.+?)\s+([+-]?\d+(?:\.\d+)?)$/.exec(details)
    if (m && (m[1] === home.abbr || m[1] === away.abbr)) {
      const size = Math.abs(Number(m[2]))
      return m[1] === home.abbr ? -size : size
    }
  }
  const quoted = line(o.pointSpread?.home?.close ?? o.pointSpread?.home?.current)
  if (quoted != null) return quoted
  const size = line(o.spread)
  if (size == null) return null
  if (size === 0) return 0
  if (o.homeTeamOdds?.favorite === true) return -Math.abs(size)
  if (o.awayTeamOdds?.favorite === true) return Math.abs(size)
  return null
}

/**
 * ESPN sends odds two ways: flat numbers (`pickcenter`, older scoreboards), and on newer scoreboards
 * `moneyline` / `pointSpread` / `total` blocks quoting each side at open and close. Either is read.
 */
function parseOdds(o: J, away: TeamSide, home: TeamSide): Odds | null {
  if (!o || typeof o !== 'object') return null
  const a = o.awayTeamOdds ?? {}
  const h = o.homeTeamOdds ?? {}
  const ml = o.moneyline ?? {}
  const ps = o.pointSpread ?? {}
  const tot = o.total ?? {}
  const latest = (q: J) => q?.close ?? q?.current
  const details = typeof o.details === 'string' && o.details.trim() ? o.details.trim() : null

  const odds: Odds = {
    provider: o.provider?.displayName ?? o.provider?.name ?? null,
    details,
    spread: homeSpread(o, details, away, home),
    total: positive(line(o.overUnder) ?? line(latest(tot.over))),
    awaySpreadOdds: price(a.spreadOdds) ?? price(latest(ps.away)),
    homeSpreadOdds: price(h.spreadOdds) ?? price(latest(ps.home)),
    overOdds: price(o.overOdds) ?? price(latest(tot.over)),
    underOdds: price(o.underOdds) ?? price(latest(tot.under)),
    awayMoneyline: price(a.moneyLine) ?? price(latest(ml.away)),
    homeMoneyline: price(h.moneyLine) ?? price(latest(ml.home)),
    openSpread: line(ps.home?.open) ?? negate(line(ps.away?.open)) ?? line(h.open?.pointSpread) ?? negate(line(a.open?.pointSpread)),
    openTotal: positive(line(tot.over?.open) ?? line(o.open?.total)),
  }
  const anything = odds.details ?? odds.spread ?? odds.total ?? odds.awayMoneyline ?? odds.homeMoneyline
  return anything == null ? null : odds
}

function parseGame(ev: J): Game {
  const c = ev?.competitions?.[0] ?? {}
  const type = (c.status ?? ev?.status)?.type ?? {}
  const competitors: J[] = c.competitors ?? []
  const away = parseTeam(competitors.find((x) => x.homeAway === 'away') ?? competitors[competitors.length - 1])
  const home = parseTeam(competitors.find((x) => x.homeAway === 'home') ?? competitors[0])
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
    away,
    home,
    neutral: c.neutralSite === true,
    note: c.notes?.[0]?.headline ?? '',
    tv: tv.join(', '),
    timeValid: c.timeValid !== false,
    odds: parseOdds(c.odds?.[0], away, home),
    period: int((c.status ?? ev?.status)?.period) ?? 0,
    clock: typeof (c.status ?? ev?.status)?.clock === 'number' ? (c.status ?? ev?.status).clock : null,
  }
}

/** "12:34" or "41.2" → seconds. */
function clockSeconds(s: unknown): number | null {
  if (typeof s !== 'string') return null
  const m = /^(?:(\d+):)?(\d+(?:\.\d+)?)$/.exec(s.trim())
  return m ? Number(m[1] ?? 0) * 60 + Number(m[2]) : null
}

const periodLength = (period: number) => (period <= 2 ? 1200 : 300)

/** Seconds played at `clock` seconds left in `period`. */
export function elapsedAt(period: number, clock: number): number {
  const before = period <= 1 ? 0 : period === 2 ? 1200 : 2400 + (period - 3) * 300
  return before + Math.max(0, periodLength(period) - clock)
}

/** Seconds left in regulation, or in the current overtime. */
export function secondsLeft(period: number, clock: number): number {
  return period <= 1 ? 1200 + clock : clock
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
  // Pick Center has the sportsbook's full line, prices included; the header's odds are the fallback.
  game.odds = parseOdds(s.pickcenter?.[0], game.away, game.home) ?? game.odds

  const boxes: Record<string, BoxTeam> = {}
  for (const p of s.boxscore?.players ?? []) {
    const st = p.statistics?.[0] ?? {}
    const names: string[] = st.names ?? []
    const indices = BOX_COLUMNS.map((c) => names.indexOf(c))
    const pick = (stats: J[] = []) => indices.map((i) => (i >= 0 ? str(stats[i]) ?? '' : ''))
    const players: BoxPlayer[] = (st.athletes ?? []).map((a: J, i: number) => ({
      id: str(a.athlete?.id) ?? String(i),
      name: a.athlete?.displayName ?? a.athlete?.shortName ?? '',
      shortName: a.athlete?.shortName ?? a.athlete?.displayName ?? '',
      jersey: str(a.athlete?.jersey) ?? '',
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
    elapsed: (() => {
      const period = int(p.period?.number)
      const clock = clockSeconds(p.clock?.displayValue)
      return period && clock != null ? elapsedAt(period, clock) : null
    })(),
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
      .map((x: J) => ({ teamId: str(x.team?.id) ?? '', name: x.team?.nickname ?? x.team?.location ?? '', points: int(x.points) ?? 0 })),
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

/** Every conference's standings for a season, in ESPN's seed order. */
export async function standings(season: number): Promise<ConferenceStandings[]> {
  const j = await fetch(`https://site.api.espn.com/apis/v2/sports/basketball/mens-college-basketball/standings?season=${season}`, { cache: 'no-store' })
  if (!j.ok) throw new Error(`ESPN ${j.status}`)
  const data: J = await j.json()
  return (data.children ?? []).map((c: J) => {
    const teams: Standing[] = (c.standings?.entries ?? []).map((e: J) => {
      const stats = new Map<string, J>((e.stats ?? []).map((x: J) => [x.type ?? x.name, x]))
      const value = (type: string) => str(stats.get(type)?.displayValue) ?? ''
      return {
        teamId: str(e.team?.id) ?? '',
        name: e.team?.shortDisplayName ?? e.team?.location ?? '',
        seed: int(stats.get('playoffseed')?.value) || null,
        conference: value('vsconf'),
        overall: value('total'),
        gamesBehind: value('vsconf_gamesbehind'),
        winPercent: Number(stats.get('vsconf_winpercent')?.value ?? stats.get('leaguewinpercent')?.value) || 0,
        streak: value('streak'),
        home: value('home'),
        road: value('road'),
      }
    })
    // Seeds break ties the way the conference does; without them, conference win percentage decides.
    teams.sort((a, b) => (a.seed ?? 99) - (b.seed ?? 99) || b.winPercent - a.winPercent || a.name.localeCompare(b.name))
    return {
      id: str(c.id) ?? '',
      name: c.name ?? '',
      short: c.shortName ?? c.abbreviation ?? '',
      season: int(c.standings?.season) ?? season,
      teams,
    }
  })
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
  const total = g.odds?.total
  const spread = g.odds?.spread
  if (!total || spread == null) return null
  return { away: Math.round((total + spread) / 2), home: Math.round((total - spread) / 2) }
}

/* ---------- betting ---------- */

/** A true minus sign, so it lines up with the plus in tabular figures. */
const signed = (n: number) => (n > 0 ? `+${n}` : `−${Math.abs(n)}`)

/** American odds: −110, +270. */
export const formatPrice = signed

/** A spread from one team's side: +7.5, −7.5, or PK. */
export const formatSpread = (n: number) => (n === 0 ? 'PK' : signed(n))

/** The favorite and its spread, "DUKE -7.5", from a home-team spread. */
export function favoriteLine(g: Game, homeSpread: number): string {
  if (homeSpread === 0) return 'PK'
  return `${(homeSpread < 0 ? g.home : g.away).abbr} -${Math.abs(homeSpread)}`
}

/** The line as ESPN writes it, or built from the spread when ESPN didn't. */
export function lineLabel(g: Game): string | null {
  const o = g.odds
  return o?.details ?? (o?.spread != null ? favoriteLine(g, o.spread) : null)
}

export interface BetResult {
  /** Which side covered the spread. */
  cover: 'away' | 'home' | 'push' | null
  /** Points the covering side beat the spread by. */
  coverBy: number
  total: 'over' | 'under' | 'push' | null
  /** Points the game went over or under by. */
  totalBy: number
  points: number
}

/** How the spread and total settled. Final games only. */
export function betResult(g: Game): BetResult | null {
  if (g.state !== 'final' || !g.odds) return null
  const a = Number.parseInt(g.away.score)
  const h = Number.parseInt(g.home.score)
  if (!Number.isFinite(a) || !Number.isFinite(h)) return null
  const { spread, total } = g.odds
  const ats = spread == null ? null : h - a + spread
  const ou = total == null ? null : a + h - total
  return {
    cover: ats == null ? null : ats === 0 ? 'push' : ats > 0 ? 'home' : 'away',
    coverBy: Math.abs(ats ?? 0),
    total: ou == null ? null : ou === 0 ? 'push' : ou > 0 ? 'over' : 'under',
    totalBy: Math.abs(ou ?? 0),
    points: a + h,
  }
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
