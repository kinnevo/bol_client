import React from 'react';
import './Deck.css';

const Deck = ({ deckSize, onDrawCard, isPlayerTurn, disabled }) => {
  const handleClick = () => {
    if (!disabled && isPlayerTurn && deckSize > 0 && onDrawCard) {
      onDrawCard();
    }
  };

  // Create visual stack effect with multiple card backs
  const renderCardStack = () => {
    const visibleCards = Math.min(deckSize, 5); // Show max 5 cards in stack
    const cards = [];

    for (let i = 0; i < visibleCards; i++) {
      cards.push(
        <div
          key={i}
          className="deck-card"
          style={{
            transform: `translateY(-${i * 2}px) translateX(${i * 2}px)`,
            zIndex: visibleCards - i,
            opacity: 1 - (i * 0.1)
          }}
        >
          <div className="deck-card-back">
            <div className="deck-card-pattern">
              <img
                src="/logo.png"
                alt="Bridges of Life"
                className="deck-card-logo"
              />
            </div>
          </div>
        </div>
      );
    }

    return cards;
  };

  const canDraw = !disabled && isPlayerTurn && deckSize > 0;

  return (
    <div className="deck-container">
      <div
        className={`deck ${canDraw ? 'can-draw' : ''} ${disabled ? 'disabled' : ''} ${deckSize === 0 ? 'empty' : ''}`}
        onClick={handleClick}
      >
        {deckSize > 0 ? (
          <>
            <div className="deck-stack">
              {renderCardStack()}
            </div>
            <div className="deck-count">
              <span className="count-number">{deckSize}</span>
              <span className="count-label">cards</span>
            </div>
          </>
        ) : (
          <div className="deck-empty-state">
            <div className="empty-icon">🃏</div>
            <div className="empty-text">Deck Empty</div>
          </div>
        )}
      </div>

      {canDraw && (
        <div className="deck-hint">
          <span>Click to draw a card</span>
        </div>
      )}
    </div>
  );
};

export default Deck;
