import React, { useState, useEffect } from 'react';
import { RefreshCw, Users, Clock, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { SharingService } from '../services/sharingService';
import { DataSyncService } from '../services/dataSyncService';
import { OfflineService } from '../services/offlineService';
import { Profile, SharedSession } from '../lib/supabase';
import { FishingSession } from '../types';

const Share: React.FC = () => {
  const { user } = useAuth();
  const [sharedSessions, setSharedSessions] = useState<SharedSession[]>([]);
  const [, setMySessions] = useState<SharedSession[]>([]);
  const [friends, setFriends] = useState<Profile[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [status, setStatus] = useState('');
  const [showShareModal, setShowShareModal] = useState(false);
  const [selectedSession, setSelectedSession] = useState<FishingSession | null>(null);
  const [privacyLevel, setPrivacyLevel] = useState<'public' | 'friends' | 'private'>('friends');
  const [selectedFriends, setSelectedFriends] = useState<string[]>([]);
  const [, setIsOfflineMode] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

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
        setFriends(friendsData);
        setStatus('Offline mode - showing cached data');
      } else {
        // Load online data
        const [sharedData, myData, friendsData] = await Promise.all([
          SharingService.getSharedSessions(),
          SharingService.getUserSessions(),
          DataSyncService.getOfflineFriendsData()
        ]);
        
        setSharedSessions(sharedData);
        setMySessions(myData);
        setFriends(friendsData);
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
            Share
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


          {/* Shared Sessions from Others */}
          <div className="shared-sessions">
            <h3>
              <Users size={18} />
              Shared Sessions from Friends
            </h3>
            
            {isLoading ? (
              <div className="loading-spinner"></div>
            ) : sharedSessions.length === 0 ? (
              <div className="empty-state">
                <p>No shared sessions available yet.</p>
                <p>Add friends to see their shared sessions!</p>
              </div>
            ) : (
              <div className="sessions-grid">
                {sharedSessions.map((session) => (
                  <div key={session.id} className="session-card">
                    <div className="session-header">
                      <div className="session-info">
                        <h4>{session.user?.display_name || session.user?.username}</h4>
                        <div className="session-meta">
                          <span className="date">
                            <Clock size={14} />
                            {formatDate(session.created_at)}
                          </span>
                          <span className="privacy-level">
                            {session.privacy_level === 'public' && <Eye size={14} />}
                            {session.privacy_level === 'friends' && <Users size={14} />}
                            {session.privacy_level === 'private' && <EyeOff size={14} />}
                            {session.privacy_level.charAt(0).toUpperCase() + session.privacy_level.slice(1)}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="session-details">
                      <div className="session-data">
                        <p><strong>Species:</strong> {session.session_data?.catches?.map((c: any) => c.species).join(', ') || 'None'}</p>
                        <p><strong>Location:</strong> {session.session_data?.location?.description || 'Unknown'}</p>
                        <p><strong>Catches:</strong> {session.session_data?.catches?.length || 0}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
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
                                {friend.initials}
                              </div>
                              <span>{friend.display_name || friend.username}</span>
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