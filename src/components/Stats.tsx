import React, { useState, useEffect } from 'react';
import { Fish } from 'lucide-react';
import { StatsService, PublicStats, AnglerStats } from '../services/statsService';

const Stats: React.FC = () => {
  const [stats, setStats] = useState<PublicStats | null>(null);
  const [anglerStats, setAnglerStats] = useState<AnglerStats[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadStats = async () => {
      try {
        console.log('Stats: Loading stats from API...');
        const { stats: publicStats, anglerStats: anglerData } = await StatsService.getStats();
        console.log('Stats: Loaded stats:', publicStats);
        console.log('Stats: Loaded angler data:', anglerData.length, 'anglers');
        setStats(publicStats);
        setAnglerStats(anglerData);
      } catch (error) {
        console.error('Error loading stats:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadStats();
  }, []);

  const formatDuration = (hours: number): string => {
    if (hours < 1) {
      return `${Math.round(hours * 60)}m`;
    }
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    if (h === 0) {
      return `${m}m`;
    }
    if (m === 0) {
      return `${h}h`;
    }
    return `${h}h ${m}m`;
  };

  if (isLoading) {
    return (
      <div className="card loading-center" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 160, textAlign: 'center' }}>
        <div className="loading-spinner"></div>
        <p>Loading statistics...</p>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="card">
        <div className="empty-state">
          <Fish size={48} />
          <h3>No statistics available</h3>
          <p>No public fishing data found.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="stats-page">
        <div className="card">
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-value">{stats.totalAnglers}</div>
            <div className="stat-label">Total Anglers</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{stats.totalSessions} / {stats.totalCatches}</div>
            <div className="stat-label">Total Sessions / Catches</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{stats.averageCatchPerSession}</div>
            <div className="stat-label">Avg Catches / Session</div>
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
      </div>

      <div className="card">
        <div className="card-header">
          <h2 className="card-title">Leaderboard</h2>
        </div>
        {anglerStats.length === 0 ? (
          <div className="empty-state">
            <Fish size={48} />
            <h3>No angler data available</h3>
            <p>No public fishing sessions found.</p>
          </div>
        ) : (
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Angler</th>
                  <th># Sessions</th>
                  <th>Fishing Time</th>
                  <th># Caught</th>
                  <th># Species Caught</th>
                  <th>Most Common</th>
                </tr>
              </thead>
              <tbody>
                {anglerStats.map((angler, index) => (
                  <tr key={index}>
                    <td>{angler.angler}</td>
                    <td>{angler.sessions}</td>
                    <td>{formatDuration(angler.fishingTime)}</td>
                    <td>{angler.catches}</td>
                    <td>{angler.speciesCaught}</td>
                    <td>{angler.mostCommonSpecies}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default Stats;

