import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import './pages.css';

const ProfilePage = () => {
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [isEditing, setIsEditing] = useState(false);
    const navigate = useNavigate();

    // Form state
    const [formData, setFormData] = useState({
        displayName: '',
        bio: '',
        location: '',
        website: ''
    });

    const SERVER_URL = process.env.REACT_APP_SERVER_URL ||
        (process.env.NODE_ENV === 'production'
            ? 'https://bolrailway-production.up.railway.app'
            : 'http://localhost:3001');

    useEffect(() => {
        const sessionToken = localStorage.getItem('sessionToken');
        if (!sessionToken) {
            navigate('/');
            return;
        }
        fetchProfile();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [navigate]);

    const fetchProfile = async () => {
        const sessionToken = localStorage.getItem('sessionToken');

        try {
            const response = await fetch(`${SERVER_URL}/api/user/profile`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${sessionToken}`,
                    'Content-Type': 'application/json',
                },
            });

            const data = await response.json();

            if (data.success) {
                setProfile(data.profile);
                setFormData({
                    displayName: data.profile.displayName || '',
                    bio: data.profile.bio || '',
                    location: data.profile.location || '',
                    website: data.profile.website || ''
                });
            } else {
                if (response.status === 401) {
                    localStorage.clear();
                    navigate('/');
                    return;
                }
                setError(data.message || 'Failed to load profile');
            }
        } catch (error) {
            console.error('Error fetching profile:', error);
            setError('Unable to connect to server');
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
        setError('');
        setSuccess('');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        setSaving(true);

        const sessionToken = localStorage.getItem('sessionToken');

        try {
            const response = await fetch(`${SERVER_URL}/api/user/profile`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${sessionToken}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formData),
            });

            const data = await response.json();

            if (data.success) {
                setProfile(data.profile);
                setSuccess('Profile updated successfully!');
                setIsEditing(false);

                // Update localStorage with new display name
                if (data.profile.displayName) {
                    localStorage.setItem('displayName', data.profile.displayName);
                    localStorage.setItem('playerName', data.profile.displayName);
                }
            } else {
                setError(data.message || 'Failed to update profile');
            }
        } catch (error) {
            console.error('Error updating profile:', error);
            setError('Unable to connect to server');
        } finally {
            setSaving(false);
        }
    };

    const handleCancel = () => {
        setFormData({
            displayName: profile?.displayName || '',
            bio: profile?.bio || '',
            location: profile?.location || '',
            website: profile?.website || ''
        });
        setIsEditing(false);
        setError('');
        setSuccess('');
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    };

    if (loading) {
        return (
            <div className="loading">
                Loading profile...
            </div>
        );
    }

    return (
        <div className="profile-container">
            <div className="profile-card">
                <div className="profile-header">
                    <Link to="/lobby" className="back-link">
                        &larr; Back to Lobby
                    </Link>
                    <h1 className="profile-title">My Profile</h1>
                </div>

                {error && <div className="error-message">{error}</div>}
                {success && <div className="success-message">{success}</div>}

                {!isEditing ? (
                    // View Mode
                    <div className="profile-view">
                        <div className="profile-avatar">
                            {profile?.displayName?.charAt(0).toUpperCase() || '?'}
                        </div>

                        <div className="profile-info">
                            <div className="profile-field">
                                <label>Display Name</label>
                                <span>{profile?.displayName || 'Not set'}</span>
                            </div>

                            <div className="profile-field">
                                <label>Email</label>
                                <span>{profile?.email}</span>
                            </div>

                            <div className="profile-field">
                                <label>Bio</label>
                                <span className="profile-bio">
                                    {profile?.bio || 'No bio yet'}
                                </span>
                            </div>

                            <div className="profile-field">
                                <label>Location</label>
                                <span>{profile?.location || 'Not specified'}</span>
                            </div>

                            <div className="profile-field">
                                <label>Website</label>
                                {profile?.website ? (
                                    <a
                                        href={profile.website.startsWith('http') ? profile.website : `https://${profile.website}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="profile-link"
                                    >
                                        {profile.website}
                                    </a>
                                ) : (
                                    <span>Not specified</span>
                                )}
                            </div>

                            <div className="profile-field">
                                <label>Member Since</label>
                                <span>{formatDate(profile?.createdAt)}</span>
                            </div>
                        </div>

                        <button
                            className="edit-profile-button"
                            onClick={() => setIsEditing(true)}
                        >
                            Edit Profile
                        </button>
                    </div>
                ) : (
                    // Edit Mode
                    <form onSubmit={handleSubmit} className="profile-form">
                        <div className="form-group">
                            <label htmlFor="displayName" className="form-label">
                                Display Name
                            </label>
                            <input
                                type="text"
                                id="displayName"
                                name="displayName"
                                className="form-input"
                                value={formData.displayName}
                                onChange={handleInputChange}
                                placeholder="Your display name"
                                maxLength={100}
                                disabled={saving}
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="bio" className="form-label">
                                Bio
                            </label>
                            <textarea
                                id="bio"
                                name="bio"
                                className="form-textarea"
                                value={formData.bio}
                                onChange={handleInputChange}
                                placeholder="Tell us about yourself..."
                                maxLength={500}
                                rows={4}
                                disabled={saving}
                            />
                            <small className="char-count">
                                {formData.bio.length}/500 characters
                            </small>
                        </div>

                        <div className="form-group">
                            <label htmlFor="location" className="form-label">
                                Location
                            </label>
                            <input
                                type="text"
                                id="location"
                                name="location"
                                className="form-input"
                                value={formData.location}
                                onChange={handleInputChange}
                                placeholder="Where are you from?"
                                maxLength={100}
                                disabled={saving}
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="website" className="form-label">
                                Website
                            </label>
                            <input
                                type="text"
                                id="website"
                                name="website"
                                className="form-input"
                                value={formData.website}
                                onChange={handleInputChange}
                                placeholder="https://yourwebsite.com"
                                maxLength={255}
                                disabled={saving}
                            />
                        </div>

                        <div className="form-group readonly">
                            <label className="form-label">Email</label>
                            <input
                                type="email"
                                className="form-input"
                                value={profile?.email || ''}
                                disabled
                            />
                            <small style={{ color: '#888' }}>
                                Email cannot be changed
                            </small>
                        </div>

                        <div className="profile-actions">
                            <button
                                type="button"
                                className="cancel-button"
                                onClick={handleCancel}
                                disabled={saving}
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className="save-button"
                                disabled={saving}
                            >
                                {saving ? 'Saving...' : 'Save Changes'}
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
};

export default ProfilePage;
