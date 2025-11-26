import React from 'react';
import './ScoreBoard.css';

const ScoreBoard = ({ players, playerPoints, pointThreshold, currentPlayerId, turnOrder }) => {
  // Use turn order if provided, otherwise use players array
  const orderedPlayers = turnOrder && turnOrder.length > 0 ? turnOrder : players;

  // Map players with their points (keep turn order, don't sort by points)
  const playersWithPoints = orderedPlayers.map((player, index) => {
    const points = playerPoints[player.id] || { connection: 0, wisdom: 0 };
    return {
      ...player,
      turnNumber: index + 1,
      connection: points.connection,
      wisdom: points.wisdom,
      total: points.connection + points.wisdom
    };
  });

  return (
    <div className="scoreboard">
      <div className="scoreboard-header">
        <h3>Scoreboard</h3>
        <span className="threshold-badge">First to {pointThreshold} wins</span>
      </div>

      <div className="scoreboard-players">
        {playersWithPoints.map((player) => {
          const progressPercent = Math.min((player.total / pointThreshold) * 100, 100);
          const isCurrentTurn = player.id === currentPlayerId;

          return (
            <div
              key={player.id}
              className={`scoreboard-player ${isCurrentTurn ? 'current-turn' : ''}`}
            >
              <div className="player-info">
                <div className="player-turn-number">{player.turnNumber}</div>
                <div className="player-name-container">
                  <span className="player-name">
                    {player.isBot && <span className="bot-emoji">🤖</span>}
                    {player.name}
                    {player.isBot && <span className="bot-badge">BOT</span>}
                  </span>
                  {isCurrentTurn && <span className="turn-indicator">🎤 Speaking</span>}
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
