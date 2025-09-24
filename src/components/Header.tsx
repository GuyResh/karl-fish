import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Fish, Settings, BarChart3, Plus, Download, Wifi, WifiOff } from 'lucide-react';
import { AppSettings } from '../types';
import { furunoService } from '../services/furunoService';

interface HeaderProps {
  settings: AppSettings | null;
}

const Header: React.FC<HeaderProps> = ({ settings }) => {
  const location = useLocation();
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  useEffect(() => {
    const updateConnectionStatus = () => {
      const status = furunoService.getConnectionStatus();
      setIsConnected(status.connected);
    };

    // Update status on mount
    updateConnectionStatus();

    // Set up interval to check connection status
    const interval = setInterval(updateConnectionStatus, 1000);

    return () => clearInterval(interval);
  }, []);

  const handleFurunoToggle = async () => {
    if (isConnecting) return;

    setIsConnecting(true);
    try {
      if (isConnected) {
        furunoService.disconnect();
        setIsConnected(false);
      } else {
        if (settings?.furuno.enabled && settings.furuno.ipAddress) {
          const success = await furunoService.connect(
            settings.furuno.ipAddress,
            settings.furuno.port || 10110
          );
          setIsConnected(success);
        }
      }
    } catch (error) {
      console.error('Error toggling Furuno connection:', error);
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
            to="/sessions/new" 
            className={isActive('/sessions/new') ? 'active' : ''}
          >
            <Plus size={16} />
            New Session
          </Link>
          <Link 
            to="/transfer" 
            className={isActive('/transfer') ? 'active' : ''}
          >
            <Download size={16} />
            Transfer
          </Link>
          <Link 
            to="/settings" 
            className={isActive('/settings') ? 'active' : ''}
          >
            <Settings size={16} />
            Settings
          </Link>
        </nav>

        <div 
          className="furuno-status"
          title={isConnected ? "Furuno Connected" : "Furuno Disconnected"}
          onClick={handleFurunoToggle}
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
      </div>
    </header>
  );
};

export default Header;
