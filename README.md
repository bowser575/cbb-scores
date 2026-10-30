# CBB Scores

Men's college basketball scores, rankings, and teams — a responsive React scoreboard with ESPN team logos and a restrained orange accent.

Scores come straight from ESPN's public site API in the browser; there's no backend. Bart Torvik predictions are fetched during deployment and served as a cached static file.

## Features

- **Scores** — any game day of the season via the date strip or calendar; filter by All / Live / Top 25 / Close; any conference or the NCAA Tournament. Live games refresh every 20 seconds.
- **Torvik predictions** — projected scores and the favored team's win probability on matching scoreboard cards, labeled separately from sportsbook odds. Includes source attribution and the cache fetch time.
- **Game** — line score, venue/TV, box score per team, team stat comparison, play-by-play (all or scoring only). Projected scores from the betting line before tip-off; upsets are flagged.
- **Odds** — ESPN's sportsbook line on every game that has one: the spread on each score row (with who covered once it's final), and on the game page the spread, total and moneyline with their prices, where the line opened, and the winning side of each bet once the game ends.
- **Rankings** — AP and Coaches polls with movement and others receiving votes.
- **Teams** — searchable list of every D-I team; schedule and roster for any season back to 2002–03. Star a team to pin its games to the top of Scores (saved in the browser).

Phones get a bottom tab bar; wide screens get branded top navigation and a two-column scoreboard. Light and dark mode follow the system.

## Disclaimer

Not affiliated with the NCAA, ESPN, or any school or sportsbook. Team names and logos are trademarks of their owners. Data, logos and odds come from ESPN's public site API; odds are shown for information only.

## Develop

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

`dist/` is a static site and works from any path (routes use the URL hash).

## Prediction data

Run `python scripts/refresh-torvik.py` to refresh `public/data/torvik.json` before building locally (Python 3.10+; standard library only). `--season 2027` explicitly selects the season ending in 2027. The bundled cache supports local development without a network fetch.

The Pages workflow refreshes and deploys three times daily, at 08:17, 11:17, and 21:17 UTC (3:17am, 6:17am, and 4:17pm Eastern in standard time; an hour later in daylight time), plus pushes and manual runs. The second morning run also covers a failed or skipped early one, and the afternoon run picks up same-day changes before evening games. GitHub schedules can be delayed. Enable scheduled Actions on the default branch for automatic updates. A failed download or invalid feed logs a warning and the build deploys the committed `public/data/torvik.json` instead, so prediction failures never block site deploys; the displayed fetch timestamp makes cache age visible.

Data comes from `https://barttorvik.com/{season}_super_sked.json`, using the [column reference published by Bart Torvik](https://adamcwisports.blogspot.com/p/data.html). We fetch the bulk file once per deployment. Matchups use the Eastern game date and ESPN team IDs; `scripts/torvik-aliases.json` maps different school names explicitly. Unknown schools and missing predictions are omitted, never guessed. The cache contains one season, so dates outside it have no predictions. These are the feed's current projections, not a guaranteed archive of original pregame picks. Bart asks developers using the data to get in touch; credit and a source link appear on the scoreboard.

Torvik's firewall blocks data-center IPs, including GitHub's runners, but allows requests whose User-Agent contains `cbbscores.app` (arranged with Bart Torvik), so keep that string in `USER_AGENT`. As a fallback, `scripts/update-torvik.sh` refreshes the cache from a home machine and pushes it (which redeploys); it refuses to run with local changes and pushes nothing if the fetch fails.

Verify ingestion and matchup matching with `python scripts/test-torvik.py` and `node scripts/test-torvik.mjs`.

## Deploy

`.github/workflows/deploy.yml` builds and publishes to GitHub Pages on every push to `main`. In the repo's **Settings → Pages**, set **Source** to **GitHub Actions**.

## Layout

```
src/
  lib/espn.ts        ESPN endpoints and parsing (ported from the iOS app)
  lib/hooks.ts       data loading with cache + live polling, persisted settings, favorites
  lib/directory.ts   bundled team/conference lists
  components/        navigation bar, segmented control, lists, menus, sheets, icons
  pages/             Scores, Rankings, Teams, Team, Game
  styles.css         light/dark colors, responsive scoreboard and shared components
```
