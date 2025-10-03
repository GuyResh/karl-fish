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

// Suppress Mozilla deprecation warnings from Leaflet
const originalWarn = console.warn;
console.warn = (message: any, ...args: any[]) => {
  if (typeof message === 'string' && 
      (message.includes('MouseEvent.mozPressure') || message.includes('MouseEvent.mozInputSource'))) {
    return; // Suppress these specific warnings
  }
  originalWarn(message, ...args);
};

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
  if (settings.nmea2000) {
    return settings as AppSettings;
  }

  // Hard reset to new shape; drop legacy keys (e.g., furuno)
  const resetSettings: AppSettings = {
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
      autoConnect: false,
      simulated: false
    },
    export: {
      defaultFormat: 'csv',
      autoBackup: false,
      backupInterval: 7
    }
  };

  // Save reset settings
  FishingDataService.saveSettings(resetSettings);
  
  return resetSettings;
}

// AppContent component that handles authentication logic
function AppContent() {
  const { user, loading: authLoading } = useAuth();
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [sampleOpen, setSampleOpen] = useState(false);
  const [sampleData, setSampleData] = useState<any[] | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [hasCachedData, setHasCachedData] = useState(false);
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
              autoConnect: false,
              simulated: false
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

  // Auto-connect to NMEA 2000 on startup based on settings
  useEffect(() => {
    const autoConnectIfEnabled = async () => {
      if (!settings || !settings.nmea2000?.enabled || !settings.nmea2000.autoConnect) return;
      try {
        const { ipAddress, port, simulated } = settings.nmea2000;
        // When simulated flag is on, use test mode
        // If simulated is false, only connect when user clicks the header icon
        if (simulated) {
          // Reuse service connect with testMode=true
          const { nmea2000Service } = await import('./services/nmea2000Service');
          await nmea2000Service.connect(ipAddress || 'test', port || 2000, true);
        }
      } catch (e) {
        console.error('Auto-connect to NMEA 2000 failed:', e);
      }
    };
    autoConnectIfEnabled();
  }, [settings]);

  useEffect(() => {
    const checkOfflineMode = async () => {
      const offline = await OfflineService.isOfflineMode();
      setIsOfflineMode(offline);
    };
    checkOfflineMode();
  }, []);

  // Probe local cache to see if we have any data to show when logged out
  useEffect(() => {
    const probeCache = async () => {
      try {
        const [localSessions, offlineShared] = await Promise.all([
          FishingDataService.getAllSessions(),
          // Use DataSyncService helper which reads IndexedDB-backed shared cache
          DataSyncService.getOfflineSharedSessions()
        ]);

        const hasAny = (localSessions && localSessions.length > 0) || (offlineShared && offlineShared.length > 0);
        setHasCachedData(Boolean(hasAny));

        // If logged out but we have cached data, enable offline mode automatically
        if (!user && hasAny) {
          await DataSyncService.enableOfflineMode();
          setIsOfflineMode(true);
          // Ensure auth modal is not forced open
          setShowAuthModal(false);
        }
      } catch (e) {
        console.error('Error probing local cache:', e);
        setHasCachedData(false);
      }
    };

    probeCache();
  }, [user]);

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
      if (user) {
        // When user logs in, disable offline mode first
        await DataSyncService.disableOfflineMode();
        setIsOfflineMode(false);
        
        // Then sync data
        setTimeout(async () => {
          await DataSyncService.syncAllData();
        }, 100);
      }
    };
    syncData();
  }, [user]);

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

  // Show auth modal only if not logged in AND we have neither offline mode nor cached data
  if (!user && !isOfflineMode && !hasCachedData) {
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
