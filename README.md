# CBB Scores

Men's college basketball scores, rankings, and teams — a responsive React scoreboard with ESPN team logos and a restrained orange accent.

Data comes straight from ESPN's public site API in the browser; there's no backend.

## Features

- **Scores** — any game day of the season via the date strip or calendar; filter by All / Live / Top 25 / Close; any conference or the NCAA Tournament. Live games refresh every 20 seconds.
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
