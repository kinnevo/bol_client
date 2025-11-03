import "./pages.css";
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { clearBrowserSession } from '../utils/browserSession';

const ResetPage = () => {
  const [message, setMessage] = useState('');
  const [isResetting, setIsResetting] = useState(false);
  const navigate = useNavigate();

  const handleResetBrowserSession = () => {
    clearBrowserSession();
    setMessage('✅ Browser session cleared successfully!');
    setTimeout(() => {
      navigate('/');
    }, 2000);
  };

  const handleResetServer = async () => {
    setIsResetting(true);
    try {
      const SERVER_URL = process.env.REACT_APP_SERVER_URL || 
        (process.env.NODE_ENV === 'production' 
          ? 'https://bolrailway-production.up.railway.app' 
          : 'http://localhost:3001');
      
      const response = await fetch(`${SERVER_URL}/admin/reset`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        setMessage('✅ Server reset successfully! All rooms and players cleared.');
      } else {
        setMessage('❌ Failed to reset server. Make sure server is running.');
      }
    } catch (error) {
      setMessage('❌ Error connecting to server: ' + error.message);
    }
    setIsResetting(false);
  };

  const handleFullReset = async () => {
    const confirmReset = window.confirm(
      '⚠️ FULL RESET WARNING ⚠️\n\n' +
      'This will:\n' +
      '• Disconnect ALL connected clients\n' +
      '• Clear ALL rooms and players on server\n' +
      '• Clear ALL browser data (localStorage, sessionStorage)\n' +
      '• Force refresh to login page\n\n' +
      'Are you sure you want to continue?'
    );
    
    if (!confirmReset) {
      return;
    }
    
    setIsResetting(true);
    setMessage('🔄 Initiating full reset...');
    
    try {
      // Reset server first - this will disconnect all clients
      const response = await fetch('http://localhost:3001/admin/reset', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        setMessage('✅ Server reset initiated. Disconnecting all clients...');
        
        // Clear all browser data
        localStorage.clear();
        sessionStorage.clear();
        
        // Give server time to disconnect clients, then redirect
        setTimeout(() => {
          window.location.href = '/?reset=true';
        }, 2000);
      } else {
        throw new Error('Server reset failed');
      }
    } catch (error) {
      setMessage('❌ Full reset failed: ' + error.message);
      setIsResetting(false);
    }
  };

  const handleClearAllStorage = () => {
    localStorage.clear();
    sessionStorage.clear();
    setMessage('✅ All browser storage cleared!');
    setTimeout(() => {
      navigate('/');
    }, 2000);
  };

  const handleGetServerStats = async () => {
    try {
      const response = await fetch('http://localhost:3001/admin/stats');
      if (response.ok) {
        const stats = await response.json();
        const memUsage = `${Math.round(stats.memoryUsage.rss / 1024 / 1024)}MB`;
        setMessage(
          `📊 Server Stats:\n` +
          `• Rooms: ${stats.rooms}\n` +
          `• Players: ${stats.players}\n` +
          `• Connected Clients: ${stats.connectedClients}\n` +
          `• Socket Connections: ${stats.connectedSockets}\n` +
          `• Uptime: ${stats.uptime}s\n` +
          `• Memory: ${memUsage}\n` +
          `• Session ID: ${stats.serverSessionId.slice(-8)}`
        );
      } else {
        setMessage('❌ Failed to get server stats.');
      }
    } catch (error) {
      setMessage('❌ Error: ' + error.message);
    }
  };

  const handleGetCurrentPlayers = async () => {
    try {
      const response = await fetch('http://localhost:3001/debug/rooms');
      if (response.ok) {
        const data = await response.json();
        const playerNames = data.players.map(p => p.name).join(', ');
        setMessage(`👥 Current Players (${data.players.length}): ${playerNames || 'None'}`);
      } else {
        setMessage('❌ Failed to get current players.');
      }
    } catch (error) {
      setMessage('❌ Error: ' + error.message);
    }
  };

  const handleGetCurrentRooms = async () => {
    try {
      const response = await fetch('http://localhost:3001/debug/rooms');
      if (response.ok) {
        const data = await response.json();
        const roomNames = data.rooms.map(r => `"${r.name}" (${r.players.length}/${r.maxPlayers})`).join(', ');
        setMessage(`🏠 Current Rooms (${data.rooms.length}): ${roomNames || 'None'}`);
      } else {
        setMessage('❌ Failed to get current rooms.');
      }
    } catch (error) {
      setMessage('❌ Error: ' + error.message);
    }
  };

  return (
    <div className="reset-container">
      <div className="reset-card">
        <h1>🔧 Game Reset Center</h1>
        <p>Use these tools to reset different parts of the game system.</p>
        
        {message && (
          <div className={`message ${message.includes('❌') ? 'error' : 'success'}`}>
            {message}
          </div>
        )}
        
        <div className="reset-options">
          <div className="reset-option">
            <h3>🚪 Reset Browser Session</h3>
            <p>Logout current user and clear browser session</p>
            <button 
              onClick={handleResetBrowserSession}
              className="reset-button session-reset"
            >
              Reset Session
            </button>
          </div>
          
          <div className="reset-option">
            <h3>🗑️ Clear All Storage</h3>
            <p>Clear all localStorage and sessionStorage data</p>
            <button 
              onClick={handleClearAllStorage}
              className="reset-button storage-reset"
            >
              Clear Storage
            </button>
          </div>
          
          <div className="reset-option">
            <h3>🖥️ Reset Server</h3>
            <p>Clear all rooms and players on the server</p>
            <button 
              onClick={handleResetServer}
              disabled={isResetting}
              className="reset-button server-reset"
            >
              {isResetting ? 'Resetting...' : 'Reset Server'}
            </button>
          </div>
          
          <div className="reset-option">
            <h3>📊 Server Stats</h3>
            <p>Get current server statistics</p>
            <button 
              onClick={handleGetServerStats}
              className="reset-button stats-button"
            >
              Get Stats
            </button>
          </div>

          <div className="reset-option">
            <h3>👥 Current Players</h3>
            <p>See who is currently online</p>
            <button 
              onClick={handleGetCurrentPlayers}
              className="reset-button players-button"
            >
              Show Players
            </button>
          </div>

          <div className="reset-option">
            <h3>🏠 Current Rooms</h3>
            <p>See all active game rooms</p>
            <button 
              onClick={handleGetCurrentRooms}
              className="reset-button rooms-button"
            >
              Show Rooms
            </button>
          </div>
          
          <div className="reset-option danger">
            <h3>💥 Full Reset</h3>
            <p>Reset everything: browser, storage, and server</p>
            <button 
              onClick={handleFullReset}
              disabled={isResetting}
              className="reset-button full-reset"
            >
              {isResetting ? 'Resetting...' : 'Full Reset'}
            </button>
          </div>
        </div>
        
        <div className="navigation">
          <button onClick={() => navigate('/')} className="nav-button">
            ← Back to Login
          </button>
        </div>
      </div>
    </div>
  );
};

export default ResetPage;
