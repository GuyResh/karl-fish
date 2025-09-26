import React, { useState, useEffect } from 'react';
import { Share2, RefreshCw, Users, Clock, Settings, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { SharingService } from '../services/sharingService';
import { FriendService } from '../services/friendService';
import { Profile, SharedSession } from '../lib/supabase';
import { FishingSession } from '../types';

const Share: React.FC = () => {
  const { user } = useAuth();
  const [sharedSessions, setSharedSessions] = useState<SharedSession[]>([]);
  const [mySessions, setMySessions] = useState<SharedSession[]>([]);
  const [friends, setFriends] = useState<Profile[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [status, setStatus] = useState('');
  const [showShareModal, setShowShareModal] = useState(false);
  const [selectedSession, setSelectedSession] = useState<FishingSession | null>(null);
  const [privacyLevel, setPrivacyLevel] = useState<'public' | 'friends' | 'private'>('friends');
  const [selectedFriends, setSelectedFriends] = useState<string[]>([]);

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  const loadData = async () => {
    setIsLoading(true);
    setStatus('');

    try {
      const [sharedData, myData, friendsData] = await Promise.all([
        SharingService.getSharedSessions(),
        SharingService.getUserSessions(),
        FriendService.getFriends()
      ]);
      
      setSharedSessions(sharedData);
      setMySessions(myData);
      setFriends(friendsData);
      
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

  const handleDeleteSession = async (sessionId: string) => {
    if (window.confirm('Are you sure you want to delete this shared session?')) {
      try {
        await SharingService.deleteSharedSession(sessionId);
        await loadData();
        setStatus('Session deleted successfully!');
      } catch (error) {
        console.error('Error deleting session:', error);
        setStatus(`Error deleting session: ${error}`);
      }
    }
  };

  const handlePrivacyChange = (sessionId: string, newPrivacy: 'public' | 'friends' | 'private') => {
    SharingService.updateSessionPrivacy(sessionId, newPrivacy);
    loadData();
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


  if (!user) {
    return (
      <div className="share">
        <div className="card">
          <div className="card-header">
            <h1 className="card-title">
              <Share2 size={24} />
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
            <Share2 size={24} />
            Share
          </h1>
          <div className="header-actions">
            <button
              onClick={loadData}
              disabled={isLoading || isSharing}
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
            <div className={`share-status ${status.includes('Error') ? 'error' : 'success'}`}>
              {status}
            </div>
          )}

          {/* My Shared Sessions */}
          <div className="my-sessions">
            <h3>
              <Settings size={18} />
              My Shared Sessions
            </h3>
            
            {mySessions.length === 0 ? (
              <div className="empty-state">
                <p>No sessions shared yet. Share your first session below!</p>
              </div>
            ) : (
              <div className="sessions-grid">
                {mySessions.map((session) => (
                  <div key={session.id} className="session-card my-session">
                    <div className="session-header">
                      <div className="session-info">
                        <h4>{formatDate(session.created_at)}</h4>
                        <div className="session-meta">
                          <span className="privacy-level">
                            {session.privacy_level === 'public' && <Eye size={14} />}
                            {session.privacy_level === 'friends' && <Users size={14} />}
                            {session.privacy_level === 'private' && <EyeOff size={14} />}
                            {session.privacy_level.charAt(0).toUpperCase() + session.privacy_level.slice(1)}
                          </span>
                        </div>
                      </div>
                      <div className="session-actions">
                        <select
                          value={session.privacy_level}
                          onChange={(e) => handlePrivacyChange(session.id, e.target.value as any)}
                          className="privacy-select"
                        >
                          <option value="public">Public</option>
                          <option value="friends">Friends Only</option>
                          <option value="private">Private</option>
                        </select>
                        <button
                          onClick={() => handleDeleteSession(session.id)}
                          className="btn btn-danger btn-sm"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

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