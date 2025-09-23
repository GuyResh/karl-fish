import { FishingSession, ExportOptions } from '../types';
import { FishingDataService } from '../database';
import { format } from 'date-fns';

export class ExportService {
  static async exportToCSV(options: ExportOptions): Promise<string> {
    const sessions = await this.getSessionsForExport(options);
    
    if (sessions.length === 0) {
      throw new Error('No sessions found for export');
    }

    const headers = [
      'Session ID',
      'Date',
      'Start Time',
      'End Time',
      'Latitude',
      'Longitude',
      'Air Temperature (°C)',
      'Water Temperature (°C)',
      'Wind Speed (kts)',
      'Wind Direction (°)',
      'Pressure (hPa)',
      'Water Depth (m)',
      'Fish Species',
      'Fish Length (cm)',
      'Fish Weight (kg)',
      'Fish Condition',
      'Bait/Lure',
      'Notes'
    ];

    const rows = sessions.flatMap(session => {
      if (session.catches.length === 0) {
        // Session with no catches
        return [this.formatSessionRow(session, null)];
      } else {
        // Session with catches - one row per catch
        return session.catches.map(catch_ => this.formatSessionRow(session, catch_));
      }
    });

    const csvContent = [headers.join(','), ...rows].join('\n');
    return csvContent;
  }

  static async exportToJSON(options: ExportOptions): Promise<string> {
    const sessions = await this.getSessionsForExport(options);
    return JSON.stringify(sessions, null, 2);
  }

  static async exportToEmail(options: ExportOptions): Promise<void> {
    if (!options.emailRecipients || options.emailRecipients.length === 0) {
      throw new Error('Email recipients are required');
    }

    const exportFormat = options.format || 'csv';
    let content: string;
    let mimeType: string;
    let filename: string;

    if (exportFormat === 'csv') {
      content = await this.exportToCSV(options);
      mimeType = 'text/csv';
      filename = `fishing-log-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    } else {
      content = await this.exportToJSON(options);
      mimeType = 'application/json';
      filename = `fishing-log-${format(new Date(), 'yyyy-MM-dd')}.json`;
    }

    const subject = options.emailSubject || `Fishing Log Export ${format(new Date(), 'yyyy-MM-dd HH:mm:ss')}`;
    const body = `Please find attached the fishing log export.\n\nTotal sessions: ${(await this.getSessionsForExport(options)).length}\nExport date: ${format(new Date(), 'yyyy-MM-dd HH:mm:ss')}`;

    // Create mailto link
    const mailtoUrl = this.createMailtoUrl(
      options.emailRecipients,
      subject,
      body,
      content,
      filename,
      mimeType
    );

    // Open email client
    window.open(mailtoUrl, '_blank');
  }

  private static async getSessionsForExport(options: ExportOptions): Promise<FishingSession[]> {
    if (options.dateRange) {
      return await FishingDataService.getSessionsByDateRange(
        options.dateRange.start,
        options.dateRange.end
      );
    }
    return await FishingDataService.getAllSessions();
  }

  private static formatSessionRow(session: FishingSession, catch_: any): string {
    const escapeCSV = (value: any): string => {
      if (value === null || value === undefined) return '';
      const str = String(value);
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    return [
      session.id,
      format(session.date, 'yyyy-MM-dd'),
      format(session.startTime, 'HH:mm:ss'),
      session.endTime ? format(session.endTime, 'HH:mm:ss') : '',
      session.location.latitude,
      session.location.longitude,
      session.weather.temperature || '',
      session.water.temperature || '',
      session.weather.windSpeed || '',
      session.weather.windDirection || '',
      session.weather.pressure || '',
      session.water.depth || '',
      catch_?.species?.replace('Custom:', '') || '',
      catch_?.length || '',
      catch_?.weight || '',
      catch_?.condition || '',
      catch_?.bait || catch_?.lure || '',
      catch_?.notes || session.notes || ''
    ].map(escapeCSV).join(',');
  }

  private static createMailtoUrl(
    recipients: string[],
    subject: string,
    body: string,
    _attachmentContent: string,
    _filename: string,
    _mimeType: string
  ): string {
    const params = new URLSearchParams({
      to: recipients.join(','),
      subject: subject,
      body: body
    });

    // Note: Most email clients don't support attachments via mailto
    // This is a limitation of the mailto protocol
    // For production, you'd want to use a proper email service
    return `mailto:?${params.toString()}`;
  }

  static async downloadFile(content: string, filename: string, mimeType: string): Promise<void> {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    URL.revokeObjectURL(url);
  }

  static async exportAndDownload(options: ExportOptions): Promise<void> {
    let content: string;
    let filename: string;
    let mimeType: string;

    if (options.format === 'csv') {
      content = await this.exportToCSV(options);
      filename = `fishing-log-${format(new Date(), 'yyyy-MM-dd')}.csv`;
      mimeType = 'text/csv';
    } else {
      content = await this.exportToJSON(options);
      filename = `fishing-log-${format(new Date(), 'yyyy-MM-dd')}.json`;
      mimeType = 'application/json';
    }

    await this.downloadFile(content, filename, mimeType);
  }

  // Generate statistics report
  static async generateStatsReport(): Promise<string> {
    const stats = await FishingDataService.getSessionStats();
    const sessions = await FishingDataService.getAllSessions();
    
    let report = `FISHING LOG STATISTICS REPORT\n`;
    report += `Generated: ${format(new Date(), 'yyyy-MM-dd HH:mm:ss')}\n\n`;
    
    report += `OVERVIEW:\n`;
    report += `- Total Sessions: ${stats.totalSessions}\n`;
    report += `- Total Catches: ${stats.totalCatches}\n`;
    report += `- Species Caught: ${stats.totalSpecies}\n`;
    report += `- Average Catches per Session: ${stats.averageCatchPerSession.toFixed(2)}\n`;
    report += `- Most Common Species: ${stats.mostCommonSpecies}\n`;
    report += `- Total Fishing Time: ${stats.totalFishingTime.toFixed(2)} hours\n\n`;

    // Species breakdown
    const speciesCount = sessions.flatMap(s => s.catches).reduce((acc, catch_) => {
      const species = catch_.species?.replace('Custom:', '') || '';
      acc[species] = (acc[species] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    report += `SPECIES BREAKDOWN:\n`;
    Object.entries(speciesCount)
      .sort(([,a], [,b]) => b - a)
      .forEach(([species, count]) => {
        report += `- ${species}: ${count} catches\n`;
      });

    // Monthly breakdown
    const monthlyStats = sessions.reduce((acc, session) => {
      const month = format(session.date, 'yyyy-MM');
      if (!acc[month]) {
        acc[month] = { sessions: 0, catches: 0 };
      }
      acc[month].sessions++;
      acc[month].catches += session.catches.length;
      return acc;
    }, {} as Record<string, { sessions: number; catches: number }>);

    report += `\nMONTHLY BREAKDOWN:\n`;
    Object.entries(monthlyStats)
      .sort(([a], [b]) => a.localeCompare(b))
      .forEach(([month, stats]) => {
        report += `- ${month}: ${stats.sessions} sessions, ${stats.catches} catches\n`;
      });

    return report;
  }
}
