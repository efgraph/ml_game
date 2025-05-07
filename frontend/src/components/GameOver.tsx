import React from 'react';
import { observer } from 'mobx-react-lite';
import { useStore } from '../stores/GameStore';
import './GameOver.css';

const GameOver: React.FC = observer(() => {
  const store = useStore();

  const playerFinalScore = store.currentPlayer.score;
  const opponentFinalScore = store.opponentPlayer.score;
  const maxPossibleScore = store.maxGameScore;

  const playerAccuracy = maxPossibleScore > 0 ? Math.round((playerFinalScore / maxPossibleScore) * 100) : 0;
  const opponentAccuracy = maxPossibleScore > 0 ? Math.round((opponentFinalScore / maxPossibleScore) * 100) : 0;
  
  const playerAvgTime = store.settings.questionTimeLimit / 2;
  const opponentAvgTime = store.settings.questionTimeLimit / 2;

  let resultMessage = '';
  let resultIcon = '';

  if (playerFinalScore > opponentFinalScore) {
    resultMessage = 'Congratulations! You won!';
    resultIcon = '🏆';
  } else if (playerFinalScore < opponentFinalScore) {
    resultMessage = 'Better luck next time!';
    resultIcon = '😢';
  } else {
    resultMessage = "It's a tie!";
    resultIcon = '🤝';
  }

  const handlePlayAgain = () => {
    store.resetGame();
  };

  return (
    <div className="game-over-container">
      <div className="game-over-card">
        <div className="game-over-header">
          <h1 className="game-over-title">Game Over</h1>
          <span className="result-icon">{resultIcon}</span>
        </div>
        
        <div className="result-message">{resultMessage}</div>
        
        <div className="final-scores">
          <div className="player-score-card">
            <h3>Your Score</h3>
            <div className="score">{playerFinalScore} / {maxPossibleScore}</div>
            <div className="stats">
              <div className="stat">
                <span className="stat-label">Accuracy:</span>
                <span className="stat-value">{playerAccuracy}%</span>
              </div>
              <div className="stat">
                <span className="stat-label">Avg. Response Time:</span>
                <span className="stat-value">{playerAvgTime} sec</span>
              </div>
            </div>
          </div>
          
          <div className="player-score-card opponent">
            <h3>Opponent's Score</h3>
            <div className="score">{opponentFinalScore} / {maxPossibleScore}</div>
            <div className="stats">
              <div className="stat">
                <span className="stat-label">Accuracy:</span>
                <span className="stat-value">{opponentAccuracy}%</span>
              </div>
              <div className="stat">
                <span className="stat-label">Avg. Response Time:</span>
                <span className="stat-value">{opponentAvgTime} sec</span>
              </div>
            </div>
          </div>
        </div>
        
        <button className="play-again-button" onClick={handlePlayAgain}>
          Play Again
        </button>
      </div>
    </div>
  );
});

export default GameOver; 