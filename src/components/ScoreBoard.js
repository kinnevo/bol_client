import React from 'react';
import './ScoreBoard.css';

const ScoreBoard = ({ players, playerPoints, pointThreshold, currentPlayerId }) => {
  // Create sorted list of players by total points
  const sortedPlayers = [...players].map(player => {
    const points = playerPoints[player.id] || { connection: 0, wisdom: 0 };
    return {
      ...player,
      connection: points.connection,
      wisdom: points.wisdom,
      total: points.connection + points.wisdom
    };
  }).sort((a, b) => b.total - a.total);

  return (
    <div className="scoreboard">
      <div className="scoreboard-header">
        <h3>Scoreboard</h3>
        <span className="threshold-badge">First to {pointThreshold} wins</span>
      </div>

      <div className="scoreboard-players">
        {sortedPlayers.map((player, index) => {
          const progressPercent = Math.min((player.total / pointThreshold) * 100, 100);
          const isCurrentTurn = player.id === currentPlayerId;
          const isLeading = index === 0 && player.total > 0;

          return (
            <div
              key={player.id}
              className={`scoreboard-player ${isCurrentTurn ? 'current-turn' : ''} ${isLeading ? 'leading' : ''}`}
            >
              <div className="player-info">
                <div className="player-rank">#{index + 1}</div>
                <div className="player-name-container">
                  <span className="player-name">
                    {player.name}
                    {player.isBot && <span className="bot-badge">BOT</span>}
                  </span>
                  {isCurrentTurn && <span className="turn-indicator">Speaking</span>}
                </div>
              </div>

              <div className="player-points">
                <div className="point-item connection">
                  <span className="point-icon">❤️</span>
                  <span className="point-value">{player.connection}</span>
                </div>
                <div className="point-item wisdom">
                  <span className="point-icon">💡</span>
                  <span className="point-value">{player.wisdom}</span>
                </div>
                <div className="point-total">
                  <span className="total-value">{player.total}</span>
                  <span className="total-divider">/</span>
                  <span className="total-threshold">{pointThreshold}</span>
                </div>
              </div>

              <div className="progress-bar-container">
                <div
                  className="progress-bar"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ScoreBoard;
