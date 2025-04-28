import React from 'react';
import { observer } from 'mobx-react-lite';
import { useStore } from '../stores/GameStore';
import './GameOver.css';

const GameOver: React.FC = observer(() => {
  const store = useStore();

  const playerCorrect = store.currentPlayer.score;
  const playerTotal = store.totalQuestions;
  const playerAccuracy = playerTotal > 0 ? Math.round((playerCorrect / playerTotal) * 100) : 0;
  const playerAvgTime = store.settings.questionTimeLimit / 2;

  const opponentCorrect = store.opponentPlayer.score;
  const opponentAccuracy = playerTotal > 0 ? Math.round((opponentCorrect / playerTotal) * 100) : 0;
  const opponentAvgTime = store.settings.questionTimeLimit / 2;

  let resultMessage = '';
  let resultIcon = '';

  if (playerCorrect > opponentCorrect) {
    resultMessage = 'Congratulations! You won!';
    resultIcon = '🏆';
  } else if (playerCorrect < opponentCorrect) {
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
            <div className="score">{playerCorrect}/{playerTotal}</div>
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
            <div className="score">{opponentCorrect}/{playerTotal}</div>
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