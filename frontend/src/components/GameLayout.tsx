import React from 'react';
import './GameLayout.css';
import { observer } from 'mobx-react';
import { useStore } from '../stores/GameStore';

interface GameLayoutProps {
  questionsAnswered: number;
  totalQuestions: number;
  children: React.ReactNode;
}

const GameLayout: React.FC<GameLayoutProps> = observer(({ 
  questionsAnswered, 
  totalQuestions, 
  children 
}) => {
  const store = useStore();
  const { currentPlayer, opponentPlayer, timeRemaining, isLoading, isLoadingQuestion } = store;
  
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };
  
  const getTimerColor = () => {
    if (timeRemaining <= 5) return '#e74c3c';
    if (timeRemaining <= 10) return '#f39c12';
    return '#2ecc71';
  };
  
  const calculateScoreProgress = (score: number) => {
    const maxPossibleScore = totalQuestions;
    return Math.min((score / maxPossibleScore) * 100, 100);
  };
  
  const currentPlayerProgress = calculateScoreProgress(currentPlayer.score);
  const opponentPlayerProgress = calculateScoreProgress(opponentPlayer.score);
  
  return (
    <div className="game-layout">
      <header className="top-bar">
        <div className="stats-group">
          <div className="player-score-display">
            <span className="player-name">{currentPlayer.name}:</span>
            <span className="score-value">{currentPlayer.score}</span>
          </div>
          
          <div className="stat-item">
            <span className="stat-label">Questions:</span>
            <span className="stat-value">{questionsAnswered} / {totalQuestions}</span>
          </div>
          
          <div className="timer-display-mini">
            <span className="timer-label">Time:</span>
            <span 
              className="timer-value" 
              style={{ color: getTimerColor() }}
            >
              {formatTime(timeRemaining)}
            </span>
          </div>
          
          <div className="player-score-display opponent">
            <span className="player-name">{opponentPlayer.name}:</span>
            <span className="score-value">{opponentPlayer.score}</span>
          </div>
        </div>
        
        <div className="header-progress-bars">
          <div className="player-progress-wrapper current">
            <div className="progress-bar-mini">
              <div 
                className="progress-fill-mini" 
                style={{ width: `${currentPlayerProgress}%`, backgroundColor: '#3498db' }}
              ></div>
            </div>
          </div>
          
          <div className="player-progress-wrapper opponent">
            <div className="progress-bar-mini">
              <div 
                className="progress-fill-mini" 
                style={{ width: `${opponentPlayerProgress}%`, backgroundColor: '#e74c3c' }}
              ></div>
            </div>
          </div>
        </div>
      </header>
      <main className={`game-content ${isLoading || isLoadingQuestion ? 'loading' : ''}`}>
        {isLoading ? (
          <div className="loading-overlay">
            <div className="loading-spinner"></div>
            <p>Loading ...</p>
          </div>
        ) : null}
        {children}
      </main>
    </div>
  );
});

export default GameLayout; 