import React, { useState, useEffect } from 'react';
import { Fish } from 'lucide-react';

const StatsHeader: React.FC = () => {
  const [currentTime, setCurrentTime] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      // Convert to Eastern Time
      const easternTime = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }));
      
      // Format as "Nov 11, 2025 HH:MM"
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const month = monthNames[easternTime.getMonth()];
      const day = easternTime.getDate();
      const year = easternTime.getFullYear();
      const hours = easternTime.getHours().toString().padStart(2, '0');
      const minutes = easternTime.getMinutes().toString().padStart(2, '0');
      
      setCurrentTime(`${month} ${day}, ${year} ${hours}:${minutes}`);
    };

    updateTime();
    // Update every minute
    const interval = setInterval(updateTime, 60000);

    return () => clearInterval(interval);
  }, []);

  return (
    <header className="header">
      <div className="header-content">
        <div className="logo">
          <Fish />
          Karl Fish Statistics
        </div>
        
        <div style={{ marginLeft: 'auto', fontSize: 'clamp(0.85rem, 1.4vw + 0.35rem, 0.95rem)', color: 'white' }}>
          {currentTime}
        </div>
      </div>
    </header>
  );
};

export default StatsHeader;

