import React, { useEffect, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { useStore } from '../stores/GameStore';
import '../styles/StarterScreen.css';

const StarterScreen = observer(() => {
  const store = useStore();
  const [playerName, setPlayerName] = useState('Шурик');

  useEffect(() => {
    console.log(`Loading state changed: ${store.isLoading}`);
  }, [store.isLoading]);

  const handleStartGame = () => {
    console.log('Starting game with player name:', playerName);
    store.setPlayerName(playerName);
    store.startGame();
  };

  const handleShowSettings = () => {
    store.showSettings();
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPlayerName(e.target.value);
  };

  return (
    <div className="starter-screen">
      <div className="starter-content">
        <h1 className="game-title">ML Game</h1>
        <p className="game-tagline">An educational game powered by machine learning</p>
        
        <div className="name-input-container">
          <label htmlFor="player-name">Your Name:</label>
          <input
            type="text"
            id="player-name"
            value={playerName}
            onChange={handleNameChange}
            placeholder="Enter your name"
            className="player-name-input"
            maxLength={20}
          />
        </div>
        
        <div className="button-container">
          <button 
            className={`start-button ${store.isLoading ? 'loading' : ''}`} 
            onClick={handleStartGame}
            disabled={store.isLoading || !playerName.trim()}
          >
            {store.isLoading ? (
              <div className="loader-container">
                <div className="loader"></div>
                <span>Loading...</span>
              </div>
            ) : (
              'Start Game'
            )}
          </button>
          <button 
            className="settings-button" 
            onClick={handleShowSettings}
            disabled={store.isLoading}
          >
            Settings
          </button>
        </div>
      </div>
    </div>
  );
});

export default StarterScreen; 