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
      // Less than 60 minutes, only show minutes
      return `${Math.round(hours * 60)}m`;
    }
    
    const totalMinutes = Math.round(hours * 60);
    const days = Math.floor(totalMinutes / (24 * 60));
    const remainingMinutes = totalMinutes % (24 * 60);
    const h = Math.floor(remainingMinutes / 60);
    const m = remainingMinutes % 60;
    
    if (days > 0) {
      // More than 24 hours: show days, hours, minutes
      const parts: string[] = [`${days}d`];
      if (h > 0) parts.push(`${h}h`);
      if (m > 0) parts.push(`${m}m`);
      return parts.join(' ');
    } else if (h > 0) {
      // Less than 24 hours but more than 60 minutes: show hours and minutes
      if (m === 0) {
        return `${h}h`;
      }
      return `${h}h ${m}m`;
    } else {
      // Less than 60 minutes: only show minutes
      return `${m}m`;
    }
  };

  if (isLoading) {
    return (
      <div className="stats-page">
        <div className="card loading-center" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 160, textAlign: 'center', width: '100%' }}>
          <div className="loading-spinner"></div>
          <p>Loading statistics...</p>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="stats-page">
        <div className="card">
          <div className="empty-state">
            <Fish size={48} />
            <h3>No statistics available</h3>
            <p>No public fishing data found.</p>
          </div>
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
                  <th>Rank</th>
                  <th>Angler</th>
                  <th style={{ textAlign: 'center' }}># Sessions</th>
                  <th style={{ textAlign: 'center' }}>Fishing Time</th>
                  <th style={{ textAlign: 'center' }}># Caught</th>
                  <th style={{ textAlign: 'center' }}># Species</th>
                  <th>Most Common</th>
                </tr>
              </thead>
              <tbody>
                {anglerStats.map((angler, index) => (
                  <tr key={index}>
                    <td style={{ textAlign: 'center', fontWeight: 'bold' }}>{index + 1}</td>
                    <td>{angler.angler}</td>
                    <td style={{ textAlign: 'center' }}>{angler.sessions}</td>
                    <td style={{ textAlign: 'center' }}>{formatDuration(angler.fishingTime)}</td>
                    <td style={{ textAlign: 'center' }}>{angler.catches}</td>
                    <td style={{ textAlign: 'center' }}>{angler.speciesCaught}</td>
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

