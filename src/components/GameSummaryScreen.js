import React from 'react';
import './GameSummaryScreen.css';

/**
 * Individual section component for summary insights
 */
const SummarySection = ({ icon, title, items }) => {
  if (!items || items.length === 0) return null;

  return (
    <div className="summary-section">
      <div className="section-header">
        <span className="section-icon">{icon}</span>
        <h3 className="section-title">{title}</h3>
      </div>
      <ul className="section-items">
        {items.map((item, index) => (
          <li key={index} className="section-item">
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
};

/**
 * Main Game Summary Screen Component
 * Displays personalized AI-generated insights for a player after game completion
 */
const GameSummaryScreen = ({ playerSummary, playerName, onReturnToLobby }) => {
  // Handle loading state
  if (!playerSummary) {
    return (
      <div className="game-summary-screen loading">
        <div className="loading-content">
          <div className="loading-spinner">✨</div>
          <h2>Generating your personalized insights...</h2>
          <p>Analyzing your philosophical journey</p>
        </div>
      </div>
    );
  }

  const {
    narrative,
    commonTopics,
    emotionalHighlights,
    areasToExplore,
    nextSteps,
    nextGameSuggestions
  } = playerSummary;

  return (
    <div className="game-summary-screen">
      <div className="summary-container">
        {/* Header */}
        <div className="summary-header">
          <div className="header-decoration">✨</div>
          <h1 className="summary-title">Your Journey Insights</h1>
          <p className="player-name-display">{playerName}</p>
          <div className="header-subtitle">
            Reflections from your exploration of what makes you feel truly alive
          </div>
        </div>

        {/* Narrative Summary */}
        {narrative && (
          <div className="summary-narrative">
            <div className="narrative-content">
              {narrative}
            </div>
          </div>
        )}

        {/* Insight Sections */}
        <div className="summary-sections">
          <SummarySection
            icon="🗣️"
            title="Common Topics"
            items={commonTopics}
          />

          <SummarySection
            icon="✨"
            title="Emotional Highlights"
            items={emotionalHighlights}
          />

          <SummarySection
            icon="🔍"
            title="Areas to Explore"
            items={areasToExplore}
          />

          <SummarySection
            icon="🎯"
            title="Next Steps"
            items={nextSteps}
          />

          <SummarySection
            icon="🎮"
            title="Next Game Focus"
            items={nextGameSuggestions}
          />
        </div>

        {/* Return Button */}
        <div className="summary-actions">
          <button
            onClick={onReturnToLobby}
            className="return-lobby-button"
          >
            Return to Lobby
          </button>
        </div>
      </div>
    </div>
  );
};

export default GameSummaryScreen;
