import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Fish, Clock, MapPin, Thermometer, Wind, Plus } from 'lucide-react';
import { FishingDataService } from '../database';
import { FishingSession } from '../types';

const Dashboard: React.FC = () => {
  const [stats, setStats] = useState({
    totalSessions: 0,
    totalCatches: 0,
    totalSpecies: 0,
    averageCatchPerSession: 0,
    mostCommonSpecies: 'None',
    totalFishingTime: 0
  });
  const [recentSessions, setRecentSessions] = useState<FishingSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        const [statsData, sessions] = await Promise.all([
          FishingDataService.getSessionStats(),
          FishingDataService.getAllSessions()
        ]);
        
        setStats(statsData);
        setRecentSessions(sessions.slice(0, 5)); // Show last 5 sessions
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
    <div>
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
        <div className="stat-card">
          <div className="stat-value">{stats.totalCatches}</div>
          <div className="stat-label">Total Catches</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats.averageCatchPerSession.toFixed(1)}</div>
          <div className="stat-label">Avg Catches/Session</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{formatDuration(stats.totalFishingTime)}</div>
          <div className="stat-label">Total Fishing Time</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats.totalSpecies}</div>
          <div className="stat-label">Species Caught</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats.mostCommonSpecies}</div>
          <div className="stat-label">Most Common Species</div>
        </div>
      </div>

      <div className="grid grid-2">
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">Recent Sessions</h2>
            <Link to="/sessions" className="btn btn-secondary btn-sm">
              View All
            </Link>
          </div>
          {recentSessions.length === 0 ? (
            <p>No sessions yet. <Link to="/sessions/new">Start your first fishing session!</Link></p>
          ) : (
            <div className="recent-sessions">
              {recentSessions.map(session => (
                <div key={session.id} className="session-item">
                  <div className="session-header">
                    <div className="session-date">
                      {new Date(session.date).toLocaleDateString()}
                    </div>
                    <div className="session-location">
                      <MapPin size={14} />
                      {session.location.latitude.toFixed(4)}, {session.location.longitude.toFixed(4)}
                    </div>
                  </div>
                  <div className="session-details">
                    <div className="session-catches">
                      <Fish size={14} />
                      {session.catches.length} catches
                    </div>
                    <div className="session-duration">
                      <Clock size={14} />
                      {session.endTime 
                        ? `${Math.round((session.endTime.getTime() - session.startTime.getTime()) / (1000 * 60))}m`
                        : 'In progress'
                      }
                    </div>
                  </div>
                  {session.weather.temperature && (
                    <div className="session-weather">
                      <Thermometer size={14} />
                      {session.weather.temperature}°C
                    </div>
                  )}
                  {session.weather.windSpeed && (
                    <div className="session-wind">
                      <Wind size={14} />
                      {session.weather.windSpeed} kts
                    </div>
                  )}
                </div>
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
    </div>
  );
};

export default Dashboard;
