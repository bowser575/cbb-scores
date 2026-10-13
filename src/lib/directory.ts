import teamsJson from '../data/teams.json'
import conferencesJson from '../data/conferences.json'

/* Bundled copies of ESPN's teams and conferences lists. */

export interface TeamInfo {
  id: string
  name: string
  full: string
  abbr: string
  color: string
}

export interface ConferenceInfo {
  id: string
  name: string
  short: string
}

export const teams: TeamInfo[] = teamsJson
export const conferences: ConferenceInfo[] = conferencesJson
export const teamsById = new Map(teams.map((t) => [t.id, t]))

const splits = new Map<string, { school: string; mascot: string }>()
const SCHOOL_WORDS = new Set(['University', 'State', 'Carolina', 'Shore', 'Valley', 'A&M'])

/**
 * Splits "Northern Arizona Lumberjacks" into school and mascot. ESPN's short names abbreviate the
 * school ("N Arizona", "Alabama St", "NC A&T", "Abilene Chrstn"), so each short-name word is matched
 * against the full name as an equal word, a prefix, an in-order abbreviation, or initials of several words.
 */
export function splitName(t: TeamInfo): { school: string; mascot: string } {
  const hit = splits.get(t.id)
  if (hit) return hit
  const words = t.full.split(' ')
  const lower = (s: string) => s.toLowerCase()
  const abbreviates = (short: string, word: string) => {
    const s = lower(short)
    const w = lower(word)
    if (s[0] !== w[0]) return false
    let i = 0
    for (const ch of w) if (ch === s[i]) i++
    return i === s.length
  }

  let used = 0
  for (const token of t.name.split(' ')) {
    if (used < words.length && abbreviates(token, words[used])) {
      used += 1
    } else if (
      /^[A-Z]{2,}$/.test(token) &&
      used + token.length <= words.length &&
      [...token].every((ch, k) => words[used + k][0] === ch)
    ) {
      used += token.length
    } else {
      used = -1
      break
    }
  }
  // Fall back to treating the last word as the mascot.
  if (used <= 0 || used >= words.length) used = Math.max(1, words.length - 1)
  // Short names sometimes stop early ("Coastal", "SE Missouri"); no mascot starts with these.
  while (used < words.length - 1 && SCHOOL_WORDS.has(words[used])) used++
  const result = { school: words.slice(0, used).join(' '), mascot: words.slice(used).join(' ') }
  splits.set(t.id, result)
  return result
}
