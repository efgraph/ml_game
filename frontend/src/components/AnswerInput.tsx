import React, { useState, useEffect } from 'react';
import { observer } from 'mobx-react-lite';
import { useStore } from '../stores/GameStore';
import './AnswerInput.css';
import { AnswerEvaluation } from '../utils/answerEvaluator';
import CountdownTimer from './CountdownTimer';

interface AnswerInputProps {
  disabled?: boolean;
}

const AnswerInput: React.FC<AnswerInputProps> = observer(({ disabled = false }) => {
  const store = useStore();
  const [inputValue, setInputValue] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (store.currentQuestion) {
      setInputValue('');
    }
  }, [store.currentQuestion?.id]);

  useEffect(() => {
    if (store.currentPlayer && store.currentPlayer.lastEvaluation) {
      store.clearPlayerEvaluation();
    }
  }, [store.currentQuestionIndex]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || disabled || isSubmitting) return;

    try {
      console.log("Submitting answer:", inputValue);
      setIsSubmitting(true);
      
      await store.evaluateUserAnswer(inputValue);
      
    } catch (error) {
      console.error("Error submitting answer:", error);
      alert("Failed to submit your answer. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSkip = () => {
    if (!disabled) {
      store.evaluateUserAnswer("SKIPPED");
      setInputValue('');
    }
  };

  const handleNextQuestion = () => {
    store.goToNextQuestion();
    setInputValue('');
  };

  const getFeedbackEmoji = () => {
    if (!store.currentPlayer?.lastEvaluation) return '';
    
    switch (store.currentPlayer.lastEvaluation.evaluation) {
      case AnswerEvaluation.CORRECT:
        return '✅';
      case AnswerEvaluation.PARTIALLY_CORRECT:
        return '🟡';
      case AnswerEvaluation.INCORRECT:
        return '❌';
      default:
        return '';
    }
  };

  const renderFeedback = () => {
    const player = store.currentPlayer;
    if (!player || !player.lastEvaluation) return null;

    const isLastQuestion = store.currentQuestionIndex === store.questions.length - 1;

    return (
      <div className="feedback">
        <div className="feedback-header">
          <span className="feedback-emoji">{getFeedbackEmoji()}</span>
          <span className={`feedback-text ${player.lastEvaluation.evaluation.toString().toLowerCase()}`}>
            {player.lastEvaluation.evaluation === AnswerEvaluation.CORRECT 
              ? 'Correct!' 
              : player.lastEvaluation.evaluation === AnswerEvaluation.PARTIALLY_CORRECT 
                ? 'Partially Correct' 
                : 'Incorrect'}
          </span>
        </div>
        
        {player.lastEvaluation.feedback && (
          <div className="feedback-message">{player.lastEvaluation.feedback}</div>
        )}
        
        {player.lastAnswer && (
          <div className="user-answer">
            <strong>Your answer:</strong> {player.lastAnswer}
          </div>
        )}
        
        {store.shouldMoveToNextQuestion() ? (
          <button 
            className="next-question-btn"
            onClick={handleNextQuestion}
          >
            Next Question
          </button>
        ) : isLastQuestion && player.questionsAnswered >= store.questions.length ? (
          <div className="final-message">
            Game complete! Calculating final results...
          </div>
        ) : null}
      </div>
    );
  };

  return (
    <div className="answer-input-container">
      <CountdownTimer />
      
      {!store.currentPlayer?.lastEvaluation ? (
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            value={inputValue}
            onChange={handleInputChange}
            placeholder="Type your answer..."
            disabled={disabled || isSubmitting}
            className={isSubmitting ? 'submitting' : ''}
          />
          <div className="button-container">
            <button 
              type="submit" 
              disabled={!inputValue.trim() || disabled || isSubmitting}
              className={isSubmitting ? 'submitting' : ''}
            >
              {isSubmitting ? 'Submitting...' : 'Submit'}
            </button>
            <button 
              type="button" 
              onClick={handleSkip} 
              disabled={disabled || isSubmitting}
            >
              Skip
            </button>
          </div>
        </form>
      ) : (
        renderFeedback()
      )}
    </div>
  );
});

export default AnswerInput; 