import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { checkBrowserSession, forceLogoutOtherTabs, clearBrowserSession } from '../utils/browserSession';
import './pages.css';

const LoginPage = () => {
  const [playerName, setPlayerName] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  // Clear any existing session data on load
  useEffect(() => {
    // Check if user is coming from a logout or server restart
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('logout') === 'true' || urlParams.get('restart') === 'true') {
      clearBrowserSession();
      localStorage.removeItem('serverSessionId');
    }
    
    if (urlParams.get('name-conflict') === 'true') {
      setError('❌ Your name was already in use. Please choose a different name.');
      clearBrowserSession();
    }
    
    if (urlParams.get('reset') === 'true') {
      setError('🔄 Server has been reset. All data cleared. Please login again.');
      clearBrowserSession();
    }
    
    // Check if there's already an active tab in this window
    const currentSession = checkBrowserSession();
    if (currentSession && !currentSession.isActiveTab) {
      setError(`⚠️ ${currentSession.user} is already active in another tab of this window. Only one tab per window can be active.`);
    }
  }, []);

  const checkNameAvailability = async (name) => {
    try {
      const response = await fetch('http://localhost:3001/api/check-name', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ name: name.trim() })
      });
      
      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Error checking name availability:', error);
      return { available: true, message: 'Unable to check name availability' };
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    
    if (!playerName.trim()) {
      setError('Please enter your name');
      return;
    }

    if (playerName.trim().length < 2) {
      setError('Name must be at least 2 characters long');
      return;
    }

    // Check for existing session in this window
    const currentSession = checkBrowserSession();
    if (currentSession && !currentSession.isActiveTab) {
      const shouldContinue = window.confirm(
        `${currentSession.user} is already active in another tab of this window. ` +
        `Do you want to take over as the active tab and login as ${playerName.trim()}?`
      );
      
      if (!shouldContinue) {
        return;
      }
    } else if (currentSession && currentSession.isActiveTab && currentSession.user !== playerName.trim()) {
      const shouldContinue = window.confirm(
        `You are currently logged in as ${currentSession.user}. ` +
        `Do you want to logout and login as ${playerName.trim()}?`
      );
      
      if (!shouldContinue) {
        return;
      }
    }

    // Check if name is available globally
    const nameCheck = await checkNameAvailability(playerName.trim());
    if (!nameCheck.available) {
      setError(`❌ ${nameCheck.message}`);
      return;
    }

    // Force logout other users and set new session
    forceLogoutOtherTabs(playerName.trim());
    
    // Store player name in sessionStorage (unique per tab/window)
    sessionStorage.setItem('playerName', playerName.trim());
    // Also store in localStorage for server restart detection
    localStorage.setItem('playerName', playerName.trim());
    
    // Clear any error messages
    setError('');
    
    // Navigate to lobby
    navigate('/lobby');
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <h1 className="login-title">Welcome to the Game</h1>
        <form onSubmit={handleLogin} className="login-form">
          <div className="form-group">
            <label htmlFor="playerName" className="form-label">Enter your name:</label>
            <input
              type="text"
              id="playerName"
              className="form-input"
              value={playerName}
              onChange={(e) => {
                setPlayerName(e.target.value);
                setError(''); // Clear error when user types
              }}
              placeholder="Your name"
              maxLength={20}
              autoFocus
            />
          </div>
          {error && <div className="error-message">{error}</div>}
          <button type="submit" className="login-button">
            Join Game
          </button>
        </form>
      </div>
    </div>
  );
};

export default LoginPage;
