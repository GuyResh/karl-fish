import fs from 'fs';
import { format, addDays, isWeekend } from 'date-fns';

// Fish species with typical adult lengths (cm) and weights (kg)
const fishSpecies = [
  { name: 'Bluefin Tuna', minLength: 120, maxLength: 200, minWeight: 50, maxWeight: 150 },
  { name: 'Yellowfin Tuna', minLength: 100, maxLength: 180, minWeight: 30, maxWeight: 100 },
  { name: 'Bigeye Tuna', minLength: 110, maxLength: 190, minWeight: 40, maxWeight: 120 },
  { name: 'Blue Marlin', minLength: 200, maxLength: 350, minWeight: 100, maxWeight: 300 },
  { name: 'White Marlin', minLength: 80, maxLength: 120, minWeight: 20, maxWeight: 50 },
  { name: 'Sailfish', minLength: 150, maxLength: 250, minWeight: 30, maxWeight: 80 },
  { name: 'Wahoo', minLength: 100, maxLength: 150, minWeight: 15, maxWeight: 40 },
  { name: 'Dolphin (Mahi-Mahi)', minLength: 60, maxLength: 100, minWeight: 5, maxWeight: 25 },
  { name: 'King Mackerel', minLength: 80, maxLength: 120, minWeight: 8, maxWeight: 30 },
  { name: 'Spanish Mackerel', minLength: 50, maxLength: 80, minWeight: 3, maxWeight: 12 },
  { name: 'Cobia', minLength: 80, maxLength: 120, minWeight: 10, maxWeight: 35 },
  { name: 'Amberjack', minLength: 60, maxLength: 100, minWeight: 8, maxWeight: 25 },
  { name: 'Grouper', minLength: 50, maxLength: 120, minWeight: 5, maxWeight: 40 },
  { name: 'Snapper', minLength: 30, maxLength: 80, minWeight: 2, maxWeight: 15 },
  { name: 'Triggerfish', minLength: 25, maxLength: 50, minWeight: 1, maxWeight: 8 }
];

// Bait options
const baitOptions = [
  'Live Ballyhoo',
  'Live Bonito',
  'Live Mackerel',
  'Live Squid',
  'Dead Ballyhoo',
  'Dead Bonito',
  'Dead Mackerel',
  'Dead Squid',
  'Cut Bait',
  'Chunk Bait'
];

// Lure options
const lureOptions = [
  'None',
  'Trolling Lure',
  'Jig',
  'Spoon',
  'Plastic Worm',
  'Topwater Plug',
  'Diving Plug'
];

// Technique options
const techniqueOptions = [
  'Trolling',
  'Bottom Fishing',
  'Jigging',
  'Casting',
  'Drift Fishing',
  'Anchored'
];

// Weather conditions
const weatherConditions = [
  { condition: 'Clear', minTemp: 20, maxTemp: 28, minWind: 5, maxWind: 15, minPressure: 1010, maxPressure: 1025 },
  { condition: 'Partly Cloudy', minTemp: 18, maxTemp: 26, minWind: 8, maxWind: 18, minPressure: 1005, maxPressure: 1020 },
  { condition: 'Overcast', minTemp: 16, maxTemp: 24, minWind: 10, maxWind: 25, minPressure: 1000, maxPressure: 1015 },
  { condition: 'Light Rain', minTemp: 14, maxTemp: 22, minWind: 12, maxWind: 30, minPressure: 995, maxPressure: 1010 },
  { condition: 'Heavy Rain', minTemp: 12, maxTemp: 20, minWind: 15, maxWind: 35, minPressure: 990, maxPressure: 1005 }
];

// Water conditions
const waterConditions = [
  { condition: 'Calm', minTemp: 18, maxTemp: 24, minDepth: 50, maxDepth: 200 },
  { condition: 'Slight Chop', minTemp: 16, maxTemp: 22, minDepth: 40, maxDepth: 180 },
  { condition: 'Moderate', minTemp: 14, maxTemp: 20, minDepth: 30, maxDepth: 150 },
  { condition: 'Rough', minTemp: 12, maxTemp: 18, minDepth: 20, maxDepth: 120 },
  { condition: 'Very Rough', minTemp: 10, maxTemp: 16, minDepth: 15, maxDepth: 100 }
];

// Generate random number between min and max
function randomBetween(min, max) {
  return Math.random() * (max - min) + min;
}

// Generate random integer between min and max (inclusive)
function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Generate random time between 7 AM and 6 PM
function generateRandomTime() {
  const hour = randomInt(7, 18);
  const minute = randomInt(0, 59);
  return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
}

// Generate random coordinates (40+ miles east of Block Island)
// Block Island is at 41.1724°N, 71.5581°W
// Moving 40+ miles east puts us around 41.0°N, 70.8°W
function generateCoordinates() {
  const baseLat = 41.0;
  const baseLon = -70.8;
  const lat = baseLat + (Math.random() - 0.5) * 0.02; // Small random variation
  const lon = baseLon + (Math.random() - 0.5) * 0.02;
  return { lat: lat.toFixed(6), lon: lon.toFixed(6) };
}

// Generate random fish catch
function generateFishCatch() {
  const species = fishSpecies[randomInt(0, fishSpecies.length - 1)];
  const length = randomBetween(species.minLength, species.maxLength);
  const weight = randomBetween(species.minWeight, species.maxWeight);
  
  return {
    species: species.name,
    length: Math.round(length * 10) / 10, // 1 decimal place
    weight: Math.round(weight * 10) / 10  // 1 decimal place
  };
}

// Generate weather and water conditions
function generateConditions() {
  const weather = weatherConditions[randomInt(0, weatherConditions.length - 1)];
  const water = waterConditions[randomInt(0, waterConditions.length - 1)];
  
  return {
    weather: {
      condition: weather.condition,
      temperature: Math.round(randomBetween(weather.minTemp, weather.maxTemp) * 10) / 10,
      windSpeed: Math.round(randomBetween(weather.minWind, weather.maxWind) * 10) / 10,
      pressure: Math.round(randomBetween(weather.minPressure, weather.maxPressure) * 10) / 10
    },
    water: {
      condition: water.condition,
      temperature: Math.round(randomBetween(water.minTemp, water.maxTemp) * 10) / 10,
      depth: randomInt(water.minDepth, water.maxDepth)
    }
  }
}

// Generate fishing session data
function generateSessionData(date) {
  const startTime = generateRandomTime();
  const startDateTime = new Date(`${format(date, 'yyyy-MM-dd')}T${startTime}:00`);
  
  // Generate end time (2-8 hours later)
  const durationHours = randomBetween(2, 8);
  const endDateTime = new Date(startDateTime.getTime() + durationHours * 60 * 60 * 1000);
  const endTime = format(endDateTime, 'HH:mm');
  
  const coordinates = generateCoordinates();
  const conditions = generateConditions();
  
  // Generate 2-5 fish catches
  const numCatches = randomInt(2, 5);
  const catches = [];
  
  for (let i = 0; i < numCatches; i++) {
    catches.push(generateFishCatch());
  }
  
  return {
    date: format(date, 'yyyy-MM-dd'),
    startTime: startTime,
    endTime: endTime,
    location: {
      latitude: parseFloat(coordinates.lat),
      longitude: parseFloat(coordinates.lon),
      description: `Offshore Block Island`
    },
    weather: conditions.weather,
    water: conditions.water,
    catches: catches
  };
}

// Generate all weekend dates from May 1 to November 30, 2024
function generateWeekendDates() {
  const dates = [];
  const startDate = new Date('2024-05-01');
  const endDate = new Date('2024-11-30');
  
  let currentDate = new Date(startDate);
  
  while (currentDate <= endDate) {
    if (isWeekend(currentDate)) {
      dates.push(new Date(currentDate));
    }
    currentDate = addDays(currentDate, 1);
  }
  
  return dates;
}

// Generate CSV content
function generateCSV() {
  const weekendDates = generateWeekendDates();
  const sessions = [];
  
  console.log(`Generating data for ${weekendDates.length} weekend dates...`);
  
  weekendDates.forEach(date => {
    const sessionData = generateSessionData(date);
    sessions.push(sessionData);
  });
  
  // Create CSV header (matching the importer column order)
  const header = [
    'Session ID',
    'Date',
    'Start Time',
    'End Time',
    'Latitude',
    'Longitude',
    'Location Description',
    'Air Temperature',
    'Water Temperature',
    'Wind Speed',
    'Wind Direction',
    'Pressure',
    'Water Depth',
    'Species',
    'Length',
    'Weight',
    'Condition',
    'Bait',
    'Lure',
    'Technique',
    'Notes'
  ];
  
  // Create CSV rows
  const rows = [];
  
  sessions.forEach(session => {
    const sessionId = `session-${Math.random().toString(36).substr(2, 9)}`;
    
    session.catches.forEach((catch_, index) => {
      const bait = baitOptions[randomInt(0, baitOptions.length - 1)];
      const lure = lureOptions[randomInt(0, lureOptions.length - 1)];
      const technique = techniqueOptions[randomInt(0, techniqueOptions.length - 1)];
      
      const row = [
        sessionId,
        session.date,
        session.startTime,
        session.endTime,
        session.location.latitude,
        session.location.longitude,
        session.location.description,
        session.weather.temperature,
        session.water.temperature,
        session.weather.windSpeed,
        Math.round(randomBetween(0, 360)), // Wind direction
        session.weather.pressure,
        session.water.depth,
        catch_.species,
        catch_.length,
        catch_.weight,
        'kept', // Fish condition (column 16)
        bait, // Bait (column 17)
        lure, // Lure (column 18)
        technique, // Technique (column 19)
        'Great day offshore' // Notes (column 20)
      ];
      
      rows.push(row);
    });
  });
  
  // Combine header and rows (no quotes around fields)
  const csvContent = [header, ...rows]
    .map(row => row.join(','))
    .join('\n');
  
  return csvContent;
}

// Generate and save CSV
function main() {
  try {
    console.log('Starting CSV generation...');
    const csvContent = generateCSV();
    
    // Ensure data directory exists
    const dataDir = './public/data';
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    
    // Write CSV file
    const filePath = `${dataDir}/karl-fish-log-2024.csv`;
    fs.writeFileSync(filePath, csvContent, 'utf8');
    
    console.log(`CSV file generated successfully: ${filePath}`);
    console.log(`Total sessions: ${new Set(csvContent.split('\n').slice(1).map(line => line.split(',')[0])).size}`);
    console.log(`Total catches: ${csvContent.split('\n').length - 1}`);
    
  } catch (error) {
    console.error('Error generating CSV:', error);
  }
}

// Run the script
main();
