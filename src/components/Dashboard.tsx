import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Fish, Clock, MapPin, Thermometer, Wind, Trash2, Navigation } from 'lucide-react';
import { FishingDataService } from '../database';
import { FishingSession } from '../types';
import { UnitConverter } from '../utils/unitConverter';
import { nmea2000Service } from '../services/nmea2000Service';
import { SharedDataService } from '../services/sharedDataService';
import ConfirmModal from './ConfirmModal';
import SpeciesModal from './SpeciesModal';
import LiveMapModal from './LiveMapModal';

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
  const [allSessions, setAllSessions] = useState<FishingSession[]>([]);
  const [friendSessions, setFriendSessions] = useState<FishingSession[]>([]);
  const [friendSessionsWithUsers, setFriendSessionsWithUsers] = useState<Array<{ session: FishingSession; username: string }>>([]);
  const [hasFriendData, setHasFriendData] = useState(false);
  const [showMine, setShowMine] = useState(true);
  const [showFriends, setShowFriends] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleteAllOpen, setIsDeleteAllOpen] = useState(false);
  const [isSpeciesModalOpen, setIsSpeciesModalOpen] = useState(false);
  const [isLiveMapOpen, setIsLiveMapOpen] = useState(false);
  
  // console.log('Dashboard: isLiveMapOpen state:', isLiveMapOpen);
  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [isGpsConnected, setIsGpsConnected] = useState(false);
  const [currentHeading, setCurrentHeading] = useState<number | null>(null);
  const [currentDepth, setCurrentDepth] = useState<number | null>(null);

  const convertSessionDates = (session: FishingSession): FishingSession => {
    return {
      ...session,
      date: session.date instanceof Date ? session.date : new Date(session.date),
      startTime: session.startTime instanceof Date ? session.startTime : new Date(session.startTime),
      endTime: session.endTime ? (session.endTime instanceof Date ? session.endTime : new Date(session.endTime)) : undefined,
      lastModified: session.lastModified ? (session.lastModified instanceof Date ? session.lastModified : new Date(session.lastModified)) : undefined
    };
  };

  const updateRecentSessions = (userSessions: FishingSession[], friendSessionsData: FishingSession[]) => {
    let filteredSessions: FishingSession[] = [];
    
    if (showMine) {
      filteredSessions = [...filteredSessions, ...userSessions];
    }
    
    if (showFriends) {
      filteredSessions = [...filteredSessions, ...friendSessionsData];
    }
    
    // Ensure all dates are Date objects and sort by date (most recent first)
    const sortedSessions = filteredSessions
      .map(convertSessionDates)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 5);
    
    setRecentSessions(sortedSessions);
  };

  const loadDashboardData = async () => {
    try {
      const [statsData, userSessions, sharedSessions, profiles] = await Promise.all([
        FishingDataService.getSessionStats(),
        FishingDataService.getAllSessions(),
        SharedDataService.getSessions(),
        SharedDataService.getProfiles()
      ]);
      
      console.log('Dashboard loaded stats:', statsData);
      console.log('Dashboard loaded user sessions:', userSessions.length);
      console.log('Dashboard loaded shared sessions:', sharedSessions.length);
      console.log('Dashboard loaded profiles:', profiles.length);
      
      setStats(statsData);
      setAllSessions(userSessions);
      
      // Create a map of user_id to username for quick lookup
      const userIdToUsername = new Map<string, string>();
      profiles.forEach(profile => {
        userIdToUsername.set(profile.id, profile.username);
      });
      
      // Convert shared sessions to FishingSession format with user info
      const friendSessionsWithUsersData = sharedSessions
        .map(session => {
          const sessionData = session.session_data as FishingSession;
          if (sessionData && sessionData.id) {
            const username = userIdToUsername.get(session.user_id) || 'Unknown Friend';
            return {
              session: convertSessionDates(sessionData),
              username: username
            };
          }
          return null;
        })
        .filter((item): item is { session: FishingSession; username: string } => item !== null);
      
      const friendSessionsData = friendSessionsWithUsersData.map(item => item.session);
      
      // Check if there's any friend data available
      const hasFriendSessions = friendSessionsData.length > 0;
      setHasFriendData(hasFriendSessions);
      
      // If no friend data, only show Mine checkbox and disable Friends
      if (!hasFriendSessions) {
        setShowMine(true);
        setShowFriends(false);
      }
      
      setFriendSessions(friendSessionsData);
      setFriendSessionsWithUsers(friendSessionsWithUsersData);
      
      // Update recent sessions based on current filter state
      updateRecentSessions(userSessions, friendSessionsData);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      // On error, only show Mine checkbox
      setHasFriendData(false);
      setShowMine(true);
      setShowFriends(false);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  // Update recent sessions when filter checkboxes change
  useEffect(() => {
    updateRecentSessions(allSessions, friendSessions);
  }, [showMine, showFriends, allSessions, friendSessions]);

  const handleMineChange = (checked: boolean) => {
    setShowMine(checked);
  };

  const handleFriendsChange = (checked: boolean) => {
    setShowFriends(checked);
  };

  // Listen for data changes to refresh dashboard
  useEffect(() => {
    const handleDataCleared = () => {
      console.log('Dashboard: Data cleared event received, refreshing...');
      loadDashboardData();
    };

    const handleDataUpdated = () => {
      console.log('Dashboard: Data updated event received, refreshing...');
      loadDashboardData();
    };

    window.addEventListener('dataCleared', handleDataCleared);
    window.addEventListener('dataUpdated', handleDataUpdated);

    return () => {
      window.removeEventListener('dataCleared', handleDataCleared);
      window.removeEventListener('dataUpdated', handleDataUpdated);
    };
  }, []);

  // Monitor GPS connection and location updates
  useEffect(() => {
    const updateGpsStatus = async () => {
        const status = nmea2000Service.getConnectionStatus();
      setIsGpsConnected(status.connected);
      
      if (status.connected) {
        // Get the latest NMEA data from the database
        try {
          const allNmeaData = await FishingDataService.getAllNMEAData();
          
          if (allNmeaData.length > 0) {
            // Find the most recent data for each field
            const latestLocation = allNmeaData
              .filter(data => data.latitude && data.longitude)
              .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())[0];
            
            const latestHeading = allNmeaData
              .filter(data => data.heading !== undefined)
              .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())[0];
            
            const latestDepth = allNmeaData
              .filter(data => data.waterDepth !== undefined)
              .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())[0];
            
            // Update location
            if (latestLocation) {
              console.log('Dashboard: Using NMEA coordinates:', latestLocation.latitude!.toFixed(6), latestLocation.longitude!.toFixed(6));
              setCurrentLocation({
                lat: latestLocation.latitude!,
                lng: latestLocation.longitude!
              });
            } else {
              setCurrentLocation({
                lat: 41.0, // Offshore fishing area (40+ miles east of Block Island)
                lng: -70.8
              });
            }
            
            // Update heading
            if (latestHeading) {
              setCurrentHeading(latestHeading.heading!);
              console.log('Dashboard: Using heading:', latestHeading.heading);
            } else {
              setCurrentHeading(null);
            }
            
            // Update depth
            if (latestDepth) {
              setCurrentDepth(latestDepth.waterDepth!);
              console.log('Dashboard: Using depth:', latestDepth.waterDepth);
            } else {
              setCurrentDepth(null);
            }
          } else {
            setCurrentLocation({
              lat: 41.0, // Offshore fishing area (40+ miles east of Block Island)
              lng: -70.8
            });
            setCurrentHeading(null);
            setCurrentDepth(null);
          }
        } catch (error) {
          console.error('Error getting latest NMEA data:', error);
          setCurrentLocation(null);
          setCurrentHeading(null);
          setCurrentDepth(null);
        }
      } else {
        setCurrentLocation(null);
        setCurrentHeading(null);
        setCurrentDepth(null);
      }
    };

    // Initial update
    updateGpsStatus();

    // Update every 2 seconds to get real-time GPS updates
    const interval = setInterval(updateGpsStatus, 2000);

    return () => clearInterval(interval);
  }, []);

  const formatDuration = (hours: number): string => {
    if (hours < 1) {
      return `${Math.round(hours * 60)}m`;
    }
    return `${hours.toFixed(1)}h`;
  };

  if (isLoading) {
    return (
      <div
        className="card loading-center"
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 160, textAlign: 'center' }}
      >
        <div className="loading-spinner"></div>
        <p>Loading dashboard...</p>
      </div>
    );
  }

  return (
    <div className="dashboard">
      <div className="card">
        <div className="card-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h1 className="card-title">Fishing Dashboard</h1>
          <div 
            className="location-display"
            onClick={() => {
              // console.log('Location display clicked, opening live map');
              setIsLiveMapOpen(true);
            }}
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '8px', 
              cursor: 'pointer',
              padding: '8px 12px',
              borderRadius: '6px',
              background: isGpsConnected ? '#f0f9ff' : '#fef2f2',
              border: `1px solid ${isGpsConnected ? '#0ea5e9' : '#fca5a5'}`,
              transition: 'all 0.2s',
              minWidth: '200px'
            }}
          >
            <Navigation 
              size={16} 
              style={{ 
                color: isGpsConnected ? '#0ea5e9' : '#fca5a5' 
              }} 
            />
            <div style={{ fontSize: '14px', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '12px' }}>
              {currentLocation ? (
                <>
                  <div style={{ color: isGpsConnected ? '#0ea5e9' : '#fca5a5' }}>
                    {currentLocation.lat.toFixed(4)}°N, {Math.abs(currentLocation.lng).toFixed(4)}°W
                  </div>
                  {currentHeading !== null && (
                    <div style={{ color: isGpsConnected ? '#0ea5e9' : '#fca5a5', fontSize: '12px' }}>
                      HDG: {Math.round(currentHeading)}°
                    </div>
                  )}
                  {currentDepth !== null && (
                    <div style={{ color: isGpsConnected ? '#0ea5e9' : '#fca5a5', fontSize: '12px' }}>
                      DEP: {UnitConverter.convertDepth(currentDepth).toFixed(1)}{UnitConverter.getDepthUnit()}
                    </div>
                  )}
                </>
              ) : (
                <div style={{ color: '#fca5a5' }}>
                  No GPS Signal
                </div>
              )}
            </div>
          </div>
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
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '14px' }}>
                  <input
                    type="checkbox"
                    checked={showMine}
                    onChange={(e) => handleMineChange(e.target.checked)}
                    style={{ margin: 0 }}
                  />
                  Mine
                </label>
                {hasFriendData && (
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '14px' }}>
                    <input
                      type="checkbox"
                      checked={showFriends}
                      onChange={(e) => handleFriendsChange(e.target.checked)}
                      style={{ margin: 0 }}
                    />
                    Friends
                  </label>
                )}
              </div>
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
          </div>
          {recentSessions.length === 0 ? (
            <div className="empty-state">
              <Fish size={48} />
              <h3>No sessions found</h3>
              {!showMine && !showFriends ? (
                <p>Please check Mine and/or Friends check boxes above</p>
              ) : showMine && !showFriends ? (
                <>
                  <p>Start logging your fishing adventures!</p>
                  <Link to="/sessions/new" className="btn btn-primary">
                    Create First Session
                  </Link>
                </>
              ) : !showMine && showFriends ? (
                <p>Your friends haven't shared any sessions yet</p>
              ) : !hasFriendData ? (
                <>
                  <p>Start logging your fishing adventures!</p>
                  <Link to="/sessions/new" className="btn btn-primary">
                    Create First Session
                  </Link>
                </>
              ) : (
                <p>No sessions found</p>
              )}
            </div>
          ) : (
            <div className="recent-sessions dashboard-recent-sessions">
              {recentSessions.map(session => {
                // Find if this is a friend session and get the username
                const friendSessionInfo = friendSessionsWithUsers.find(item => item.session.id === session.id);
                const isFriendSession = !!friendSessionInfo;
                
                return (
                  <Link key={session.id} to={`/sessions/${session.id}`} className="session-item session-item-clickable">
                    {/* Left Column: Date/Time + Session Details */}
                    <div className="session-left-column">
                      <div className="session-date">
                        {session.date.toLocaleDateString()}
                        {/* time moved next to date */}
                        <span style={{ marginLeft: '8px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <Clock size={14} />
                          {session.startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          {` - `}
                          {session.endTime
                            ? (
                                <>
                                  {session.endTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                  <span className="duration">
                                    {(() => {
                                      const ms = session.endTime.getTime() - session.startTime.getTime();
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
                      </div>
                    </div>
                    
                    {/* Right Column: Location + Friend Info */}
                    <div className="session-right-column">
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
                        {isFriendSession && (
                          <div className="friend-username" style={{ 
                            textAlign: 'right',
                            color: '#666',
                            fontSize: '0.8rem'
                          }}>
                            by {friendSessionInfo.username}
                          </div>
                        )}
                      </div>
                    </div>
                  </Link>
                );
              })}
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
      <LiveMapModal
        isOpen={isLiveMapOpen}
        onClose={() => setIsLiveMapOpen(false)}
      />
    </div>
  );
};

export default Dashboard;
