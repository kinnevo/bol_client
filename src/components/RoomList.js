import React from 'react';
import './RoomList.css';

const RoomList = ({ rooms = [], onJoinRoom, currentPlayerId }) => {
  if (!rooms || rooms.length === 0) {
    return (
      <div className="room-list">
        <div className="empty-state">
          <div className="empty-icon">🎮</div>
          <p>No active rooms</p>
          <span>Create a room to get started!</span>
        </div>
      </div>
    );
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'waiting':
        return '#27ae60';
      case 'playing':
        return '#f39c12';
      case 'finished':
        return '#95a5a6';
      default:
        return '#3498db';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'waiting':
        return 'Waiting for players';
      case 'playing':
        return 'Game in progress';
      case 'finished':
        return 'Game finished';
      default:
        return 'Unknown';
    }
  };

  // Get actual player count from either players array or playerNames array
  const getPlayerCount = (room) => {
    if (room.playerNames && room.playerNames.length > 0) {
      return room.playerNames.length;
    }
    return room.players ? room.players.length : 0;
  };

  // Check if current player was originally in this game (for rejoin)
  const wasInGame = (room) => {
    if (!currentPlayerId || !room.turnOrder) return false;
    return room.turnOrder.some(p =>
      (typeof p === 'object' ? p.id : p) === currentPlayerId
    );
  };

  const canJoinRoom = (room) => {
    // Can join if waiting and not full
    if (room.status === 'waiting' && getPlayerCount(room) < room.maxPlayers) {
      return true;
    }
    // Can rejoin if game in progress and was originally in the game
    if (room.status === 'playing' && wasInGame(room)) {
      return true;
    }
    return false;
  };

  return (
    <div className="room-list">
      <div className="rooms-container">
        {rooms.map((room) => (
          <div key={room.id} className="room-item">
            <div className="room-header">
              <div className="room-name">{room.name}</div>
              <div 
                className="room-status"
                style={{ color: getStatusColor(room.status) }}
              >
                {getStatusText(room.status)}
              </div>
            </div>
            
            <div className="room-details">
              <div className="room-info">
                <div className="player-count">
                  <span className="count-icon">👥</span>
                  {getPlayerCount(room)}/{room.maxPlayers} players
                </div>

                <div className="room-id">
                  Room ID: {room.id.slice(-6)} • Host: {room.hostId ? room.hostId.slice(-4) : 'Unknown'}
                </div>
              </div>

              <div className="room-actions">
                {canJoinRoom(room) ? (
                  <button
                    onClick={() => onJoinRoom(room.id)}
                    className="join-button"
                  >
                    {room.status === 'playing' && wasInGame(room) ? 'Rejoin Game' : 'Join Room'}
                  </button>
                ) : room.status === 'playing' ? (
                  <button className="join-button disabled" disabled>
                    In Progress
                  </button>
                ) : (
                  <button className="join-button disabled" disabled>
                    Room Full
                  </button>
                )}
              </div>
            </div>
            
            {getPlayerCount(room) > 0 && (
              <div className="room-players">
                <div className="players-label">Players:</div>
                <div className="players-avatars">
                  {(room.playerNames || room.players || []).slice(0, 4).map((player, index) => (
                    <div key={typeof player === 'object' ? player.id : player} className="player-avatar">
                      {index + 1}
                    </div>
                  ))}
                  {getPlayerCount(room) > 4 && (
                    <div className="player-avatar more">
                      +{getPlayerCount(room) - 4}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default RoomList;
