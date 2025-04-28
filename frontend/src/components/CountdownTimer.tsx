import React from 'react';
import { observer } from 'mobx-react';
import './CountdownTimer.css';
import gameStore from '../stores/GameStore';

const CountdownTimer: React.FC = observer(() => {
  const { timeRemaining, timerProgress, timerActive } = gameStore;
  
  const getTimerColor = () => {
    if (timeRemaining <= 5) return '#e74c3c';
    if (timeRemaining <= 10) return '#f39c12';
    return '#2ecc71';
  };
  
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className={`countdown-timer ${!timerActive ? 'paused' : ''}`}>
      <div className="timer-display">
        <div className="time-left">{formatTime(timeRemaining)}</div>
        
        <div className="timer-progress-container">
          <div 
            className="timer-progress-bar"
            style={{ 
              width: `${timerProgress}%`,
              backgroundColor: getTimerColor()
            }}
          ></div>
        </div>
      </div>
    </div>
  );
});

export default CountdownTimer; 