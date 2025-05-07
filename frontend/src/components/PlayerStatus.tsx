import React from 'react';
import { observer } from 'mobx-react';
import './PlayerStatus.css';
import { AnswerEvaluation } from '../utils/answerEvaluator';

interface PlayerStatusProps {
  name: string;
  score: number;
  questionsAnswered: number;
  totalQuestions: number;
  maxGameScore: number;
  lastAnswer?: string;
  lastEvaluation: any;
  isCurrentPlayer: boolean;
}

const PlayerStatus: React.FC<PlayerStatusProps> = observer(({
  name,
  score,
  questionsAnswered,
  totalQuestions,
  maxGameScore,
  lastAnswer,
  lastEvaluation,
  isCurrentPlayer
}) => {
  const getEvaluationClass = () => {
    if (!lastEvaluation) return '';
    
    const evaluationValue = typeof lastEvaluation.evaluation === 'string'
                            ? lastEvaluation.evaluation.toUpperCase() 
                            : lastEvaluation.evaluation;

    switch (evaluationValue) {
      case AnswerEvaluation.CORRECT:
        return 'answer-correct';
      case AnswerEvaluation.PARTIALLY_CORRECT:
        return 'answer-partial';
      case AnswerEvaluation.INCORRECT: 
        return 'answer-incorrect';
      default:
        return '';
    }
  };

  const currentMaxScore = maxGameScore > 0 ? maxGameScore : 1;
  const scoreProgressPercentage = Math.min((score / currentMaxScore) * 100, 100);
  
  const progressPercent = totalQuestions > 0 ? (questionsAnswered / totalQuestions) * 100 : 0;

  return (
    <div className={`player-status ${isCurrentPlayer ? 'current-player' : 'opponent-player'}`}>
      <div className="player-header">
        <h3 className="player-name">
          {name} {isCurrentPlayer && <span className="you-label">(You)</span>}
        </h3>
        <div className="player-score">
          Score: <span className="score-value">{score}</span>
        </div>
      </div>
      
      <div className="player-progress">
        <div className="progress-bar">
          <div 
            className="progress-fill" 
            style={{ width: `${progressPercent}%` }}
          ></div>
        </div>
        <div className="progress-text">
          {questionsAnswered} of {totalQuestions} questions
        </div>
      </div>
      
      <div className="player-score-progress">
        <div className="progress-bar">
          <div 
            className="score-progress-fill" 
            style={{ width: `${scoreProgressPercentage}%` }}
          ></div>
        </div>
        <div className="progress-text">
          Score progress: {score} / {maxGameScore}
        </div>
      </div>
      
      {(lastAnswer || (!isCurrentPlayer && questionsAnswered > 0)) && (
        <div className="player-last-answer">
          <div className="last-answer-label">Last Answer:</div>
          <div className={`last-answer-value ${getEvaluationClass()}`}>
            {lastAnswer || (questionsAnswered > 0 && !isCurrentPlayer ? 'Opponent has answered' : 'Waiting...')}
          </div>
        </div>
      )}
    </div>
  );
});

export default PlayerStatus; 