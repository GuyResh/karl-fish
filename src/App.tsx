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
import { importFishingCSV } from './utils/csvImporter';
import ConfirmModal from './components/ConfirmModal';

// Migration function to handle old settings structure
function migrateSettings(settings: any): AppSettings {
  // If settings already have nmea2000, return as-is
  if (settings.nmea2000) {
    return settings;
  }

  // Migrate from old furuno structure
  const migratedSettings: AppSettings = {
    units: settings.units || {
      temperature: 'fahrenheit',
      distance: 'imperial',
      weight: 'imperial',
      pressure: 'inHg'
    },
    nmea2000: {
      enabled: settings.furuno?.enabled || false,
      ipAddress: settings.furuno?.ipAddress || '',
      port: settings.furuno?.port || 2000,
      autoConnect: settings.furuno?.autoConnect || false
    },
    export: settings.export || {
      defaultFormat: 'csv',
      autoBackup: false,
      backupInterval: 7
    }
  };

  // Save migrated settings
  FishingDataService.saveSettings(migratedSettings);
  
  return migratedSettings;
}

function App() {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [sampleOpen, setSampleOpen] = useState(false);
  const [sampleCsv, setSampleCsv] = useState<string | null>(null);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const appSettings = await FishingDataService.getSettings();
        if (appSettings) {
          // Migrate old settings structure if needed
          const migratedSettings = migrateSettings(appSettings);
          setSettings(migratedSettings);
          UnitConverter.setSettings(migratedSettings);
        } else {
          // Create default settings
          const defaultSettings: AppSettings = {
            units: {
              temperature: 'fahrenheit',
              distance: 'imperial',
              weight: 'imperial',
              pressure: 'inHg'
            },
            nmea2000: {
              enabled: false,
              ipAddress: '',
              port: 2000,
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
        try {
          const sessions = await FishingDataService.getAllSessions();
          if (!sessions || sessions.length === 0) {
            const url = `${import.meta.env.BASE_URL}data/karl-fish-log-2024.csv`;
            const res = await fetch(url, { cache: 'no-store' });
            if (res.ok) {
              const csv = await res.text();
              setSampleCsv(csv);
              setSampleOpen(true);
            }
          }
        } catch (e) {
          console.error('Sample data load check failed:', e);
        }
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
    <Router basename={import.meta.env.BASE_URL} future={{ v7_relativeSplatPath: true }}>
      <div className="app">
        <Header settings={settings} />
        <main className="main-content">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/sessions" element={<SessionList />} />
            <Route path="/sessions/new" element={<SessionForm />} />
            <Route path="/sessions/:id" element={<SessionForm />} />
            <Route path="/catches" element={<CatchesList />} />
            <Route path="/transfer" element={<Transfer />} />
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
        <ConfirmModal
          isOpen={sampleOpen}
          onClose={() => setSampleOpen(false)}
          title="Load Sample Data?"
          message={"No data found. Load 2024 sample data?"}
          confirmLabel="Load"
          onConfirm={async () => {
            if (sampleCsv) {
              await importFishingCSV(sampleCsv);
              setSampleOpen(false);
              window.location.reload();
            }
          }}
        />
      </div>
    </Router>
  );
}

export default App;
