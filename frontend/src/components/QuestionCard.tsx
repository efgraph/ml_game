import React from 'react';
import './QuestionCard.css';

interface QuestionCardProps {
  question: string;
  onAnswer?: () => void;
}

const QuestionCard: React.FC<QuestionCardProps> = ({ question, onAnswer }) => {
  return (
    <div className="question-card" onClick={onAnswer}>
      <div className="question-content">
        <p>{question}</p>
      </div>
    </div>
  );
};

export default QuestionCard; 