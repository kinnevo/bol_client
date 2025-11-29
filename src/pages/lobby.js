import "./pages.css";
import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import useSocket from '../hooks/useSocket';
import PlayerList from '../components/PlayerList';
import RoomList from '../components/RoomList';
import { checkBrowserSession, setupLogoutListener, clearBrowserSession, startSessionHeartbeat } from '../utils/browserSession';

const LobbyPage = () => {
  const [playerName, setPlayerName] = useState('');
  const [playerId, setPlayerId] = useState('');
  const [rooms, setRooms] = useState([]);
  const [players, setPlayers] = useState([]);
  const [showCreateRoom, setShowCreateRoom] = useState(false);
  const [roomName, setRoomName] = useState('');
  const [maxPlayers, setMaxPlayers] = useState(4);
  const [isCreatingRoom, setIsCreatingRoom] = useState(false);
  const navigate = useNavigate();

  const { socket, isConnected, disconnect } = useSocket();

  useEffect(() => {
    // Set up listener for forced logout from other tabs
    const cleanupLogoutListener = setupLogoutListener(() => {
      alert('🚫 You have been logged out because someone else logged in this browser.');
      clearBrowserSession();
      navigate('/?logout=true');
    });
    
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
      console.log('🚫 Session mismatch. Browser session:', currentSession.user, 'Stored name:', storedName);
      navigate('/');
      return;
    }
    
    // Store in sessionStorage for this tab
    sessionStorage.setItem('playerName', storedName);
    setPlayerName(storedName);
    
    // Start session heartbeat to keep session alive
    const cleanupHeartbeat = startSessionHeartbeat(storedName);
    
    return () => {
      cleanupLogoutListener();
      cleanupHeartbeat();
    };
  }, [navigate]);

  useEffect(() => {
    const storedName = sessionStorage.getItem('playerName');
    
    if (socket && isConnected && storedName) {
      console.log('🔄 Lobby: Setting up socket listeners for', storedName);
      console.log('🔌 Socket ID:', socket.id, 'Connected:', isConnected);

      // Get userId from localStorage (set during login)
      const userId = localStorage.getItem('userId');

      // Join lobby with userId for proper session tracking
      socket.emit('join-lobby', { name: storedName, userId: userId });

      // Listen for lobby events
      socket.on('lobby-joined', (data) => {
        console.log('✅ Lobby joined, received rooms:', data.rooms.length, 'playerId:', data.playerId);
        setRooms(data.rooms);
        if (data.playerId) {
          setPlayerId(data.playerId);
          // Store playerId for later use
          localStorage.setItem('playerId', data.playerId);
        }
      });

      socket.on('room-list-updated', (updatedRooms) => {
        console.log('🔄 Room list updated:', updatedRooms.length, 'rooms');
        setRooms(updatedRooms);
      });

      socket.on('player-list-updated', (updatedPlayers) => {
        console.log('🔄 Player list updated:', updatedPlayers.length, 'players');
        setPlayers(updatedPlayers);
      });

      socket.on('room-created', (room) => {
        setIsCreatingRoom(false);
        // Store room info in localStorage for persistence
        localStorage.setItem('currentRoom', JSON.stringify({
          id: room.id,
          name: room.name,
          isHost: true
        }));
        navigate(`/game/${room.id}`);
      });

      socket.on('room-joined', (room) => {
        // Store room info in localStorage for persistence
        localStorage.setItem('currentRoom', JSON.stringify({
          id: room.id,
          name: room.name,
          isHost: false
        }));
        navigate(`/game/${room.id}`);
      });

      socket.on('join-room-error', (error) => {
        alert(error);
      });

      socket.on('name-taken', (data) => {
        alert(`❌ ${data.message}`);
        // Redirect back to login page to choose a different name
        navigate('/?name-conflict=true');
      });

      socket.on('create-room-error', (error) => {
        setIsCreatingRoom(false);
        alert(error);
      });

      return () => {
        socket.off('lobby-joined');
        socket.off('room-list-updated');
        socket.off('player-list-updated');
        socket.off('room-created');
        socket.off('room-joined');
        socket.off('join-room-error');
        socket.off('name-taken');
        socket.off('create-room-error');
      };
    }
  }, [socket, isConnected, navigate]);

  const checkRoomNameAvailability = async (name) => {
    try {
      const SERVER_URL = process.env.REACT_APP_SERVER_URL || 'http://localhost:3001';
      const response = await fetch(`${SERVER_URL}/api/check-room-name`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ name: name.trim() })
      });
      
      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Error checking room name availability:', error);
      return { available: true, message: 'Unable to check room name availability' };
    }
  };

  const handleCreateRoom = async (e) => {
    e.preventDefault();

    if (!roomName.trim()) {
      alert('Please enter a room name');
      return;
    }

    if (roomName.trim().length < 3) {
      alert('Room name must be at least 3 characters long');
      return;
    }

    if (roomName.trim().length > 30) {
      alert('Room name must be less than 30 characters');
      return;
    }

    // Check if room name is available
    const nameCheck = await checkRoomNameAvailability(roomName.trim());
    if (!nameCheck.available) {
      alert(`❌ ${nameCheck.message}`);
      return;
    }

    if (socket && !isCreatingRoom) {
      setIsCreatingRoom(true);
      socket.emit('create-room', {
        name: roomName.trim(),
        maxPlayers: maxPlayers
      });
    }

    setShowCreateRoom(false);
    setRoomName('');
  };

  const handleJoinRoom = (roomId) => {
    if (socket) {
      socket.emit('join-room', roomId);
    }
  };

  const handleLogout = () => {
    clearBrowserSession(); // Clear browser-wide session
    disconnect(); // Properly disconnect the socket
    navigate('/?logout=true');
  };

  if (!isConnected) {
    return (
      <div className="lobby-container">
        <div className="loading">Connecting to server...</div>
      </div>
    );
  }

  return (
    <div className="lobby-container">
      <header className="lobby-header">
        <div className="lobby-title">
          <h1>Game Lobby</h1>
          <div className="header-actions">
            <Link to="/profile" className="profile-button">
              Profile
            </Link>
            <button onClick={handleLogout} className="logout-button">
              Logout
            </button>
          </div>
        </div>
        <div className="welcome-info">
          <span className="welcome-message">Welcome, {playerName}!</span>
          <span className="socket-id">
            Socket ID: {socket?.id || 'Not connected'}
          </span>
        </div>
      </header>

      <div className="lobby-content">
        <div className="lobby-section">
          <div className="section-header">
            <h2 className="section-title">Game Rooms</h2>
            <button
              onClick={() => setShowCreateRoom(true)}
              className="create-room-button"
            >
              Create Room
            </button>
          </div>
          
          <div className="section-content">
            <RoomList rooms={rooms} onJoinRoom={handleJoinRoom} currentPlayerId={playerId} />
          </div>
        </div>

        <div className="lobby-section">
          <div className="section-header">
            <h2 className="section-title">Players Online</h2>
          </div>
          <div className="section-content">
            <PlayerList players={players} />
          </div>
        </div>
      </div>

      {showCreateRoom && (
        <div className="modal-overlay" onClick={() => setShowCreateRoom(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Create New Room</h3>
              <button 
                type="button" 
                onClick={() => setShowCreateRoom(false)}
                className="close-button"
              >
                ×
              </button>
            </div>
            <form onSubmit={handleCreateRoom} className="modal-form">
              <div className="form-group">
                <label htmlFor="roomName">Room Name:</label>
                <input
                  type="text"
                  id="roomName"
                  value={roomName}
                  onChange={(e) => setRoomName(e.target.value)}
                  placeholder="Enter room name"
                  maxLength={30}
                  autoFocus
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="maxPlayers">Max Players:</label>
                <select
                  id="maxPlayers"
                  value={maxPlayers}
                  onChange={(e) => setMaxPlayers(parseInt(e.target.value))}
                >
                  <option value={2}>2 Players</option>
                  <option value={3}>3 Players</option>
                  <option value={4}>4 Players</option>
                  <option value={6}>6 Players</option>
                </select>
              </div>
              
              <div className="modal-actions">
                <button type="submit" className="modal-button primary" disabled={isCreatingRoom}>
                  {isCreatingRoom ? 'Creating...' : 'Create Room'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreateRoom(false)}
                  className="modal-button secondary"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default LobbyPage;
