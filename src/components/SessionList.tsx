import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Edit, Trash2, MapPin, Clock, Fish, Thermometer, Wind, Search } from 'lucide-react';
import { useSessions, useDeleteSession, useSearchSessions, useSettings } from '../hooks/useFishingData';
import { UnitConverter } from '../utils/unitConverter';

const SessionList: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  
  const { data: settings } = useSettings();
  const { data: allSessions, isLoading: sessionsLoading, error: sessionsError } = useSessions();
  const { data: searchResults, isLoading: searchLoading } = useSearchSessions(searchQuery);
  const deleteSessionMutation = useDeleteSession();

  // Load settings for unit converter
  React.useEffect(() => {
    if (settings) {
      UnitConverter.setSettings(settings);
    }
  }, [settings]);

  const sessions = searchQuery.trim() ? searchResults : allSessions;
  const isLoading = sessionsLoading || (searchQuery.trim() ? searchLoading : false);
  const error = sessionsError;

  const handleDelete = async (sessionId: string) => {
    if (window.confirm('Are you sure you want to delete this session?')) {
      deleteSessionMutation.mutate(sessionId, {
        onError: (error) => {
          console.error('Error deleting session:', error);
          alert('Error deleting session');
        }
      });
    }
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString();
  };

  const formatTime = (date: Date) => {
    return new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
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

  if (error) {
    return (
      <div className="card">
        <div className="error-message">
          <p>Error loading sessions: {error.message}</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="card">
        <div className="card-header">
          <h1 className="card-title">Fishing Sessions</h1>
          {/* New Session button commented out - redundant with header navigation */}
          {/* 
          <Link to="/sessions/new" className="btn btn-primary">
            New Session
          </Link>
          */}
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

      {sessions?.length === 0 ? (
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
          {sessions?.map(session => (
            <div key={session.id} className="session-card">
              <div className="session-card-header">
                <div className="session-date">
                  {formatDate(session.date)}
                </div>
                <div className="session-actions">
                  <Link 
                    to={`/sessions/${session.id}`}
                    className="btn btn-secondary btn-sm"
                  >
                    <Edit size={14} />
                  </Link>
                  <button 
                    onClick={() => handleDelete(session.id)}
                    className="btn btn-danger btn-sm"
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
                  </div>
                  {session.location.description && (
                    <div className="location-desc">
                      {session.location.description}
                    </div>
                  )}
                </div>

                <div className="session-catches">
                  <Fish size={14} />
                  {session.catches.length} catches
                  {session.catches.length > 0 && (
                    <div className="catch-species">
                      {session.catches.map(catch_ => catch_.species?.replace('Custom:', '') || '').join(', ')}
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
