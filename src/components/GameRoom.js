import React, { useState, useEffect } from 'react';
import './GameRoom.css';
import Deck from './Deck';
import Card from './Card';

const GameRoom = ({ room, gameState, playerName, playerId, onGameAction, socket }) => {
  const [gameData, setGameData] = useState(null);
  const [message, setMessage] = useState('');
  const [addingBot, setAddingBot] = useState(false);
  const [botsAvailable, setBotsAvailable] = useState(false);
  const [turnOrder, setTurnOrder] = useState([]);
  const [currentPlayerId, setCurrentPlayerId] = useState(null);
  const [deckSize, setDeckSize] = useState(0);
  const [drawnCard, setDrawnCard] = useState(null);
  const [isCardFlipped, setIsCardFlipped] = useState(false);

  useEffect(() => {
    // Check if bots are available from localStorage
    const botsEnabled = localStorage.getItem('botsAvailable') === 'true';
    setBotsAvailable(botsEnabled);
  }, []);

  useEffect(() => {
    if (!socket) return;

    // Listen for game started event with turn order
    const handleGameStarted = (data) => {
      console.log('🎮 Game started event received:', data);
      if (data.turnOrder) {
        console.log('Setting turn order:', data.turnOrder);
        setTurnOrder(data.turnOrder);
        setCurrentPlayerId(data.currentPlayerId);
        setDeckSize(data.deckSize || 0);
      }
    };

    // Listen for card drawn event
    const handleCardDrawn = (data) => {
      console.log('🃏 Card drawn:', data);
      setDrawnCard(data.card);
      setDeckSize(data.deckSize);
      setIsCardFlipped(false);

      // Auto-flip the card after a brief delay
      setTimeout(() => {
        setIsCardFlipped(true);
      }, 300);
    };

    // Listen for turn changed event
    const handleTurnChanged = (data) => {
      console.log('➡️ Turn changed:', data);
      setCurrentPlayerId(data.currentPlayerId);
      // Clear the drawn card when turn changes
      setDrawnCard(null);
      setIsCardFlipped(false);
    };

    socket.on('game-started', handleGameStarted);
    socket.on('card-drawn', handleCardDrawn);
    socket.on('turn-changed', handleTurnChanged);

    return () => {
      socket.off('game-started', handleGameStarted);
      socket.off('card-drawn', handleCardDrawn);
      socket.off('turn-changed', handleTurnChanged);
    };
  }, [socket]);

  // Initialize turn order from room data if game is already playing
  useEffect(() => {
    if (room && gameState === 'playing' && room.turnOrder && turnOrder.length === 0) {
      console.log('Initializing turn order from room data:', room.turnOrder);
      setTurnOrder(room.turnOrder);
      setCurrentPlayerId(room.currentPlayerId);
      setDeckSize(room.deckSize || 0);
    }
  }, [room, gameState, turnOrder.length]);

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

  const handleDrawCard = () => {
    if (socket && room) {
      // Get the current player's ID from the socket
      const playerId = socket.id;
      socket.emit('draw-card', { roomId: room.id, playerId: playerId });
    }
  };

  const handleNextTurn = () => {
    if (socket && room) {
      socket.emit('next-turn', { roomId: room.id });
    }
  };

  // Helper to check if it's the current user's turn
  const isMyTurn = () => {
    if (!socket || !currentPlayerId) return false;
    return socket.id === currentPlayerId;
  };

  // Helper to get current player info
  const getCurrentPlayerInfo = () => {
    if (!currentPlayerId) return null;
    return turnOrder.find(p => p.id === currentPlayerId);
  };

  // Helper to check if the current player is a bot
  const isCurrentPlayerBot = () => {
    const currentPlayer = getCurrentPlayerInfo();
    return currentPlayer?.isBot || false;
  };

  // Helper to check if user is the room host/admin
  const isHost = () => {
    if (!room || !playerId) return false;
    return room.hostId === playerId;
  };

  // Handler for admin to draw card for bot
  const handleDrawCardForBot = () => {
    if (socket && room && isHost() && isCurrentPlayerBot()) {
      socket.emit('draw-card', { roomId: room.id, playerId: currentPlayerId });
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

          {/* Add Bot Button - Only show if bots are available */}
          {botsAvailable && room.players.length < room.maxPlayers && (
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
    const currentPlayerInfo = getCurrentPlayerInfo();
    const myTurn = isMyTurn();
    const currentIsBot = isCurrentPlayerBot();
    const userIsHost = isHost();

    // Debug logging for host detection
    console.log('🔍 Debug Info:', {
      socketId: socket?.id,
      playerId: playerId,
      roomHostId: room?.hostId,
      userIsHost,
      currentIsBot,
      currentPlayerId,
      shouldShowAdminControls: currentIsBot && userIsHost && !drawnCard
    });

    return (
      <div className="game-room playing">
        <div className="game-header">
          <div className="game-info">
            <h3>Game in Progress</h3>
            {currentPlayerInfo && (
              <div className={`turn-info ${myTurn ? 'my-turn' : ''}`}>
                {myTurn ? "🎯 Your Turn!" : `${currentPlayerInfo.name}'s Turn`}
                {currentPlayerInfo.isBot && !myTurn && " 🤖"}
              </div>
            )}
          </div>
        </div>

        <div className="game-content">
          {/* Turn Order Display */}
          <div className="turn-order-panel">
            <h4>Turn Order</h4>
            <div className="turn-order-list">
              {turnOrder.map((player, index) => (
                <div
                  key={player.id}
                  className={`turn-order-item ${player.id === currentPlayerId ? 'current' : ''} ${player.isBot ? 'bot' : ''}`}
                >
                  <span className="turn-number">{index + 1}</span>
                  <span className="turn-player-name">
                    {player.isBot && '🤖 '}{player.name}
                  </span>
                  {player.id === currentPlayerId && <span className="current-badge">Current</span>}
                </div>
              ))}
            </div>
          </div>

          {/* Admin Controls for Bot Turn */}
          {currentIsBot && userIsHost && !drawnCard && (
            <div className="admin-bot-control">
              <div className="admin-control-header">
                <span className="admin-badge">👑 Admin Controls</span>
                <p>Control bot player: {currentPlayerInfo.name}</p>
              </div>
              <button
                className="admin-draw-btn"
                onClick={handleDrawCardForBot}
              >
                🃏 Draw Card for Bot
              </button>
            </div>
          )}

          <div className="game-board">
            {/* Deck Section */}
            <div className="deck-section">
              <Deck
                deckSize={deckSize}
                onDrawCard={myTurn ? handleDrawCard : (currentIsBot && userIsHost ? handleDrawCardForBot : null)}
                isPlayerTurn={(myTurn || (currentIsBot && userIsHost)) && !drawnCard}
                disabled={(!myTurn && !(currentIsBot && userIsHost)) || drawnCard !== null}
              />
            </div>

            {/* Drawn Card Display */}
            {drawnCard && (
              <div className="drawn-card-section">
                <Card
                  card={drawnCard}
                  isFlipped={isCardFlipped}
                  onFlipComplete={() => {}}
                />
                {isCardFlipped && (myTurn || (currentIsBot && userIsHost)) && (
                  <div className="card-actions">
                    <button
                      className="next-turn-btn"
                      onClick={handleNextTurn}
                    >
                      Next Turn ➡️
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Instructions */}
            {!drawnCard && myTurn && (
              <div className="game-instructions">
                <p>🃏 Click the deck to draw a card!</p>
              </div>
            )}

            {!drawnCard && currentIsBot && userIsHost && (
              <div className="game-instructions bot-admin">
                <p>🤖 You're controlling bot {currentPlayerInfo.name} - Click the deck to draw!</p>
              </div>
            )}

            {!drawnCard && !myTurn && !(currentIsBot && userIsHost) && currentPlayerInfo && (
              <div className="game-instructions">
                <p>Waiting for {currentPlayerInfo.name} to draw a card...</p>
              </div>
            )}
          </div>

          <div className="game-sidebar">
            <div className="players-panel">
              <h4>Players</h4>
              {turnOrder.map((player) => (
                <div
                  key={player.id}
                  className={`player-card ${player.id === currentPlayerId ? 'active' : ''}`}
                >
                  <div className="player-avatar small">
                    {player.isBot ? '🤖' : player.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="player-details">
                    <div className="player-name">{player.name}</div>
                  </div>
                  {player.id === currentPlayerId && <div className="active-indicator">🎯</div>}
                </div>
              ))}
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
