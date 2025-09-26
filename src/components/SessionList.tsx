import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Edit, Trash2, MapPin, Clock, Fish, Thermometer, Wind, Search, Plus, Share2 } from 'lucide-react';
import { FishingDataService } from '../database';
import { FishingSession } from '../types';
import { UnitConverter } from '../utils/unitConverter';

const SessionList: React.FC = () => {
  const [sessions, setSessions] = useState<FishingSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadSessions();
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const appSettings = await FishingDataService.getSettings();
      if (appSettings) {
        UnitConverter.setSettings(appSettings);
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const loadSessions = async () => {
    try {
      const allSessions = await FishingDataService.getAllSessions();
      setSessions(allSessions);
    } catch (error) {
      console.error('Error loading sessions:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (sessionId: string) => {
    if (window.confirm('Are you sure you want to delete this session?')) {
      try {
        await FishingDataService.deleteSession(sessionId);
        setSessions(sessions.filter(s => s.id !== sessionId));
      } catch (error) {
        console.error('Error deleting session:', error);
        alert('Error deleting session');
      }
    }
  };

  const handleShare = async (sessionId: string) => {
    try {
      // Toggle the shared status
      const session = sessions.find(s => s.id === sessionId);
      if (session) {
        const updatedSession = { ...session, shared: !session.shared };
        await FishingDataService.updateSession(sessionId, { shared: updatedSession.shared });
        
        // Update the local state
        setSessions(sessions.map(s => 
          s.id === sessionId ? { ...s, shared: updatedSession.shared } : s
        ));
      }
    } catch (error) {
      console.error('Error updating session share status:', error);
      alert('Error updating session share status');
    }
  };

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (query.trim()) {
      try {
        const results = await FishingDataService.searchSessions(query);
        setSessions(results);
      } catch (error) {
        console.error('Error searching sessions:', error);
      }
    } else {
      loadSessions();
    }
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString();
  };

  const formatTime = (time: Date) => {
    return time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getDuration = (startTime: Date, endTime?: Date) => {
    if (!endTime) return 'In progress';
    
    const duration = endTime.getTime() - startTime.getTime();
    const hours = Math.floor(duration / (1000 * 60 * 60));
    const minutes = Math.floor((duration % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  };

  if (isLoading) {
    return (
      <div className="card">
        <div className="loading-spinner"></div>
        <p>Loading sessions...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="card">
        <div className="card-header">
          <h1 className="card-title">Fishing Sessions</h1>
          <Link to="/sessions/new" className="btn btn-primary btn-compact">
            <Plus size={14} />
            New
          </Link>
        </div>
        
        <div className="search-container">
          <div className="search-input-wrapper">
            <Search size={16} />
            <input
              type="text"
              placeholder="Search sessions by species, notes, or location..."
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              className="search-input"
            />
          </div>
        </div>
      </div>

      {sessions.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <Fish size={48} />
            <h3>No sessions found</h3>
            <p>
              {searchQuery 
                ? 'No sessions match your search criteria.' 
                : 'Start logging your fishing adventures!'
              }
            </p>
            <Link to="/sessions/new" className="btn btn-primary">
              Create First Session
            </Link>
          </div>
        </div>
      ) : (
        <div className="sessions-grid">
          {sessions.map(session => (
            <div key={session.id} className="session-card">
              <div className="session-card-header">
                <div className="session-date">
                  {formatDate(session.date)}
                </div>
                <div className="session-actions">
                  <button 
                    onClick={() => handleShare(session.id)}
                    className={`btn btn-sm ${session.shared ? 'btn-info' : 'btn-outline-info'}`}
                    title={session.shared ? 'Unshare' : 'Share'}
                  >
                    <Share2 size={14} />
                  </button>
                  <Link 
                    to={`/sessions/${session.id}`}
                    className="btn btn-secondary btn-sm"
                    title="Edit"
                  >
                    <Edit size={14} />
                  </Link>
                  <button 
                    onClick={() => handleDelete(session.id)}
                    className="btn btn-danger btn-sm"
                    title="Delete"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              <div className="session-info">
                <div className="session-time">
                  <Clock size={14} />
                  {formatTime(session.startTime)} - {session.endTime ? formatTime(session.endTime) : 'In progress'}
                  <span className="duration">({getDuration(session.startTime, session.endTime)})</span>
                </div>

                <div className="session-location">
                  <div className="location-line">
                    <MapPin size={14} />
                    {session.location.latitude.toFixed(4)}°N, {Math.abs(session.location.longitude).toFixed(4)}°W
                    {session.location.description && (
                      <span style={{ fontStyle: 'italic', marginLeft: '8px', opacity: 0.85 }}>
                        {session.location.description}
                      </span>
                    )}
                  </div>
                </div>

                <div className="session-catches">
                  <Fish size={14} />
                  {session.catches.length} catches
                  {session.catches.length > 0 && (
                    <div className="catch-species">
                      {(() => {
                        // Group catches by species and count them
                        const speciesCount: { [key: string]: number } = {};
                        session.catches.forEach(catch_ => {
                          const species = catch_.species?.replace('Custom:', '') || 'Unknown';
                          speciesCount[species] = (speciesCount[species] || 0) + 1;
                        });
                        
                        // Create display strings with counts
                        return Object.entries(speciesCount)
                          .map(([species, count]) => count > 1 ? `${species} (${count})` : species)
                          .join(', ');
                      })()}
                    </div>
                  )}
                </div>
              </div>

              {(session.weather.temperature || session.weather.windSpeed) && (
                <div className="session-conditions">
                  {session.weather.temperature && (
                    <div className="condition">
                      <Thermometer size={14} />
                      {UnitConverter.convertTemperature(session.weather.temperature).toFixed(1)}{UnitConverter.getTemperatureUnit()}
                    </div>
                  )}
                  {session.weather.windSpeed && (
                    <div className="condition">
                      <Wind size={14} />
                      {UnitConverter.convertSpeed(session.weather.windSpeed).toFixed(1)} {UnitConverter.getSpeedUnit()}
                    </div>
                  )}
                </div>
              )}

              {session.notes && (
                <div className="session-notes">
                  <p>{session.notes}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default SessionList;
