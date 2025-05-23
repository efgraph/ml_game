import React, { useRef, useEffect } from 'react';
import { observer } from 'mobx-react-lite';
import { useStore, GameHistoryItem, GameStore as GameStoreType } from '../stores/GameStore';
import './GameOver.css';

interface ReviewAnswerItemDisplayProps {
  item: GameHistoryItem;
  store: GameStoreType;
}

const ReviewAnswerItemDisplay: React.FC<ReviewAnswerItemDisplayProps> = observer(({ item, store }) => {
  const isSelected = item.isMarkedForReview;

  let classes = 'review-answer-item';
  if (isSelected) {
    classes += ' selected';
  }

  return (
    <li 
      key={item.question.id}
      className={classes}
      onClick={() => store.toggleQuestionForReview(item.question.id)}
    >
      <div className="review-item-content">
        <p className="review-question-text"><strong>Q:</strong> {item.question.question}</p>
        <p className="review-user-answer"><strong>Your Answer:</strong> {item.userAnswer || "-"}</p>
        <p className="review-evaluation">
          <strong>Evaluation:</strong> {item.evaluation.evaluation} (Score: {item.evaluation.score})
        </p>
      </div>
    </li>
  );
});

const GameOver: React.FC = observer(() => {
  const store = useStore();

  const playerFinalScore = store.currentPlayer.score;
  const opponentFinalScore = store.opponentPlayer.score;
  const maxPossibleScore = store.maxGameScore;

  const playerAccuracy = maxPossibleScore > 0 ? Math.round((playerFinalScore / maxPossibleScore) * 100) : 0;
  const opponentAccuracy = maxPossibleScore > 0 ? Math.round((opponentFinalScore / maxPossibleScore) * 100) : 0;
  
  const playerAvgTime = store.questions.length > 0 ? (store.settings.questionTimeLimit * store.questions.length / 2) / store.currentPlayer.questionsAnswered : store.settings.questionTimeLimit / 2;
  const opponentAvgTime = store.questions.length > 0 ? (store.settings.questionTimeLimit * store.questions.length / 2) / store.opponentPlayer.questionsAnswered : store.settings.questionTimeLimit / 2;

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

  const handleShowAnswers = () => {
    store.toggleReviewMode();
  };

  const ReviewAnswersDisplay = () => {
    const listRef = useRef<HTMLUListElement>(null);

    useEffect(() => {
      if (listRef.current) {
        listRef.current.scrollTop = store.reviewListScrollTop;
      }
    });

    const handleScroll = (event: React.UIEvent<HTMLUListElement>) => {
      store.setReviewListScrollTop(event.currentTarget.scrollTop);
    };

    return (
      <div className="review-answers-container">
        <h2 className="review-answers-title">Review Your Answers</h2>
        <p className="review-answers-instructions">Click on an item to select/deselect it for review.</p>
        
        {store.gameHistory.length === 0 ? (
          <p>No game history available to review.</p>
        ) : (
          <ul 
            className="review-answers-list" 
            ref={listRef} 
            onScroll={handleScroll}
          >
            {store.gameHistory.map((historyItem: GameHistoryItem) => (
              <ReviewAnswerItemDisplay 
                item={historyItem} 
                store={store} 
                key={historyItem.question.id} 
              />
            ))}
          </ul>
        )}
        
        <div className="review-answers-actions">
          <button onClick={handleShowAnswers} className="action-button review-action-button">
            Go Back
          </button>
          <button 
            onClick={() => store.submitReviewedQuestions()} 
            className="action-button review-action-button primary"
            disabled={store.selectedReviewCount === 0} 
          >
            Send ({store.selectedReviewCount})
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="game-over-container">
      <div className="game-over-card">
        {store.isReviewModeActive ? (
          <ReviewAnswersDisplay key={`review-display-${store.listRefreshKey}`} />
        ) : (
          <>
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
                    <span className="stat-value">{playerAvgTime.toFixed(1)} sec</span>
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
                    <span className="stat-value">{opponentAvgTime.toFixed(1)} sec</span>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="game-over-actions">
                <button className="action-button play-again-button" onClick={handlePlayAgain}>
                    Play Again
                </button>
                <button className="action-button show-answers-button" onClick={handleShowAnswers}>
                    Review
                </button>
            </div>
          </>
        )}
      </div>
      {store.showSuccessToast && (
        <div className="success-toast">
          <span className="success-toast-icon">✓</span>
          <span>{store.toastMessage}</span>
        </div>
      )}
    </div>
  );
});

export default GameOver; 