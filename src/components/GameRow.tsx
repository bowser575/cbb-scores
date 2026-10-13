import { Link } from 'react-router-dom'
import { isUpset, projection, statusText, type Game, type TeamSide } from '../lib/espn'
import { ChevronRight } from './icons'
import { Rank, TeamLogo, UpsetBadge } from './ui'

export function GameRow({ game, to, back }: { game: Game; to: string; back: string }) {
  const proj = game.state === 'pre' ? projection(game) : null
  const upset = isUpset(game)

  const side = (t: TeamSide, projected: number | undefined) => {
    const lost = game.state === 'final' && !t.winner
    return (
      <div className={`gr-team ${lost ? 'lost' : ''}`}>
        <TeamLogo id={t.id} size={26} />
        <Rank rank={t.rank} />
        <span className="gr-name">{t.name}</span>
        <span className="gr-record">{t.record}</span>
        {game.state !== 'pre' ? (
          <span className="gr-score">{t.score}</span>
        ) : projected != null ? (
          <span className="gr-proj">{projected}</span>
        ) : null}
      </div>
    )
  }

  return (
    <Link to={to} state={{ back }} className="row row-link game-row">
      <div className="gr-teams">
        {game.note && <div className="gr-note">{game.note}</div>}
        {side(game.away, proj?.away)}
        {side(game.home, proj?.home)}
      </div>
      <div className={`gr-status ${game.state}`}>
        <span className="gr-state">{statusText(game)}</span>
        {game.state === 'pre' && game.tv && <span className="gr-sub">{game.tv}</span>}
        {proj && <span className="gr-sub">Proj.</span>}
        {upset && <UpsetBadge live={game.state === 'live'} />}
      </div>
      <ChevronRight className="chevron" />
    </Link>
  )
}
