import React, { useState, useEffect } from 'react';
import './FlipCard.css';
import gameStore from '../stores/GameStore';

interface FlipCardProps {
  question: string;
  answer: string;
  topic?: string;
  context?: string;
  onAnswered?: () => void;
}

const getFirstNSentences = (text: string | undefined, n: number): string => {
  if (!text) return "";
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
  return sentences.slice(0, n).join(' ').trim();
};

const FlipCard: React.FC<FlipCardProps> = ({ 
  question, 
  answer, 
  topic, 
  context,
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

  const displayContext = getFirstNSentences(context, 2);

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
            <span className="flip-hint">Click for hint</span>
          </div>
        </div>
        <div className="flip-card-back">
          <div className="card-content">
            <p className="answer-text hint-text">{displayContext || "No hint available."}</p>
            <span className="flip-hint">Click to go back</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FlipCard; 