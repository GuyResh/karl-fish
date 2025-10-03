import React, { useState, useEffect } from 'react';
import { Save, Wifi } from 'lucide-react';
import { AppSettings } from '../types';
import { nmea2000Service } from '../services/nmea2000Service';

interface SettingsProps {
  settings: AppSettings;
  onUpdate: (settings: AppSettings) => void;
}

const Settings: React.FC<SettingsProps> = ({ settings, onUpdate }) => {
  const [localSettings, setLocalSettings] = useState<AppSettings>(settings);
  const [isSaving, setIsSaving] = useState(false);
  const [nmeaMessages, setNmeaMessages] = useState<Array<{ timestamp: number; raw: string; parsed?: any }>>([]);

  // Monitor test mode state to keep button in sync
  // Note: Test mode should persist across the app session, not be cleaned up on component unmount
  useEffect(() => {
    try {
      // Seed with recent messages
      const recent = nmea2000Service.getRecentMessages?.() || [];
      if (recent.length) setNmeaMessages(recent);
      // Subscribe for live updates
      const unsubscribe = nmea2000Service.subscribeMessages?.((msg) => {
        setNmeaMessages((prev) => {
          const next = [...prev, { timestamp: Date.now(), raw: msg.raw, parsed: msg.parsed }];
          return next.length > 500 ? next.slice(next.length - 500) : next;
        });
        // Auto-scroll to bottom
        try {
          const el = document.getElementById('nmeaScroll');
          if (el) {
            el.scrollTop = el.scrollHeight;
          }
        } catch {}
      });
      return () => { if (unsubscribe) unsubscribe(); };
    } catch {}
  }, []);

  // Ensure auto-scroll happens after DOM updates when messages change
  useEffect(() => {
    try {
      const el = document.getElementById('nmeaScroll');
      if (el) {
        el.scrollTop = el.scrollHeight;
      }
    } catch {}
  }, [nmeaMessages]);

  const handleInputChange = (section: keyof AppSettings, field: string, value: any) => {
    setLocalSettings(prev => {
      const next = {
        ...prev,
        [section]: {
          ...prev[section],
          [field]: value
        }
      } as AppSettings;

      // Immediately persist critical N2K toggles so header connect honors current state
      if (
        section === 'nmea2000' &&
        (field === 'enabled' || field === 'autoConnect' || field === 'simulated')
      ) {
        try { onUpdate(next); } catch {}
      }

      return next;
    });
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
              <label className="form-label" style={{ marginLeft: '24px', display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '16px' }}>
                <input
                  type="checkbox"
                  checked={!!localSettings.nmea2000.simulated}
                  onChange={(e) => handleInputChange('nmea2000', 'simulated', e.target.checked)}
                />
                Simulated
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

                {/* Simulated is now a persistent checkbox; manual test button removed */}

                <div className="nmea2000-info" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', alignItems: 'start' }}>
                  <div>
                    <h4>NMEA 2000 Gateway Setup Instructions:</h4>
                    <ol>
                      <li>Connect the YDWG-02 gateway to your N2K network</li>
                      <li>Power on the gateway & connect to WiFi network <strong><em>YDWG-02</em></strong></li>
                      <li>Access the web interface at <code>http://192.168.4.1</code></li>
                      <li>Configure data servers:
                        <ul>
                          <li>Enable <strong>TCP server</strong> on port 2000</li>
                          <li>Select <strong>RAW protocol</strong> (not NMEA 0183)</li>
                          <li>Configure data filters as needed</li>
                        </ul>
                      </li>
                      <li>Enter gateway IP (192.168.4.1) and port (2000) above</li>
                    </ol>
                  </div>
                  <div>
                    <h4>Supported NMEA 2000 PGNs (via RAW protocol):</h4>
                    <ul>
                      <li><strong>PGN 129025</strong> - Position, Rapid Update (GPS coords)</li>
                      <li><strong>PGN 130306</strong> - Wind Data (speed, direction)</li>
                      <li><strong>PGN 128267</strong> - Water Depth</li>
                      <li><strong>PGN 127250</strong> - Vessel Heading</li>
                      <li><strong>PGN 127488</strong> - Engine Parameters (RPM, temp, BP)</li>
                    <li><strong>PGN 130310</strong> - Environmental Parameters (temp, BP)</li>
                      <li><strong>PGN 127258</strong> - Engine RPM</li>
                      <li><strong>PGN 127505</strong> - Fluid Level (fuel, water, etc.)</li>
                    </ul>
                  </div>
                </div>

                <div className="nmea2000-messages" style={{ marginTop: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h4 style={{ margin: 0 }}>Live NMEA 2000 Messages</h4>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        className="btn btn-sm btn-secondary"
                        onClick={async () => {
                          try {
                            const text = nmeaMessages.map(m => {
                              const ts = new Date(m.timestamp).toISOString();
                              const parsed = m.parsed ? `\n  parsed: ${JSON.stringify(m.parsed)}` : '';
                              return `[${ts}] raw: ${m.raw}${parsed}`;
                            }).join('\n');
                            await navigator.clipboard.writeText(text);
                          } catch (e) {
                            console.error('Copy messages failed:', e);
                          }
                        }}
                      >
                        Copy
                      </button>
                      <button
                        className="btn btn-sm btn-danger"
                        onClick={() => {
                          try {
                            nmea2000Service.clearMessages?.();
                          } catch {}
                          setNmeaMessages([]);
                        }}
                      >
                        Clear
                      </button>
                    </div>
                  </div>
                  <div id="nmeaScroll" style={{ height: '220px', overflow: 'auto', background: '#0b1020', color: '#d6e1ff', padding: '8px', borderRadius: '6px', fontFamily: 'monospace', fontSize: '12px', marginTop: '8px' }}>
                    {nmeaMessages.length === 0 && (
                      <div style={{ opacity: 0.7 }}>No messages yet.</div>
                    )}
                    {nmeaMessages.map((m, idx) => (
                      <div key={idx} style={{ whiteSpace: 'pre-wrap', borderBottom: '1px solid rgba(255,255,255,0.05)', padding: '2px 0' }}>
                        [{new Date(m.timestamp).toLocaleTimeString()}] raw: {m.raw}
                        {m.parsed ? `\n  parsed: ${JSON.stringify(m.parsed)}` : ''}
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;

