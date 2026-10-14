import { Link } from 'react-router-dom'
import { betResult, isUpset, lineLabel, statusText, type Game, type TeamSide } from '../lib/espn'
import { ChevronRight, TV } from './icons'
import { TeamLogo, UpsetBadge } from './ui'

export function GameRow({ game, to, back }: { game: Game; to: string; back: string }) {
  const upset = isUpset(game)
  const line = lineLabel(game)
  const cover = betResult(game)?.cover

  const side = (t: TeamSide) => {
    const lost = game.state === 'final' && !t.winner
    return (
      <div className={`gr-team ${lost ? 'lost' : ''}`}>
        <TeamLogo id={t.id} size={28} />
        <span className="gr-name">{t.name}</span>
        {t.rank && <span className="gr-rank">{t.rank}</span>}
        {game.state !== 'pre' && <span className="gr-score">{t.score}</span>}
      </div>
    )
  }

  return (
    <Link to={to} state={{ back }} className="row row-link game-row">
      <div className="gr-teams">
        {game.note && <div className="gr-note">{game.note}</div>}
        {side(game.away)}
        {side(game.home)}
      </div>
      <div className={`gr-status ${game.state}`}>
        <span className="gr-state">{statusText(game)}</span>
        {line && <span className="gr-line">{line}</span>}
        {cover && <span className="gr-cover">{cover === 'push' ? 'Push' : `${game[cover].abbr} covered`}</span>}
        {game.state !== 'final' && game.tv && (
          <span className="gr-tv">
            <TV />
            {game.tv.split(', ')[0]}
          </span>
        )}
        {upset && <UpsetBadge live={game.state === 'live'} />}
      </div>
      <ChevronRight className="chevron" />
    </Link>
  )
}
