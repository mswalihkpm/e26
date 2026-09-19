const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, 'data', 'db.json');
const db = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));

// 1. Rich News Items
db.news = [
  {
    id: "news-01",
    title: "Grand Inauguration of Excellentia Arts Fiesta 2026 Celebrated with Splendor",
    category: "Top Story",
    badge: "Breaking",
    date: "Sept 15, 2026",
    image: "https://images.unsplash.com/photo-1511578314322-379afb476865?w=800&auto=format&fit=crop&q=80",
    summary: "The grand cultural extravaganza commenced with majestic fanfare, flag hoisting, and inspiring inaugural addresses honoring the artistic heritage of Ma'din School of Excellence.",
    isUploaded: true,
    isPublic: true,
    isPublished: true
  },
  {
    id: "news-02",
    title: "Team Bukhara Takes Early Lead in A-Zone Literary & Recitation Duels",
    category: "Championship",
    badge: "Leaderboard",
    date: "Sept 16, 2026",
    image: "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=800&auto=format&fit=crop&q=80",
    summary: "With phenomenal performances in Quran Recitation and Elocution, Bukhara surged ahead, closely followed by Undulus and Samarkhand in a nail-biting point contest.",
    isUploaded: true,
    isPublic: true,
    isPublished: true
  },
  {
    id: "news-03",
    title: "Spectacular Duff Muttu & Kolkkali Performances Mesmerize Capacity Crowd",
    category: "Stage Recitals",
    badge: "Stage Live",
    date: "Sept 16, 2026",
    image: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800&auto=format&fit=crop&q=80",
    summary: "The Main Stadium was packed to the rafters as the four houses delivered thunderous percussion rhythms, traditional sync, and acrobatic choreography.",
    isUploaded: true,
    isPublic: true,
    isPublished: true
  },
  {
    id: "news-04",
    title: "Arabic Calligraphy & Watercolor Exhibition Unveiled at Central Pavilion",
    category: "Exhibition",
    badge: "Arts & Craft",
    date: "Sept 17, 2026",
    image: "https://images.unsplash.com/photo-1579783902614-a3fb3927b675?w=800&auto=format&fit=crop&q=80",
    summary: "Visitors and jury members praised the breathtaking Arabic script masterpieces and creative canvas illustrations crafted by talented students across all zones.",
    isUploaded: true,
    isPublic: true,
    isPublished: true
  },
  {
    id: "news-05",
    title: "Choral March & Anthem Grand Finale Scheduled for Tomorrow Night",
    category: "Schedule",
    badge: "Upcoming",
    date: "Sept 17, 2026",
    image: "https://images.unsplash.com/photo-1465847899084-d164df4dedc6?w=800&auto=format&fit=crop&q=80",
    summary: "All four houses are fine-tuning their vocal harmonies and formations for the prestigious General Category Anthem trophy.",
    isUploaded: true,
    isPublic: true,
    isPublished: true
  },
  {
    id: "news-06",
    title: "Audit Committee Discrepancy Reporting System Operational 24/7",
    category: "Official",
    badge: "Notice",
    date: "Sept 18, 2026",
    image: "https://images.unsplash.com/photo-1450133064473-71024230f91b?w=800&auto=format&fit=crop&q=80",
    summary: "Team managers and house captains can submit immediate score or participant correction queries through the portal's integrated discrepancy audit module.",
    isUploaded: true,
    isPublic: true,
    isPublished: true
  }
];

// 2. Rich Videos Collection across All Categories
db.videos = [
  {
    id: "vid-01",
    date: "2026-09-15",
    title: "Grand Inaugural Ceremony & Anthem Performance",
    category: "Ceremony",
    thumbnail: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=800",
    url: "/videos/INTRO SPEED.mp4",
    description: "Opening overture and festive stage welcome for Excellentia Arts Fiesta 2026."
  },
  {
    id: "vid-02",
    date: "2026-09-15",
    title: "HAAMEEM PUKAL - Sufi Choral Recital",
    category: "Ceremony",
    thumbnail: "https://images.unsplash.com/photo-1465847899084-d164df4dedc6?w=800",
    url: "https://youtu.be/L2OMuWdGMDE?si=jJE_e7qBm0NHwZ-R",
    description: "Soulful devotional choral hymn presented during the inauguration."
  },
  {
    id: "vid-03",
    date: "2026-09-15",
    title: "Quran Recitation (Hafs) - 1st Place Championship Winner",
    category: "A-Zone",
    thumbnail: "https://images.unsplash.com/photo-1542810634-71277d95dcbb?w=800",
    url: "/videos/INTRO SPEED.mp4",
    description: "Flawless tajweed recitation by Mohammed Adil (Samarkhand) in A-Zone."
  },
  {
    id: "vid-04",
    date: "2026-09-16",
    title: "Elocution English (A-Zone) - Winning Keynote",
    category: "A-Zone",
    thumbnail: "https://images.unsplash.com/photo-1475721027785-f74eccf877e2?w=800",
    url: "/videos/INTRO SPEED.mp4",
    description: "Powerful rhetoric on 'Discovering the Unseen Depths of Truth' by Zayan Rayan."
  },
  {
    id: "vid-05",
    date: "2026-09-16",
    title: "Arabana Muttu Traditional Percussion Championship",
    category: "C-Zone",
    thumbnail: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800",
    url: "/videos/INTRO SPEED.mp4",
    description: "High-octane rhythmic Arabana display by Bukhara Troupe."
  },
  {
    id: "vid-06",
    date: "2026-09-16",
    title: "Duff Muttu Spectacular Group Sync",
    category: "C-Zone",
    thumbnail: "https://images.unsplash.com/photo-1511578314322-379afb476865?w=800",
    url: "/videos/INTRO SPEED.mp4",
    description: "Undulus Duff Squad's gold medal-winning stage choreography and beats."
  },
  {
    id: "vid-07",
    date: "2026-09-16",
    title: "Kolkkali Folk Dance Performance Grand Finale",
    category: "C-Zone",
    thumbnail: "https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=800",
    url: "/videos/INTRO SPEED.mp4",
    description: "Lightning-fast stick rhythm and circle steps by Qurthuba Kolkkali Team."
  },
  {
    id: "vid-08",
    date: "2026-09-17",
    title: "Group Nasheed Harmony Showcase",
    category: "C-Zone",
    thumbnail: "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=800",
    url: "/videos/INTRO SPEED.mp4",
    description: "Melodious polyphonic vocal harmonies by Samarkhand Nasheed Band."
  },
  {
    id: "vid-09",
    date: "2026-09-17",
    title: "Elocution Malayalam (B-Zone) - Fiery Speech",
    category: "B-Zone",
    thumbnail: "https://images.unsplash.com/photo-1524178232363-1fb2b075b655?w=800",
    url: "/videos/INTRO SPEED.mp4",
    description: "Masterful Malayalam speech delivered by Rayyan Shaheen."
  },
  {
    id: "vid-10",
    date: "2026-09-17",
    title: "Versification Malayalam - Poetic Recital",
    category: "B-Zone",
    thumbnail: "https://images.unsplash.com/photo-1455390582262-044cdead277a?w=800",
    url: "/videos/INTRO SPEED.mp4",
    description: "Original Malayalam verse recitation by Muhammed Rizwan."
  },
  {
    id: "vid-11",
    date: "2026-09-17",
    title: "Origami Sculpture & 3D Paper Architecture",
    category: "B-Zone",
    thumbnail: "https://images.unsplash.com/photo-1579783902614-a3fb3927b675?w=800",
    url: "/videos/INTRO SPEED.mp4",
    description: "Speed craftsmanship and complex geometric folding exhibition."
  },
  {
    id: "vid-12",
    date: "2026-09-18",
    title: "Theatrical Stage Drama - 'Echoes of the Coast'",
    category: "General",
    thumbnail: "https://images.unsplash.com/photo-1507676184212-d03ab07a01bf?w=800",
    url: "/videos/INTRO SPEED.mp4",
    description: "Dramatic historical enactment staged by Bukhara Drama Wing."
  },
  {
    id: "vid-13",
    date: "2026-09-18",
    title: "Grand Quiz Finale - Rapid Fire Championship Round",
    category: "General",
    thumbnail: "https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=800",
    url: "/videos/INTRO SPEED.mp4",
    description: "High-intensity battle of wits between Samarkhand and Undulus quiz teams."
  },
  {
    id: "vid-14",
    date: "2026-09-18",
    title: "Choral March & Anthem - Four House Symphonies",
    category: "General",
    thumbnail: "https://images.unsplash.com/photo-1511192336575-5a79af67a629?w=800",
    url: "/videos/INTRO SPEED.mp4",
    description: "Grand ensemble performance of the official festival anthem."
  },
  {
    id: "vid-15",
    date: "2026-09-18",
    title: "Qawwali Grand Night & Traditional Ghazal Recitals",
    category: "General",
    thumbnail: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800",
    url: "/videos/INTRO SPEED.mp4",
    description: "Ecstatic live classical vocal rendition by the festival choir."
  },
  {
    id: "vid-16",
    date: "2026-09-18",
    title: "Water Color Painting Live Championship Strokes",
    category: "A-Zone",
    thumbnail: "https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=800",
    url: "/videos/INTRO SPEED.mp4",
    description: "Timelapsed technique and live canvas painting demonstration."
  }
];

// 2.5. Rich Gallery Photos Collection across Festival Highlights
db.gallery = [
  { id: "gal-01", title: "Grand Opening Stage Ceremony", category: "Inauguration", image: "https://images.unsplash.com/photo-1511578314322-379afb476865?w=800", date: "Sept 15, 2026", likes: 142 },
  { id: "gal-02", title: "Quran Recitation Stage", category: "A-Zone", image: "https://images.unsplash.com/photo-1542810634-71277d95dcbb?w=800", date: "Sept 15, 2026", likes: 98 },
  { id: "gal-03", title: "Duff Muttu Rhythmic Beats", category: "C-Zone", image: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800", date: "Sept 16, 2026", likes: 215 },
  { id: "gal-04", title: "Arabic Calligraphy Canvas", category: "Exhibition", image: "https://images.unsplash.com/photo-1579783902614-a3fb3927b675?w=800", date: "Sept 16, 2026", likes: 167 },
  { id: "gal-05", title: "Kolkkali Folk Dance Squad", category: "C-Zone", image: "https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=800", date: "Sept 16, 2026", likes: 189 },
  { id: "gal-06", title: "English Keynote Speech", category: "A-Zone", image: "https://images.unsplash.com/photo-1475721027785-f74eccf877e2?w=800", date: "Sept 16, 2026", likes: 76 },
  { id: "gal-07", title: "Vocal Choir Harmony", category: "General", image: "https://images.unsplash.com/photo-1511192336575-5a79af67a629?w=800", date: "Sept 17, 2026", likes: 134 },
  { id: "gal-08", title: "Watercolor Arts Pavilion", category: "A-Zone", image: "https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=800", date: "Sept 17, 2026", likes: 112 },
  { id: "gal-09", title: "Drama Theatre Showcase", category: "General", image: "https://images.unsplash.com/photo-1507676184212-d03ab07a01bf?w=800", date: "Sept 17, 2026", likes: 156 },
  { id: "gal-10", title: "Grand Championship Trophy Unveiling", category: "Championship", image: "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=800", date: "Sept 18, 2026", likes: 245 },
  { id: "gal-11", title: "Paper Origami & Craft Display", category: "B-Zone", image: "https://images.unsplash.com/photo-1455390582262-044cdead277a?w=800", date: "Sept 18, 2026", likes: 88 },
  { id: "gal-12", title: "Pencil Sketching Contest", category: "B-Zone", image: "https://images.unsplash.com/photo-1465847899084-d164df4dedc6?w=800", date: "Sept 18, 2026", likes: 95 },
  { id: "gal-13", title: "Arabana Muttu Percussion Sync", category: "C-Zone", image: "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=800", date: "Sept 18, 2026", likes: 178 },
  { id: "gal-14", title: "House Captains March Past", category: "Ceremony", image: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=800", date: "Sept 18, 2026", likes: 203 }
];

// 3. Ensure results array is complete and recalculate
const results = [
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
  },
  {
    id: "res-19",
    resultNumber: 19,
    programCode: "B06",
    programName: "POEM MALAYALAM",
    category: "B-Zone",
    isPublic: true,
    winners: [
      { position: "1st", participantName: "Hisham Munir", chestNumber: "202", team: "Undulus", grade: "A", points: 10 },
      { position: "2nd", participantName: "Muhammed Rizwan", chestNumber: "402", team: "Qurthuba", grade: "A", points: 7 },
      { position: "3rd (Tie)", participantName: "Nihal Shamil", chestNumber: "301", team: "Samarkhand", grade: "A", points: 5 },
      { position: "3rd (Tie)", participantName: "Rayyan Shaheen", chestNumber: "103", team: "Bukhara", grade: "A", points: 5 }
    ]
  },
  {
    id: "res-20",
    resultNumber: 20,
    programCode: "B07",
    programName: "STORY MALAYALAM",
    category: "B-Zone",
    isPublic: true,
    winners: [
      { position: "1st", participantName: "Zayan Rayan", chestNumber: "101", team: "Bukhara", grade: "A", points: 10 },
      { position: "2nd (Tie)", participantName: "Aman Farhan", chestNumber: "201", team: "Undulus", grade: "A", points: 7 },
      { position: "2nd (Tie)", participantName: "Sufyan Tariq", chestNumber: "303", team: "Samarkhand", grade: "A", points: 7 },
      { position: "3rd", participantName: "Rashid Ali", chestNumber: "403", team: "Qurthuba", grade: "A", points: 5 }
    ]
  }
];

db.results = results;

// Recalculate House Points
const teamMap = {};
db.teams.forEach(team => {
  teamMap[team.name.toLowerCase()] = {
    ...team,
    points: 0,
    firstCount: 0,
    secondCount: 0,
    thirdCount: 0,
    categoryPoints: {
      'A-Zone': 0,
      'B-Zone': 0,
      'C-Zone': 0,
      'General': 0
    }
  };
});

db.results.forEach(res => {
  const cat = res.category || 'A-Zone';
  if (Array.isArray(res.winners)) {
    res.winners.forEach(w => {
      if (!w || !w.team) return;
      const tKey = w.team.toLowerCase();
      if (!teamMap[tKey]) return;
      const pts = Number(w.points) || 0;
      teamMap[tKey].points += pts;
      teamMap[tKey].categoryPoints[cat] = (teamMap[tKey].categoryPoints[cat] || 0) + pts;
      const pos = String(w.position || '').toLowerCase();
      if (pos.includes('1')) teamMap[tKey].firstCount += 1;
      else if (pos.includes('2')) teamMap[tKey].secondCount += 1;
      else if (pos.includes('3')) teamMap[tKey].thirdCount += 1;
    });
  }
});

const updatedTeams = Object.values(teamMap);
updatedTeams.sort((a, b) => {
  if (b.points !== a.points) return b.points - a.points;
  if (b.firstCount !== a.firstCount) return b.firstCount - a.firstCount;
  return b.secondCount - a.secondCount;
});
updatedTeams.forEach((team, index) => {
  team.rank = index + 1;
});
db.teams = updatedTeams;

fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), 'utf8');
console.log('✅ Updated db.json with complete News, Videos, Multi-Winner Results & Recalculated Points!');
console.log('Team points:', db.teams.map(t => `${t.name}: ${t.points} pts (Rank #${t.rank})`));
