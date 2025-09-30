import React, { useState, useEffect } from 'react';
import { RefreshCw, Users, Eye, EyeOff, UserPlus, MapPin, Check, X, UserMinus, UserCheck } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { SharingService } from '../services/sharingService';
import { DataSyncService } from '../services/dataSyncService';
import { OfflineService } from '../services/offlineService';
import { AuthService } from '../services/authService';
import { FriendService } from '../services/friendService';
import { Profile, Session } from '../lib/supabase';
import { FishingSession } from '../types';
import { FishingDataService } from '../database';
import LeafletMap, { CatchLocation } from './LeafletMap';
import DateRangeSlider from './DateRangeSlider';

const Share: React.FC = () => {
  const { user, profile } = useAuth();
  const [sharedSessions, setSharedSessions] = useState<Session[]>([]);
  const [mySessions, setMySessions] = useState<any[]>([]);
  const [allUsers, setAllUsers] = useState<Profile[]>([]);
  const [friends, setFriends] = useState<Profile[]>([]);
  const [friendships, setFriendships] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [status, setStatus] = useState('');
  const [showShareModal, setShowShareModal] = useState(false);
  const [selectedSession, setSelectedSession] = useState<FishingSession | null>(null);
  const [privacyLevel, setPrivacyLevel] = useState<'public' | 'friends' | 'private'>('friends');
  const [selectedFriends, setSelectedFriends] = useState<string[]>([]);
  const [, setIsOfflineMode] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [selectedSpecies, setSelectedSpecies] = useState<string[]>([]);
  const [allSpecies, setAllSpecies] = useState<{[species: string]: number}>({});
  const [dateRange, setDateRange] = useState<{start: Date, end: Date} | null>(null);
  const [filteredSessions, setFilteredSessions] = useState<any[]>([]);
  const [selectedSessionsForMap, setSelectedSessionsForMap] = useState<Set<number>>(new Set());
  const [dateFilter, setDateFilter] = useState<{start: Date, end: Date} | null>(null);
  const [currentNmeaLocation, setCurrentNmeaLocation] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    if (user) {
      // When user logs in, disable offline mode and load fresh data
      DataSyncService.disableOfflineMode();
      loadData();
    } else {
      // Even if not logged in, try to load offline data
      loadData();
    }
  }, [user]);

  useEffect(() => {
    if (sharedSessions.length > 0 || mySessions.length > 0) {
      extractSpeciesCounts();
      calculateDateRange();
      processSharedSessions();
    }
  }, [sharedSessions, mySessions, selectedUsers, selectedSpecies, allUsers]);

  useEffect(() => {
    processSharedSessions();
  }, [selectedUsers, selectedSpecies, sharedSessions, mySessions, allUsers, dateFilter]);

  // Initialize all sessions as selected for map when filteredSessions changes
  useEffect(() => {
    if (filteredSessions.length > 0) {
      setSelectedSessionsForMap(new Set(filteredSessions.map((_, index) => index)));
    } else {
      setSelectedSessionsForMap(new Set());
    }
  }, [filteredSessions]);

  // Initialize date filter when date range is calculated
  useEffect(() => {
    if (dateRange) {
      setDateFilter({ start: dateRange.start, end: dateRange.end });
    }
  }, [dateRange]);

  // Pull latest NMEA location to drive map current-location override
  useEffect(() => {
    const loadLatestNmea = async () => {
      try {
        const allNmea = await FishingDataService.getAllNMEAData();
        if (allNmea && allNmea.length > 0) {
          const latestWithCoords = allNmea
            .filter((d: any) => d.latitude && d.longitude)
            .sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];
          if (latestWithCoords && typeof latestWithCoords.latitude === 'number' && typeof latestWithCoords.longitude === 'number') {
            setCurrentNmeaLocation({ lat: latestWithCoords.latitude, lng: latestWithCoords.longitude });
          }
        }
      } catch (e) {
        console.error('Share: failed to load NMEA data', e);
      }
    };

    loadLatestNmea();
    const onDataUpdated = () => loadLatestNmea();
    window.addEventListener('dataUpdated', onDataUpdated);
    return () => window.removeEventListener('dataUpdated', onDataUpdated);
  }, []);


  const loadData = async () => {
    setIsLoading(true);
    setStatus('');

    try {
      const offlineMode = await OfflineService.isOfflineMode();
      setIsOfflineMode(offlineMode);

      if (!user) {
        // Not logged in - load cached data
        const [sharedData, friendsData, friendshipsData, localSessions] = await Promise.all([
          DataSyncService.getOfflineSharedSessions(),
          DataSyncService.getOfflineFriendsData(),
          DataSyncService.getOfflineFriendships(),
          // Load local sessions from IndexedDB even when not logged in
          import('../database').then(({ FishingDataService }) => FishingDataService.getAllSessions())
        ]);
        
        setSharedSessions(sharedData);
        setMySessions(localSessions); // Show local sessions even when not logged in
        setAllUsers(friendsData); // In offline mode, only show friends
        setFriends(friendsData);
        setFriendships(friendshipsData);
        setStatus('Showing cached data (not logged in)');
      } else if (offlineMode) {
        // Logged in but in offline mode - show cached data
        const [sharedData, friendsData, friendshipsData, localSessions] = await Promise.all([
          DataSyncService.getOfflineSharedSessions(),
          DataSyncService.getOfflineFriendsData(),
          DataSyncService.getOfflineFriendships(),
          // Load local sessions from IndexedDB
          import('../database').then(({ FishingDataService }) => FishingDataService.getAllSessions())
        ]);
        
        setSharedSessions(sharedData);
        setMySessions(localSessions);
        setAllUsers(friendsData);
        setFriends(friendsData);
        setFriendships(friendshipsData);
        setStatus('Offline mode - showing cached data');
      } else {
        // Logged in and online - load fresh data from server
        const [sharedData, myData, allUsersData, friendsData, friendshipsData] = await Promise.all([
          SharingService.getSharedSessions(),
          SharingService.getUserSessions(),
          AuthService.getAllUsers(),
          FriendService.getFriends(),
          FriendService.getAllFriendships()
        ]);
        
        setSharedSessions(sharedData);
        setMySessions(myData);
        setAllUsers(allUsersData); // All users except current user
        setFriends(friendsData);
        setFriendships(friendshipsData);
        setStatus(''); // Clear status when loading fresh data
      }
      
    } catch (error) {
      console.error('Error loading data:', error);
      setStatus(`Error loading data: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };


  const handleConfirmShare = async () => {
    if (!selectedSession) return;

    setIsSharing(true);
    setStatus('');

    try {
      await SharingService.shareSession(
        selectedSession,
        privacyLevel,
        privacyLevel === 'friends' ? selectedFriends : undefined
      );
      
      setStatus('Session shared successfully!');
      setShowShareModal(false);
      setSelectedSession(null);
      await loadData();
      
    } catch (error) {
      console.error('Error sharing session:', error);
      setStatus(`Error sharing session: ${error}`);
    } finally {
      setIsSharing(false);
    }
  };



  const toggleFriendSelection = (friendId: string) => {
    setSelectedFriends(prev => 
      prev.includes(friendId) 
        ? prev.filter(id => id !== friendId)
        : [...prev, friendId]
    );
  };

  const toggleUserSelection = (userId: string) => {
    setSelectedUsers(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const toggleSpeciesSelection = (species: string) => {
    setSelectedSpecies(prev => 
      prev.includes(species) 
        ? prev.filter(s => s !== species)
        : [...prev, species]
    );
  };

  const toggleSessionForMap = (index: number) => {
    setSelectedSessionsForMap(prev => {
      const newSet = new Set(prev);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      return newSet;
    });
  };

  const toggleAllSessionsForMap = () => {
    const allSelected = selectedSessionsForMap.size === filteredSessions.length && filteredSessions.length > 0;
    if (allSelected) {
      setSelectedSessionsForMap(new Set());
    } else {
      setSelectedSessionsForMap(new Set(filteredSessions.map((_, index) => index)));
    }
  };

  const toggleAllSpecies = () => {
    const speciesList = Object.keys(allSpecies);
    const allSelected = selectedSpecies.length === speciesList.length && speciesList.length > 0;
    setSelectedSpecies(allSelected ? [] : speciesList);
  };

  const processSharedSessions = () => {
    // Require at least one selected user AND at least one selected species
    if (selectedUsers.length === 0 || selectedSpecies.length === 0) {
      setFilteredSessions([]);
      return;
    }

    // Get all sessions to process (shared + my own if "me" is selected)
    const allSessionsToProcess = [...sharedSessions];
    
    // If "me" is selected, also include my own sessions
    if (user && selectedUsers.includes(user.id)) {
      const myOwnSessions = mySessions || [];
      allSessionsToProcess.push(...myOwnSessions);
    }

    const sessions = allSessionsToProcess.filter((session: any) => {
      // Handle different session structures
      let sessionData, sessionUserId;
      if ('session_data' in session) {
        // Shared session from Supabase
        sessionData = session.session_data as any;
        sessionUserId = session.user_id;
      } else {
        // Local session from IndexedDB
        sessionData = session as any;
        sessionUserId = session.userId || session.user_id;
      }
      
      const userMatch = selectedUsers.includes(sessionUserId) || 
        (user && selectedUsers.includes(user.id) && sessionUserId === user.id);
      const speciesMatch = sessionData.catches?.some((catch_: any) => 
        selectedSpecies.includes(catch_.species)
      );
      
      // Add date filtering if date filter is set
      let dateMatch = true;
      if (dateFilter) {
        const sessionDate = new Date(sessionData.date || sessionData.startTime || session.updated_at);
        dateMatch = sessionDate >= dateFilter.start && sessionDate <= dateFilter.end;
      }
      
      return Boolean(userMatch && speciesMatch && dateMatch);
    });

    // Flatten all catches from filtered sessions, but only include catches that match selected species
    const allCatches: any[] = [];
    sessions.forEach((session: any) => {
      // Handle different session structures
      let sessionData, sessionUserId;
      if ('session_data' in session) {
        // Shared session from Supabase
        sessionData = session.session_data as any;
        sessionUserId = session.user_id;
      } else {
        // Local session from IndexedDB
        sessionData = session as any;
        sessionUserId = session.userId || session.user_id;
      }
      
      if (sessionData.catches) {
        sessionData.catches.forEach((catch_: any) => {
          // Only include catches that match the selected species
          if (selectedSpecies.includes(catch_.species)) {
            // Get username - special handling for current user
            let userName = 'Unknown';
            if (sessionUserId === user?.id) {
              // Current user - use profile name or username
              userName = profile?.name ? profile.name.split(' ')[0] : profile?.username || user?.email || 'Unknown';
            } else {
              // Other users - look up in allUsers
              userName = allUsers.find(u => u.id === sessionUserId)?.username || 'Unknown';
            }

            allCatches.push({
              ...catch_,
              sessionDate: sessionData.date,
              sessionStartTime: sessionData.startTime,
              userName: userName,
              location: sessionData.location
            });
          }
        });
      }
    });

    // Sort by date (most recent first)
    allCatches.sort((a, b) => new Date(b.sessionDate).getTime() - new Date(a.sessionDate).getTime());
    
    setFilteredSessions(allCatches);
  };

  const calculateDateRange = () => {
    const allSessions = [...sharedSessions, ...mySessions];
    if (allSessions.length === 0) {
      setDateRange(null);
      return;
    }

    const dates = allSessions.map(session => {
      // Handle different session structures
      let sessionData;
      if ('session_data' in session) {
        // Shared session from Supabase
        sessionData = session.session_data as any;
      } else {
        // Local session from IndexedDB
        sessionData = session as any;
      }
      
      return new Date(sessionData.date || sessionData.startTime || session.updated_at);
    }).filter(date => !isNaN(date.getTime()));

    if (dates.length === 0) {
      setDateRange(null);
      return;
    }

    const minDate = new Date(Math.min(...dates.map(d => d.getTime())));
    const maxDate = new Date(Math.max(...dates.map(d => d.getTime())));
    
    setDateRange({ start: minDate, end: maxDate });
  };

  const extractSpeciesCounts = () => {
    const speciesCount: {[species: string]: number} = {};
    
    // Only count species from selected users' sessions
    if (selectedUsers.length === 0) {
      setAllSpecies({});
      return;
    }
    
    // Get all sessions to process (shared + my own if "me" is selected)
    const allSessionsToProcess = [...sharedSessions];
    
    // If "me" is selected, also include my own sessions
    if (user && selectedUsers.includes(user.id)) {
      const myOwnSessions = mySessions || [];
      allSessionsToProcess.push(...myOwnSessions);
    }
    
    allSessionsToProcess.forEach((session: any) => {
      // Handle different session structures
      let sessionData, sessionUserId;
      if ('session_data' in session) {
        // Shared session from Supabase
        sessionData = session.session_data as any;
        sessionUserId = session.user_id;
      } else {
        // Local session from IndexedDB
        sessionData = session as any;
        sessionUserId = session.userId || session.user_id;
      }
      
      // Check if this session belongs to a selected user
      const isSelectedUser = selectedUsers.includes(sessionUserId) || 
        (user && selectedUsers.includes(user.id) && sessionUserId === user.id);
      
      if (isSelectedUser && sessionData.catches) {
        sessionData.catches.forEach((catch_: any) => {
          const species = catch_.species || 'Unknown';
          speciesCount[species] = (speciesCount[species] || 0) + 1;
        });
      }
    });
    setAllSpecies(speciesCount);
  };

  // Generate consistent colors for species
  const getSpeciesColor = (species: string): string => {
    const colors = [
      '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
      '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9',
      '#F8C471', '#82E0AA', '#F1948A', '#85C1E9', '#D7BDE2'
    ];
    
    // Simple hash function to get consistent color for each species
    let hash = 0;
    for (let i = 0; i < species.length; i++) {
      hash = species.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };

  // Convert filtered sessions to catch locations for Leaflet map
  const getCatchLocations = (): CatchLocation[] => {
    return filteredSessions
      .filter((_, index) => selectedSessionsForMap.has(index))
      .map(catch_ => ({
        id: catch_.id,
        latitude: catch_.location.latitude,
        longitude: catch_.location.longitude,
        species: catch_.species,
        userName: catch_.userName,
        sessionDate: catch_.sessionDate,
        length: catch_.length,
        weight: catch_.weight,
        location: catch_.location
      }));
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const handleSync = async () => {
    if (!user) {
      setStatus('Please sign in to sync data');
      return;
    }

    setIsSyncing(true);
    setStatus('');

    try {
      await DataSyncService.forceSync();
      setStatus('Successfully synced session data');
      await loadData(); // Reload data after sync
    } catch (error) {
      console.error('Error syncing data:', error);
      setStatus('Failed to sync session data');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleAddFriend = async (friendId: string, friendName: string) => {
    if (!user) {
      setStatus('Please sign in to add friends');
      return;
    }

    try {
      await FriendService.addFriend(friendId);
      setStatus(`Friend request sent to ${friendName}!`);
      await loadData(); // Reload data to update friend status
    } catch (error: any) {
      console.error('Error adding friend:', error);
      
      // Handle specific error messages
      if (error.message?.includes('Already friends')) {
        setStatus(`You are already friends with ${friendName}`);
      } else if (error.message?.includes('Friend request already sent')) {
        setStatus(`Friend request already sent to ${friendName}`);
      } else if (error.message?.includes('blocked')) {
        setStatus(`Cannot send friend request to ${friendName}`);
      } else {
        setStatus(`Error adding friend: ${error.message || error}`);
      }
    }
  };

  const handleAcceptFriend = async (friendshipId: string, friendName: string) => {
    try {
      await FriendService.acceptFriendRequest(friendshipId);
      setStatus(`Accepted friend request from ${friendName}!`);
      await loadData(); // Reload data to update friend status
    } catch (error: any) {
      console.error('Error accepting friend:', error);
      setStatus(`Error accepting friend: ${error.message || error}`);
    }
  };

  const handleBlockUser = async (friendId: string, friendName: string) => {
    try {
      await FriendService.blockUser(friendId);
      setStatus(`Blocked ${friendName}`);
      await loadData(); // Reload data to update friend status
    } catch (error: any) {
      console.error('Error blocking user:', error);
      setStatus(`Error blocking user: ${error.message || error}`);
    }
  };

  const handleUnfriendUser = async (friendId: string, friendName: string) => {
    try {
      await FriendService.unfriendUser(friendId);
      setStatus(`Unfriended ${friendName}`);
      await loadData(); // Reload data to update friend status
    } catch (error: any) {
      console.error('Error unfriending user:', error);
      setStatus(`Error unfriending user: ${error.message || error}`);
    }
  };

  const handleUnblockUser = async (friendId: string, friendName: string) => {
    try {
      await FriendService.unblockUser(friendId);
      setStatus(`Unblocked ${friendName}`);
      await loadData(); // Reload data to update friend status
    } catch (error: any) {
      console.error('Error unblocking user:', error);
      setStatus(`Error unblocking user: ${error.message || error}`);
    }
  };


  // Check if we have any data to show (either online or offline)
  const hasData = sharedSessions.length > 0 || mySessions.length > 0 || allUsers.length > 0 || friends.length > 0;
  
  if (!user && !hasData && !isLoading) {
    return (
      <div className="share">
        <div className="card">
          <div className="card-header">
            <h1 className="card-title">
              Share
            </h1>
          </div>
          <div className="share-content">
            <div className="auth-required">
              <p>Please sign in to access sharing features.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="share">
      <div className="card">
        <div className="card-header">
          <h1 className="card-title">
            <Users size={20} />
            <span style={{ marginLeft: '8px' }}>Shared Sessions</span>
          </h1>
          <div className="header-actions">
            <button
              onClick={handleSync}
              disabled={isLoading || isSharing || isSyncing}
              className="btn btn-primary"
            >
              <RefreshCw size={16} className={isSyncing ? 'spin' : ''} />
              {isSyncing ? 'Syncing...' : 'Sync'}
            </button>
            <button
              onClick={loadData}
              disabled={isLoading || isSharing || isSyncing}
              className="btn btn-secondary"
            >
              <RefreshCw size={16} />
              Refresh
            </button>
          </div>
        </div>

        <div className="share-content">
          {/* Status */}
          {status && (
            <div className={`share-status ${status.includes('Error') ? 'error' : 'info'}`}>
              {status}
            </div>
          )}

          {/* Two Panel Layout */}
          <div className="share-panels">
            {/* Left Panel - Users */}
            <div className="users-panel">
              <h3>Anglers</h3>
              <div className="users-list">
                {isLoading ? (
                  <div className="loading">Loading anglers...</div>
                ) : (
                  <>
                    {/* Current User - "Me" */}
                    {user && (
                      <div className="user-item">
                        <input
                          type="checkbox"
                          checked={selectedUsers.includes(user.id)}
                          onChange={() => toggleUserSelection(user.id)}
                          className="user-checkbox"
                        />
                        <div className="user-info">
                          <span className="user-name me-name">
                            {profile?.name ? profile.name.split(' ')[0] : profile?.username || user.email}
                          </span>
                        </div>
                      </div>
                    )}
                    
                    {/* Other Users */}
                    {allUsers.length === 0 ? (
                      <div className="no-data">No other anglers found</div>
                    ) : (
                      allUsers.map(displayedUser => {
                    const isFriend = friends.some(f => f.id === displayedUser.id);
                    const friendship = user ? friendships.find(f => 
                      (f.requester_id === user.id && f.addressee_id === displayedUser.id) ||
                      (f.requester_id === displayedUser.id && f.addressee_id === user.id)
                    ) : null;
                    
                    // Determine friendship state
                    let friendshipState = 'stranger';
                    if (isFriend) {
                      friendshipState = 'friend';
                    } else if (friendship && user) {
                      if (friendship.status === 'pending') {
                        // If current logged-in user is the requester, they sent the request (show "sent")
                        // If current logged-in user is the addressee, they received the request (show "accept/block")
                        friendshipState = friendship.requester_id === user.id ? 'pending_sent' : 'pending_received';
                      } else if (friendship.status === 'blocked') {
                        friendshipState = 'blocked';
                      }
                    }
                    
                    return (
                      <div key={displayedUser.id} className="user-item">
                        <input
                          type="checkbox"
                          checked={selectedUsers.includes(displayedUser.id)}
                          onChange={() => toggleUserSelection(displayedUser.id)}
                          className="user-checkbox"
                        />
                        <span className="user-name">{displayedUser.username}</span>
                        
                        {/* Friendship Status Display */}
                        <div className="friend-status-container" style={{ display: 'flex', gap: '4px' }}>
                          {friendshipState === 'stranger' && (
                            <div 
                              className="friend-status" 
                              title="Click to add friend"
                              onClick={() => handleAddFriend(displayedUser.id, displayedUser.username)}
                              style={{ 
                                cursor: 'pointer',
                                padding: '4px',
                                borderRadius: '4px',
                                transition: 'background-color 0.2s',
                                opacity: 0.6
                              }}
                            >
                              <UserPlus size={16} className="invite-icon" />
                            </div>
                          )}
                          
                          {friendshipState === 'pending_sent' && (
                            <div 
                              className="friend-status" 
                              title="Request sent"
                              style={{ 
                                cursor: 'default',
                                padding: '4px',
                                borderRadius: '4px',
                                backgroundColor: '#fbbf24',
                                color: 'white'
                              }}
                            >
                              <UserPlus size={16} />
                            </div>
                          )}
                          
                          {friendshipState === 'pending_received' && (
                            <>
                              <div 
                                className="friend-status" 
                                title="Accept friend request"
                                onClick={() => handleAcceptFriend(friendship.id, displayedUser.username)}
                                style={{ 
                                  cursor: 'pointer',
                                  padding: '4px',
                                  borderRadius: '4px',
                                  backgroundColor: '#10b981',
                                  color: 'white',
                                  transition: 'background-color 0.2s'
                                }}
                              >
                                <Check size={16} />
                              </div>
                              <div 
                                className="friend-status" 
                                title="Block user"
                                onClick={() => handleBlockUser(displayedUser.id, displayedUser.username)}
                                style={{ 
                                  cursor: 'pointer',
                                  padding: '4px',
                                  borderRadius: '4px',
                                  backgroundColor: '#ef4444',
                                  color: 'white',
                                  transition: 'background-color 0.2s'
                                }}
                              >
                                <X size={16} />
                              </div>
                            </>
                          )}
                          
                          {friendshipState === 'friend' && (
                            <>
                              <div 
                                className="friend-status" 
                                title="Friend"
                                style={{ 
                                  cursor: 'default',
                                  padding: '4px',
                                  borderRadius: '4px',
                                  backgroundColor: '#10b981',
                                  color: 'white'
                                }}
                              >
                                <Users size={16} />
                              </div>
                              <div 
                                className="friend-status" 
                                title="Unfriend"
                                onClick={() => handleUnfriendUser(displayedUser.id, displayedUser.username)}
                                style={{ 
                                  cursor: 'pointer',
                                  padding: '4px',
                                  borderRadius: '4px',
                                  backgroundColor: '#6b7280',
                                  color: 'white',
                                  transition: 'background-color 0.2s'
                                }}
                              >
                                <UserMinus size={16} />
                              </div>
                            </>
                          )}
                          
                          {friendshipState === 'blocked' && (
                            <>
                              <div 
                                className="friend-status" 
                                title="Blocked"
                                style={{ 
                                  cursor: 'default',
                                  padding: '4px',
                                  borderRadius: '4px',
                                  backgroundColor: '#ef4444',
                                  color: 'white'
                                }}
                              >
                                <X size={16} />
                              </div>
                              <div 
                                className="friend-status" 
                                title="Unblock"
                                onClick={() => handleUnblockUser(displayedUser.id, displayedUser.username)}
                                style={{ 
                                  cursor: 'pointer',
                                  padding: '4px',
                                  borderRadius: '4px',
                                  backgroundColor: '#6b7280',
                                  color: 'white',
                                  transition: 'background-color 0.2s'
                                }}
                              >
                                <UserCheck size={16} />
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    );
                      })
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Right Panel - Species */}
            <div className="species-panel">
              <h3 style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span>Species</span>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 'normal', fontSize: '0.9rem' }}>
                  <input
                    type="checkbox"
                    checked={selectedSpecies.length === Object.keys(allSpecies).length && Object.keys(allSpecies).length > 0}
                    onChange={toggleAllSpecies}
                  />
                  All
                </label>
              </h3>
              <div className="species-list">
                {Object.entries(allSpecies).length === 0 ? (
                  <div className="no-data">No species data</div>
                ) : (
                  Object.entries(allSpecies)
                    .sort(([a], [b]) => a.localeCompare(b))
                    .map(([species, count]) => (
                      <div key={species} className="species-item">
                        <input
                          type="checkbox"
                          checked={selectedSpecies.includes(species)}
                          onChange={() => toggleSpeciesSelection(species)}
                          className="species-checkbox"
                        />
                        <span className="species-name">{species}</span>
                        <span className="species-count">({count})</span>
                        <div 
                          className="species-color-swatch" 
                          style={{ backgroundColor: getSpeciesColor(species) }}
                        ></div>
                      </div>
                    ))
                )}
              </div>
            </div>
          </div>

          {/* Date Range Filter */}
          {dateRange && (
            <div className="date-range-filter">
              <div className="date-range-header">
                <span className="date-range-label">Date</span>
                <DateRangeSlider
                  minDate={dateRange.start}
                  maxDate={dateRange.end}
                  startDate={dateFilter?.start || dateRange.start}
                  endDate={dateFilter?.end || dateRange.end}
                  onChange={(start, end) => setDateFilter({ start, end })}
                  className="date-range-slider"
                />
              </div>
            </div>
          )}

          {/* Summary Panel */}
          <div className="summary-panel">
            <div className="summary-header">
              {filteredSessions.length > 0 && (
                <input
                  type="checkbox"
                  checked={selectedSessionsForMap.size === filteredSessions.length && filteredSessions.length > 0}
                  onChange={toggleAllSessionsForMap}
                  className="summary-checkbox"
                  title="All"
                />
              )}
              <h3>Session Summary</h3>
            </div>
            <div className="summary-content">
              <div className="summary-list-container">
                <div className="summary-list">
                  {filteredSessions.length === 0 ? (
                    <div className="no-data">No sessions match your filters</div>
                  ) : (
                    filteredSessions.map((catch_, index) => (
                      <div key={index} className="summary-item">
                        <input
                          type="checkbox"
                          checked={selectedSessionsForMap.has(index)}
                          onChange={() => toggleSessionForMap(index)}
                          className="summary-checkbox"
                          title="Toggle for map display"
                        />
                        <div className="summary-date">
                          {new Date(catch_.sessionDate).toLocaleDateString()}
                        </div>
                        <div className="summary-time">
                          {new Date(catch_.sessionStartTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                        <div className="summary-user">{catch_.userName}</div>
                        <div className="summary-location" title={catch_.location?.description || 'Unknown'}>
                          <MapPin size={14} />
                          {catch_.location?.latitude?.toFixed(4)}, {catch_.location?.longitude?.toFixed(4)}
                        </div>
                        <div className="summary-species">
                          <div 
                            className="species-color-swatch" 
                            style={{ backgroundColor: getSpeciesColor(catch_.species) }}
                          ></div>
                          <span className="species-name">{catch_.species}</span>
                        </div>
                        <div className="summary-measurements">
                          {catch_.length ? `${catch_.length}"` : ''} {catch_.weight ? `${catch_.weight}lbs` : ''}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
              
              {/* Map */}
              <div className="summary-map">
                <h4>Catch Locations</h4>
                <div className="map-container">
                  {filteredSessions.length > 0 ? (
                    <LeafletMap
                      catches={getCatchLocations()}
                      height="100%"
                      zoom={4}
                      className="catch-locations-map"
                      showCurrentLocation={true}
                      currentLocationOverride={currentNmeaLocation || undefined}
                    />
                  ) : (
                    <div className="map-placeholder">
                      Select users and species to view catch locations
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Share Modal */}
          {showShareModal && selectedSession && (
            <div className="modal-overlay">
              <div className="modal">
                <div className="modal-header">
                  <h3>Share Session</h3>
                  <button
                    onClick={() => setShowShareModal(false)}
                    className="modal-close"
                  >
                    ×
                  </button>
                </div>
                
                <div className="modal-content">
                  <div className="session-preview">
                    <h4>{formatDate(selectedSession.date.toString())} - {selectedSession.location.description}</h4>
                    <p>Catches: {selectedSession.catches.length}</p>
                  </div>

                  <div className="privacy-settings">
                    <h4>Privacy Level</h4>
                    <div className="privacy-options">
                      <label className="privacy-option">
                        <input
                          type="radio"
                          name="privacy"
                          value="public"
                          checked={privacyLevel === 'public'}
                          onChange={(e) => setPrivacyLevel(e.target.value as any)}
                        />
                        <div className="privacy-card">
                          <Eye size={20} />
                          <h5>Public</h5>
                          <p>Anyone can see this session</p>
                        </div>
                      </label>
                      
                      <label className="privacy-option">
                        <input
                          type="radio"
                          name="privacy"
                          value="friends"
                          checked={privacyLevel === 'friends'}
                          onChange={(e) => setPrivacyLevel(e.target.value as any)}
                        />
                        <div className="privacy-card">
                          <Users size={20} />
                          <h5>Friends Only</h5>
                          <p>Only your friends can see this session</p>
                        </div>
                      </label>
                      
                      <label className="privacy-option">
                        <input
                          type="radio"
                          name="privacy"
                          value="private"
                          checked={privacyLevel === 'private'}
                          onChange={(e) => setPrivacyLevel(e.target.value as any)}
                        />
                        <div className="privacy-card">
                          <EyeOff size={20} />
                          <h5>Private</h5>
                          <p>Only you can see this session</p>
                        </div>
                      </label>
                    </div>
                  </div>

                  {privacyLevel === 'friends' && friends.length > 0 && (
                    <div className="friend-selection">
                      <h4>Select Friends</h4>
                      <div className="friend-list">
                        {friends.map(friend => (
                          <label key={friend.id} className="friend-option">
                            <input
                              type="checkbox"
                              checked={selectedFriends.includes(friend.id)}
                              onChange={() => toggleFriendSelection(friend.id)}
                            />
                            <div className="friend-info">
                              <div className="friend-avatar">
                                {friend.name.charAt(0).toUpperCase()}
                              </div>
                              <span>{friend.name}</span>
                            </div>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="modal-footer">
                  <button
                    onClick={() => setShowShareModal(false)}
                    className="btn btn-secondary"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleConfirmShare}
                    disabled={isSharing}
                    className="btn btn-primary"
                  >
                    {isSharing ? 'Sharing...' : 'Share Session'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Share;