import React, { useState } from 'react';
import './Card.css';

const Card = ({ card, isFlipped, onFlipComplete }) => {
  const [animating, setAnimating] = useState(false);

  const handleCardClick = () => {
    if (!animating && !isFlipped) {
      setAnimating(true);
      // Animation duration matches CSS
      setTimeout(() => {
        setAnimating(false);
        if (onFlipComplete) {
          onFlipComplete();
        }
      }, 600);
    }
  };

  return (
    <div className="card-container" onClick={handleCardClick}>
      <div className={`card ${isFlipped ? 'flipped' : ''} ${animating ? 'animating' : ''}`}>
        {/* Card Back */}
        <div className="card-face card-back">
          <div className="card-back-pattern">
            <img
              src="/logo.png"
              alt="Bridges of Life"
              className="card-back-logo"
            />
          </div>
        </div>

        {/* Card Front */}
        <div className="card-face card-front">
          <div className="card-content">
            <div className="card-type-badge">{card?.type || 'Unknown'}</div>
            <div className="card-text">
              <p>{card?.content?.front || 'Card content'}</p>
            </div>
            <div className="card-footer">
              <span className="card-id">{card?.id || ''}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Card;
