import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Save, Plus, Trash2, MapPin, Thermometer, Waves, Cloud, Map, Clock } from 'lucide-react';
import { FishingDataService } from '../database';
import { FishingSession, FishCatch, Location, WeatherConditions, WaterConditions } from '../types';
import { WeatherService } from '../services/weatherService';
import MapModal from './MapModal';

const SessionForm: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEditing = Boolean(id);

  const [session, setSession] = useState<Partial<FishingSession>>({
    date: new Date(),
    startTime: new Date(),
    location: { latitude: 0, longitude: 0 },
    weather: {},
    water: {},
    catches: []
  });

  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingWeather, setIsLoadingWeather] = useState(false);
  const [isMapModalOpen, setIsMapModalOpen] = useState(false);

  useEffect(() => {
    if (isEditing && id) {
      loadSession(id);
    } else {
      // Get current location for new sessions
      getCurrentLocation();
    }
  }, [id, isEditing]);

  const loadSession = async (sessionId: string) => {
    setIsLoading(true);
    try {
      const loadedSession = await FishingDataService.getSession(sessionId);
      if (loadedSession) {
        setSession(loadedSession);
      }
    } catch (error) {
      console.error('Error loading session:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const newLocation = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy
          };
          
          setSession(prev => ({
            ...prev,
            location: newLocation
          }));
          
          // Fetch weather data for the new location
          fetchWeatherData(newLocation.latitude, newLocation.longitude);
        },
        (error) => {
          console.warn('Could not get location:', error);
        }
      );
    }
  };

  const fetchWeatherData = async (latitude: number, longitude: number) => {
    setIsLoadingWeather(true);
    try {
      const weatherData = await WeatherService.getLocationWeatherData(latitude, longitude);
      if (weatherData) {
        setSession(prev => ({
          ...prev,
          weather: weatherData.weather,
          water: weatherData.water
        }));
      }
    } catch (error) {
      console.error('Error fetching weather data:', error);
    } finally {
      setIsLoadingWeather(false);
    }
  };

  const handleInputChange = (field: string, value: any) => {
    setSession(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleLocationChange = (field: keyof Location, value: number) => {
    setSession(prev => ({
      ...prev,
      location: {
        ...prev.location!,
        [field]: value
      }
    }));
  };

  const handleWeatherChange = (field: keyof WeatherConditions, value: any) => {
    setSession(prev => ({
      ...prev,
      weather: {
        ...prev.weather!,
        [field]: value
      }
    }));
  };

  const handleWaterChange = (field: keyof WaterConditions, value: any) => {
    setSession(prev => ({
      ...prev,
      water: {
        ...prev.water!,
        [field]: value
      }
    }));
  };

  const addCatch = () => {
    const newCatch: FishCatch = {
      id: crypto.randomUUID(),
      sessionId: id || undefined, // Link to current session if editing
      species: '',
      length: 0,
      condition: 'alive',
      bait: '',
      lure: '',
      technique: '',
      notes: ''
    };

    setSession(prev => ({
      ...prev,
      catches: [...(prev.catches || []), newCatch]
    }));
  };

  const updateCatch = (catchId: string, field: keyof FishCatch, value: any) => {
    setSession(prev => ({
      ...prev,
      catches: prev.catches?.map(catch_ => 
        catch_.id === catchId ? { ...catch_, [field]: value } : catch_
      ) || []
    }));
  };

  const removeCatch = (catchId: string) => {
    setSession(prev => ({
      ...prev,
      catches: prev.catches?.filter(catch_ => catch_.id !== catchId) || []
    }));
  };

  const handleSave = async () => {
    if (!session.date || !session.startTime || !session.location) {
      alert('Please fill in all required fields (Date, Start Time, and Location)');
      return;
    }

    // Validate catches if any exist
    if (session.catches && session.catches.length > 0) {
      const invalidCatches = session.catches.filter(catch_ => 
        !catch_.species || !catch_.length || catch_.length <= 0
      );
      
      if (invalidCatches.length > 0) {
        alert('Please fill in species and length for all catches');
        return;
      }
    }

    setIsSaving(true);
    try {
      console.log('Saving session with catches:', session.catches);
      
      if (isEditing && id) {
        await FishingDataService.updateSession(id, session);
        console.log('Session updated successfully');
      } else {
        const sessionId = await FishingDataService.createSession(session as Omit<FishingSession, 'id'>);
        console.log('Session created with ID:', sessionId);
        navigate(`/sessions/${sessionId}`);
      }
      navigate('/sessions');
    } catch (error) {
      console.error('Error saving session:', error);
      alert('Error saving session: ' + error);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="card">
        <div className="loading-spinner"></div>
        <p>Loading session...</p>
      </div>
    );
  }

  return (
    <div className="session-form">
      <div className="card">
        <div className="card-header">
          <h1 className="card-title">
            {isEditing ? 'Edit Session' : 'New Fishing Session'}
          </h1>
          <div className="form-actions">
            {isEditing && !session.endTime && (
              <button
                type="button"
                onClick={() => {
                  setSession(prev => ({ ...prev, endTime: new Date() }));
                }}
                className="btn btn-warning"
              >
                <Clock size={16} />
                End Session
              </button>
            )}
            <button 
              onClick={handleSave} 
              disabled={isSaving}
              className="btn btn-primary"
            >
              <Save size={16} />
              {isSaving ? 'Saving...' : 'Save Session'}
            </button>
          </div>
        </div>

        <div className="form-content">
          {/* Fish Catches */}
          <div className="form-section">
            <div className="form-section-header">
              <h3>Fish Catches</h3>
              <button 
                type="button" 
                onClick={addCatch}
                className="btn btn-success btn-sm"
              >
                <Plus size={14} />
                Add Catch
              </button>
            </div>

            {session.catches?.map((catch_, index) => (
              <div key={catch_.id} className="catch-form">
                <div className="catch-header">
                  <h4>Catch #{index + 1}</h4>
                  <button 
                    type="button" 
                    onClick={() => removeCatch(catch_.id)}
                    className="btn btn-danger btn-sm"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
                
                <div className="form-row-3">
                  <div className="form-group">
                    <label className="form-label">Species *</label>
                    <select
                      className="form-select"
                      value={catch_.species?.startsWith('Custom:') ? 'Custom' : catch_.species}
                      onChange={(e) => {
                        if (e.target.value === 'Custom') {
                          updateCatch(catch_.id, 'species', 'Custom:');
                        } else {
                          updateCatch(catch_.id, 'species', e.target.value);
                        }
                      }}
                    >
                      <option value="">Select species</option>
                      <option value="Bluefin Tuna">Bluefin Tuna</option>
                      <option value="Yellowfin Tuna">Yellowfin Tuna</option>
                      <option value="Albacore Tuna">Albacore Tuna</option>
                      <option value="Bigeye Tuna">Bigeye Tuna</option>
                      <option value="White Marlin">White Marlin</option>
                      <option value="Blue Marlin">Blue Marlin</option>
                      <option value="Swordfish">Swordfish</option>
                      <option value="Giant Bluefin">Giant Bluefin</option>
                      <option value="Halibut">Halibut</option>
                      <option value="Large Black Sea Bass">Large Black Sea Bass</option>
                      <option value="Pollock">Pollock</option>
                      <option value="Custom">Custom (Other)</option>
                    </select>
                    {catch_.species?.startsWith('Custom:') && (
                      <input
                        type="text"
                        className="form-input"
                        placeholder="Enter custom species name"
                        value={catch_.species.replace('Custom:', '')}
                        onChange={(e) => updateCatch(catch_.id, 'species', `Custom:${e.target.value}`)}
                        style={{ marginTop: '0.5rem' }}
                      />
                    )}
                  </div>
                  <div className="form-group">
                    <label className="form-label">Length (cm) *</label>
                    <input
                      type="number"
                      step="0.1"
                      className="form-input"
                      value={catch_.length}
                      onChange={(e) => updateCatch(catch_.id, 'length', parseFloat(e.target.value))}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Weight (kg)</label>
                    <input
                      type="number"
                      step="0.1"
                      className="form-input"
                      value={catch_.weight || ''}
                      onChange={(e) => updateCatch(catch_.id, 'weight', parseFloat(e.target.value))}
                    />
                  </div>
                </div>

                <div className="form-row-3">
                  <div className="form-group">
                    <label className="form-label">Condition</label>
                    <select
                      className="form-select"
                      value={catch_.condition}
                      onChange={(e) => updateCatch(catch_.id, 'condition', e.target.value)}
                    >
                      <option value="alive">Alive</option>
                      <option value="released">Released</option>
                      <option value="kept">Kept</option>
                      <option value="dead">Dead</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Bait</label>
                    <input
                      type="text"
                      className="form-input"
                      value={catch_.bait || ''}
                      onChange={(e) => updateCatch(catch_.id, 'bait', e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Lure</label>
                    <input
                      type="text"
                      className="form-input"
                      value={catch_.lure || ''}
                      onChange={(e) => updateCatch(catch_.id, 'lure', e.target.value)}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Notes</label>
                  <textarea
                    className="form-textarea"
                    value={catch_.notes || ''}
                    onChange={(e) => updateCatch(catch_.id, 'notes', e.target.value)}
                    placeholder="Additional notes about this catch..."
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Session Notes */}
          <div className="form-section">
            <h3>Session Notes</h3>
            <div className="form-group">
              <label className="form-label">Notes</label>
              <textarea
                className="form-textarea"
                value={session.notes || ''}
                onChange={(e) => handleInputChange('notes', e.target.value)}
                placeholder="Additional notes about this fishing session..."
              />
            </div>
          </div>

          {/* Basic Information */}
          <div className="form-section">
            <div className="form-section-header">
              <h3>Basic Information</h3>
            </div>
            <div className="form-inline-row">
              <div className="form-inline-group">
                <label className="form-label">Date *</label>
                <input
                  type="date"
                  className="form-input"
                  value={session.date ? session.date.toISOString().split('T')[0] : ''}
                  onChange={(e) => handleInputChange('date', new Date(e.target.value))}
                />
              </div>
              <div className="form-inline-group">
                <label className="form-label">Start Time *</label>
                <input
                  type="time"
                  className="form-input"
                  value={session.startTime ? session.startTime.toTimeString().slice(0, 5) : ''}
                  onChange={(e) => {
                    const [hours, minutes] = e.target.value.split(':');
                    const newTime = new Date(session.date || new Date());
                    newTime.setHours(parseInt(hours), parseInt(minutes));
                    handleInputChange('startTime', newTime);
                  }}
                />
              </div>
            </div>
          </div>

          {/* Location */}
          <div className="form-section">
            <div className="form-section-header">
              <h3><MapPin size={16} /> Location</h3>
              <div className="location-buttons">
                <button 
                  type="button" 
                  onClick={() => setIsMapModalOpen(true)}
                  disabled={!session.location?.latitude || !session.location?.longitude}
                  className="btn btn-secondary btn-sm"
                  title="View on Map"
                >
                  <Map size={14} />
                  Map
                </button>
                <button 
                  type="button" 
                  onClick={getCurrentLocation}
                  className="btn btn-secondary btn-sm"
                >
                  <MapPin size={14} />
                  Use Current Location
                </button>
              </div>
            </div>
            <div className="form-inline-row">
              <div className="form-inline-group">
                <label className="form-label">Latitude *</label>
                <input
                  type="number"
                  step="any"
                  className="form-input"
                  value={session.location?.latitude || ''}
                  onChange={(e) => handleLocationChange('latitude', parseFloat(e.target.value))}
                />
              </div>
              <div className="form-inline-group">
                <label className="form-label">Longitude *</label>
                <input
                  type="number"
                  step="any"
                  className="form-input"
                  value={session.location?.longitude || ''}
                  onChange={(e) => handleLocationChange('longitude', parseFloat(e.target.value))}
                />
              </div>
            </div>
          </div>

          {/* Weather Conditions */}
          <div className="form-section">
            <div className="form-section-header">
              <h3><Thermometer size={16} /> Weather Conditions</h3>
              <button 
                type="button" 
                onClick={() => {
                  if (session.location?.latitude && session.location?.longitude) {
                    fetchWeatherData(session.location.latitude, session.location.longitude);
                  }
                }}
                disabled={isLoadingWeather || !session.location?.latitude || !session.location?.longitude}
                className="btn btn-secondary btn-sm"
              >
                <Cloud size={14} />
                {isLoadingWeather ? 'Loading...' : 'Get Weather Data'}
              </button>
            </div>
            <div className="form-row-3">
              <div className="form-group">
                <label className="form-label">Air Temperature (°C)</label>
                <input
                  type="number"
                  step="0.1"
                  className="form-input"
                  value={session.weather?.temperature || ''}
                  onChange={(e) => handleWeatherChange('temperature', parseFloat(e.target.value))}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Wind Speed (kts)</label>
                <input
                  type="number"
                  step="0.1"
                  className="form-input"
                  value={session.weather?.windSpeed || ''}
                  onChange={(e) => handleWeatherChange('windSpeed', parseFloat(e.target.value))}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Wind Direction (°)</label>
                <input
                  type="number"
                  step="1"
                  className="form-input"
                  value={session.weather?.windDirection || ''}
                  onChange={(e) => handleWeatherChange('windDirection', parseFloat(e.target.value))}
                />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Pressure (hPa)</label>
                <input
                  type="number"
                  step="0.1"
                  className="form-input"
                  value={session.weather?.pressure || ''}
                  onChange={(e) => handleWeatherChange('pressure', parseFloat(e.target.value))}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Humidity (%)</label>
                <input
                  type="number"
                  step="1"
                  className="form-input"
                  value={session.weather?.humidity || ''}
                  onChange={(e) => handleWeatherChange('humidity', parseFloat(e.target.value))}
                />
              </div>
            </div>
          </div>

          {/* Water Conditions */}
          <div className="form-section">
            <div className="form-section-header">
              <h3><Waves size={16} /> Water Conditions</h3>
              <button 
                type="button" 
                onClick={() => {
                  if (session.location?.latitude && session.location?.longitude) {
                    fetchWeatherData(session.location.latitude, session.location.longitude);
                  }
                }}
                disabled={isLoadingWeather || !session.location?.latitude || !session.location?.longitude}
                className="btn btn-secondary btn-sm"
              >
                <Waves size={14} />
                {isLoadingWeather ? 'Loading...' : 'Get Water Data'}
              </button>
            </div>
            <div className="form-row-3">
              <div className="form-group">
                <label className="form-label">Water Temperature (°C)</label>
                <input
                  type="number"
                  step="0.1"
                  className="form-input"
                  value={session.water?.temperature || ''}
                  onChange={(e) => handleWaterChange('temperature', parseFloat(e.target.value))}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Depth (m)</label>
                <input
                  type="number"
                  step="0.1"
                  className="form-input"
                  value={session.water?.depth || ''}
                  onChange={(e) => handleWaterChange('depth', parseFloat(e.target.value))}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Clarity</label>
                <select
                  className="form-select"
                  value={session.water?.clarity || ''}
                  onChange={(e) => handleWaterChange('clarity', e.target.value)}
                >
                  <option value="">Select clarity</option>
                  <option value="clear">Clear</option>
                  <option value="slightly_murky">Slightly Murky</option>
                  <option value="murky">Murky</option>
                  <option value="very_murky">Very Murky</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Map Modal */}
      {session.location?.latitude && session.location?.longitude && (
        <MapModal
          isOpen={isMapModalOpen}
          onClose={() => setIsMapModalOpen(false)}
          latitude={session.location.latitude}
          longitude={session.location.longitude}
        />
      )}
    </div>
  );
};

export default SessionForm;
