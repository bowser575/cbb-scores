"""Fetch Torvik's bulk schedule once per build; publish a small same-origin feed.

Column reference: https://adamcwisports.blogspot.com/p/data.html
Unknown teams are skipped rather than matched fuzzily to the wrong school.
"""
import argparse
from datetime import datetime, timezone
import json
import math
from pathlib import Path
import re
import unicodedata
from urllib.request import urlopen

ROOT = Path(__file__).resolve().parents[1]


def normalize(name):
    name = unicodedata.normalize('NFKD', name).encode('ascii', 'ignore').decode().lower()
    name = re.sub(r'\b(state|saint)\b', 'st', name)
    return re.sub(r'[^a-z0-9]', '', name)


def team_ids():
    teams = json.loads((ROOT / 'src/data/teams.json').read_text(encoding='utf-8'))
    ids = {normalize(t['name']): t['id'] for t in teams}
    aliases = json.loads((ROOT / 'scripts/torvik-aliases.json').read_text(encoding='utf-8'))
    for name, target in aliases.items():
        ids[normalize(name)] = ids[normalize(target)]
    return ids


def convert(rows, ids):
    games, missing = {}, set()
    for row in rows:
        if not isinstance(row, list) or len(row) < 20:
            raise ValueError('Unexpected Torvik schedule schema')
        first, second = ids.get(normalize(row[8])), ids.get(normalize(row[14]))
        if not first or not second:
            missing.update(n for n in (row[8], row[14]) if normalize(n) not in ids)
            continue
        try:
            day = datetime.strptime(row[1], '%m/%d/%y').strftime('%Y%m%d')
            # Never coerce blanks to zero, or substitute actual results for projections.
            p1, s1, p2, s2 = (float(row[i]) for i in (12, 13, 18, 19))
            if not all(math.isfinite(v) for v in (p1, s1, p2, s2)):
                continue
            if not (0 <= p1 <= 1 and 0 <= p2 <= 1 and abs(p1 + p2 - 1) < .01 and 0 < s1 < 200 and 0 < s2 < 200):
                continue
        except (ValueError, TypeError):
            continue
        key = '|'.join((day, *sorted((first, second))))
        if key in games:
            raise ValueError(f'Ambiguous duplicate matchup: {key}')
        games[key] = {'teams': {first: {'score': s1, 'winProbability': p1}, second: {'score': s2, 'winProbability': p2}}}
    return games, sorted(missing)


def main():
    now = datetime.now(timezone.utc)
    parser = argparse.ArgumentParser()
    parser.add_argument('--season', type=int, default=now.year + (now.month >= 7))
    args = parser.parse_args()
    url = f'https://barttorvik.com/{args.season}_super_sked.json'
    with urlopen(url, timeout=45) as response:
        rows = json.load(response)
    if not isinstance(rows, list) or not rows:
        raise ValueError('Empty or invalid Torvik feed')
    games, missing = convert(rows, team_ids())
    if not games:
        raise ValueError('No usable predictions; refusing to replace the cache')
    output = ROOT / 'public/data/torvik.json'
    output.parent.mkdir(parents=True, exist_ok=True)
    payload = {'season': args.season, 'updatedAt': now.isoformat(), 'source': url, 'games': games}
    temporary = output.with_suffix('.tmp')
    temporary.write_text(json.dumps(payload, separators=(',', ':')) + '\n', encoding='utf-8')
    temporary.replace(output)
    print(f'Published {len(games)} predictions for season {args.season}.')
    if missing:
        print('Unmatched D-I names: ' + ', '.join(n for n in missing if '(' not in n))


if __name__ == '__main__':
    main()
