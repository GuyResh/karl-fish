import React, { useState, useEffect } from 'react';
import { Users, UserPlus, Search, Check, X, UserX, Shield } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { FriendService } from '../services/friendService';
import { AuthService } from '../services/authService';
import { Profile, Friendship } from '../lib/supabase';

const Friends: React.FC = () => {
  const { profile } = useAuth();
  const [friends, setFriends] = useState<Profile[]>([]);
  const [pendingRequests, setPendingRequests] = useState<Friendship[]>([]);
  const [sentRequests, setSentRequests] = useState<Friendship[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Profile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    loadFriendsData();
  }, []);

  const loadFriendsData = async () => {
    setIsLoading(true);
    try {
      const [friendsData, pendingData, sentData] = await Promise.all([
        FriendService.getFriends(),
        FriendService.getPendingRequests(),
        FriendService.getSentRequests()
      ]);
      
      setFriends(friendsData);
      setPendingRequests(pendingData);
      setSentRequests(sentData);
    } catch (error) {
      console.error('Error loading friends data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const results = await AuthService.searchUsers(query);
      // Filter out current user and existing friends
      const friendIds = friends.map(f => f.id);
      const filteredResults = results.filter(user => 
        user.id !== profile?.id && !friendIds.includes(user.id)
      );
      setSearchResults(filteredResults);
    } catch (error) {
      console.error('Error searching users:', error);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSendRequest = async (userId: string) => {
    try {
      await FriendService.sendFriendRequest(userId);
      await loadFriendsData();
      setSearchResults(searchResults.filter(user => user.id !== userId));
    } catch (error) {
      console.error('Error sending friend request:', error);
    }
  };

  const handleAcceptRequest = async (requestId: string) => {
    try {
      await FriendService.acceptFriendRequest(requestId);
      await loadFriendsData();
    } catch (error) {
      console.error('Error accepting friend request:', error);
    }
  };

  const handleDeclineRequest = async (requestId: string) => {
    try {
      await FriendService.declineFriendRequest(requestId);
      await loadFriendsData();
    } catch (error) {
      console.error('Error declining friend request:', error);
    }
  };

  const handleRemoveFriend = async (friendId: string) => {
    if (window.confirm('Are you sure you want to remove this friend?')) {
      try {
        await FriendService.removeFriend(friendId);
        await loadFriendsData();
      } catch (error) {
        console.error('Error removing friend:', error);
      }
    }
  };

  const handleBlockUser = async (userId: string) => {
    if (window.confirm('Are you sure you want to block this user?')) {
      try {
        await FriendService.blockUser(userId);
        await loadFriendsData();
      } catch (error) {
        console.error('Error blocking user:', error);
      }
    }
  };

  if (isLoading) {
    return (
      <div className="friends">
        <div className="card">
          <div className="loading-spinner"></div>
          <p>Loading friends...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="friends">
      <div className="card">
        <div className="card-header">
          <h1 className="card-title">
            <Users size={24} />
            Friends
          </h1>
        </div>

        <div className="friends-content">
          {/* Search Section */}
          <div className="search-section">
            <div className="search-input-wrapper">
              <Search size={16} />
              <input
                type="text"
                placeholder="Search for anglers..."
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                className="search-input"
              />
            </div>
            
            {isSearching && <div className="loading-spinner small"></div>}
          </div>

          {/* Search Results */}
          {searchResults.length > 0 && (
            <div className="search-results">
              <h3>Search Results</h3>
              <div className="user-list">
                {searchResults.map(user => (
                  <div key={user.id} className="user-card">
                    <div className="user-info">
                      <div className="user-avatar">
                        {user.initials}
                      </div>
                      <div>
                        <h4>{user.display_name || user.username}</h4>
                        <p>@{user.username}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleSendRequest(user.id)}
                      className="btn btn-primary btn-sm"
                    >
                      <UserPlus size={14} />
                      Add Friend
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Pending Requests */}
          {pendingRequests.length > 0 && (
            <div className="requests-section">
              <h3>Friend Requests</h3>
              <div className="user-list">
                {pendingRequests.map(request => (
                  <div key={request.id} className="user-card">
                    <div className="user-info">
                      <div className="user-avatar">
                        {request.requester?.initials}
                      </div>
                      <div>
                        <h4>{request.requester?.display_name || request.requester?.username}</h4>
                        <p>@{request.requester?.username}</p>
                      </div>
                    </div>
                    <div className="user-actions">
                      <button
                        onClick={() => handleAcceptRequest(request.id)}
                        className="btn btn-success btn-sm"
                      >
                        <Check size={14} />
                        Accept
                      </button>
                      <button
                        onClick={() => handleDeclineRequest(request.id)}
                        className="btn btn-secondary btn-sm"
                      >
                        <X size={14} />
                        Decline
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Sent Requests */}
          {sentRequests.length > 0 && (
            <div className="requests-section">
              <h3>Sent Requests</h3>
              <div className="user-list">
                {sentRequests.map(request => (
                  <div key={request.id} className="user-card">
                    <div className="user-info">
                      <div className="user-avatar">
                        {request.addressee?.initials}
                      </div>
                      <div>
                        <h4>{request.addressee?.display_name || request.addressee?.username}</h4>
                        <p>@{request.addressee?.username}</p>
                      </div>
                    </div>
                    <span className="status-pending">Pending</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Friends List */}
          <div className="friends-section">
            <h3>Your Friends ({friends.length})</h3>
            {friends.length === 0 ? (
              <div className="empty-state">
                <p>No friends yet. Search for anglers to add them!</p>
              </div>
            ) : (
              <div className="user-list">
                {friends.map(friend => (
                  <div key={friend.id} className="user-card">
                    <div className="user-info">
                      <div className="user-avatar">
                        {friend.initials}
                      </div>
                      <div>
                        <h4>{friend.display_name || friend.username}</h4>
                        <p>@{friend.username}</p>
                      </div>
                    </div>
                    <div className="user-actions">
                      <button
                        onClick={() => handleRemoveFriend(friend.id)}
                        className="btn btn-danger btn-sm"
                      >
                        <UserX size={14} />
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Friends;
