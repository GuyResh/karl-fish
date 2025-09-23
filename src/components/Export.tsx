import React, { useState } from 'react';
import { Download, Mail, FileText, Filter } from 'lucide-react';
import { ExportService } from '../services/exportService';
import { ExportOptions } from '../types';
import { format } from 'date-fns';

const Export: React.FC = () => {
  const [exportOptions, setExportOptions] = useState<ExportOptions>({
    format: 'csv',
    includePhotos: false
  });
  const [dateRange, setDateRange] = useState({
    start: '',
    end: ''
  });
  const [emailRecipients, setEmailRecipients] = useState('');
  const [emailSubject, setEmailSubject] = useState(`Fishing Log Export ${format(new Date(), 'yyyy-MM-dd HH:mm:ss')}`);
  const [isExporting, setIsExporting] = useState(false);
  const [exportStatus, setExportStatus] = useState('');

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
        setExportStatus('Export completed successfully!');
      } else {
        await ExportService.exportToEmail(options);
        setExportStatus('Email export initiated!');
      }
    } catch (error) {
      console.error('Export error:', error);
      setExportStatus(`Export failed: ${error}`);
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

  return (
    <div className="export">
      <div className="card">
        <div className="card-header">
          <h1 className="card-title">Export Data</h1>
        </div>

        <div className="export-content">
          {/* Export Format */}
          <div className="export-section">
            <h3>Export Format</h3>
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
                  <FileText size={24} />
                  <h4>CSV</h4>
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
                  <FileText size={24} />
                  <h4>JSON</h4>
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
            <p className="help-text">
              Leave empty to export all sessions
            </p>
          </div>

          {/* Export Options */}
          <div className="export-section">
            <h3>Export Options</h3>
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
                Include photos in export (if available)
              </label>
            </div>
          </div>

          {/* Email Settings */}
          <div className="export-section">
            <h3>
              <Mail size={16} />
              Email Export
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
                placeholder="Fishing Log Export"
              />
            </div>
          </div>

          {/* Export Actions */}
          <div className="export-actions">
            <button
              onClick={() => handleExport('download')}
              disabled={isExporting}
              className="btn btn-primary"
            >
              <Download size={16} />
              {isExporting ? 'Exporting...' : 'Download Export'}
            </button>

            <button
              onClick={() => handleExport('email')}
              disabled={isExporting || !emailRecipients.trim()}
              className="btn btn-secondary"
            >
              <Mail size={16} />
              {isExporting ? 'Sending...' : 'Email Export'}
            </button>

            <button
              onClick={generateStatsReport}
              disabled={isExporting}
              className="btn btn-success"
            >
              <FileText size={16} />
              {isExporting ? 'Generating...' : 'Generate Stats Report'}
            </button>
          </div>

          {/* Status */}
          {exportStatus && (
            <div className={`export-status ${exportStatus.includes('successful') ? 'success' : 'error'}`}>
              {exportStatus}
            </div>
          )}

          {/* Export Information */}
          <div className="export-info">
            <h3>Export Information</h3>
            <div className="info-grid">
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
                <h4>Email Export</h4>
                <ul>
                  <li>Opens your default email client</li>
                  <li>Attaches the export file automatically</li>
                  <li>Perfect for sharing with fishing partners</li>
                  <li>Note: Requires email client configuration</li>
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

export default Export;
