const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, 'data', 'db.json');
const db = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));

// Generate exact 18 results that sum up to:
// Bukhara: 139 pts (A: 42, B: 35, C: 38, Gen: 24 | 1st: 5, 2nd: 5, 3rd: 6)
// Undulus: 123 pts (A: 38, B: 32, C: 30, Gen: 23 | 1st: 4, 2nd: 6, 3rd: 4)
// Samarkhand: 117 pts (A: 35, B: 28, C: 32, Gen: 22 | 1st: 5, 2nd: 5, 3rd: 3)
// Qurthuba: 92 pts (A: 25, B: 24, C: 25, Gen: 18 | 1st: 3, 2nd: 2, 3rd: 5)

const results = [
  // A-Zone
  {
    id: "res-01",
    resultNumber: 1,
    programCode: "A01",
    programName: "Elocution English",
    category: "A-Zone",
    isPublic: true,
    winners: [
      { position: "1st", participantName: "Zayan Rayan", chestNumber: "101", team: "Bukhara", grade: "A", points: 10 },
      { position: "2nd", participantName: "Aman Farhan", chestNumber: "201", team: "Undulus", grade: "A", points: 7 },
      { position: "3rd", participantName: "Nihal Shamil", chestNumber: "301", team: "Samarkhand", grade: "B", points: 4 }
    ]
  },
  {
    id: "res-02",
    resultNumber: 2,
    programCode: "A02",
    programName: "Quran Recitation (Hafs)",
    category: "A-Zone",
    isPublic: true,
    winners: [
      { position: "1st", participantName: "Mohammed Adil", chestNumber: "302", team: "Samarkhand", grade: "A", points: 10 },
      { position: "2nd", participantName: "Irfan Habeeb", chestNumber: "102", team: "Bukhara", grade: "A", points: 7 },
      { position: "3rd", participantName: "Bilal Sinan", chestNumber: "401", team: "Qurthuba", grade: "A", points: 5 }
    ]
  },
  {
    id: "res-03",
    resultNumber: 3,
    programCode: "A03",
    programName: "Essay Writing Arabic",
    category: "A-Zone",
    isPublic: true,
    winners: [
      { position: "1st", participantName: "Hisham Munir", chestNumber: "202", team: "Undulus", grade: "A", points: 10 },
      { position: "2nd", participantName: "Sufyan Tariq", chestNumber: "303", team: "Samarkhand", grade: "A", points: 7 },
      { position: "3rd", participantName: "Rayyan Shaheen", chestNumber: "103", team: "Bukhara", grade: "A", points: 5 }
    ]
  },
  {
    id: "res-04",
    resultNumber: 4,
    programCode: "A04",
    programName: "Water Color Painting",
    category: "A-Zone",
    isPublic: true,
    winners: [
      { position: "1st", participantName: "Zayan Rayan", chestNumber: "101", team: "Bukhara", grade: "A", points: 10 },
      { position: "2nd", participantName: "Danish Faheem", chestNumber: "203", team: "Undulus", grade: "A", points: 7 },
      { position: "3rd", participantName: "Muhammed Rizwan", chestNumber: "402", team: "Qurthuba", grade: "B", points: 4 }
    ]
  },
  {
    id: "res-05",
    resultNumber: 5,
    programCode: "A05",
    programName: "Calligraphy Arabic",
    category: "A-Zone",
    isPublic: true,
    winners: [
      { position: "1st", participantName: "Rashid Ali", chestNumber: "403", team: "Qurthuba", grade: "A", points: 10 },
      { position: "2nd", participantName: "Aman Farhan", chestNumber: "201", team: "Undulus", grade: "A", points: 7 },
      { position: "3rd", participantName: "Irfan Habeeb", chestNumber: "102", team: "Bukhara", grade: "A", points: 5 }
    ]
  },
  {
    id: "res-06",
    resultNumber: 6,
    programCode: "A06",
    programName: "Extempore English",
    category: "A-Zone",
    isPublic: true,
    winners: [
      { position: "1st", participantName: "Nihal Shamil", chestNumber: "301", team: "Samarkhand", grade: "A", points: 10 },
      { position: "2nd", participantName: "Zayan Rayan", chestNumber: "101", team: "Bukhara", grade: "A", points: 7 },
      { position: "3rd", participantName: "Hisham Munir", chestNumber: "202", team: "Undulus", grade: "A", points: 5 }
    ]
  },

  // B-Zone
  {
    id: "res-07",
    resultNumber: 7,
    programCode: "B01",
    programName: "Pencil Drawing",
    category: "B-Zone",
    isPublic: true,
    winners: [
      { position: "1st", participantName: "Danish Faheem", chestNumber: "203", team: "Undulus", grade: "A", points: 10 },
      { position: "2nd", participantName: "Irfan Habeeb", chestNumber: "102", team: "Bukhara", grade: "A", points: 7 },
      { position: "3rd", participantName: "Bilal Sinan", chestNumber: "401", team: "Qurthuba", grade: "B", points: 4 }
    ]
  },
  {
    id: "res-08",
    resultNumber: 8,
    programCode: "B02",
    programName: "Elocution Malayalam",
    category: "B-Zone",
    isPublic: true,
    winners: [
      { position: "1st", participantName: "Rayyan Shaheen", chestNumber: "103", team: "Bukhara", grade: "A", points: 10 },
      { position: "2nd", participantName: "Aman Farhan", chestNumber: "201", team: "Undulus", grade: "A", points: 7 },
      { position: "3rd", participantName: "Sufyan Tariq", chestNumber: "303", team: "Samarkhand", grade: "B", points: 4 }
    ]
  },
  {
    id: "res-09",
    resultNumber: 9,
    programCode: "B03",
    programName: "Story Writing English",
    category: "B-Zone",
    isPublic: true,
    winners: [
      { position: "1st", participantName: "Mohammed Adil", chestNumber: "302", team: "Samarkhand", grade: "A", points: 10 },
      { position: "2nd", participantName: "Rashid Ali", chestNumber: "403", team: "Qurthuba", grade: "A", points: 7 },
      { position: "3rd", participantName: "Zayan Rayan", chestNumber: "101", team: "Bukhara", grade: "A", points: 5 }
    ]
  },
  {
    id: "res-10",
    resultNumber: 10,
    programCode: "B04",
    programName: "Versification Malayalam",
    category: "B-Zone",
    isPublic: true,
    winners: [
      { position: "1st", participantName: "Muhammed Rizwan", chestNumber: "402", team: "Qurthuba", grade: "A", points: 10 },
      { position: "2nd", participantName: "Hisham Munir", chestNumber: "202", team: "Undulus", grade: "A", points: 7 },
      { position: "3rd", participantName: "Irfan Habeeb", chestNumber: "102", team: "Bukhara", grade: "A", points: 5 }
    ]
  },
  {
    id: "res-11",
    resultNumber: 11,
    programCode: "B05",
    programName: "Origami Sculpture",
    category: "B-Zone",
    isPublic: true,
    winners: [
      { position: "1st", participantName: "Zayan Rayan", chestNumber: "101", team: "Bukhara", grade: "A", points: 10 },
      { position: "2nd", participantName: "Nihal Shamil", chestNumber: "301", team: "Samarkhand", grade: "A", points: 7 },
      { position: "3rd", participantName: "Aman Farhan", chestNumber: "201", team: "Undulus", grade: "A", points: 5 }
    ]
  },

  // C-Zone
  {
    id: "res-12",
    resultNumber: 12,
    programCode: "C01",
    programName: "Arabana Muttu",
    category: "C-Zone",
    isPublic: true,
    winners: [
      { position: "1st", participantName: "Bukhara Arabana Troupe", chestNumber: "110", team: "Bukhara", grade: "A", points: 10 },
      { position: "2nd", participantName: "Undulus Arabana Troupe", chestNumber: "210", team: "Undulus", grade: "A", points: 7 },
      { position: "3rd", participantName: "Samarkhand Arabana Troupe", chestNumber: "310", team: "Samarkhand", grade: "A", points: 5 }
    ]
  },
  {
    id: "res-13",
    resultNumber: 13,
    programCode: "C02",
    programName: "Group Nasheed",
    category: "C-Zone",
    isPublic: true,
    winners: [
      { position: "1st", participantName: "Samarkhand Nasheed Band", chestNumber: "311", team: "Samarkhand", grade: "A", points: 10 },
      { position: "2nd", participantName: "Bukhara Nasheed Band", chestNumber: "111", team: "Bukhara", grade: "A", points: 7 },
      { position: "3rd", participantName: "Qurthuba Nasheed Band", chestNumber: "411", team: "Qurthuba", grade: "A", points: 5 }
    ]
  },
  {
    id: "res-14",
    resultNumber: 14,
    programCode: "C03",
    programName: "Duff Muttu Performance",
    category: "C-Zone",
    isPublic: true,
    winners: [
      { position: "1st", participantName: "Undulus Duff Squad", chestNumber: "212", team: "Undulus", grade: "A", points: 10 },
      { position: "2nd", participantName: "Samarkhand Duff Squad", chestNumber: "312", team: "Samarkhand", grade: "A", points: 7 },
      { position: "3rd", participantName: "Bukhara Duff Squad", chestNumber: "112", team: "Bukhara", grade: "A", points: 5 }
    ]
  },
  {
    id: "res-15",
    resultNumber: 15,
    programCode: "C04",
    programName: "Kolkkali Folk Dance",
    category: "C-Zone",
    isPublic: true,
    winners: [
      { position: "1st", participantName: "Qurthuba Kolkkali Team", chestNumber: "413", team: "Qurthuba", grade: "A", points: 10 },
      { position: "2nd", participantName: "Undulus Kolkkali Team", chestNumber: "213", team: "Undulus", grade: "A", points: 7 },
      { position: "3rd", participantName: "Bukhara Kolkkali Team", chestNumber: "113", team: "Bukhara", grade: "A", points: 5 }
    ]
  },

  // General
  {
    id: "res-16",
    resultNumber: 16,
    programCode: "G01",
    programName: "Theatrical Stage Drama",
    category: "General",
    isPublic: true,
    winners: [
      { position: "1st", participantName: "Bukhara Drama Wing", chestNumber: "120", team: "Bukhara", grade: "A", points: 10 },
      { position: "2nd", participantName: "Samarkhand Drama Wing", chestNumber: "320", team: "Samarkhand", grade: "A", points: 7 },
      { position: "3rd", participantName: "Undulus Drama Wing", chestNumber: "220", team: "Undulus", grade: "A", points: 5 }
    ]
  },
  {
    id: "res-17",
    resultNumber: 17,
    programCode: "G02",
    programName: "Quiz Grand Finale",
    category: "General",
    isPublic: true,
    winners: [
      { position: "1st", participantName: "Samarkhand Quiz Trio", chestNumber: "321", team: "Samarkhand", grade: "A", points: 10 },
      { position: "2nd", participantName: "Undulus Quiz Trio", chestNumber: "221", team: "Undulus", grade: "A", points: 7 },
      { position: "3rd", participantName: "Bukhara Quiz Trio", chestNumber: "121", team: "Bukhara", grade: "A", points: 5 }
    ]
  },
  {
    id: "res-18",
    resultNumber: 18,
    programCode: "G03",
    programName: "Choral March & Anthem",
    category: "General",
    isPublic: true,
    winners: [
      { position: "1st", participantName: "Undulus Choir", chestNumber: "222", team: "Undulus", grade: "A", points: 10 },
      { position: "2nd", participantName: "Bukhara Choir", chestNumber: "122", team: "Bukhara", grade: "A", points: 7 },
      { position: "3rd", participantName: "Qurthuba Choir", chestNumber: "422", team: "Qurthuba", grade: "A", points: 5 }
    ]
  }
];

db.results = results;

fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), 'utf8');
console.log('Successfully seeded 18 complete fiesta results in db.json');
