import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Fish, Clock, MapPin, Thermometer, Wind, Trash2 } from 'lucide-react';
import { FishingDataService } from '../database';
import { FishingSession } from '../types';
import { UnitConverter } from '../utils/unitConverter';
import ConfirmModal from './ConfirmModal';
import SpeciesModal from './SpeciesModal';

const Dashboard: React.FC = () => {
  const [stats, setStats] = useState({
    totalSessions: 0,
    totalCatches: 0,
    totalSpecies: 0,
    averageCatchPerSession: 0,
    mostCommonSpecies: 'None',
    mostCommonSpeciesCount: 0,
    speciesCounts: {} as { [species: string]: number },
    totalFishingTime: 0
  });
  const [recentSessions, setRecentSessions] = useState<FishingSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleteAllOpen, setIsDeleteAllOpen] = useState(false);
  const [isSpeciesModalOpen, setIsSpeciesModalOpen] = useState(false);

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        const [statsData, sessions] = await Promise.all([
          FishingDataService.getSessionStats(),
          FishingDataService.getAllSessions()
        ]);
        
        setStats(statsData);
        setRecentSessions(sessions.slice(0, 4)); // Show last 4 sessions
      } catch (error) {
        console.error('Error loading dashboard data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadDashboardData();
  }, []);

  const formatDuration = (hours: number): string => {
    if (hours < 1) {
      return `${Math.round(hours * 60)}m`;
    }
    return `${hours.toFixed(1)}h`;
  };

  if (isLoading) {
    return (
      <div className="card">
        <div className="loading-spinner"></div>
        <p>Loading dashboard...</p>
      </div>
    );
  }

  return (
    <div className="dashboard">
      <div className="card">
        <div className="card-header">
          <h1 className="card-title">Fishing Dashboard</h1>
          {/* New Session button commented out - redundant with header navigation */}
          {/* 
          <Link to="/sessions/new" className="btn btn-primary">
            <Plus size={16} />
            New Session
          </Link>
          */}
        </div>
      </div>

      <div className="stats-grid">
        <Link to="/sessions" className="stat-card stat-card-clickable">
          <div className="stat-value">{stats.totalSessions}</div>
          <div className="stat-label">Total Sessions</div>
        </Link>
        <Link to="/catches" className="stat-card stat-card-link">
          <div className="stat-value">{stats.totalCatches}</div>
          <div className="stat-label">Total Catches</div>
        </Link>
        <div className="stat-card">
          <div className="stat-value">{stats.averageCatchPerSession.toFixed(1)}</div>
          <div className="stat-label">Avg Catches/Session</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{formatDuration(stats.totalFishingTime)}</div>
          <div className="stat-label">Total Fishing Time</div>
        </div>
        <div 
          className="stat-card stat-card-clickable" 
          onClick={() => setIsSpeciesModalOpen(true)}
          style={{ cursor: 'pointer' }}
        >
          <div className="stat-value">{stats.totalSpecies}</div>
          <div className="stat-label">Species Caught</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">
            {stats.mostCommonSpecies}
            {stats.mostCommonSpeciesCount > 0 && (
              <span className="duration" style={{ marginLeft: '4px' }}>
                ({stats.mostCommonSpeciesCount})
              </span>
            )}
          </div>
          <div className="stat-label">Most Common Species</div>
        </div>
      </div>

      <div className="grid grid-2">
        <div className="card">
          <div className="card-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h2 className="card-title">Recent Sessions</h2>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                className="btn btn-danger btn-sm"
                onClick={() => setIsDeleteAllOpen(true)}
                title="Delete ALL sessions and catches"
              >
                <Trash2 size={14} />
                Delete All
              </button>
              <Link to="/sessions" className="btn btn-secondary btn-sm">
                View All
              </Link>
            </div>
          </div>
          {recentSessions.length === 0 ? (
            <p>No sessions yet. <Link to="/sessions/new">Start your first fishing session!</Link></p>
          ) : (
            <div className="recent-sessions dashboard-recent-sessions">
              {recentSessions.map(session => (
                <Link key={session.id} to={`/sessions/${session.id}`} className="session-item session-item-clickable">
                  <div className="session-header">
                    <div className="session-date">
                      {new Date(session.date).toLocaleDateString()}
                      {/* time moved next to date */}
                      <span style={{ marginLeft: '8px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        <Clock size={14} />
                        {new Date(session.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        {` - `}
                        {session.endTime
                          ? (
                              <>
                                {new Date(session.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                <span className="duration">
                                  {(() => {
                                    const ms = new Date(session.endTime).getTime() - new Date(session.startTime).getTime();
                                    const totalMinutes = Math.round(ms / (1000 * 60));
                                    const h = Math.floor(totalMinutes / 60);
                                    const m = totalMinutes % 60;
                                    const duration = h > 0 ? `${h}h ${m}m` : `${m}m`;
                                    return `(${duration})`;
                                  })()}
                                </span>
                              </>
                            )
                          : 'In progress'}
                      </span>
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
                  </div>
                  <div className="session-details">
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
                    {/* duration removed from here - time moved beside date */}
                  </div>
                  {session.weather.temperature && (
                    <div className="session-weather">
                      <Thermometer size={14} />
                      {UnitConverter.convertTemperature(session.weather.temperature).toFixed(1)}{UnitConverter.getTemperatureUnit()}
                    </div>
                  )}
                  {session.weather.windSpeed && (
                    <div className="session-wind">
                      <Wind size={14} />
                      {UnitConverter.convertSpeed(session.weather.windSpeed).toFixed(1)} {UnitConverter.getSpeedUnit()}
                    </div>
                  )}
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Quick Actions panel commented out - redundant with header navigation */}
        {/* 
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">Quick Actions</h2>
          </div>
          <div className="quick-actions">
            <Link to="/sessions/new" className="btn btn-primary">
              <Plus size={16} />
              Start New Session
            </Link>
            <Link to="/sessions" className="btn btn-secondary">
              <BarChart3 size={16} />
              View All Sessions
            </Link>
            <Link to="/export" className="btn btn-secondary">
              <Download size={16} />
              Export Data
            </Link>
          </div>
        </div>
        */}
      </div>
      <ConfirmModal
        isOpen={isDeleteAllOpen}
        onClose={() => setIsDeleteAllOpen(false)}
        title="WARNING"
        message={"You are about to delete ALL log data!"}
        confirmLabel="Confirm"
        requiresCount={3}
        onConfirm={async () => {
          await FishingDataService.clearAllData();
          window.location.reload();
        }}
      />
      <SpeciesModal
        isOpen={isSpeciesModalOpen}
        onClose={() => setIsSpeciesModalOpen(false)}
        speciesData={stats.speciesCounts}
      />
    </div>
  );
};

export default Dashboard;
