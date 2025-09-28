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

const Share: React.FC = () => {
  const { user } = useAuth();
  const [sharedSessions, setSharedSessions] = useState<Session[]>([]);
  const [, setMySessions] = useState<Session[]>([]);
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
  const [filteredSessions, setFilteredSessions] = useState<any[]>([]);

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  useEffect(() => {
    if (sharedSessions.length > 0) {
      extractSpeciesCounts();
      processSharedSessions();
    }
  }, [sharedSessions, selectedUsers, selectedSpecies, allUsers]);

  useEffect(() => {
    processSharedSessions();
  }, [selectedUsers, selectedSpecies, sharedSessions, allUsers]);

  const loadData = async () => {
    setIsLoading(true);
    setStatus('');

    try {
      const offlineMode = await OfflineService.isOfflineMode();
      setIsOfflineMode(offlineMode);

      if (offlineMode) {
        // Load offline data
        const [sharedData, friendsData] = await Promise.all([
          DataSyncService.getOfflineSharedSessions(),
          DataSyncService.getOfflineFriendsData()
        ]);
        
        setSharedSessions(sharedData);
        setMySessions([]); // No my sessions in offline mode
        setAllUsers(friendsData); // In offline mode, only show friends
        setFriends(friendsData);
        setStatus('Offline mode - showing cached data');
      } else {
        // Load online data
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

  const processSharedSessions = () => {
    const sessions = sharedSessions.filter(session => {
      const userMatch = selectedUsers.length === 0 || selectedUsers.includes(session.user_id);
      const speciesMatch = selectedSpecies.length === 0 || 
        session.session_data.catches.some((catch_: any) => 
          selectedSpecies.includes(catch_.species)
        );
      return userMatch && speciesMatch;
    });

    // Flatten all catches from filtered sessions
    const allCatches: any[] = [];
    sessions.forEach(session => {
      if (session.session_data.catches) {
        session.session_data.catches.forEach((catch_: any) => {
          allCatches.push({
            ...catch_,
            sessionDate: session.session_data.date,
            sessionStartTime: session.session_data.startTime,
            userName: allUsers.find(u => u.id === session.user_id)?.username || 'Unknown',
            location: session.session_data.location
          });
        });
      }
    });

    // Sort by date (most recent first)
    allCatches.sort((a, b) => new Date(b.sessionDate).getTime() - new Date(a.sessionDate).getTime());
    
    setFilteredSessions(allCatches);
  };

  const extractSpeciesCounts = () => {
    const speciesCount: {[species: string]: number} = {};
    sharedSessions.forEach(session => {
      if (session.session_data.catches) {
        session.session_data.catches.forEach((catch_: any) => {
          const species = catch_.species || 'Unknown';
          speciesCount[species] = (speciesCount[species] || 0) + 1;
        });
      }
    });
    setAllSpecies(speciesCount);
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


  if (!user) {
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
            Shared Sessions from Friends
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
                ) : allUsers.length === 0 ? (
                  <div className="no-data">No anglers found</div>
                ) : (
                  allUsers.map(displayedUser => {
                    const isFriend = friends.some(f => f.id === displayedUser.id);
                    const friendship = friendships.find(f => 
                      (f.requester_id === user.id && f.addressee_id === displayedUser.id) ||
                      (f.requester_id === displayedUser.id && f.addressee_id === user.id)
                    );
                    
                    // Determine friendship state
                    let friendshipState = 'stranger';
                    if (isFriend) {
                      friendshipState = 'friend';
                    } else if (friendship) {
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
              </div>
            </div>

            {/* Right Panel - Species */}
            <div className="species-panel">
              <h3>Species</h3>
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
                      </div>
                    ))
                )}
              </div>
            </div>
          </div>

          {/* Summary Panel */}
          <div className="summary-panel">
            <h3>Session Summary</h3>
            <div className="summary-content">
              <div className="summary-list">
                {filteredSessions.length === 0 ? (
                  <div className="no-data">No sessions match your filters</div>
                ) : (
                  filteredSessions.map((catch_, index) => (
                    <div key={index} className="summary-item">
                      <div className="summary-date">
                        {new Date(catch_.sessionDate).toLocaleDateString()}
                      </div>
                      <div className="summary-time">
                        {new Date(catch_.sessionStartTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                      <div className="summary-user">{catch_.userName}</div>
                      <div className="summary-location">
                        <MapPin size={14} />
                        {catch_.location?.description || 'Unknown'}
                      </div>
                      <div className="summary-species">{catch_.species}</div>
                      <div className="summary-measurements">
                        {catch_.length ? `${catch_.length}"` : ''} {catch_.weight ? `${catch_.weight}lbs` : ''}
                      </div>
                    </div>
                  ))
                )}
              </div>
              
              {/* Map */}
              <div className="summary-map">
                <h4>Catch Locations</h4>
                <div className="map-container">
                  <div className="map-placeholder">
                    Map showing {filteredSessions.length} catch locations
                  </div>
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