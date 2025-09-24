import { FishingDataService } from '../database';

// Import CSV data into IndexedDB. Supports enhanced headers layout used by ExportService.
export async function importFishingCSV(csvContent: string): Promise<{ importedSessions: number; duplicateSessions: number; errorCount: number; }> {
  const lines = csvContent.split('\n').filter(line => line.trim());
  if (lines.length < 2) {
    throw new Error('CSV appears empty or invalid');
  }

  const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
  const expectedHeaders = [
    'Session ID', 'Date', 'Start Time', 'End Time', 'Latitude', 'Longitude', 'Location Description',
    'Air Temperature', 'Water Temperature', 'Wind Speed', 'Wind Direction', 'Pressure', 'Water Depth',
    'Species', 'Length', 'Weight', 'Condition', 'Bait', 'Lure', 'Technique', 'Notes'
  ];
  const hasRequiredHeaders = expectedHeaders.some(header =>
    headers.some(h => h.toLowerCase().includes(header.toLowerCase()))
  );
  if (!hasRequiredHeaders) {
    throw new Error('CSV format not recognized. Please use a file exported from this application.');
  }

  const sessionMap = new Map<string, string[][]>();
  for (let i = 1; i < lines.length; i++) {
    try {
      const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
      const sessionId = values[0];
      if (!sessionMap.has(sessionId)) {
        sessionMap.set(sessionId, []);
      }
      sessionMap.get(sessionId)!.push(values);
    } catch {
      // skip row errors but count later
    }
  }

  let importedSessions = 0;
  let duplicateSessions = 0;
  let errorCount = 0;

  const existingSessions = await FishingDataService.getAllSessions();

  for (const [, rows] of sessionMap) {
    try {
      if (rows.length === 0) continue;
      const firstRow = rows[0];

      const sessionData: any = {
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
        catches: [],
        notes: firstRow[20] || ''
      };

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
    } catch {
      errorCount++;
    }
  }

  return { importedSessions, duplicateSessions, errorCount };
}


