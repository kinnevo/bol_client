import React from 'react';
import './PlayerList.css';

const PlayerList = ({ players = [] }) => {
  if (!players || players.length === 0) {
    return (
      <div className="player-list">
        <div className="empty-state">
          <p>No players online</p>
        </div>
      </div>
    );
  }

  return (
    <div className="player-list">
      <div className="players-container">
        {players.map((player) => (
          <div key={player.id} className="player-item">
            <div className="player-avatar">
              {player.name.charAt(0).toUpperCase()}
            </div>
            <div className="player-info">
              <div className="player-name">{player.name}</div>
              <div className="player-status">
                {player.room ? (
                  <span className="in-room">In game</span>
                ) : (
                  <span className="in-lobby">In lobby</span>
                )}
              </div>
            </div>
            <div className="player-indicator">
              <div className="status-dot online"></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PlayerList;
