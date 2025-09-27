import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Fish, Settings, BarChart3, Download, Wifi, WifiOff, Share2, LogIn, LogOut } from 'lucide-react';
import { AppSettings } from '../types';
import { nmea2000Service } from '../services/nmea2000Service';
import { useAuth } from '../contexts/AuthContext';

interface HeaderProps {
  settings: AppSettings | null;
  onShowAuth?: () => void;
}

const Header: React.FC<HeaderProps> = ({ settings, onShowAuth }) => {
  const location = useLocation();
  const { user, profile, signOut } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);

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

    return () => clearInterval(interval);
  }, []);

  const handleNMEA2000Toggle = async () => {
    if (isConnecting) return;

    setIsConnecting(true);
    try {
      if (isConnected) {
        nmea2000Service.disconnect();
        setIsConnected(false);
      } else {
        if (settings?.nmea2000.enabled && settings.nmea2000.ipAddress) {
          const success = await nmea2000Service.connect(
            settings.nmea2000.ipAddress,
            settings.nmea2000.port || 2000
          );
          setIsConnected(success);
        }
      }
    } catch (error) {
      console.error('Error toggling NMEA 2000 connection:', error);
      setIsConnected(false);
    } finally {
      setIsConnecting(false);
    }
  };

  return (
    <header className="header">
      <div className="header-content">
        <div className="logo">
          <Fish size={24} />
          Karl Fish
        </div>
        
        <nav className="nav">
          <Link 
            to="/" 
            className={isActive('/') ? 'active' : ''}
          >
            <BarChart3 size={16} />
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
            <Download size={16} />
            Transfer
          </Link>
          <Link 
            to="/share" 
            className={isActive('/share') ? 'active' : ''}
          >
            <Share2 size={16} />
            Share
          </Link>
          <Link 
            to="/settings" 
            className={isActive('/settings') ? 'active' : ''}
          >
            <Settings size={16} />
            Settings
          </Link>
        </nav>

        <div className="header-actions">
          <div 
            className="furuno-status"
            title={isConnected ? "NMEA 2000 Connected" : "NMEA 2000 Disconnected"}
            onClick={handleNMEA2000Toggle}
            style={{ 
              cursor: 'pointer', 
              display: 'flex', 
              alignItems: 'center',
              padding: '8px',
              borderRadius: '4px',
              transition: 'background-color 0.2s'
            }}
          >
            {isConnecting ? (
              <WifiOff size={16} className="pulse" />
            ) : isConnected ? (
              <Wifi size={16} style={{ color: '#10b981' }} />
            ) : (
              <WifiOff size={16} style={{ color: '#ef4444' }} />
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
                <LogOut size={16} />
              </button>
            </div>
          ) : (
            <button
              onClick={onShowAuth}
              className="btn btn-sm btn-primary"
              title="Sign In"
            >
              <LogIn size={16} />
              Sign In
            </button>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
