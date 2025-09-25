import React, { useState } from 'react';
import { Save, Wifi, TestTube } from 'lucide-react';
import { AppSettings } from '../types';
import { nmea2000Service } from '../services/nmea2000Service';

interface SettingsProps {
  settings: AppSettings;
  onUpdate: (settings: AppSettings) => void;
}

const Settings: React.FC<SettingsProps> = ({ settings, onUpdate }) => {
  const [localSettings, setLocalSettings] = useState<AppSettings>(settings);
  const [isSaving, setIsSaving] = useState(false);
  const [isTestModeActive, setIsTestModeActive] = useState(false);

  // Note: Test mode should persist across the app session, not be cleaned up on component unmount

  const handleInputChange = (section: keyof AppSettings, field: string, value: any) => {
    setLocalSettings(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value
      }
    }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      onUpdate(localSettings);
    } catch (error) {
      console.error('Error saving settings:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const toggleTestMode = async () => {
    if (isTestModeActive) {
      // Stop test mode
      nmea2000Service.disconnect();
      setIsTestModeActive(false);
    } else {
      // Start test mode
      try {
        const success = await nmea2000Service.connect(
          localSettings.nmea2000.ipAddress || 'test',
          localSettings.nmea2000.port || 2000,
          true // Enable test mode
        );
        
        if (success) {
          setIsTestModeActive(true);
        }
      } catch (error) {
        console.error('Failed to start test mode:', error);
      }
    }
  };

  // Safety check for settings structure
  if (!localSettings.nmea2000) {
    return (
      <div className="settings">
        <div className="card">
          <div className="card-header">
            <h1 className="card-title">Settings</h1>
          </div>
          <div className="settings-content">
            <p>Loading settings...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="settings">
      <div className="card">
        <div className="card-header">
          <h1 className="card-title">Settings</h1>
          <button 
            onClick={handleSave} 
            disabled={isSaving}
            className="btn btn-primary"
          >
            <Save size={16} />
            {isSaving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>

        <div className="settings-content">
          {/* Units Settings */}
          <div className="settings-section">
            <h3>Units</h3>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Distance</label>
                <select
                  className="form-select"
                  value={localSettings.units.distance}
                  onChange={(e) => handleInputChange('units', 'distance', e.target.value)}
                >
                  <option value="metric">Metric (m, km)</option>
                  <option value="imperial">Imperial (ft, mi)</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Weight</label>
                <select
                  className="form-select"
                  value={localSettings.units.weight}
                  onChange={(e) => handleInputChange('units', 'weight', e.target.value)}
                >
                  <option value="metric">Metric (kg)</option>
                  <option value="imperial">Imperial (lbs)</option>
                </select>
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Temperature</label>
                <select
                  className="form-select"
                  value={localSettings.units.temperature}
                  onChange={(e) => handleInputChange('units', 'temperature', e.target.value)}
                >
                  <option value="celsius">Celsius (°C)</option>
                  <option value="fahrenheit">Fahrenheit (°F)</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Pressure</label>
                <select
                  className="form-select"
                  value={localSettings.units.pressure}
                  onChange={(e) => handleInputChange('units', 'pressure', e.target.value)}
                >
                  <option value="hpa">Hectopascals (hPa)</option>
                  <option value="inHg">Inches of Mercury (inHg)</option>
                </select>
              </div>
            </div>
          </div>

          {/* NMEA 2000 Settings */}
          <div className="settings-section">
            <h3>
              <Wifi size={16} />
              NMEA 2000 Integration
              <label className="form-label" style={{ marginLeft: '16px', display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '16px' }}>
                <input
                  type="checkbox"
                  checked={localSettings.nmea2000.enabled}
                  onChange={(e) => handleInputChange('nmea2000', 'enabled', e.target.checked)}
                />
                Enable
              </label>
              <label className="form-label" style={{ marginLeft: '24px', display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '16px' }}>
                <input
                  type="checkbox"
                  checked={localSettings.nmea2000.autoConnect}
                  onChange={(e) => handleInputChange('nmea2000', 'autoConnect', e.target.checked)}
                />
                Auto-connect on startup
              </label>
            </h3>

            {localSettings.nmea2000.enabled && (
              <>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">IP Address</label>
                    <input
                      type="text"
                      className="form-input"
                      value={localSettings.nmea2000.ipAddress || ''}
                      onChange={(e) => handleInputChange('nmea2000', 'ipAddress', e.target.value)}
                      placeholder="192.168.4.1"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Port</label>
                    <input
                      type="number"
                      className="form-input"
                      value={localSettings.nmea2000.port || 2000}
                      onChange={(e) => handleInputChange('nmea2000', 'port', parseInt(e.target.value))}
                    />
                  </div>
                </div>

                <div className="connection-test">
                  <button 
                    onClick={toggleTestMode}
                    className={`btn ${isTestModeActive ? 'btn-danger' : 'btn-secondary'}`}
                    style={{
                      backgroundColor: isTestModeActive ? '#ef4444' : undefined,
                      color: isTestModeActive ? 'white' : undefined,
                      width: '250px',
                      justifyContent: 'center'
                    }}
                  >
                    <TestTube size={16} />
                    {isTestModeActive ? 'Stop Test Mode' : 'Test with Simulated Data'}
                  </button>
                </div>

                <div className="nmea2000-info">
                  <h4>NMEA 2000 Gateway Setup Instructions:</h4>
                  <ol>
                    <li>Connect the YDWG-02 gateway to your NMEA 2000 network backbone</li>
                    <li>Power on the gateway and connect to its WiFi network "YDWG-02"</li>
                    <li>Access the web interface at <code>http://192.168.4.1</code></li>
                    <li>Configure data servers:
                      <ul>
                        <li>Enable <strong>TCP server</strong> on port 2000</li>
                        <li>Select <strong>RAW protocol</strong> (not NMEA 0183)</li>
                        <li>Configure data filters as needed</li>
                      </ul>
                    </li>
                    <li>Enter gateway IP (192.168.4.1) and port (2000) above</li>
                    <li>Test the connection using the button above</li>
                  </ol>
                  
                  <h4>Supported NMEA 2000 PGNs (via RAW protocol):</h4>
                  <ul>
                    <li><strong>PGN 129025</strong> - Position, Rapid Update (GPS coordinates)</li>
                    <li><strong>PGN 130306</strong> - Wind Data (speed, direction)</li>
                    <li><strong>PGN 128267</strong> - Water Depth</li>
                    <li><strong>PGN 127250</strong> - Vessel Heading</li>
                    <li><strong>PGN 127488</strong> - Engine Parameters (RPM, temperature, pressure)</li>
                    <li><strong>PGN 130310</strong> - Environmental Parameters (temperature, pressure)</li>
                    <li><strong>PGN 127258</strong> - Engine RPM</li>
                    <li><strong>PGN 127505</strong> - Fluid Level (fuel, water, etc.)</li>
                  </ul>
                  {/* <h4>Why RAW Protocol?</h4>
                  <p>RAW protocol provides complete access to all NMEA 2000 data from your marine electronics network, including engine data, detailed environmental conditions, and real-time updates. This gives Karl Fish access to the full range of data available on your vessel.</p> */}
                </div>
              </>
            )}
          </div>

          {/* Transfer Settings */}
          <div className="settings-section">
            <h3>Transfer Settings</h3>
            
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Default Transfer Format</label>
                <select
                  className="form-select"
                  value={localSettings.export.defaultFormat}
                  onChange={(e) => handleInputChange('export', 'defaultFormat', e.target.value)}
                >
                  <option value="csv">CSV</option>
                  <option value="json">JSON</option>
                </select>
              </div>
            </div>

            <div className="form-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={localSettings.export.autoBackup}
                  onChange={(e) => handleInputChange('export', 'autoBackup', e.target.checked)}
                />
                Enable automatic backup
              </label>
            </div>

            {localSettings.export.autoBackup && (
              <div className="form-group">
                <label className="form-label">Backup Interval (days)</label>
                <input
                  type="number"
                  className="form-input"
                  value={localSettings.export.backupInterval}
                  onChange={(e) => handleInputChange('export', 'backupInterval', parseInt(e.target.value))}
                  min="1"
                  max="30"
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;

