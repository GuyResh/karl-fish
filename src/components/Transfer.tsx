import React, { useState, useRef } from 'react';
import { Download, Mail, FileText, Filter, Upload, Share2 } from 'lucide-react';
import { ExportService } from '../services/exportService';
import { ExportOptions, FishCatch } from '../types';
import { format } from 'date-fns';
import { FishingDataService } from '../database';

const Transfer: React.FC = () => {
  const [exportOptions, setExportOptions] = useState<ExportOptions>({
    format: 'csv',
    includePhotos: false
  });
  const [dateRange, setDateRange] = useState({
    start: '',
    end: ''
  });
  const [emailRecipients, setEmailRecipients] = useState('');
  const [emailSubject, setEmailSubject] = useState(`Fishing Log Transfer ${format(new Date(), 'yyyy-MM-dd HH:mm:ss')}`);
  const [isExporting, setIsExporting] = useState(false);
  const [exportStatus, setExportStatus] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFormatChange = (format: 'csv' | 'json') => {
    setExportOptions(prev => ({ ...prev, format }));
  };

  const handleDateRangeChange = (field: 'start' | 'end', value: string) => {
    setDateRange(prev => ({ ...prev, [field]: value }));
  };

  const handleExport = async (method: 'download' | 'email') => {
    if (method === 'email' && !emailRecipients.trim()) {
      setExportStatus('Please enter email recipients');
      return;
    }

    setIsExporting(true);
    setExportStatus('');

    try {
      const options: ExportOptions = {
        ...exportOptions,
        emailRecipients: method === 'email' ? emailRecipients.split(',').map(e => e.trim()) : undefined,
        emailSubject: method === 'email' ? emailSubject : undefined,
        dateRange: (dateRange.start && dateRange.end) ? {
          start: new Date(dateRange.start),
          end: new Date(dateRange.end)
        } : undefined
      };

      if (method === 'download') {
        await ExportService.exportAndDownload(options);
        setExportStatus('Transfer completed successfully!');
      } else {
        await ExportService.exportToEmail(options);
        setExportStatus('File downloaded and email client opened! Please attach the downloaded file to your email.');
      }
    } catch (error) {
      console.error('Transfer error:', error);
      setExportStatus(`Transfer failed: ${error}`);
    } finally {
      setIsExporting(false);
    }
  };

  const generateStatsReport = async () => {
    setIsExporting(true);
    setExportStatus('');

    try {
      const report = await ExportService.generateStatsReport();
      await ExportService.downloadFile(
        report,
        `fishing-stats-${new Date().toISOString().split('T')[0]}.txt`,
        'text/plain'
      );
      setExportStatus('Statistics report generated successfully!');
    } catch (error) {
      console.error('Stats report error:', error);
      setExportStatus(`Stats report failed: ${error}`);
    } finally {
      setIsExporting(false);
    }
  };

  const handleShare = async () => {
    setIsExporting(true);
    setExportStatus('');

    try {
      // Get login credentials from settings
      const settings = await FishingDataService.getSettings();
      if (!settings?.angler?.login || !settings?.angler?.password) {
        setExportStatus('Please configure your login credentials in Settings first');
        return;
      }

      // Get sessions to share
      const sessions = await FishingDataService.getAllSessions();
      if (sessions.length === 0) {
        setExportStatus('No sessions to share');
        return;
      }

      // TODO: Implement API call to share data
      // This will be implemented when the API endpoint is ready
      setExportStatus('Share functionality will be available when API endpoint is ready');
      
    } catch (error) {
      console.error('Share error:', error);
      setExportStatus(`Share failed: ${error}`);
    } finally {
      setIsExporting(false);
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.csv')) {
      setExportStatus('Please select a CSV file');
      return;
    }

    const reader = new FileReader();
    reader.onload = async (e) => {
      const csvContent = e.target?.result as string;
      await importCSVData(csvContent);
    };
    reader.readAsText(file);
  };

  const importCSVData = async (csvContent: string) => {
    setIsUploading(true);
    setExportStatus('');

    try {
      const lines = csvContent.split('\n').filter(line => line.trim());
      if (lines.length < 2) {
        setExportStatus('CSV file appears to be empty or invalid');
        return;
      }

      // Parse header row
      const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
      
      // Expected headers for fishing data
      const expectedHeaders = [
        'Session ID', 'Date', 'Start Time', 'End Time', 'Latitude', 'Longitude', 'Location Description',
        'Air Temperature', 'Water Temperature', 'Wind Speed', 'Wind Direction', 'Pressure', 'Water Depth',
        'Species', 'Length', 'Weight', 'Condition', 'Bait', 'Lure', 'Technique', 'Notes'
      ];

      // Check if headers match expected format
      const hasRequiredHeaders = expectedHeaders.some(header => 
        headers.some(h => h.toLowerCase().includes(header.toLowerCase()))
      );

      if (!hasRequiredHeaders) {
        setExportStatus('CSV file does not appear to be in the correct format. Please use a file exported from this application.');
        return;
      }

      // Group rows by session (Session ID)
      const sessionMap = new Map<string, any[]>();
      
      for (let i = 1; i < lines.length; i++) {
        try {
          const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
          const sessionId = values[0];
          
          if (!sessionMap.has(sessionId)) {
            sessionMap.set(sessionId, []);
          }
          sessionMap.get(sessionId)!.push(values);
        } catch (error) {
          console.error(`Error parsing row ${i + 1}:`, error);
        }
      }

      let importedSessions = 0;
      let duplicateSessions = 0;
      let errorCount = 0;

      // Process each session
      for (const [sessionId, rows] of sessionMap) {
        try {
          if (rows.length === 0) continue;
          
          const firstRow = rows[0];
          
          // Create session data from first row
          const sessionData = {
            date: new Date(firstRow[1] + 'T00:00:00'),
            startTime: new Date(`${firstRow[1]}T${firstRow[2]}:00`),
            endTime: firstRow[3] ? new Date(`${firstRow[1]}T${firstRow[3]}:00`) : undefined,
            location: {
              latitude: parseFloat(firstRow[4]) || 0,
              longitude: parseFloat(firstRow[5]) || 0,
              description: firstRow[6] || ''
            },
            weather: {
              temperature: firstRow[7] ? parseFloat(firstRow[7]) : undefined,
              windSpeed: firstRow[9] ? parseFloat(firstRow[9]) : undefined,
              windDirection: firstRow[10] ? parseFloat(firstRow[10]) : undefined,
              pressure: firstRow[11] ? parseFloat(firstRow[11]) : undefined
            },
            water: {
              temperature: firstRow[8] ? parseFloat(firstRow[8]) : undefined,
              depth: firstRow[12] ? parseFloat(firstRow[12]) : undefined
            },
            catches: [] as FishCatch[],
            notes: firstRow[20] || ''
          };

          // Add all catches for this session
          for (const row of rows) {
            if (row[13] && row[13].trim()) {
              sessionData.catches.push({
                id: crypto.randomUUID(),
                species: row[13],
                length: parseFloat(row[14]) || 0,
                weight: row[15] ? parseFloat(row[15]) : undefined,
                condition: (row[16] as any) || 'kept',
                bait: row[17] || undefined,
                lure: row[18] || undefined,
                technique: row[19] || undefined,
                notes: row[20] || undefined
              });
            }
          }

          // Check for existing session with same date and location
          const existingSessions = await FishingDataService.getAllSessions();
          const isDuplicate = existingSessions.some(session => 
            session.date.toDateString() === sessionData.date.toDateString() &&
            Math.abs(session.location.latitude - sessionData.location.latitude) < 0.001 &&
            Math.abs(session.location.longitude - sessionData.location.longitude) < 0.001
          );

          if (isDuplicate) {
            duplicateSessions++;
            continue;
          }

          await FishingDataService.createSession(sessionData);
          importedSessions++;

        } catch (error) {
          console.error(`Error processing session ${sessionId}:`, error);
          errorCount++;
        }
      }

      setExportStatus(
        `Import completed! Sessions imported: ${importedSessions}, Duplicates skipped: ${duplicateSessions}, Errors: ${errorCount}`
      );

    } catch (error) {
      console.error('CSV import error:', error);
      setExportStatus(`Import failed: ${error}`);
    } finally {
      setIsUploading(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const triggerFileUpload = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="export">
      <div className="card">
        <div className="card-header">
          <h1 className="card-title">Transfer Data</h1>
        </div>

        <div className="export-content">
          {/* Transfer Format */}
          <div className="export-section">
            <h3>Transfer Format</h3>
            <div className="format-options">
              <label className="format-option">
                <input
                  type="radio"
                  name="format"
                  value="csv"
                  checked={exportOptions.format === 'csv'}
                  onChange={() => handleFormatChange('csv')}
                />
                <div className="format-card">
                  <h4>
                    <FileText size={18} />
                    CSV
                  </h4>
                  <p>Comma-separated values for Excel, Google Sheets</p>
                </div>
              </label>
              
              <label className="format-option">
                <input
                  type="radio"
                  name="format"
                  value="json"
                  checked={exportOptions.format === 'json'}
                  onChange={() => handleFormatChange('json')}
                />
                <div className="format-card">
                  <h4>
                    <FileText size={18} />
                    JSON
                  </h4>
                  <p>Structured data for developers and APIs</p>
                </div>
              </label>
            </div>
          </div>

          {/* Date Range Filter */}
          <div className="export-section">
            <h3>
              <Filter size={16} />
              Date Range Filter
              <span className="help-text-inline">
                <em>(leave empty to transfer all sessions)</em>
              </span>
            </h3>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Start Date</label>
                <input
                  type="date"
                  className="form-input"
                  value={dateRange.start}
                  onChange={(e) => handleDateRangeChange('start', e.target.value)}
                />
              </div>
              <div className="form-group">
                <label className="form-label">End Date</label>
                <input
                  type="date"
                  className="form-input"
                  value={dateRange.end}
                  onChange={(e) => handleDateRangeChange('end', e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Transfer Options */}
          <div className="export-section">
            <h3>Transfer Options</h3>
            <div className="form-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={exportOptions.includePhotos}
                  onChange={(e) => setExportOptions(prev => ({ 
                    ...prev, 
                    includePhotos: e.target.checked 
                  }))}
                />
                Include photos in transfer (if available)
              </label>
            </div>
          </div>

          {/* Email Settings */}
          <div className="export-section">
            <h3>
              <Mail size={16} />
              Email Transfer
            </h3>
            <div className="form-group">
              <label className="form-label">Recipients (comma-separated)</label>
              <input
                type="text"
                className="form-input"
                value={emailRecipients}
                onChange={(e) => setEmailRecipients(e.target.value)}
                placeholder="user1@example.com, user2@example.com"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Subject</label>
              <input
                type="text"
                className="form-input"
                value={emailSubject}
                onChange={(e) => setEmailSubject(e.target.value)}
                placeholder="Fishing Log Transfer"
              />
            </div>
          </div>

          {/* Transfer Actions */}
          <div className="export-actions">
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleFileUpload}
              style={{ display: 'none' }}
            />
            
            <button
              onClick={triggerFileUpload}
              disabled={isUploading || isExporting}
              className="btn btn-success"
            >
              <Upload size={16} />
              {isUploading ? 'Uploading...' : 'Upload CSV'}
            </button>

            <button
              onClick={() => handleExport('download')}
              disabled={isExporting || isUploading}
              className="btn btn-primary"
            >
              <Download size={16} />
              {isExporting ? 'Transferring...' : 'Download'}
            </button>

            <button
              onClick={() => handleExport('email')}
              disabled={isExporting || isUploading || !emailRecipients.trim()}
              className="btn btn-secondary"
            >
              <Mail size={16} />
              {isExporting ? 'Sending...' : 'Email'}
            </button>

            <button
              onClick={handleShare}
              disabled={isExporting || isUploading}
              className="btn btn-info"
            >
              <Share2 size={16} />
              Share
            </button>

            <button
              onClick={generateStatsReport}
              disabled={isExporting || isUploading}
              className="btn btn-warning"
            >
              <FileText size={16} />
              {isExporting ? 'Generating...' : 'Stats Report'}
            </button>
          </div>

          {/* Status */}
          {exportStatus && (
            <div className={`export-status ${exportStatus.includes('successful') || exportStatus.includes('completed') ? 'success' : 'error'}`}>
              {exportStatus}
            </div>
          )}

          {/* Transfer Information */}
          <div className="export-info">
            <h3>Transfer Information</h3>
            <div className="info-grid-2x2">
              <div className="info-item">
                <h4>CSV Format</h4>
                <ul>
                  <li>Compatible with Excel, Google Sheets, Numbers</li>
                  <li>One row per fish catch</li>
                  <li>Includes session data and environmental conditions</li>
                  <li>Easy to import into other fishing apps</li>
                </ul>
              </div>
              
              <div className="info-item">
                <h4>JSON Format</h4>
                <ul>
                  <li>Complete structured data export</li>
                  <li>Preserves all relationships between data</li>
                  <li>Perfect for backup and migration</li>
                  <li>Can be imported back into the app</li>
                </ul>
              </div>
              
              <div className="info-item">
                <h4>Email Transfer</h4>
                <ul>
                  <li>Downloads the transfer file to your computer</li>
                  <li>Opens your default email client with pre-filled content</li>
                  <li>You manually attach the downloaded file</li>
                  <li>Perfect for sharing with fishing partners</li>
                </ul>
              </div>
              
              <div className="info-item">
                <h4>Statistics Report</h4>
                <ul>
                  <li>Summary of all your fishing data</li>
                  <li>Species breakdown and trends</li>
                  <li>Monthly and yearly statistics</li>
                  <li>Great for fishing reports and analysis</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Transfer;
