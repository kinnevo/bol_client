import React, { useState, useEffect } from 'react';
import './GameRoom.css';

const GameRoom = ({ room, gameState, playerName, onGameAction, socket }) => {
  const [gameData, setGameData] = useState(null);
  const [message, setMessage] = useState('');
  const [addingBot, setAddingBot] = useState(false);

  useEffect(() => {
    // Initialize game data based on room state
    if (room && gameState === 'playing' && !gameData) {
      setGameData({
        currentPlayer: 0,
        turn: 1,
        players: room.players.map((playerId, index) => {
          const playerName = room.playerNames ? 
            room.playerNames.find(p => p.id === playerId)?.name || `Player ${index + 1}` :
            `Player ${index + 1}`;
          
          return {
            id: playerId,
            name: playerName,
            score: 0,
            isActive: index === 0
          };
        })
      });
    }
  }, [room, gameState, gameData]);

  const handleAction = (action, data = {}) => {
    if (onGameAction) {
      onGameAction(action, data);
    }
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (message.trim()) {
      handleAction('send-message', { message: message.trim() });
      setMessage('');
    }
  };

  const handleAddBot = () => {
    if (socket && room && !addingBot) {
      setAddingBot(true);
      socket.emit('add-bot', room.id);

      // Reset after a delay
      setTimeout(() => {
        setAddingBot(false);
      }, 1000);
    }
  };

  const handleRemoveBot = (botId) => {
    if (socket && room) {
      socket.emit('remove-bot', { roomId: room.id, botId: botId });
    }
  };

  if (gameState === 'waiting') {
    return (
      <div className="game-room waiting">
        <div className="waiting-content">
          <div className="waiting-icon">⏳</div>
          <h2>Waiting for Game to Start</h2>
          <p>Players in room: {room.players.length}/{room.maxPlayers}</p>
          
          <div className="players-waiting">
            {room.players.map((playerId, index) => {
              const playerData = room.playerNames ?
                room.playerNames.find(p => p.id === playerId) : null;
              const playerName = playerData?.name || `Player ${index + 1}`;
              const isBot = playerData?.isBot || false;

              return (
                <div key={playerId} className={`waiting-player ${isBot ? 'bot-player' : ''}`}>
                  <div className="player-avatar">
                    {isBot ? '🤖' : playerName.charAt(0).toUpperCase()}
                  </div>
                  <span>{playerName}</span>
                  {isBot && (
                    <button
                      className="remove-bot-btn"
                      onClick={() => handleRemoveBot(playerId)}
                      title="Remove bot"
                    >
                      ✕
                    </button>
                  )}
                </div>
              );
            })}

            {/* Show empty slots */}
            {Array.from({ length: room.maxPlayers - room.players.length }).map((_, index) => (
              <div key={`empty-${index}`} className="waiting-player empty">
                <div className="player-avatar empty">?</div>
                <span>Waiting...</span>
              </div>
            ))}
          </div>

          {/* Add Bot Button */}
          {room.players.length < room.maxPlayers && (
            <div className="bot-controls">
              <button
                onClick={handleAddBot}
                className="add-bot-button"
                disabled={addingBot}
              >
                {addingBot ? 'Adding Bot...' : '🤖 Add Bot Player'}
              </button>
              <p className="bot-help-text">
                Add bot players to fill the room and test the game!
              </p>
            </div>
          )}
          
          {room.players.length >= 2 && (
            <div className="ready-message">
              Ready to start! Waiting for host to begin the game.
            </div>
          )}
        </div>
      </div>
    );
  }

  if (gameState === 'playing') {
    return (
      <div className="game-room playing">
        <div className="game-header">
          <div className="game-info">
            <h3>Game in Progress</h3>
            {gameData && (
              <div className="turn-info">
                Turn {gameData.turn} - {gameData.players[gameData.currentPlayer]?.name}'s turn
              </div>
            )}
          </div>
        </div>
        
        <div className="game-content">
          <div className="game-board">
            <div className="board-placeholder">
              <div className="board-icon">🎲</div>
              <p>Game board will be implemented here</p>
              <p>This is where the actual game mechanics will be displayed</p>
            </div>
          </div>
          
          <div className="game-sidebar">
            <div className="players-panel">
              <h4>Players</h4>
              {gameData && gameData.players.map((player, index) => (
                <div 
                  key={player.id} 
                  className={`player-card ${player.isActive ? 'active' : ''}`}
                >
                  <div className="player-avatar small">
                    {player.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="player-details">
                    <div className="player-name">{player.name}</div>
                    <div className="player-score">Score: {player.score}</div>
                  </div>
                  {player.isActive && <div className="active-indicator">🎯</div>}
                </div>
              ))}
            </div>
            
            <div className="actions-panel">
              <h4>Game Actions</h4>
              <div className="action-buttons">
                <button 
                  className="action-btn"
                  onClick={() => handleAction('roll-dice')}
                >
                  🎲 Roll Dice
                </button>
                <button 
                  className="action-btn"
                  onClick={() => handleAction('pass-turn')}
                >
                  ⏭️ Pass Turn
                </button>
                <button 
                  className="action-btn"
                  onClick={() => handleAction('make-move')}
                >
                  🎯 Make Move
                </button>
              </div>
            </div>
            
            <div className="chat-panel">
              <h4>Chat</h4>
              <div className="chat-messages">
                <div className="chat-message system">
                  Game started! Good luck everyone! 🎮
                </div>
              </div>
              <form onSubmit={handleSendMessage} className="chat-form">
                <input
                  type="text"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Type a message..."
                  className="chat-input"
                />
                <button type="submit" className="send-btn">Send</button>
              </form>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="game-room finished">
      <div className="finished-content">
        <div className="finished-icon">🏆</div>
        <h2>Game Finished!</h2>
        <p>Thanks for playing!</p>
        <button 
          onClick={() => handleAction('return-to-lobby')}
          className="return-button"
        >
          Return to Lobby
        </button>
      </div>
    </div>
  );
};

export default GameRoom;
