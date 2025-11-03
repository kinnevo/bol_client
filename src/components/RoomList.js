import React from 'react';
import './RoomList.css';

const RoomList = ({ rooms = [], onJoinRoom }) => {
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

  const canJoinRoom = (room) => {
    return room.status === 'waiting' && room.players.length < room.maxPlayers;
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
                  {room.players.length}/{room.maxPlayers} players
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
                    Join Room
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
            
            {room.players.length > 0 && (
              <div className="room-players">
                <div className="players-label">Players:</div>
                <div className="players-avatars">
                  {room.players.slice(0, 4).map((playerId, index) => (
                    <div key={playerId} className="player-avatar">
                      {index + 1}
                    </div>
                  ))}
                  {room.players.length > 4 && (
                    <div className="player-avatar more">
                      +{room.players.length - 4}
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
