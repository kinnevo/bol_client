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
            {/* Placeholder for future card back image */}
            <div className="card-back-design">
              <div className="card-back-circle"></div>
              <div className="card-back-lines">
                <div className="line"></div>
                <div className="line"></div>
                <div className="line"></div>
              </div>
            </div>
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
