import { observer } from 'mobx-react'
import './App.css'
import GameLayout from './components/GameLayout'
import FlipCard from './components/FlipCard'
import AnswerInput from './components/AnswerInput'
import MultplayerPanel from './components/MultplayerPanel'
import { GameState, useStore } from './stores/GameStore'
import StarterScreen from './components/StarterScreen'
import SettingsScreen from './components/SettingsScreen'
import GameOver from './components/GameOver'

const App = observer(() => {
  const store = useStore();
  
  const renderContent = () => {
    switch (store.gameState) {
      case GameState.INITIAL:
        return <StarterScreen />;
        
      case GameState.SETTINGS:
        return <SettingsScreen />;
        
      case GameState.PLAYING:
        return (
          <GameLayout 
            questionsAnswered={store.currentPlayer.questionsAnswered}
            totalQuestions={store.totalQuestions}
          >
            <div className="game-container">
              <MultplayerPanel />
              
              <div className="question-container">
                <FlipCard 
                  question={store.currentQuestion.question}
                  answer={store.currentQuestion.answer}
                  topic={store.currentQuestion.topic}
                  context={store.currentQuestion.context}
                  onAnswered={() => {}}
                />
                
                <AnswerInput />
              </div>
            </div>
          </GameLayout>
        );
        
      case GameState.GAME_OVER:
        return <GameOver />;
        
      default:
        return <StarterScreen />;
    }
  };

  return renderContent();
})

export default App
