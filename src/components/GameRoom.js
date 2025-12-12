import React, { useState, useEffect } from 'react';
import './GameRoom.css';
import Deck from './Deck';
import Card from './Card';
import VoiceChat from './VoiceChat';
import ScoreBoard from './ScoreBoard';
import VotingPanel from './VotingPanel';
import GameSummaryScreen from './GameSummaryScreen';

const GameRoom = ({ room, gameState, playerName, playerId, onGameAction, socket }) => {
  const [gameData, setGameData] = useState(null);
  const [addingBot, setAddingBot] = useState(false);
  const [botsAvailable, setBotsAvailable] = useState(false);
  const [turnOrder, setTurnOrder] = useState([]);
  const [currentPlayerId, setCurrentPlayerId] = useState(null);
  const [deckSize, setDeckSize] = useState(0);
  const [drawnCard, setDrawnCard] = useState(null);
  const [isCardFlipped, setIsCardFlipped] = useState(false);
  const [voiceChatUrl, setVoiceChatUrl] = useState(null);
  const [voiceChatToken, setVoiceChatToken] = useState(null);

  // New voting system state
  const [gamePhase, setGamePhase] = useState('drawing');
  const [playerPoints, setPlayerPoints] = useState({});
  const [pointThreshold, setPointThreshold] = useState(7);
  const [votingState, setVotingState] = useState(null);
  const [hasVoted, setHasVoted] = useState(false);
  const [voteCount, setVoteCount] = useState(0);
  const [votingResults, setVotingResults] = useState(null);
  const [gameWinner, setGameWinner] = useState(null);

  // AI Summary state
  const [playerSummary, setPlayerSummary] = useState(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryError, setSummaryError] = useState(null);
  const [showSummaryScreen, setShowSummaryScreen] = useState(false);
  const [summaryTransitionTimer, setSummaryTransitionTimer] = useState(null);
  const [waitingForTranscripts, setWaitingForTranscripts] = useState(false);
  const [summaryRequested, setSummaryRequested] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [callEnded, setCallEnded] = useState(false);

  useEffect(() => {
    // Check if bots are available from localStorage
    const botsEnabled = localStorage.getItem('botsAvailable') === 'true';
    setBotsAvailable(botsEnabled);
  }, []);

  // Initialize voice chat URL and token from room data (for reconnection after page reload)
  useEffect(() => {
    if (room && room.voiceChat && room.voiceChat.url) {
      console.log('🎙️ Initializing voice chat from room data:', room.voiceChat.url);
      setVoiceChatUrl(room.voiceChat.url);

      // Set meeting token if available for this player
      if (room.voiceChat.tokens && room.voiceChat.tokens[playerId]) {
        console.log('🎙️ Meeting token found for player:', playerId);
        setVoiceChatToken(room.voiceChat.tokens[playerId]);
      }
    }
  }, [room, playerId]);

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

      // Reset all summary/finished state for play-again
      setGameWinner(null);
      setSummaryRequested(false);
      setWaitingForTranscripts(false);
      setSummaryLoading(false);
      setPlayerSummary(null);
      setSummaryError(null);
      setShowSummaryScreen(false);
      setCallEnded(false);
      setDrawnCard(null);
      setIsCardFlipped(false);
      setHasVoted(false);
      setVoteCount(0);
      setVotingState(null);
      setVotingResults(null);

      // Set voice chat URL and token if available
      console.log('🎙️ Voice chat data:', data.voiceChat);
      if (data.voiceChat && data.voiceChat.url) {
        console.log('🎙️ Voice chat URL received:', data.voiceChat.url);
        setVoiceChatUrl(data.voiceChat.url);

        // Set meeting token if available for this player
        if (data.voiceChat.tokens && data.voiceChat.tokens[playerId]) {
          console.log('🎙️ Meeting token received for player:', playerId);
          setVoiceChatToken(data.voiceChat.tokens[playerId]);
        } else {
          console.warn('⚠️ No meeting token available for player:', playerId);
        }
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
      // Don't auto-start transcript fetching - wait for user to click "End Game & Get Summary"
    };

    // Listen for transcripts ready (start loading summaries)
    const handleTranscriptsReady = (data) => {
      console.log('📝 Transcripts ready:', data);
      setWaitingForTranscripts(false);
      setSummaryLoading(true);
    };

    // Listen for player summaries ready
    const handlePlayerSummariesReady = (data) => {
      console.log('✨ Player summaries ready:', data);
      const mySummary = data.summaries[playerId];
      if (mySummary) {
        setPlayerSummary(mySummary);
        setSummaryLoading(false);

        // Auto-transition to summary screen after 3 seconds
        const timer = setTimeout(() => {
          setShowSummaryScreen(true);
        }, 3000);
        setSummaryTransitionTimer(timer);
      } else {
        console.warn('No summary found for current player');
        setSummaryError('No summary available for your session');
        setSummaryLoading(false);
      }
    };

    // Listen for player summaries error
    const handlePlayerSummariesError = (data) => {
      console.error('❌ Player summaries error:', data);
      setSummaryError(data.message || 'Failed to generate AI summaries');
      setSummaryLoading(false);
    };

    // Listen for transcripts error (no voice data available)
    const handleTranscriptsError = (data) => {
      console.warn('⚠️ Transcripts error:', data);
      // Don't show loading anymore, but don't block UI - user can still see leaderboard
      setWaitingForTranscripts(false);
      setSummaryLoading(false);
      setSummaryError(data.message || 'Voice transcripts not available');
    };

    socket.on('game-started', handleGameStarted);
    socket.on('card-drawn', handleCardDrawn);
    socket.on('turn-changed', handleTurnChanged);
    socket.on('voting-phase-started', handleVotingPhaseStarted);
    socket.on('vote-count-updated', handleVoteCountUpdated);
    socket.on('voting-results', handleVotingResults);
    socket.on('game-ended', handleGameEnded);
    socket.on('transcripts-ready', handleTranscriptsReady);
    socket.on('transcripts-error', handleTranscriptsError);
    socket.on('player-summaries-ready', handlePlayerSummariesReady);
    socket.on('player-summaries-error', handlePlayerSummariesError);

    return () => {
      socket.off('game-started', handleGameStarted);
      socket.off('card-drawn', handleCardDrawn);
      socket.off('turn-changed', handleTurnChanged);
      socket.off('voting-phase-started', handleVotingPhaseStarted);
      socket.off('vote-count-updated', handleVoteCountUpdated);
      socket.off('voting-results', handleVotingResults);
      socket.off('game-ended', handleGameEnded);
      socket.off('transcripts-ready', handleTranscriptsReady);
      socket.off('transcripts-error', handleTranscriptsError);
      socket.off('player-summaries-ready', handlePlayerSummariesReady);
      socket.off('player-summaries-error', handlePlayerSummariesError);

      // Clean up timer if component unmounts
      if (summaryTransitionTimer) {
        clearTimeout(summaryTransitionTimer);
      }
    };
  }, [socket, playerId, summaryTransitionTimer]);

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

  // Show leaderboard and game content for both 'playing' and 'finished' states
  // This ensures the leaderboard is shown when game ends before falling through to simple finished screen
  if (gameState === 'playing' || (gameState === 'finished' && gameWinner)) {
    const currentPlayerInfo = getCurrentPlayerInfo();
    const myTurn = isMyTurn();
    const currentIsBot = isCurrentPlayerBot();
    const userIsHost = isHost();

    // Check if game has ended - show leaderboard/summary
    const isGameFinished = (gamePhase === 'finished' || gameState === 'finished') && gameWinner;

    // Show AI summary screen if available and requested
    if (isGameFinished && showSummaryScreen && playerSummary) {
      return (
        <GameSummaryScreen
          playerSummary={playerSummary}
          playerName={playerName}
          onReturnToLobby={() => handleAction('return-to-lobby')}
        />
      );
    }

    // Handle "End Game & Get Summary" button click
    const handleGetSummary = () => {
      setSummaryRequested(true);
      setWaitingForTranscripts(true);
      // Emit event to server to start transcript retrieval
      if (socket && room) {
        console.log('[GameRoom] Requesting summary for room:', room.id);
        socket.emit('request-summary', { roomId: room.id });
      }
    };

    // Handle player profile click (mock for now)
    const handlePlayerClick = (player) => {
      setSelectedPlayer(player);
      alert(`Player Profile: ${player.playerName}\n\nThis feature is coming soon! You'll be able to view player profiles and add them as friends.`);
    };

    // Handle Add Friend click (mock for now)
    const handleAddFriend = (player) => {
      alert(`Add Friend: ${player.playerName}\n\nFriend request feature coming soon!`);
    };

    // Handle Play Again
    const handlePlayAgain = () => {
      if (socket && room) {
        console.log('[GameRoom] Requesting play again for room:', room.id);
        socket.emit('play-again', { roomId: room.id });
      }
    };

    // Use a single layout that keeps VoiceChat in the same DOM position
    // This prevents remounting when game phase changes
    return (
      <div className={`game-room ${isGameFinished ? 'finished-with-voice' : 'playing'}`}>
        {/* Status banners for finished state - only show when actively loading summary */}
        {isGameFinished && summaryLoading && (
          <div className="loading-banner">
            <span className="loading-icon">✨</span>
            <span>Generating personalized insights...</span>
          </div>
        )}

        {isGameFinished && playerSummary && !showSummaryScreen && (
          <div className="ready-banner">
            <span className="ready-icon">🎉</span>
            <span className="ready-text">AI Insights Ready!</span>
            <button
              onClick={() => {
                clearTimeout(summaryTransitionTimer);
                setShowSummaryScreen(true);
              }}
              className="view-now-button"
            >
              View Now
            </button>
            <span className="countdown-text">Auto-showing in 3s...</span>
          </div>
        )}

        {isGameFinished && summaryError && !playerSummary && (
          <div className="error-banner">
            <span className="error-icon">⚠️</span>
            <span>{summaryError}</span>
          </div>
        )}

        <div className={isGameFinished ? 'finished-layout' : 'game-layout'}>
          {/* Left Column - Voice Chat (and ScoreBoard during game) */}
          <div className={isGameFinished ? 'finished-voice-section' : 'game-sidebar-left'}>
            {isGameFinished && !callEnded && (
              <div className="voice-chat-header">
                <span className="voice-icon">🎙️</span>
                <span>Say goodbye to your friends!</span>
              </div>
            )}
            {isGameFinished && callEnded && (
              <div className="voice-chat-header">
                <span className="voice-icon">✨</span>
                <span>Generating AI Insights...</span>
              </div>
            )}
            {!isGameFinished && (
              <ScoreBoard
                players={turnOrder}
                playerPoints={playerPoints}
                pointThreshold={pointThreshold}
                currentPlayerId={currentPlayerId}
                turnOrder={turnOrder}
              />
            )}
            <div className={`voice-chat-wrapper ${isGameFinished ? 'large' : ''}`}>
              <VoiceChat
                roomUrl={voiceChatUrl}
                playerName={playerName}
                meetingToken={voiceChatToken}
                onError={(error) => console.error('[GameRoom] Voice chat error:', error)}
                onMeetingEnded={() => setCallEnded(true)}
              />
            </div>
          </div>

          {/* Right side content - changes based on game state */}
          {isGameFinished ? (
            /* Finished: Show game results */
            <div className="finished-results-section">
              {/* Winner announcement */}
              <div className="winner-card">
                <div className="trophy-icon">🏆</div>
                <h2>Game Over!</h2>
                <div className="winner-badge">
                  <span className="winner-label">Winner</span>
                  <span className="winner-name">{gameWinner.winnerName}</span>
                </div>
              </div>

              {/* Leaderboard */}
              <div className="leaderboard-card">
                <div className="leaderboard-header">
                  <h3>Final Standings</h3>
                  <span className="goal-badge">Goal: {pointThreshold} pts</span>
                </div>

                <div className="leaderboard-list">
                  {gameWinner.standings && gameWinner.standings.map((player, index) => (
                    <div
                      key={player.playerId}
                      className={`leaderboard-entry ${index === 0 ? 'winner' : ''}`}
                    >
                      <div className="entry-left" onClick={() => handlePlayerClick(player)}>
                        <span className="entry-rank">{index === 0 ? '👑' : `#${index + 1}`}</span>
                        <div className="entry-avatar">
                          {player.isBot ? '🤖' : player.playerName.charAt(0).toUpperCase()}
                        </div>
                        <span className="entry-name">{player.playerName}</span>
                      </div>
                      <div className="entry-right">
                        <span className="entry-points-mini">
                          <span className="heart">❤️ {player.connection}</span>
                          <span className="bulb">💡 {player.wisdom}</span>
                        </span>
                        <span className="entry-total">{player.total}</span>
                        {/* Add Friend button for non-bots */}
                        {!player.isBot && player.playerId !== playerId && (
                          <button
                            className="add-friend-inline-btn"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleAddFriend(player);
                            }}
                            title="Add Friend"
                          >
                            👤+
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action buttons */}
              <div className="finished-actions">
                {!summaryRequested ? (
                  <button onClick={handleGetSummary} className="get-summary-btn">
                    <span>✨</span> End Game & Get AI Summary
                  </button>
                ) : (
                  <div className="finished-buttons-row">
                    <button onClick={handlePlayAgain} className="play-again-btn">
                      <span>🔄</span> Play Again
                    </button>
                    <button
                      onClick={() => handleAction('return-to-lobby')}
                      className="return-btn"
                    >
                      Return to Lobby
                    </button>
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* Playing: Show game content */
            <div className="game-content-inner">

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
          )}
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
