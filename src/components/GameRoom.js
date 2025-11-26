import React, { useState, useEffect } from 'react';
import './GameRoom.css';
import Deck from './Deck';
import Card from './Card';
import VoiceChat from './VoiceChat';
import ScoreBoard from './ScoreBoard';
import VotingPanel from './VotingPanel';

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
  const [voiceChatUrl, setVoiceChatUrl] = useState(null);

  // New voting system state
  const [gamePhase, setGamePhase] = useState('drawing');
  const [playerPoints, setPlayerPoints] = useState({});
  const [pointThreshold, setPointThreshold] = useState(7);
  const [votingState, setVotingState] = useState(null);
  const [hasVoted, setHasVoted] = useState(false);
  const [voteCount, setVoteCount] = useState(0);
  const [votingResults, setVotingResults] = useState(null);
  const [gameWinner, setGameWinner] = useState(null);

  useEffect(() => {
    // Check if bots are available from localStorage
    const botsEnabled = localStorage.getItem('botsAvailable') === 'true';
    setBotsAvailable(botsEnabled);
  }, []);

  // Initialize voice chat URL from room data (for reconnection after page reload)
  useEffect(() => {
    if (room && room.voiceChat && room.voiceChat.url) {
      console.log('🎙️ Initializing voice chat from room data:', room.voiceChat.url);
      setVoiceChatUrl(room.voiceChat.url);
    }
  }, [room]);

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

      // Initialize voting system state
      if (data.gamePhase) setGamePhase(data.gamePhase);
      if (data.playerPoints) setPlayerPoints(data.playerPoints);
      if (data.pointThreshold) setPointThreshold(data.pointThreshold);

      // Set voice chat URL if available
      console.log('🎙️ Voice chat data:', data.voiceChat);
      if (data.voiceChat && data.voiceChat.url) {
        console.log('🎙️ Voice chat URL received:', data.voiceChat.url);
        setVoiceChatUrl(data.voiceChat.url);
      } else {
        console.warn('⚠️ No voice chat URL in game-started event');
      }
    };

    // Listen for card drawn event
    const handleCardDrawn = (data) => {
      console.log('🃏 Card drawn:', data);
      setDrawnCard(data.card);
      setDeckSize(data.deckSize);
      setIsCardFlipped(false);
      if (data.gamePhase) setGamePhase(data.gamePhase);

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
      setHasVoted(false);
      setVoteCount(0);
      setVotingState(null);
      setVotingResults(null);
      if (data.gamePhase) setGamePhase(data.gamePhase);
      if (data.playerPoints) setPlayerPoints(data.playerPoints);
    };

    // Listen for voting phase started
    const handleVotingPhaseStarted = (data) => {
      console.log('🗳️ Voting phase started:', data);
      setGamePhase('voting');
      setVotingState({
        speakerId: data.speakerId,
        speakerName: data.speakerName,
        expectedVoters: data.expectedVoters,
        timeout: data.timeout
      });
      setHasVoted(false);
      setVoteCount(0);
    };

    // Listen for vote count updates
    const handleVoteCountUpdated = (data) => {
      console.log('🗳️ Vote count updated:', data);
      setVoteCount(data.voteCount);
    };

    // Listen for voting results
    const handleVotingResults = (data) => {
      console.log('🏆 Voting results:', data);
      setGamePhase('results');
      setVotingResults({
        speakerId: data.speakerId,
        speakerName: data.speakerName,
        connectionAwarded: data.connectionAwarded,
        wisdomAwarded: data.wisdomAwarded,
        newTotals: data.newTotals
      });
      if (data.playerPoints) setPlayerPoints(data.playerPoints);
    };

    // Listen for game ended
    const handleGameEnded = (data) => {
      console.log('🎉 Game ended:', data);
      setGamePhase('finished');
      setGameWinner({
        winnerId: data.winnerId,
        winnerName: data.winnerName,
        standings: data.standings
      });
    };

    socket.on('game-started', handleGameStarted);
    socket.on('card-drawn', handleCardDrawn);
    socket.on('turn-changed', handleTurnChanged);
    socket.on('voting-phase-started', handleVotingPhaseStarted);
    socket.on('vote-count-updated', handleVoteCountUpdated);
    socket.on('voting-results', handleVotingResults);
    socket.on('game-ended', handleGameEnded);

    return () => {
      socket.off('game-started', handleGameStarted);
      socket.off('card-drawn', handleCardDrawn);
      socket.off('turn-changed', handleTurnChanged);
      socket.off('voting-phase-started', handleVotingPhaseStarted);
      socket.off('vote-count-updated', handleVoteCountUpdated);
      socket.off('voting-results', handleVotingResults);
      socket.off('game-ended', handleGameEnded);
    };
  }, [socket]);

  // Initialize turn order from room data if game is already playing
  useEffect(() => {
    if (room && gameState === 'playing' && room.turnOrder && turnOrder.length === 0) {
      console.log('Initializing turn order from room data:', room.turnOrder);
      console.log('Room deck size:', room.deckSize, 'Current deck size state:', deckSize);
      setTurnOrder(room.turnOrder);
      setCurrentPlayerId(room.currentPlayerId);

      // Initialize deck size from room data
      if (room.deckSize !== undefined) {
        console.log('Setting deck size from room:', room.deckSize);
        setDeckSize(room.deckSize);
      } else {
        console.warn('⚠️ Room has no deckSize property!');
      }

      // Initialize voting state from room
      if (room.gamePhase) setGamePhase(room.gamePhase);
      if (room.playerPoints) setPlayerPoints(room.playerPoints);
      if (room.pointThreshold) setPointThreshold(room.pointThreshold);
    }
  }, [room, gameState, turnOrder.length, deckSize]);

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
    if (socket && room && playerId) {
      // Use the persistent player ID instead of socket.id
      socket.emit('draw-card', { roomId: room.id, playerId: playerId });
    }
  };

  const handleFinishTurn = () => {
    if (socket && room && playerId) {
      socket.emit('finish-turn', { roomId: room.id, playerId: playerId });
    }
  };

  const handleVote = (voteType) => {
    if (socket && room && playerId && !hasVoted) {
      socket.emit('submit-vote', { roomId: room.id, voterId: playerId, voteType });
      setHasVoted(true);
    }
  };

  // Helper to check if it's the current user's turn
  const isMyTurn = () => {
    if (!playerId || !currentPlayerId) {
      console.log('🔍 isMyTurn check:', { playerId, currentPlayerId, result: false });
      return false;
    }
    const result = playerId === currentPlayerId;
    console.log('🔍 isMyTurn check:', { playerId, currentPlayerId, result });
    return result;
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

  // Handler for admin to finish turn for bot
  const handleFinishTurnForBot = () => {
    if (socket && room && isHost() && isCurrentPlayerBot()) {
      socket.emit('finish-turn', { roomId: room.id, playerId: currentPlayerId });
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

    // Check if game has ended
    if (gamePhase === 'finished' && gameWinner) {
      return (
        <div className="game-room finished">
          <div className="finished-content">
            <div className="winner-celebration">
              <div className="trophy-icon">🏆</div>
              <h2>Game Over!</h2>
              <div className="winner-announcement">
                <span className="winner-label">Winner</span>
                <span className="winner-name">{gameWinner.winnerName}</span>
              </div>
            </div>

            <div className="final-standings">
              <h3>Final Standings</h3>
              {gameWinner.standings && gameWinner.standings.map((player, index) => (
                <div key={player.playerId} className={`standing-row ${index === 0 ? 'winner' : ''}`}>
                  <span className="standing-rank">#{index + 1}</span>
                  <span className="standing-name">
                    {player.playerName}
                    {player.isBot && ' 🤖'}
                  </span>
                  <span className="standing-points">
                    ❤️ {player.connection} | 💡 {player.wisdom} | Total: {player.total}
                  </span>
                </div>
              ))}
            </div>

            <button
              onClick={() => handleAction('return-to-lobby')}
              className="return-button"
            >
              Return to Lobby
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="game-room playing">
        <div className="game-layout">
          {/* Left Sidebar - ScoreBoard */}
          <div className="game-sidebar-left">
            <ScoreBoard
              players={turnOrder}
              playerPoints={playerPoints}
              pointThreshold={pointThreshold}
              currentPlayerId={currentPlayerId}
              turnOrder={turnOrder}
            />
          </div>

          {/* Main Game Area */}
          <div className="game-content-inner">
            {/* Voice Chat Component */}
            <VoiceChat
              roomUrl={voiceChatUrl}
              playerName={playerName}
              playerId={playerId}
              onError={(error) => console.error('[GameRoom] Voice chat error:', error)}
            />

            {/* Game Phase Display */}
            <div className="game-phase-indicator">
              <span className={`phase-badge ${gamePhase}`}>
                {gamePhase === 'drawing' && '🃏 Draw Phase'}
                {gamePhase === 'talking' && '🗣️ Talking Phase'}
                {gamePhase === 'voting' && '🗳️ Voting Phase'}
                {gamePhase === 'results' && '🏆 Results'}
              </span>
            </div>

            {/* Admin Controls for Bot Turn */}
            {currentIsBot && userIsHost && gamePhase === 'drawing' && !drawnCard && (
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
              {/* Drawing Phase */}
              {gamePhase === 'drawing' && (
                <>
                  <div className="deck-section">
                    <Deck
                      deckSize={deckSize}
                      onDrawCard={myTurn ? handleDrawCard : (currentIsBot && userIsHost ? handleDrawCardForBot : null)}
                      isPlayerTurn={(myTurn || (currentIsBot && userIsHost)) && !drawnCard}
                      disabled={(!myTurn && !(currentIsBot && userIsHost)) || drawnCard !== null}
                    />
                  </div>

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
                </>
              )}

              {/* Talking Phase - Show Card */}
              {gamePhase === 'talking' && drawnCard && (
                <div className="talking-phase">
                  <div className="drawn-card-section">
                    <Card
                      card={drawnCard}
                      isFlipped={isCardFlipped}
                      onFlipComplete={() => { }}
                    />
                  </div>

                  {myTurn ? (
                    <div className="talking-instructions">
                      <p>🗣️ Share your thoughts about this question, then click Finish!</p>
                      <button
                        className="finish-turn-btn"
                        onClick={handleFinishTurn}
                      >
                        ✅ Finish Turn
                      </button>
                    </div>
                  ) : currentIsBot && userIsHost ? (
                    <div className="talking-instructions bot-admin">
                      <p>🤖 Bot is "speaking" - Click to finish their turn</p>
                      <button
                        className="finish-turn-btn"
                        onClick={handleFinishTurnForBot}
                      >
                        ✅ Finish Bot's Turn
                      </button>
                    </div>
                  ) : (
                    <div className="talking-instructions">
                      <p>👂 Listen to {currentPlayerInfo?.name} share their thoughts...</p>
                    </div>
                  )}
                </div>
              )}

              {/* Voting Phase */}
              {gamePhase === 'voting' && votingState && (
                <VotingPanel
                  speakerId={votingState.speakerId}
                  speakerName={votingState.speakerName}
                  currentPlayerId={playerId}
                  expectedVoters={votingState.expectedVoters}
                  voteCount={voteCount}
                  timeout={votingState.timeout}
                  hasVoted={hasVoted}
                  onVote={handleVote}
                />
              )}

              {/* Results Phase */}
              {gamePhase === 'results' && votingResults && (
                <div className="results-phase">
                  <div className="results-card">
                    <h3>🏆 Results</h3>
                    <div className="results-speaker">
                      <span className="speaker-name">{votingResults.speakerName}</span>
                      <span className="received-label">received</span>
                    </div>
                    <div className="results-points">
                      <div className="result-point connection">
                        <span className="result-icon">❤️</span>
                        <span className="result-value">{votingResults.connectionAwarded}</span>
                        <span className="result-label">Connection</span>
                      </div>
                      <div className="result-point wisdom">
                        <span className="result-icon">💡</span>
                        <span className="result-value">{votingResults.wisdomAwarded}</span>
                        <span className="result-label">Wisdom</span>
                      </div>
                    </div>
                    <div className="results-total">
                      New Total: {(votingResults.newTotals?.connection || 0) + (votingResults.newTotals?.wisdom || 0)} / {pointThreshold}
                    </div>
                    <p className="results-wait">Next turn starting soon...</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Sidebar - Chat (hidden to encourage voice chat) */}
          {/*
          <div className="game-sidebar">
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
          */}
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
