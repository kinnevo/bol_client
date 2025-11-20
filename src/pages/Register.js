import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import './pages.css';

const RegisterPage = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [displayName, setDisplayName] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const SERVER_URL = process.env.REACT_APP_SERVER_URL ||
        (process.env.NODE_ENV === 'production'
            ? 'https://bolrailway-production.up.railway.app'
            : 'http://localhost:3001');

    const handleRegister = async (e) => {
        e.preventDefault();
        setError('');

        // Validation
        if (!email || !password || !confirmPassword) {
            setError('Please fill in all required fields');
            return;
        }

        // Email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            setError('Please enter a valid email address');
            return;
        }

        // Password validation
        if (password.length < 6) {
            setError('Password must be at least 6 characters long');
            return;
        }

        if (password !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        setLoading(true);

        try {
            const response = await fetch(`${SERVER_URL}/api/auth/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    email: email.trim(),
                    password: password,
                    displayName: displayName.trim() || null,
                }),
            });

            const data = await response.json();

            if (data.success) {
                // Registration successful, redirect to login
                navigate('/', {
                    state: {
                        message: 'Registration successful! Please login with your credentials.',
                        email: email.trim()
                    }
                });
            } else {
                setError(data.message || 'Registration failed. Please try again.');
            }
        } catch (error) {
            console.error('Registration error:', error);
            setError('Unable to connect to server. Please try again later.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-container">
            <div className="login-card">
                <h1 className="login-title">Create Account</h1>
                <form onSubmit={handleRegister} className="login-form">
                    <div className="form-group">
                        <label htmlFor="email" className="form-label">Email *</label>
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
                        <label htmlFor="displayName" className="form-label">
                            Display Name (optional)
                        </label>
                        <input
                            type="text"
                            id="displayName"
                            className="form-input"
                            value={displayName}
                            onChange={(e) => setDisplayName(e.target.value)}
                            placeholder="How you want to appear in game"
                            maxLength={50}
                            disabled={loading}
                        />
                        <small style={{ color: '#888', fontSize: '0.85rem' }}>
                            If not provided, we'll use the first part of your email
                        </small>
                    </div>

                    <div className="form-group">
                        <label htmlFor="password" className="form-label">Password *</label>
                        <input
                            type="password"
                            id="password"
                            className="form-input"
                            value={password}
                            onChange={(e) => {
                                setPassword(e.target.value);
                                setError('');
                            }}
                            placeholder="At least 6 characters"
                            autoComplete="new-password"
                            disabled={loading}
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="confirmPassword" className="form-label">
                            Confirm Password *
                        </label>
                        <input
                            type="password"
                            id="confirmPassword"
                            className="form-input"
                            value={confirmPassword}
                            onChange={(e) => {
                                setConfirmPassword(e.target.value);
                                setError('');
                            }}
                            placeholder="Re-enter your password"
                            autoComplete="new-password"
                            disabled={loading}
                        />
                    </div>

                    {error && <div className="error-message">{error}</div>}

                    <button
                        type="submit"
                        className="login-button"
                        disabled={loading}
                    >
                        {loading ? 'Creating Account...' : 'Create Account'}
                    </button>
                </form>

                <div style={{ marginTop: '1.5rem', textAlign: 'center' }}>
                    <p style={{ color: '#666', fontSize: '0.9rem' }}>
                        Already have an account?{' '}
                        <Link
                            to="/"
                            style={{
                                color: '#4a90e2',
                                textDecoration: 'none',
                                fontWeight: '500'
                            }}
                        >
                            Login here
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default RegisterPage;
