import React, { useState } from 'react';
import { observer } from 'mobx-react-lite';
import { useStore } from '../stores/GameStore';
import './SettingsScreen.css';

const SettingsScreen: React.FC = observer(() => {
  const store = useStore();
  
  const [settings, setSettings] = useState({
    questionTimeLimit: store.settings.questionTimeLimit,
    numberOfPlayers: store.settings.numberOfPlayers
  });
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    setSettings({
      ...settings,
      [name]: parseInt(value, 10)
    });
  };
  
  const handleSave = () => {
    store.updateSettings(settings);
    store.showStartScreen();
  };
  
  const handleCancel = () => {
    store.showStartScreen();
  };

  return (
    <div className="settings-screen">
      <div className="settings-content">
        <h1 className="settings-title">Game Settings</h1>
        
        <div className="settings-form">
          <div className="setting-group">
            <label htmlFor="questionTimeLimit">Time Limit Per Question</label>
            <div className="setting-control">
              <input
                type="range"
                id="questionTimeLimit"
                name="questionTimeLimit"
                min="10"
                max="60"
                step="5"
                value={settings.questionTimeLimit}
                onChange={handleChange}
              />
              <span className="setting-value">{settings.questionTimeLimit} seconds</span>
            </div>
          </div>
          
          <div className="setting-group">
            <label htmlFor="numberOfPlayers">Number of Players</label>
            <div className="setting-control">
              <select
                id="numberOfPlayers"
                name="numberOfPlayers"
                value={settings.numberOfPlayers}
                onChange={handleChange}
              >
                <option value="2">2 Players</option>
                <option value="3">3 Players</option>
                <option value="4">4 Players</option>
              </select>
            </div>
          </div>
        </div>
        
        <div className="settings-actions">
          <button className="cancel-button" onClick={handleCancel}>
            Cancel
          </button>
          <button className="save-button" onClick={handleSave}>
            Save Settings
          </button>
        </div>
      </div>
    </div>
  );
});

export default SettingsScreen; 