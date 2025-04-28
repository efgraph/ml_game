import React from 'react';
import { observer } from 'mobx-react';
import './MultplayerPanel.css';
import PlayerStatus from './PlayerStatus';
import gameStore from '../stores/GameStore';

const MultplayerPanel: React.FC = observer(() => {
  const { currentPlayer, opponentPlayer, totalQuestions } = gameStore;
  
  return (
    <div className="multiplayer-panel">
      <div className="players-container">
        <PlayerStatus 
          name={currentPlayer.name}
          score={currentPlayer.score}
          questionsAnswered={currentPlayer.questionsAnswered}
          totalQuestions={totalQuestions}
          lastAnswer={currentPlayer.lastAnswer}
          lastEvaluation={currentPlayer.lastEvaluation}
          isCurrentPlayer={true}
        />
        
        <PlayerStatus 
          name={opponentPlayer.name}
          score={opponentPlayer.score}
          questionsAnswered={opponentPlayer.questionsAnswered}
          totalQuestions={totalQuestions}
          lastAnswer={opponentPlayer.lastAnswer}
          lastEvaluation={opponentPlayer.lastEvaluation}
          isCurrentPlayer={false}
        />
      </div>
    </div>
  );
});

export default MultplayerPanel; 