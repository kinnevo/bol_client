import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { checkBrowserSession, forceLogoutOtherTabs, clearBrowserSession } from '../utils/browserSession';
import './pages.css';

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const SERVER_URL = process.env.REACT_APP_SERVER_URL ||
    (process.env.NODE_ENV === 'production'
      ? 'https://bolrailway-production.up.railway.app'
      : 'http://localhost:3001');

  // Clear any existing session data on load
  useEffect(() => {
    // Check if user is coming from a logout or server restart
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('logout') === 'true' || urlParams.get('restart') === 'true') {
      clearBrowserSession();
      localStorage.removeItem('serverSessionId');
      localStorage.removeItem('sessionToken');
    }

    if (urlParams.get('reset') === 'true') {
      setError('🔄 Server has been reset. All data cleared. Please login again.');
      clearBrowserSession();
      localStorage.removeItem('sessionToken');
    }

    // Check for success message from registration
    if (location.state?.message) {
      setSuccessMessage(location.state.message);
      if (location.state.email) {
        setEmail(location.state.email);
      }
      // Clear the location state
      window.history.replaceState({}, document.title);
    }

    // Check if there's already an active tab in this window
    const currentSession = checkBrowserSession();
    if (currentSession && !currentSession.isActiveTab) {
      setError(`⚠️ ${currentSession.user} is already active in another tab of this window. Only one tab per window can be active.`);
    }
  }, [location]);

  const getWindowSessionId = () => {
    let windowId = sessionStorage.getItem('windowId');
    if (!windowId) {
      windowId = 'window_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
      sessionStorage.setItem('windowId', windowId);
    }
    return windowId;
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');

    if (!email.trim() || !password) {
      setError('Please enter your email and password');
      return;
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Please enter a valid email address');
      return;
    }

    setLoading(true);

    try {
      const windowSessionId = getWindowSessionId();

      const response = await fetch(`${SERVER_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email.trim(),
          password: password,
          windowSessionId: windowSessionId,
        }),
      });

      const data = await response.json();

      if (data.success) {
        // Store session token
        localStorage.setItem('sessionToken', data.sessionToken);

        // Store user data
        localStorage.setItem('userId', data.user.id);
        localStorage.setItem('userEmail', data.user.email);
        localStorage.setItem('displayName', data.user.displayName);

        // Also store in sessionStorage for backward compatibility
        sessionStorage.setItem('playerName', data.user.displayName);
        localStorage.setItem('playerName', data.user.displayName);

        // Force logout from other tabs and set new session
        forceLogoutOtherTabs(data.user.displayName);

        console.log('✅ Login successful:', data.user);

        // Navigate to lobby
        navigate('/lobby');
      } else {
        setError(data.message || 'Login failed. Please check your credentials.');
      }
    } catch (error) {
      console.error('Login error:', error);
      setError('Unable to connect to server. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <h1 className="login-title">Welcome to the Game</h1>
        <form onSubmit={handleLogin} className="login-form">
          {successMessage && (
            <div className="success-message" style={{
              backgroundColor: '#d4edda',
              color: '#155724',
              padding: '12px',
              borderRadius: '8px',
              marginBottom: '1rem',
              border: '1px solid #c3e6cb'
            }}>
              {successMessage}
            </div>
          )}

          <div className="form-group">
            <label htmlFor="email" className="form-label">Email:</label>
            <input
              type="email"
              id="email"
              className="form-input"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setError('');
              }}
              placeholder="your.email@example.com"
              autoComplete="email"
              disabled={loading}
              autoFocus
            />
          </div>

          <div className="form-group">
            <label htmlFor="password" className="form-label">Password:</label>
            <input
              type="password"
              id="password"
              className="form-input"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError('');
              }}
              placeholder="Enter your password"
              autoComplete="current-password"
              disabled={loading}
            />
          </div>

          {error && <div className="error-message">{error}</div>}

          <button
            type="submit"
            className="login-button"
            disabled={loading}
          >
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>

        <div style={{ marginTop: '1.5rem', textAlign: 'center' }}>
          <p style={{ color: '#666', fontSize: '0.9rem' }}>
            Don't have an account?{' '}
            <Link
              to="/register"
              style={{
                color: '#4a90e2',
                textDecoration: 'none',
                fontWeight: '500'
              }}
            >
              Register here
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
