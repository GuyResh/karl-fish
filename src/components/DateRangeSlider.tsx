import React, { useState, useEffect } from 'react';

export interface DateRangeSliderProps {
  minDate: Date;
  maxDate: Date;
  startDate: Date;
  endDate: Date;
  onChange: (startDate: Date, endDate: Date) => void;
  className?: string;
}

const DateRangeSlider: React.FC<DateRangeSliderProps> = ({
  minDate,
  maxDate,
  startDate,
  endDate,
  onChange,
  className = ''
}) => {
  const [isDragging, setIsDragging] = useState<'start' | 'end' | null>(null);
  const [localStartDate, setLocalStartDate] = useState(startDate);
  const [localEndDate, setLocalEndDate] = useState(endDate);

  // Update local state when props change
  useEffect(() => {
    setLocalStartDate(startDate);
    setLocalEndDate(endDate);
  }, [startDate, endDate]);

  const minTime = minDate.getTime();
  const maxTime = maxDate.getTime();
  const range = maxTime - minTime;

  const getPosition = (date: Date) => {
    return ((date.getTime() - minTime) / range) * 100;
  };

  const getDateFromPosition = (position: number) => {
    const time = minTime + (position / 100) * range;
    return new Date(time);
  };

  const handleMouseDown = (type: 'start' | 'end') => (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(type);
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging) return;

    const rect = (e.target as HTMLElement).closest('.date-range-slider')?.getBoundingClientRect();
    if (!rect) return;

    const x = e.clientX - rect.left;
    const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100));
    const newDate = getDateFromPosition(percentage);

    if (isDragging === 'start') {
      const newStartDate = newDate > localEndDate ? localEndDate : newDate;
      setLocalStartDate(newStartDate);
      onChange(newStartDate, localEndDate);
    } else {
      const newEndDate = newDate < localStartDate ? localStartDate : newDate;
      setLocalEndDate(newEndDate);
      onChange(localStartDate, newEndDate);
    }
  };

  const handleMouseUp = () => {
    setIsDragging(null);
  };

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, localStartDate, localEndDate]);

  const startPosition = getPosition(localStartDate);
  const endPosition = getPosition(localEndDate);

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: date.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
    });
  };

  return (
    <div className={`date-range-slider ${className}`}>
      <div className="date-range-labels">
        <span className="date-label start-date">{formatDate(localStartDate)}</span>
        <span className="date-label end-date">{formatDate(localEndDate)}</span>
      </div>
      
      <div className="date-range-track">
        <div 
          className="date-range-selected"
          style={{
            left: `${startPosition}%`,
            width: `${endPosition - startPosition}%`
          }}
        />
        
        <div
          className="date-range-handle start-handle"
          style={{ left: `${startPosition}%` }}
          onMouseDown={handleMouseDown('start')}
        />
        
        <div
          className="date-range-handle end-handle"
          style={{ left: `${endPosition}%` }}
          onMouseDown={handleMouseDown('end')}
        />
      </div>
    </div>
  );
};

export default DateRangeSlider;
