import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { FishingDataService } from './database';
import { AppSettings } from './types';
import { UnitConverter } from './utils/unitConverter';
import Header from './components/Header';
import Dashboard from './components/Dashboard';
import SessionForm from './components/SessionForm';
import SessionList from './components/SessionList';
import CatchesList from './components/CatchesList';
import Settings from './components/Settings';
import Transfer from './components/Transfer';
import './App.css';

function App() {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const appSettings = await FishingDataService.getSettings();
        if (appSettings) {
          setSettings(appSettings);
          UnitConverter.setSettings(appSettings);
        } else {
          // Create default settings
          const defaultSettings: AppSettings = {
            units: {
              temperature: 'fahrenheit',
              distance: 'imperial',
              weight: 'imperial',
              pressure: 'inHg'
            },
            furuno: {
              enabled: false,
              ipAddress: '',
              port: 10110,
              autoConnect: false
            },
            export: {
              defaultFormat: 'csv',
              autoBackup: false,
              backupInterval: 7
            }
          };
          await FishingDataService.updateSettings(defaultSettings);
          setSettings(defaultSettings);
          UnitConverter.setSettings(defaultSettings);
        }
      } catch (error) {
        console.error('Error loading settings:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadSettings();
  }, []);

  const updateSettings = async (newSettings: AppSettings) => {
    try {
      await FishingDataService.updateSettings(newSettings);
      setSettings(newSettings);
      UnitConverter.setSettings(newSettings);
    } catch (error) {
      console.error('Error updating settings:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="app-loading">
        <div className="loading-spinner"></div>
        <p>Loading Karl Fish...</p>
      </div>
    );
  }

  return (
    <Router future={{ v7_relativeSplatPath: true }}>
      <div className="app">
        <Header settings={settings} />
        <main className="main-content">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/sessions" element={<SessionList />} />
            <Route path="/sessions/new" element={<SessionForm />} />
            <Route path="/sessions/:id" element={<SessionForm />} />
            <Route path="/catches" element={<CatchesList />} />
            <Route path="/export" element={<Transfer />} />
            <Route 
              path="/settings" 
              element={
                <Settings 
                  settings={settings!} 
                  onUpdate={updateSettings} 
                />
              } 
            />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
