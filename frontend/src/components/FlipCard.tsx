import React, { useState, useEffect } from 'react';
import './FlipCard.css';
import gameStore from '../stores/GameStore';

interface FlipCardProps {
  question: string;
  answer: string;
  topic?: string;
  onAnswered?: () => void;
}

const FlipCard: React.FC<FlipCardProps> = ({ 
  question, 
  answer, 
  topic, 
  onAnswered 
}) => {
  const [isFlipped, setIsFlipped] = useState(false);

  useEffect(() => {
    setIsFlipped(false);
  }, [question]);
  
  useEffect(() => {
    const timeIsUp = gameStore.timeRemaining === 0 && !gameStore.timerActive;
    if (timeIsUp && !isFlipped) {
      setIsFlipped(true);
    }
  }, [gameStore.timeRemaining, gameStore.timerActive, isFlipped]);

  const handleFlip = () => {
    if (gameStore.timerActive || isFlipped) {
      
      setIsFlipped(!isFlipped);
      
      if (isFlipped && onAnswered) {
        onAnswered();
      }
    }
  };

  return (
    <div 
      className={`flip-card ${isFlipped ? 'flipped' : ''}`} 
      onClick={handleFlip}
    >
      <div className="flip-card-inner">
        <div className="flip-card-front">
          <div className="card-content">
            {topic && <div className="card-topic">Topic: {topic}</div>}
            <p className="question-text">{question}</p>
            <span className="flip-hint">Click to reveal answer</span>
          </div>
        </div>
        <div className="flip-card-back">
          <div className="card-content">
            <p className="answer-text">{answer || "No answer provided yet."}</p>
            <span className="flip-hint">Click to go back</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FlipCard; 