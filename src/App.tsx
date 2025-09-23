import { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { useSettings, useUpdateSettings } from './hooks/useFishingData';
import { AppSettings } from './types';
import { UnitConverter } from './utils/unitConverter';
import Header from './components/Header';
import Dashboard from './components/Dashboard';
import SessionForm from './components/SessionForm';
import SessionList from './components/SessionList';
import CatchesList from './components/CatchesList';
import Settings from './components/Settings';
import Export from './components/Export';
import './App.css';

function App() {
  const { data: settings, isLoading, error } = useSettings();
  const updateSettingsMutation = useUpdateSettings();

  useEffect(() => {
    if (settings) {
      UnitConverter.setSettings(settings);
    } else if (!isLoading && !error) {
      // Create default settings if none exist
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
      updateSettingsMutation.mutate(defaultSettings);
    }
  }, [settings, isLoading, error, updateSettingsMutation]);

  const updateSettings = async (newSettings: AppSettings) => {
    updateSettingsMutation.mutate(newSettings, {
      onSuccess: () => {
        UnitConverter.setSettings(newSettings);
      },
      onError: (error) => {
        console.error('Error updating settings:', error);
      }
    });
  };

  if (isLoading || updateSettingsMutation.isPending) {
    return (
      <div className="app-loading">
        <div className="loading-spinner"></div>
        <p>Loading Carl Fish...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="app-loading">
        <div className="error-message">
          <p>Error loading settings: {error.message}</p>
        </div>
      </div>
    );
  }

  return (
    <Router future={{ v7_relativeSplatPath: true }}>
      <div className="app">
        <Header settings={settings!} />
        <main className="main-content">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/sessions" element={<SessionList />} />
            <Route path="/sessions/new" element={<SessionForm />} />
            <Route path="/sessions/:id" element={<SessionForm />} />
            <Route path="/catches" element={<CatchesList />} />
            <Route path="/export" element={<Export />} />
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
