import React, { useState, useEffect } from 'react';
import { Search, ArrowUpDown, ArrowUp, ArrowDown, MapPin, Calendar, Clock, Fish, Scale } from 'lucide-react';
import { FishingDataService } from '../database';
import { FishCatch, FishingSession } from '../types';
import { UnitConverter } from '../utils/unitConverter';

type SortField = 'date' | 'time' | 'location' | 'species' | 'length' | 'weight';
type SortDirection = 'asc' | 'desc';

const CatchesList: React.FC = () => {
  const [catches, setCatches] = useState<(FishCatch & { session: FishingSession })[]>([]);
  const [filteredCatches, setFilteredCatches] = useState<(FishCatch & { session: FishingSession })[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  useEffect(() => {
    loadCatches();
  }, []);

  useEffect(() => {
    filterAndSortCatches();
  }, [catches, searchQuery, sortField, sortDirection]);

  const loadCatches = async () => {
    try {
      const sessions = await FishingDataService.getAllSessions();
      const allCatches: (FishCatch & { session: FishingSession })[] = [];
      
      sessions.forEach(session => {
        session.catches.forEach(catch_ => {
          allCatches.push({
            ...catch_,
            session
          });
        });
      });
      
      setCatches(allCatches);
    } catch (error) {
      console.error('Error loading catches:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const filterAndSortCatches = () => {
    let filtered = catches;

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(catch_ => 
        catch_.species?.toLowerCase().replace('Custom:', '').includes(query) ||
        catch_.session.location.description?.toLowerCase().includes(query) ||
        catch_.notes?.toLowerCase().includes(query)
      );
    }

    // Sort catches
    filtered.sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortField) {
        case 'date':
          aValue = new Date(a.session.date).getTime();
          bValue = new Date(b.session.date).getTime();
          break;
        case 'time':
          aValue = new Date(a.session.startTime).getTime();
          bValue = new Date(b.session.startTime).getTime();
          break;
        case 'location':
          aValue = a.session.location.description || `${a.session.location.latitude}, ${a.session.location.longitude}`;
          bValue = b.session.location.description || `${b.session.location.latitude}, ${b.session.location.longitude}`;
          break;
        case 'species':
          aValue = a.species?.replace('Custom:', '') || '';
          bValue = b.species?.replace('Custom:', '') || '';
          break;
        case 'length':
          aValue = a.length || 0;
          bValue = b.length || 0;
          break;
        case 'weight':
          aValue = a.weight || 0;
          bValue = b.weight || 0;
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    setFilteredCatches(filtered);
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDown size={14} />;
    }
    return sortDirection === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />;
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString();
  };

  const formatTime = (date: Date) => {
    return new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatLocation = (session: FishingSession) => {
    return session.location.description || `${session.location.latitude.toFixed(4)}°N, ${Math.abs(session.location.longitude).toFixed(4)}°W`;
  };

  if (isLoading) {
    return (
      <div className="card">
        <div className="loading-spinner"></div>
        <p>Loading catches...</p>
      </div>
    );
  }

  return (
    <div className="catches-page">
      <div className="card">
        <div className="card-header">
          <h1 className="card-title">
            <Fish size={20} />
            All Fish Catches ({filteredCatches.length})
          </h1>
        </div>

        <div className="card-content">
          {/* Search */}
          <div className="search-container">
            <div className="search-input-wrapper">
              <Search size={16} className="search-icon" />
              <input
                type="text"
                placeholder="Search by species, location, or notes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="search-input"
              />
            </div>
          </div>

          {/* Table */}
          <div className="table-container">
            <table className="catches-table">
              <thead>
                <tr>
                  <th 
                    className="sortable" 
                    onClick={() => handleSort('date')}
                  >
                    <div className="th-content">
                      <Calendar size={14} />
                      Date
                      {getSortIcon('date')}
                    </div>
                  </th>
                  <th 
                    className="sortable" 
                    onClick={() => handleSort('time')}
                  >
                    <div className="th-content">
                      <Clock size={14} />
                      Time
                      {getSortIcon('time')}
                    </div>
                  </th>
                  <th 
                    className="sortable" 
                    onClick={() => handleSort('location')}
                  >
                    <div className="th-content">
                      <MapPin size={14} />
                      Location
                      {getSortIcon('location')}
                    </div>
                  </th>
                  <th 
                    className="sortable" 
                    onClick={() => handleSort('species')}
                  >
                    <div className="th-content">
                      <Fish size={14} />
                      Species
                      {getSortIcon('species')}
                    </div>
                  </th>
                  <th 
                    className="sortable" 
                    onClick={() => handleSort('length')}
                  >
                    <div className="th-content">
                      Length
                      {getSortIcon('length')}
                    </div>
                  </th>
                  <th 
                    className="sortable" 
                    onClick={() => handleSort('weight')}
                  >
                    <div className="th-content">
                      <Scale size={14} />
                      Weight
                      {getSortIcon('weight')}
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredCatches.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="no-data">
                      {searchQuery ? 'No catches found matching your search.' : 'No catches recorded yet.'}
                    </td>
                  </tr>
                ) : (
                  filteredCatches.map((catch_) => (
                    <tr key={catch_.id}>
                      <td>{formatDate(catch_.session.date)}</td>
                      <td>{formatTime(catch_.session.startTime)}</td>
                      <td className="location-cell">
                        <div className="location-text" title={formatLocation(catch_.session)}>
                          {formatLocation(catch_.session)}
                        </div>
                      </td>
                      <td className="species-cell">
                        {catch_.species?.replace('Custom:', '') || 'Unknown'}
                      </td>
                      <td>
                        {catch_.length ? `${UnitConverter.convertLength(catch_.length).toFixed(1)} ${UnitConverter.getLengthUnit()}` : '-'}
                      </td>
                      <td>
                        {catch_.weight ? `${UnitConverter.convertWeight(catch_.weight).toFixed(1)} ${UnitConverter.getWeightUnit()}` : '-'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CatchesList;
