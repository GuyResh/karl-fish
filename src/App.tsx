import { useState, useEffect, Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { FishingDataService } from './database';
import { AppSettings } from './types';
import { UnitConverter } from './utils/unitConverter';
import Header from './components/Header';
import AuthModal from './components/AuthModal';
import PasswordResetPage from './components/PasswordResetPage';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { DataSyncService } from './services/dataSyncService';
import { OfflineService } from './services/offlineService';
import './App.css';
import { generateTwoYearsOfData } from './services/sampleDataGenerator';
import ConfirmModal from './components/ConfirmModal';

// Lazy load components for better code splitting
const Dashboard = lazy(() => import('./components/Dashboard'));
const SessionForm = lazy(() => import('./components/SessionForm'));
const SessionList = lazy(() => import('./components/SessionList'));
const CatchesList = lazy(() => import('./components/CatchesList'));
const Settings = lazy(() => import('./components/Settings'));
const Transfer = lazy(() => import('./components/Transfer'));
const Share = lazy(() => import('./components/Share'));

// Migration function to handle old settings structure
function migrateSettings(settings: any): AppSettings {
  // If settings already have nmea2000 and angler, return as-is
  if (settings.nmea2000 && settings.angler) {
    return settings;
  }

  // Migrate from old furuno structure
  const migratedSettings: AppSettings = {
    angler: settings.angler || {
      login: '',
      password: '',
      name: ''
    },
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

// AppContent component that handles authentication logic
function AppContent() {
  const { user, loading: authLoading } = useAuth();
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [sampleOpen, setSampleOpen] = useState(false);
  const [sampleData, setSampleData] = useState<any[] | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [isOfflineMode, setIsOfflineMode] = useState(false);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const appSettings = await FishingDataService.getSettings();
        if (appSettings) {
          const migratedSettings = migrateSettings(appSettings);
          setSettings(migratedSettings);
          UnitConverter.setSettings(migratedSettings);
        } else {
          const defaultSettings: AppSettings = {
            angler: {
              login: '',
              password: '',
              name: ''
            },
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
      }
    };

    loadSettings();
  }, []);

  useEffect(() => {
    const checkOfflineMode = async () => {
      const offline = await OfflineService.isOfflineMode();
      setIsOfflineMode(offline);
    };
    checkOfflineMode();
  }, []);

  useEffect(() => {
    const loadSampleData = async () => {
      if (!user && !isOfflineMode) return;
      
      try {
        const sessions = await FishingDataService.getAllSessions();
        if (!sessions || sessions.length === 0) {
          // Generate 2 years of random weekend data
          const generatedData = await generateTwoYearsOfData();
          setSampleData(generatedData);
          setSampleOpen(true);
        }
      } catch (e) {
        console.error('Sample data load check failed:', e);
      }
    };

    loadSampleData();
  }, [user, isOfflineMode]);

  useEffect(() => {
    const syncData = async () => {
      if (user && !isOfflineMode) {
        await DataSyncService.syncAllData();
      }
    };
    syncData();
  }, [user, isOfflineMode]);

  const updateSettings = async (newSettings: AppSettings) => {
    try {
      await FishingDataService.updateSettings(newSettings);
      setSettings(newSettings);
      UnitConverter.setSettings(newSettings);
    } catch (error) {
      console.error('Error updating settings:', error);
    }
  };

  const handleOfflineMode = async () => {
    await DataSyncService.enableOfflineMode();
    setIsOfflineMode(true);
  };

  const handleShowAuthModal = () => {
    setShowAuthModal(true);
  };

  const handleCloseAuthModal = () => {
    setShowAuthModal(false);
  };

  if (isLoading || authLoading) {
    return (
      <div className="app-loading">
        <div className="loading-spinner"></div>
        <p>Loading Karl Fish...</p>
      </div>
    );
  }

  // Show auth modal if not logged in and not in offline mode
  if (!user && !isOfflineMode) {
    return (
      <div className="app">
        <Header settings={settings} onShowAuth={handleShowAuthModal} />
        <AuthModal
          isOpen={showAuthModal}
          onClose={handleCloseAuthModal}
          onOfflineMode={handleOfflineMode}
        />
        <ConfirmModal
          isOpen={sampleOpen}
          onClose={() => setSampleOpen(false)}
          title="Generate Sample Data?"
          message={"No data found - generate 2 years of random catches?"}
          confirmLabel="Generate"
          onConfirm={async () => {
            if (sampleData) {
              // Save all generated sessions to the database
              for (const session of sampleData) {
                await FishingDataService.createSession(session);
              }
              setSampleOpen(false);
              window.location.reload();
            }
          }}
        />
      </div>
    );
  }

  return (
    <div className="app">
      <Header settings={settings} onShowAuth={handleShowAuthModal} />
      <main className="main-content">
        <Suspense fallback={
          <div className="app-loading">
            <div className="loading-spinner"></div>
            <p>Loading page...</p>
          </div>
        }>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/sessions" element={<SessionList />} />
            <Route path="/sessions/new" element={<SessionForm />} />
            <Route path="/sessions/:id" element={<SessionForm />} />
            <Route path="/catches" element={<CatchesList />} />
            <Route path="/transfer" element={<Transfer />} />
            <Route path="/share" element={<Share />} />
            <Route path="/reset-password" element={<PasswordResetPage />} />
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
        </Suspense>
      </main>
      <AuthModal
        isOpen={showAuthModal}
        onClose={handleCloseAuthModal}
        onOfflineMode={handleOfflineMode}
      />
      <ConfirmModal
        isOpen={sampleOpen}
        onClose={() => setSampleOpen(false)}
        title="Generate Sample Data?"
        message={"No data found - generate 2 years of random catches?"}
        confirmLabel="Generate"
        onConfirm={async () => {
          if (sampleData) {
            // Save all generated sessions to the database
            for (const session of sampleData) {
              await FishingDataService.createSession(session);
            }
            setSampleOpen(false);
            window.location.reload();
          }
        }}
      />
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <Router basename={import.meta.env.BASE_URL} future={{ v7_relativeSplatPath: true }}>
        <AppContent />
      </Router>
    </AuthProvider>
  );
}

export default App;
