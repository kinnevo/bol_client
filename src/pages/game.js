import "./pages.css";
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import useSocket from '../hooks/useSocket';
import GameRoom from '../components/GameRoom';
import { checkBrowserSession, setupLogoutListener, clearBrowserSession } from '../utils/browserSession';

const GamePage = () => {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const [room, setRoom] = useState(null);
  const [playerName, setPlayerName] = useState('');
  const [playerId, setPlayerId] = useState(null); // Add playerId state
  const [gameState, setGameState] = useState('waiting'); // waiting, playing, finished
  const [error, setError] = useState('');

  const { socket, isConnected } = useSocket();

  useEffect(() => {
    // Set up listener for forced logout from other tabs
    const cleanupLogoutListener = setupLogoutListener(() => {
      alert('🚫 You have been logged out because someone else logged in this browser.');
      clearBrowserSession();
      navigate('/?logout=true');
    });

    // Set up listener for session restoration
    const handleSessionRestored = (event) => {
      console.log('🎉 Session restored event received:', event.detail);
      const { room: restoredRoom, playerName: restoredPlayerName } = event.detail;

      if (restoredRoom) {
        setRoom(restoredRoom);
        setGameState(restoredRoom.status || 'waiting');
      }

      if (restoredPlayerName) {
        setPlayerName(restoredPlayerName);
        sessionStorage.setItem('playerName', restoredPlayerName);
      }
    };

    window.addEventListener('session-restored', handleSessionRestored);

    // Check browser session first
    const currentSession = checkBrowserSession();
    if (!currentSession) {
      navigate('/');
      return;
    }

    // Get player name from sessionStorage first (unique per tab), fallback to localStorage
    let storedName = sessionStorage.getItem('playerName');
    if (!storedName) {
      storedName = localStorage.getItem('playerName');
    }

    if (!storedName) {
      navigate('/');
      return;
    }

    // Verify the stored name matches the browser session
    if (currentSession.user !== storedName) {
      console.log('🚫 Session mismatch in game page. Browser session:', currentSession.user, 'Stored name:', storedName);
      navigate('/');
      return;
    }

    // Store in sessionStorage for this tab
    sessionStorage.setItem('playerName', storedName);
    setPlayerName(storedName);

    return () => {
      cleanupLogoutListener();
      window.removeEventListener('session-restored', handleSessionRestored);
    };
  }, [navigate]);

  useEffect(() => {
    const storedName = sessionStorage.getItem('playerName');
    
    if (socket && isConnected && roomId && storedName) {
      console.log('🎮 Game page: Socket ID:', socket.id, 'Joining room:', roomId);
      
      // Since socket persists, we should already be in lobby, just join the room
      console.log('🎯 Game page: Attempting to join room:', roomId);
      socket.emit('join-room', roomId);

      // Listen for room events
      socket.on('room-joined', (roomData) => {
        console.log('📥 Room joined data:', roomData);
        setRoom(roomData);
        // Save the persistent player ID
        if (roomData.playerId) {
          setPlayerId(roomData.playerId);
          console.log('💾 Saved player ID:', roomData.playerId);
        }
        setGameState(roomData.status || 'waiting');
      });

      socket.on('player-joined-room', (data) => {
        setRoom(data.room);
      });

      socket.on('player-left-room', (data) => {
        setRoom(data.room);
      });

      socket.on('game-started', (roomData) => {
        setRoom(roomData);
        setGameState('playing');
      });

      socket.on('join-room-error', (errorMessage) => {
        setError(errorMessage);
        setTimeout(() => {
          navigate('/lobby');
        }, 3000);
      });

      // Game-specific events
      socket.on('game-updated', (gameData) => {
        // Handle game state updates
        console.log('Game updated:', gameData);
      });

      socket.on('game-ended', (result) => {
        setGameState('finished');
        console.log('Game ended:', result);
      });

      socket.on('name-taken', (data) => {
        alert(`❌ ${data.message}`);
        // Redirect back to login page to choose a different name
        navigate('/?name-conflict=true');
      });

      // Listen for real-time updates
      socket.on('player-list-updated', (updatedPlayers) => {
        console.log('🔄 Players updated in game page:', updatedPlayers.length, 'players');
      });

      socket.on('room-list-updated', (updatedRooms) => {
        console.log('🔄 Rooms updated in game page:', updatedRooms.length, 'rooms');
      });

      return () => {
        socket.off('lobby-joined');
        socket.off('room-joined');
        socket.off('player-joined-room');
        socket.off('player-left-room');
        socket.off('game-started');
        socket.off('join-room-error');
        socket.off('game-updated');
        socket.off('game-ended');
        socket.off('name-taken');
        socket.off('player-list-updated');
        socket.off('room-list-updated');
      };
    }
  }, [socket, isConnected, roomId, navigate]);

  const handleStartGame = () => {
    if (socket && room) {
      socket.emit('start-game', room.id);
    }
  };

  const handleLeaveRoom = () => {
    if (socket && room) {
      // Emit leave-room event to server
      socket.emit('leave-room', room.id);
      
      // Listen for confirmation
      const handleRoomLeft = (data) => {
        console.log('Successfully left room:', data);
        // Clear room info from localStorage
        localStorage.removeItem('currentRoom');
        // Navigate to lobby
        navigate('/lobby');
        // Clean up listener
        socket.off('room-left', handleRoomLeft);
      };
      
      socket.on('room-left', handleRoomLeft);
      
      // Fallback: navigate after timeout if no response
      setTimeout(() => {
        socket.off('room-left', handleRoomLeft);
        localStorage.removeItem('currentRoom');
        navigate('/lobby');
      }, 3000);
    } else {
      // Fallback if no socket connection
      localStorage.removeItem('currentRoom');
      navigate('/lobby');
    }
  };

  const handleGameAction = (action, data) => {
    if (socket && room) {
      socket.emit('game-action', {
        roomId: room.id,
        action,
        data
      });
    }
  };

  if (!isConnected) {
    return (
      <div className="game-container">
        <div className="loading">Connecting to server...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="game-container">
        <div className="error-container">
          <h2>Error</h2>
          <p>{error}</p>
          <p>Redirecting to lobby...</p>
        </div>
      </div>
    );
  }

  if (!room) {
    return (
      <div className="game-container">
        <div className="loading">Loading room...</div>
      </div>
    );
  }

  return (
    <div className="game-container">
      <header className="game-header">
        <div className="room-info">
          <h1>{room.name}</h1>
          <span className="room-status">
            Status: {gameState === 'waiting' ? 'Waiting for players' : 
                    gameState === 'playing' ? 'Game in progress' : 'Game finished'}
          </span>
          <div className="socket-id">
            Socket ID: {socket?.id || 'Not connected'}
          </div>
        </div>
        
        <div className="player-info">
          <span>Welcome, {playerName}!</span>
        </div>
        
        <div className="game-controls">
          <span className="player-count">
            {room.players.length}/{room.maxPlayers} players
          </span>
          
          {gameState === 'waiting' && room.players.length >= 2 && (
            <button onClick={handleStartGame} className="start-game-button">
              Start Game
            </button>
          )}
          
          <button onClick={handleLeaveRoom} className="leave-room-button">
            Leave Room
          </button>
        </div>
      </header>

      <div className="game-content">
        <GameRoom
          room={room}
          gameState={gameState}
          playerName={playerName}
          playerId={playerId}
          socket={socket}
          onGameAction={handleGameAction}
        />
      </div>

    </div>
  );
};

export default GamePage;
