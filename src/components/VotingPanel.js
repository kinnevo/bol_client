import React, { useState, useEffect } from 'react';
import './VotingPanel.css';

const VotingPanel = ({
  speakerId,
  speakerName,
  currentPlayerId,
  expectedVoters,
  voteCount,
  timeout,
  hasVoted,
  onVote
}) => {
  const [timeLeft, setTimeLeft] = useState(Math.floor(timeout / 1000));
  const [selectedVote, setSelectedVote] = useState(null);

  const isSpeaker = currentPlayerId === speakerId;

  // Countdown timer
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const handleVoteClick = (voteType) => {
    if (hasVoted || isSpeaker) return;
    setSelectedVote(voteType);
    onVote(voteType);
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const progressPercent = expectedVoters.length > 0
    ? (voteCount / expectedVoters.length) * 100
    : 0;

  return (
    <div className="voting-panel">
      <div className="voting-header">
        <h3>Voting Time!</h3>
        <div className={`timer ${timeLeft <= 10 ? 'warning' : ''}`}>
          {formatTime(timeLeft)}
        </div>
      </div>

      <div className="voting-speaker">
        <span className="speaker-label">Award points to</span>
        <span className="speaker-name">{speakerName}</span>
      </div>

      {isSpeaker ? (
        <div className="voting-waiting">
          <div className="waiting-icon">
            <div className="spinner"></div>
          </div>
          <p>Waiting for votes...</p>
          <div className="vote-progress">
            <div className="vote-progress-bar">
              <div
                className="vote-progress-fill"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <span className="vote-count">{voteCount} / {expectedVoters.length} votes</span>
          </div>
        </div>
      ) : hasVoted ? (
        <div className="voting-submitted">
          <div className="submitted-icon">
            {selectedVote === 'connection' && '❤️'}
            {selectedVote === 'wisdom' && '💡'}
            {selectedVote === 'skip' && '⏭️'}
          </div>
          <p>
            {selectedVote === 'skip'
              ? 'You skipped this vote'
              : `You gave a ${selectedVote} point`}
          </p>
          <div className="vote-progress">
            <div className="vote-progress-bar">
              <div
                className="vote-progress-fill"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <span className="vote-count">{voteCount} / {expectedVoters.length} votes</span>
          </div>
        </div>
      ) : (
        <div className="voting-buttons">
          <p className="voting-prompt">How did their answer make you feel?</p>

          <button
            className="vote-btn connection"
            onClick={() => handleVoteClick('connection')}
          >
            <span className="vote-icon">❤️</span>
            <span className="vote-label">Connection</span>
            <span className="vote-desc">I identify with what was shared</span>
          </button>

          <button
            className="vote-btn wisdom"
            onClick={() => handleVoteClick('wisdom')}
          >
            <span className="vote-icon">💡</span>
            <span className="vote-label">Wisdom</span>
            <span className="vote-desc">It opened my mind / new perspective</span>
          </button>

          <button
            className="vote-btn skip"
            onClick={() => handleVoteClick('skip')}
          >
            <span className="vote-icon">⏭️</span>
            <span className="vote-label">Skip</span>
            <span className="vote-desc">Pass this vote</span>
          </button>
        </div>
      )}
    </div>
  );
};

export default VotingPanel;
