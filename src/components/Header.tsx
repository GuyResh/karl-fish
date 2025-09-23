import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Fish, Settings, BarChart3, Plus, Download, Wifi, WifiOff } from 'lucide-react';
import { AppSettings } from '../types';
import { furunoService } from '../services/furunoService';

interface HeaderProps {
  settings: AppSettings | null;
}

const Header: React.FC<HeaderProps> = ({ settings }) => {
  const location = useLocation();
  const connectionStatus = furunoService.getConnectionStatus();

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  return (
    <header className="header">
      <div className="header-content">
        <Link to="/" className="logo">
          <Fish size={24} />
          Carl Fish
        </Link>
        
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
            to="/export" 
            className={isActive('/export') ? 'active' : ''}
          >
            <Download size={16} />
            Export
          </Link>
          <Link 
            to="/settings" 
            className={isActive('/settings') ? 'active' : ''}
          >
            <Settings size={16} />
            Settings
          </Link>
        </nav>

        {settings?.furuno.enabled && (
          <div className="furuno-status">
            {connectionStatus.connected ? (
              <>
                <Wifi size={16} />
                <span>Furuno Connected</span>
              </>
            ) : (
              <>
                <WifiOff size={16} />
                <span>Furuno Disconnected</span>
              </>
            )}
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;
