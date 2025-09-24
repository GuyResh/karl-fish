import React, { useState } from 'react';
import { Save, Wifi, TestTube } from 'lucide-react';
import { AppSettings } from '../types';
import { furunoService } from '../services/furunoService';

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
      furunoService.disconnect();
      setIsTestModeActive(false);
    } else {
      // Start test mode
      try {
        const success = await furunoService.connect(
          localSettings.furuno.ipAddress || 'test',
          localSettings.furuno.port || 10110,
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

          {/* Furuno Settings */}
          <div className="settings-section">
            <h3>
              <Wifi size={16} />
              Furuno Integration
            </h3>
            
            <div className="form-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={localSettings.furuno.enabled}
                  onChange={(e) => handleInputChange('furuno', 'enabled', e.target.checked)}
                />
                Enable Furuno integration
              </label>
            </div>

            {localSettings.furuno.enabled && (
              <>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">IP Address</label>
                    <input
                      type="text"
                      className="form-input"
                      value={localSettings.furuno.ipAddress || ''}
                      onChange={(e) => handleInputChange('furuno', 'ipAddress', e.target.value)}
                      placeholder="192.168.1.100"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Port</label>
                    <input
                      type="number"
                      className="form-input"
                      value={localSettings.furuno.port || 10110}
                      onChange={(e) => handleInputChange('furuno', 'port', parseInt(e.target.value))}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={localSettings.furuno.autoConnect}
                      onChange={(e) => handleInputChange('furuno', 'autoConnect', e.target.checked)}
                    />
                    Auto-connect on startup
                  </label>
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

                <div className="furuno-info">
                  <h4>Furuno Setup Instructions:</h4>
                  <ol>
                    <li>Ensure your Furuno unit is connected to the same network as this device</li>
                    <li>Enable NMEA 0183 output on the Furuno device</li>
                    <li>Configure the device to output data via TCP/IP on the specified port (default: 10110)</li>
                    <li>Find the device's IP address in the Furuno network settings</li>
                    <li>Enter the IP address and port above, then test the connection</li>
                  </ol>
                  
                  <h4>Supported NMEA Sentences:</h4>
                  <ul>
                    <li><strong>GPGGA</strong> - GPS Fix Data (position, altitude)</li>
                    <li><strong>GPRMC</strong> - Recommended Minimum (position, speed, heading)</li>
                    <li><strong>SDDBT/YDBT</strong> - Depth Below Transducer</li>
                    <li><strong>SDMTW/YMTW</strong> - Water Temperature</li>
                    <li><strong>SDMDA/YMDA</strong> - Meteorological Composite</li>
                    <li><strong>SDMWV/YMWV</strong> - Wind Speed and Direction</li>
                    <li><strong>SDVHW/YVHW</strong> - Water Speed and Heading</li>
                    <li><strong>SDVWR/YVWR</strong> - Relative Wind Speed and Angle</li>
                  </ul>
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

