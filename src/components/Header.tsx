import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Fish, Settings, BarChart3, Download, Wifi, WifiOff, Share2, LogIn, LogOut } from 'lucide-react';
import { AppSettings } from '../types';
import { nmea2000Service } from '../services/nmea2000Service';
import { useAuth } from '../contexts/AuthContext';
import Modal from './Modal';

interface HeaderProps {
  settings: AppSettings | null;
  onShowAuth?: () => void;
  title?: string;
}

const Header: React.FC<HeaderProps> = ({ settings, onShowAuth, title }) => {
  const location = useLocation();
  const { user, profile, signOut } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [showConnectionError, setShowConnectionError] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [connectionTimeout, setConnectionTimeout] = useState<NodeJS.Timeout | null>(null);
  const [retryCount, setRetryCount] = useState(3);
  const [retryTimeout, setRetryTimeout] = useState<NodeJS.Timeout | null>(null);
  const [isRetrying, setIsRetrying] = useState(false);

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  useEffect(() => {
    const updateConnectionStatus = () => {
        const status = nmea2000Service.getConnectionStatus();
      setIsConnected(status.connected);
    };

    // Update status on mount
    updateConnectionStatus();

    // Set up interval to check connection status
    const interval = setInterval(updateConnectionStatus, 500); // Check more frequently

    return () => {
      clearInterval(interval);
      // Clean up any pending timeouts
      if (connectionTimeout) {
        clearTimeout(connectionTimeout);
      }
      if (retryTimeout) {
        clearTimeout(retryTimeout);
      }
    };
  }, [connectionTimeout, retryTimeout]);

  const handleRetry = async () => {
    if (retryCount <= 0 || !settings?.nmea2000.enabled || !settings.nmea2000.ipAddress) return;
    
    setShowConnectionError(false);
    setIsRetrying(true);
    setIsConnecting(true);
    setRetryCount(prev => prev - 1);
    
    // Set up connection timeout for retry attempts
    const timeout = setTimeout(() => {
      console.log('NMEA 2000 retry timeout');
      setIsConnecting(false);
      setIsRetrying(false);
      setIsConnected(false);
      setShowConnectionError(true);
      setConnectionTimeout(null);
    }, 10000); // 10 second timeout
    
    setConnectionTimeout(timeout);
    
    try {
      const result = await nmea2000Service.connect(
        settings.nmea2000.ipAddress,
        settings.nmea2000.port || 2000
      );
      
      // Clear timeout if connection succeeded
      if (result.success) {
        clearTimeout(timeout);
        setConnectionTimeout(null);
        setIsConnected(true);
        setIsRetrying(false);
        setIsConnecting(false);
        setRetryCount(3); // Reset retry count on success
        setConnectionError(null);
      } else {
        // Connection failed - clear timeout and show error modal with details
        clearTimeout(timeout);
        setConnectionTimeout(null);
        setIsConnecting(false);
        setIsRetrying(false);
        setConnectionError(result.errorMessage || 'Connection failed');
        setShowConnectionError(true);
      }
    } catch (error) {
      console.error('Error during retry:', error);
      clearTimeout(timeout);
      setConnectionTimeout(null);
      setIsConnecting(false);
      setIsRetrying(false);
      setConnectionError((error as Error)?.message || 'Unknown error occurred');
      setShowConnectionError(true);
    }
  };

  const handleCancel = () => {
    setShowConnectionError(false);
    setIsRetrying(false);
    setRetryCount(3);
    setIsConnecting(false);
    setIsConnected(false);
    
    // Clear any pending timeouts
    if (connectionTimeout) {
      clearTimeout(connectionTimeout);
      setConnectionTimeout(null);
    }
    if (retryTimeout) {
      clearTimeout(retryTimeout);
      setRetryTimeout(null);
    }
    
    // Disconnect from service
    nmea2000Service.disconnect();
  };

  const handleNMEA2000Toggle = async () => {
    if (isConnecting) return;
    
    // If we're retrying, don't allow toggle
    if (isRetrying) return;

    // Clear any existing timeout
    if (connectionTimeout) {
      clearTimeout(connectionTimeout);
      setConnectionTimeout(null);
    }

    // Reset retry count for new connection attempts
    setRetryCount(3);
    setIsRetrying(false);

    setIsConnecting(true);
    try {
      if (isConnected) {
        nmea2000Service.disconnect();
        setIsConnected(false);
      } else {
        if (settings?.nmea2000.enabled) {
          let success = false;
          if (settings.nmea2000.simulated) {
            // Start simulated mode without requiring IP address
            const result = await nmea2000Service.connect(
              settings.nmea2000.ipAddress || 'test',
              settings.nmea2000.port || 2000,
              true
            );
            success = result.success;
            setIsConnected(success);
            if (!success) {
              setConnectionError(result.errorMessage || 'Failed to start simulation');
              setShowConnectionError(true);
            }
          } else if (settings.nmea2000.ipAddress) {
            // Set up connection timeout for real connections
            const timeout = setTimeout(() => {
              console.log('[NMEA2000] Connection timeout');
              setIsConnecting(false);
              setIsConnected(false);
              setConnectionError('Connection timeout. The server did not respond within 10 seconds.');
              setShowConnectionError(true);
              setConnectionTimeout(null);
            }, 10000); // 10 second timeout
            
            setConnectionTimeout(timeout);
            
            const result = await nmea2000Service.connect(
              settings.nmea2000.ipAddress,
              settings.nmea2000.port || 2000
            );
            
            // Clear timeout if connection succeeded
            if (result.success) {
              clearTimeout(timeout);
              setConnectionTimeout(null);
              setIsConnected(true);
              setConnectionError(null);
            } else {
              // Connection failed - show error modal with details
              clearTimeout(timeout);
              setConnectionTimeout(null);
              setConnectionError(result.errorMessage || 'Connection failed');
              setShowConnectionError(true);
            }
          }
        }
      }
    } catch (error) {
      console.error('Error toggling NMEA 2000 connection:', error);
      setIsConnected(false);
      if (connectionTimeout) {
        clearTimeout(connectionTimeout);
        setConnectionTimeout(null);
      }
      setConnectionError((error as Error)?.message || 'Unknown error occurred');
      setShowConnectionError(true);
    } finally {
      setIsConnecting(false);
    }
  };

  return (
    <header className="header">
      <div className="header-content">
        <div className="logo">
          <Fish />
          {title || 'Karl Fish'}
        </div>
        
        <nav className="nav">
          <Link 
            to="/" 
            className={isActive('/') ? 'active' : ''}
          >
            <BarChart3 />
            Dashboard
          </Link>
          <Link 
            to="/sessions" 
            className={isActive('/sessions') ? 'active' : ''}
          >
            Sessions
          </Link>
          <Link 
            to="/transfer" 
            className={isActive('/transfer') ? 'active' : ''}
          >
            <Download />
            Transfer
          </Link>
          <Link 
            to="/share" 
            className={isActive('/share') ? 'active' : ''}
          >
            <Share2 />
            Share
          </Link>
          <Link 
            to="/settings" 
            className={isActive('/settings') ? 'active' : ''}
          >
            <Settings />
            Settings
          </Link>
        </nav>

        <div className="header-actions">
          <div 
            className="n2k-status"
            title={
              isRetrying ? "Retrying..." :
              isConnecting ? "Connecting..." : 
              isConnected ? "NMEA 2000 Connected" : 
              "NMEA 2000 Disconnected"
            }
            onClick={handleNMEA2000Toggle}
          >
            {(isConnecting || isRetrying) ? (
              <WifiOff style={{ color: '#f59e0b' }} className="pulse" />
            ) : isConnected ? (
              <Wifi style={{ color: '#10b981' }} />
            ) : (
              <WifiOff style={{ color: '#ef4444' }} />
            )}
          </div>

          {user ? (
            <div className="user-info">
              <span className="user-name" style={{ color: 'white' }}>
                {profile?.name ? profile.name.split(' ')[0] : profile?.username || user.email}
              </span>
              <button
                onClick={signOut}
                className="btn btn-sm btn-primary"
                title="Sign Out"
              >
                <LogOut />
              </button>
            </div>
          ) : (
            <button
              onClick={onShowAuth}
              className="btn btn-sm btn-primary"
              title="Sign In"
            >
              <LogIn />
              Sign In
            </button>
          )}
        </div>
      </div>

      {/* Connection Error Modal */}
      <Modal
        isOpen={showConnectionError}
        onClose={handleCancel}
        title="Connection Failed"
        actions={
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={handleCancel}
              className="btn btn-secondary"
            >
              Cancel
            </button>
            {retryCount > 0 && (
              <button
                onClick={handleRetry}
                className="btn btn-primary"
              >
                Retry ({retryCount})
              </button>
            )}
          </div>
        }
      >
        <div style={{ textAlign: 'left', color: '#000' }}>
          <p style={{ margin: '0 0 12px 0', fontSize: '16px', fontWeight: 'bold' }}>
            Unable to connect to NMEA 2000 gateway
          </p>
          {connectionError && (
            <div style={{ 
              margin: '0 0 12px 0', 
              padding: '12px', 
              backgroundColor: '#fef2f2', 
              border: '1px solid #fca5a5',
              borderRadius: '6px',
              fontSize: '14px',
              lineHeight: '1.5'
            }}>
              <strong>Error Details:</strong>
              <div style={{ marginTop: '8px', whiteSpace: 'pre-wrap' }}>{connectionError}</div>
            </div>
          )}
          <div style={{ margin: '0 0 8px 0', fontSize: '14px' }}>
            <strong>Connection Settings:</strong>
            <div style={{ marginTop: '4px' }}>
              IP: {settings?.nmea2000.ipAddress || 'Not set'}<br />
              Port: {settings?.nmea2000.port || 2000}
            </div>
          </div>
          <div style={{ margin: '12px 0 0 0', fontSize: '13px', color: '#666' }}>
            <strong>Troubleshooting:</strong>
            <ul style={{ margin: '8px 0 0 0', paddingLeft: '20px' }}>
              <li>Verify the gateway is running and accessible</li>
              <li>Check that both devices are on the same network</li>
              <li>Ensure firewall allows connections on port {settings?.nmea2000.port || 2000}</li>
              <li>On Android, check network security configuration allows cleartext traffic</li>
            </ul>
          </div>
        </div>
      </Modal>
    </header>
  );
};

export default Header;
