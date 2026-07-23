import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import multer from "multer";
import path from "path";
import fs from "fs";
import { v2 as cloudinary } from "cloudinary";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import { WebSocketServer } from "ws";
import http from "http";
import dotenv from "dotenv";
import serverless from "serverless-http";
import zlib from "zlib";

dotenv.config();

// Generate a branded OG image as PNG (1200x630) using pure Node.js
function generateOGImagePNG(): Buffer {
  const W = 1200, H = 630;
  const rowBytes = W * 3;
  const rawRows: Buffer[] = [];
  for (let y = 0; y < H; y++) {
    const row = Buffer.alloc(1 + rowBytes);
    row[0] = 0; // filter byte: none
    for (let x = 0; x < W; x++) {
      const t = (x / W) * 0.5 + (y / H) * 0.5;
      const r = Math.round(15 + t * 14);
      const g = Math.round(23 + t * 35);
      const b = Math.round(42 + t * 146);
      const offset = 1 + x * 3;
      row[offset] = r;
      row[offset + 1] = g;
      row[offset + 2] = b;
    }
    rawRows.push(row);
  }
  // Draw some decorative elements: horizontal accent line
  const accentY = Math.round(H * 0.5);
  for (let y = accentY - 2; y <= accentY + 2; y++) {
    const row = rawRows[y];
    for (let x = 80; x < 280; x++) {
      const offset = 1 + x * 3;
      row[offset] = 59;
      row[offset + 1] = 130;
      row[offset + 2] = 246;
    }
  }
  // Draw circle decorations (right side)
  const cx = 950, cy = 315;
  for (let angle = 0; angle < 360; angle += 1) {
    const rad = (angle * Math.PI) / 180;
    for (let r = 120; r <= 220; r += 50) {
      const px = Math.round(cx + r * Math.cos(rad));
      const py = Math.round(cy + r * Math.sin(rad));
      if (px >= 0 && px < W && py >= 0 && py < H) {
        const row = rawRows[py];
        const offset = 1 + px * 3;
        row[offset] = Math.min(255, row[offset] + 20);
        row[offset + 1] = Math.min(255, row[offset + 1] + 50);
        row[offset + 2] = Math.min(255, row[offset + 2] + 100);
      }
    }
  }
  const rawData = Buffer.concat(rawRows);
  const compressed = zlib.deflateSync(rawData);
  // Build PNG file
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  function makeChunk(type: string, data: Buffer): Buffer {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length, 0);
    const typeB = Buffer.from(type, "ascii");
    const crcData = Buffer.concat([typeB, data]);
    let crc = 0xffffffff;
    for (const byte of crcData) {
      crc ^= byte;
      for (let i = 0; i < 8; i++) {
        crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
      }
    }
    crc ^= 0xffffffff;
    const crcB = Buffer.alloc(4);
    crcB.writeUInt32BE(crc >>> 0, 0);
    return Buffer.concat([len, typeB, data, crcB]);
  }
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(W, 0);
  ihdrData.writeUInt32BE(H, 4);
  ihdrData[8] = 8; // bit depth
  ihdrData[9] = 2; // color type: RGB
  ihdrData[10] = 0; // compression
  ihdrData[11] = 0; // filter
  ihdrData[12] = 0; // interlace
  return Buffer.concat([
    signature,
    makeChunk("IHDR", ihdrData),
    makeChunk("IDAT", compressed),
    makeChunk("IEND", Buffer.alloc(0)),
  ]);
}

// Cloudinary Configuration
// Automatically picks up CLOUDINARY_URL from environment if set
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true
});

export const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });
const PORT = process.env.PORT || 3000;
const ADMIN_SECRET = (process.env.ADMIN_SECRET || "admin12345").trim();
console.log(`[Config] ADMIN_SECRET initialized (length: ${ADMIN_SECRET.length})`);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
const uploadDir = process.env.UPLOAD_DIR || "uploads";
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}
app.use("/uploads", express.static(uploadDir));

// Database setup - SQLite
const db = new Database("database.sqlite");
db.pragma("foreign_keys = OFF");

// Initialize tables
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE,
    email TEXT,
    password TEXT,
    role TEXT DEFAULT 'user'
  );

  CREATE TABLE IF NOT EXISTS shipments (
    id TEXT PRIMARY KEY,
    customer_name TEXT,
    client_phone TEXT,
    client_photo_url TEXT,
    origin TEXT,
    destination TEXT,
    status TEXT DEFAULT 'Warehouse',
    payment_methods TEXT,
    claimed_by TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    product_photos TEXT,
    weight TEXT,
    dimensions TEXT,
    estimated_delivery TEXT,
    shipping_cost TEXT,
    content_description TEXT
  );

  CREATE TABLE IF NOT EXISTS shipment_updates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    shipment_id TEXT,
    status TEXT,
    location TEXT,
    photo_url TEXT,
    notes TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(shipment_id) REFERENCES shipments(id)
  );

  CREATE TABLE IF NOT EXISTS tickets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_email TEXT,
    subject TEXT,
    message TEXT,
    status TEXT DEFAULT 'Open',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS ticket_replies (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ticket_id INTEGER,
    sender_username TEXT,
    message TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(ticket_id) REFERENCES tickets(id)
  );

  CREATE TABLE IF NOT EXISTS flights (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    airline TEXT,
    flight_number TEXT,
    origin TEXT,
    destination TEXT,
    departure_time DATETIME,
    arrival_time DATETIME,
    price REAL,
    available_seats INTEGER,
    status TEXT DEFAULT 'Scheduled',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS flight_updates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    flight_id INTEGER,
    status TEXT,
    location TEXT,
    notes TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(flight_id) REFERENCES flights(id)
  );

  CREATE TABLE IF NOT EXISTS bookings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    flight_id INTEGER,
    user_id INTEGER,
    passenger_name TEXT,
    passport_number TEXT,
    cabin_class TEXT DEFAULT 'economy',
    payment_status TEXT DEFAULT 'pending',
    airline TEXT,
    flight_number TEXT,
    origin TEXT,
    destination TEXT,
    departure_time TEXT,
    arrival_time TEXT,
    price REAL,
    duration_minutes INTEGER,
    distance_km INTEGER,
    booking_date DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS activity_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT,
    action TEXT,
    details TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS news (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    summary TEXT,
    content TEXT NOT NULL,
    image_url TEXT,
    category TEXT DEFAULT 'General',
    is_published INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

// Migrate shipments table: add customs payment columns if missing
const shipmentCols = db.prepare("PRAGMA table_info(shipments)").all() as any[];
const shipmentColNames = shipmentCols.map((c: any) => c.name);
const shipmentMigrations: [string, string][] = [
  ["customs_amount", "ALTER TABLE shipments ADD COLUMN customs_amount TEXT"],
  ["customs_currency", "ALTER TABLE shipments ADD COLUMN customs_currency TEXT"],
  ["payment_proof_url", "ALTER TABLE shipments ADD COLUMN payment_proof_url TEXT"],
  ["payment_confirmed", "ALTER TABLE shipments ADD COLUMN payment_confirmed INTEGER DEFAULT 0"],
];
for (const [col, sql] of shipmentMigrations) {
  if (!shipmentColNames.includes(col)) {
    db.prepare(sql).run();
  }
}

// Migrate bookings table: add new columns if missing
const bookingCols = db.prepare("PRAGMA table_info(bookings)").all() as any[];
const bookingColNames = bookingCols.map((c: any) => c.name);
const bookingMigrations: [string, string][] = [
  ["payment_status", "ALTER TABLE bookings ADD COLUMN payment_status TEXT DEFAULT 'pending'"],
  ["airline", "ALTER TABLE bookings ADD COLUMN airline TEXT"],
  ["flight_number", "ALTER TABLE bookings ADD COLUMN flight_number TEXT"],
  ["origin", "ALTER TABLE bookings ADD COLUMN origin TEXT"],
  ["destination", "ALTER TABLE bookings ADD COLUMN destination TEXT"],
  ["departure_time", "ALTER TABLE bookings ADD COLUMN departure_time TEXT"],
  ["arrival_time", "ALTER TABLE bookings ADD COLUMN arrival_time TEXT"],
  ["price", "ALTER TABLE bookings ADD COLUMN price REAL"],
  ["duration_minutes", "ALTER TABLE bookings ADD COLUMN duration_minutes INTEGER"],
  ["distance_km", "ALTER TABLE bookings ADD COLUMN distance_km INTEGER"],
];
for (const [col, sql] of bookingMigrations) {
  if (!bookingColNames.includes(col)) {
    db.prepare(sql).run();
  }
}
// Migrate old bookings with status 'Confirmed' to payment_status 'confirmed' (only if status column exists)
const bookingColNames2 = (db.prepare("PRAGMA table_info(bookings)").all() as any[]).map((c: any) => c.name);
if (bookingColNames2.includes("status")) {
  db.prepare("UPDATE bookings SET payment_status = 'confirmed' WHERE status = 'Confirmed' AND payment_status = 'pending'").run();
}

// Migrate ticket_replies table: add image_url column if missing
const replyCols = db.prepare("PRAGMA table_info(ticket_replies)").all() as any[];
const replyColNames = replyCols.map((c: any) => c.name);
if (!replyColNames.includes("image_url")) {
  db.prepare("ALTER TABLE ticket_replies ADD COLUMN image_url TEXT").run();
}

// Seed news articles (only if table is empty)
const existingNews = db.prepare("SELECT COUNT(*) as cnt FROM news").get() as any;
if (existingNews.cnt === 0) {
  const insertNews = db.prepare("INSERT INTO news (title, summary, content, image_url, category, is_published) VALUES (?, ?, ?, ?, ?, 1)");
  const seedNews = [
    { t: "Diplomatic Xpress Expands Global Air Cargo Network to 120+ Countries", s: "Our network now spans over 120 countries with dedicated freight corridors across six continents.", c: "Diplomatic Xpress Logistics has officially expanded its air cargo operations to cover more than 120 countries worldwide. The expansion includes new freight corridors in Southeast Asia, West Africa, and South America. CEO Marcus Reed stated: \"This milestone reflects our commitment to connecting businesses and communities across every corner of the globe. Our new routes reduce average transit times by 18%, making international shipping faster and more reliable than ever.\"\n\nWith this expansion, Diplomatic Xpress now operates through 340+ partner airports and maintains dedicated cargo terminals in 45 major logistics hubs. The company plans to add 20 more destinations by Q3 2026.", i: "https://images.unsplash.com/photo-1436491865332-7a61a109db05?w=800&h=500&fit=crop", cat: "Company News" },
    { t: "New AI-Powered Tracking System Launches This Month", s: "Real-time AI tracking with predictive delivery windows is now live for all premium shipments.", c: "Diplomatic Xpress has deployed a next-generation AI tracking system that provides predictive delivery windows with 97.3% accuracy. The system analyzes weather patterns, air traffic data, customs processing times, and historical shipment data to give customers precise ETAs.\n\n\"Customers no longer have to wonder when their package will arrive,\" said CTO Diana Zhao. \"Our AI models process over 2 million data points per shipment to generate highly accurate delivery predictions.\"\n\nThe feature is available for all premium-tier shipments and will roll out to standard shipments by end of quarter.", i: "https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=800&h=500&fit=crop", cat: "Technology" },
    { t: "Customs Clearance Times Drop 40% with Digital Documentation", s: "Digital-first customs processing is revolutionizing border clearance across major trade routes.", c: "A landmark partnership between Diplomatic Xpress and customs authorities in 28 countries has resulted in a 40% reduction in average customs clearance times. The Digital Customs Initiative (DCI) allows pre-submission of all required documentation, including commercial invoices, packing lists, and certificates of origin.\n\nKey benefits include:\n- Average clearance time reduced from 72 hours to 43 hours\n- Paperwork errors reduced by 65%\n- Compliance rate improved to 99.1%\n- Real-time customs status updates via our mobile app\n\nThe initiative will expand to an additional 15 countries by the end of 2026.", i: "https://images.unsplash.com/photo-1578575437130-527eed3abbec?w=800&h=500&fit=crop", cat: "Customs" },
    { t: "Sustainability Milestone: 30% Reduction in Carbon Emissions", s: "Our green logistics program has achieved a 30% reduction in carbon emissions across all operations.", c: "Diplomatic Xpress is proud to announce a 30% reduction in carbon emissions across its global operations since 2024. The achievement was made possible through:\n\n- Fleet modernization with fuel-efficient cargo aircraft\n- Adoption of Sustainable Aviation Fuel (SAF) on 40% of routes\n- Solar-powered warehouse facilities in Dubai, Singapore, and Rotterdam\n- Optimized routing algorithms that reduce unnecessary flight segments\n- Electric last-mile delivery vehicles in 12 major cities\n\n\"We believe logistics and sustainability can coexist,\" said VP of Sustainability James Park. \"Our target is net-zero emissions by 2030, and we are ahead of schedule.\"", i: "https://images.unsplash.com/photo-1473341304170-971dccb5ac1e?w=800&h=500&fit=crop", cat: "Sustainability" },
    { t: "Holiday Shipping Deadlines: What You Need to Know for 2026", s: "Plan ahead this holiday season with our updated shipping deadlines for guaranteed delivery.", c: "The 2026 holiday season is approaching, and Diplomatic Xpress has released its updated shipping deadlines to ensure your packages arrive on time.\n\nInternational Express deadlines:\n- Europe: December 12\n- Asia-Pacific: December 8\n- South America: December 5\n- Africa: December 3\n\nDomestic Express deadlines:\n- Standard: December 18\n- Priority: December 22\n- Same-Day: December 24\n\n\"We recommend shipping at least 5 business days earlier than these deadlines during peak season,\" advised Operations Director Sarah Kim. \"Customs processing times may be extended during holidays.\"", i: "https://images.unsplash.com/photo-1549488344-1f9b8d2bd1f8?w=800&h=500&fit=crop", cat: "Company News" },
    { t: "New Warehouse Facility Opens in Nairobi, Kenya", s: "East Africa's newest logistics hub boosts regional trade capacity by 45%.", c: "Diplomatic Xpress has inaugurated a state-of-the-art 250,000 sq ft warehouse facility in Nairobi's Export Processing Zone. The facility features automated sorting systems, cold storage for perishables, and a dedicated customs bonded area.\n\nThe Nairobi hub will serve as the primary distribution center for East African trade, connecting Kenya, Uganda, Tanzania, Rwanda, and Ethiopia to global markets. The facility is expected to process over 15,000 shipments daily.\n\n\"East Africa is one of the fastest-growing trade regions in the world,\" said Regional Director Amara Okonkwo. \"This facility positions Diplomatic Xpress as the logistics partner of choice for businesses in the region.\"", i: "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=800&h=500&fit=crop", cat: "Company News" },
    { t: "Understanding Customs Duties: A Complete Guide for Shippers", s: "Everything you need to know about calculating and paying customs duties on international shipments.", c: "Customs duties are taxes imposed by governments on goods transported across international borders. Understanding how they work is crucial for any business involved in international trade.\n\nKey factors affecting customs duties:\n1. HS Code classification of goods\n2. Declared value of the shipment\n3. Country of origin\n4. Trade agreements between countries\n5. Any applicable anti-dumping duties\n\nDiplomatic Xpress provides duty calculators and pre-clearance services to help shippers estimate costs before shipping. Our customs team can also help classify goods correctly to avoid delays and penalties.\n\nContact our customs department for a free consultation on your next international shipment.", i: "https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=800&h=500&fit=crop", cat: "Customs" },
    { t: "Blockchain Technology Transforms Supply Chain Transparency", s: "Immutable tracking records give shippers and recipients complete visibility into the supply chain.", c: "Diplomatic Xpress has integrated blockchain technology into its supply chain management platform, creating immutable records of every shipment's journey from origin to destination.\n\nBenefits of blockchain tracking:\n- Tamper-proof documentation\n- Real-time verification of goods authenticity\n- Simplified dispute resolution\n- Automated compliance reporting\n- Enhanced trust between trading partners\n\n\"Blockchain eliminates the trust gap in international shipping,\" explained tech lead Marcus Chen. \"Every handoff, every scan, every customs clearance is permanently recorded and verifiable by all parties.\"\n\nThe feature is currently live for high-value shipments and pharmaceutical logistics.", i: "https://images.unsplash.com/photo-1639762681485-074b7f938ba0?w=800&h=500&fit=crop", cat: "Technology" },
    { t: "Peak Season Preparedness: How We Handle 3x Volume", s: "Behind the scenes of our peak season operations — how we maintain quality with triple the volume.", c: "Every year, global logistics volumes surge during peak season. Diplomatic Xpress prepares months in advance to ensure seamless operations even when shipment volumes triple.\n\nOur peak season strategy includes:\n- Seasonal hiring of 2,500+ temporary staff across all hubs\n- Additional charter flights on high-demand routes\n- Extended warehouse operating hours (24/7 at major hubs)\n- Dynamic pricing to balance demand\n- Pre-positioned inventory at forward logistics centers\n\nLast year, we maintained a 98.7% on-time delivery rate during peak season, up from 96.2% the previous year. Our goal for 2026 is 99%.", i: "https://images.unsplash.com/photo-1566576912321-d58ddd7a6088?w=800&h=500&fit=crop", cat: "Logistics" },
    { t: "Diplomatic Xpress Wins Global Logistics Excellence Award 2026", s: "Recognized for outstanding innovation in international freight management and customer service.", c: "Diplomatic Xpress Logistics has been awarded the Global Logistics Excellence Award 2026 at the International Supply Chain Summit in Singapore. The award recognizes the company's outstanding contributions to innovation in freight management and customer service.\n\nJudges highlighted several achievements:\n- Industry-leading 99.2% delivery accuracy rate\n- Pioneering AI-powered customs clearance\n- Carbon emission reduction of 30% in two years\n- 24/7 customer support in 45 languages\n- Launch of the Diplomatic Express mobile app with 2 million downloads\n\n\"This award belongs to our 15,000 team members worldwide who make excellence their daily standard,\" said CEO Marcus Reed during the acceptance ceremony.", i: "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800&h=500&fit=crop", cat: "Company News" },
    { t: "Cold Chain Logistics: Ensuring Temperature-Sensitive Shipments", s: "How advanced monitoring technology keeps pharmaceuticals and perishables at the perfect temperature.", c: "Temperature-sensitive shipments require specialized handling to maintain product integrity throughout the supply chain. Diplomatic Xpress operates one of the world's most advanced cold chain logistics networks.\n\nOur cold chain capabilities include:\n- Temperature range: -70°C to +25°C\n- Real-time IoT temperature monitoring\n- Automated alerts for temperature deviations\n- Dedicated cold storage facilities at 18 major airports\n- GDP (Good Distribution Practice) certification\n\nPharmaceutical shipments receive priority handling with GPS-tracked temperature loggers that transmit data every 30 seconds. If temperatures deviate from the acceptable range, our operations team is immediately notified.\n\nLast year, we successfully delivered 4.2 million temperature-sensitive packages with a 99.98% integrity rate.", i: "https://images.unsplash.com/photo-1585435557343-3b092031a831?w=800&h=500&fit=crop", cat: "Logistics" },
    { t: "New Direct Routes Between Asia and South America", s: "Faster shipping with 5 new direct air cargo routes connecting Asian manufacturing to South American markets.", c: "Diplomatic Xpress has launched five new direct air cargo routes connecting major Asian manufacturing hubs to South American markets. The new routes significantly reduce transit times for goods moving between these continents.\n\nNew routes:\n- Shanghai → São Paulo (14 hours, down from 32)\n- Ho Chi Minh City → Santiago (16 hours)\n- Mumbai → Buenos Aires (15 hours)\n- Shenzhen → Bogota (17 hours)\n- Bangkok → Lima (18 hours)\n\n\"Previously, shipments between Asia and South America required multiple connections through Europe or North America,\" explained Route Planning Director Yuki Tanaka. \"These direct routes cut transit times by more than half.\"\n\nThe routes are served by Boeing 777F and Airbus A350F freighters with 100+ ton capacity each.", i: "https://images.unsplash.com/photo-1529074025005-3da28f7e25cf?w=800&h=500&fit=crop", cat: "Aviation" },
    { t: "E-Commerce Boom Drives Record Parcel Volumes", s: "Global e-commerce growth pushes Diplomatic Xpress to handle 2 million parcels daily across its network.", c: "The global e-commerce boom continues to reshape the logistics industry, with Diplomatic Xpress now processing over 2 million parcels daily across its worldwide network. This represents a 45% increase from the previous year.\n\nKey statistics:\n- Cross-border e-commerce parcels up 62% year-over-year\n- Average parcel weight: 2.3 kg\n- Top origin countries: China, USA, UK, Germany, Japan\n- Top destination countries: USA, Germany, Australia, UAE, Brazil\n\nTo handle the surge, Diplomatic Xpress has invested $200 million in automated sorting facilities and last-mile delivery infrastructure. The company has also partnered with local delivery services in 30 countries to ensure efficient last-mile delivery.\n\n\"E-commerce has fundamentally changed how people shop, and logistics must evolve to meet these new expectations,\" said Head of E-Commerce Logistics Rachel Wong.", i: "https://images.unsplash.com/photo-1556740758-90de374c12ad?w=800&h=500&fit=crop", cat: "Industry Trends" },
    { t: "Safety First: Zero Workplace Incidents for 500 Consecutive Days", s: "Our unwavering commitment to workplace safety reaches a major milestone.", c: "Diplomatic Xpress is proud to announce 500 consecutive days without a workplace safety incident across all global operations. This milestone covers over 15,000 employees working in warehouses, cargo terminals, and delivery operations.\n\nKey safety initiatives:\n- Mandatory safety training for all employees (quarterly refreshers)\n- AI-powered hazard detection in warehouse operations\n- Ergonomic equipment upgrades at all major facilities\n- Anonymous safety concern reporting system\n- Monthly safety audits by independent third parties\n\n\"Every employee deserves to go home safe at the end of their shift,\" said Chief Safety Officer Dr. Patricia Owens. \"This milestone proves that safety culture works when everyone commits to it.\"", i: "https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=800&h=500&fit=crop", cat: "Safety" },
    { t: "How to Properly Package Fragile Items for International Shipping", s: "Expert tips on packaging fragile goods to ensure they arrive at their destination intact.", c: "Shipping fragile items internationally requires careful preparation. Here are Diplomatic Xpress's expert recommendations for packaging fragile goods:\n\nEssential packaging steps:\n1. Use double-walled corrugated boxes\n2. Line the bottom with 3 inches of cushioning material\n3. Wrap each item individually in bubble wrap (minimum 2 layers)\n4. Fill all void spaces with packing peanuts or air pillows\n5. Use \"FRAGILE\" labels on all sides of the box\n6. Consider using a wooden crate for extremely valuable items\n\nCommon mistakes to avoid:\n- Using newspaper as cushioning (ink can transfer)\n- Overfilling boxes (causes bursting)\n- Reusing damaged boxes\n- Neglecting to mark as fragile\n\nDiplomatic Xpress offers professional packing services at all major drop-off locations. Our packing specialists use museum-grade materials for artwork and collectibles.", i: "https://images.unsplash.com/photo-1607167988660-a1a224399404?w=800&h=500&fit=crop", cat: "Logistics" },
    { t: "Partnership with UNICEF: Delivering Hope to Communities in Need", s: "Diplomatic Xpress partners with UNICEF to provide free logistics for humanitarian aid shipments.", c: "Diplomatic Xpress has entered a landmark partnership with UNICEF to provide free logistics services for humanitarian aid shipments to communities in need. The five-year agreement covers freight forwarding, warehousing, and last-mile delivery for UNICEF operations in 40 countries.\n\nThe partnership will focus on:\n- Medical supplies and vaccine distribution\n- Emergency relief materials during natural disasters\n- Educational materials for developing regions\n- Clean water equipment and purification systems\n\n\"Access to reliable logistics can be the difference between life and death in humanitarian crises,\" said CEO Marcus Reed. \"We are honored to contribute our expertise to UNICEF's vital work.\"\n\nThe first shipments under this partnership have already been dispatched to drought-affected regions in the Horn of Africa.", i: "https://images.unsplash.com/photo-1532629345422-7515f3d16bb6?w=800&h=500&fit=crop", cat: "Company News" },
    { t: "Understanding Incoterms 2020: A Shipper's Guide", s: "Navigate international trade with confidence using our comprehensive guide to Incoterms.", c: "Incoterms (International Commercial Terms) are standardized trade terms published by the International Chamber of Commerce. They define the responsibilities of buyers and sellers in international transactions.\n\nMost commonly used Incoterms:\n- EXW (Ex Works): Seller makes goods available at their premises\n- FOB (Free on Board): Seller delivers goods on board the vessel\n- CIF (Cost, Insurance, Freight): Seller pays for shipping and insurance\n- DAP (Delivered at Place): Seller delivers to the named destination\n- DDP (Delivered Duty Paid): Seller bears all costs including duties\n\nChoosing the right Incoterm affects your shipping costs, risk transfer, and insurance obligations. Diplomatic Xpress recommends consulting with our trade compliance team to select the best terms for your business.\n\nIncorrect use of Incoterms is the #1 cause of international shipping disputes. Our free Incoterm calculator tool helps shippers make informed decisions.", i: "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=800&h=500&fit=crop", cat: "Customs" },
    { t: "Fleet Modernization: Adding 12 New Boeing 777Fs to Our Network", s: "Investment in next-generation freighters brings fuel efficiency and reduced emissions across our fleet.", c: "Diplomatic Xpress has placed an order for 12 new Boeing 777F freighters, representing a $4.2 billion investment in fleet modernization. The new aircraft will be delivered in phases between 2026 and 2028.\n\nThe Boeing 777F offers:\n- 20% better fuel efficiency than previous generation\n- 102-ton payload capacity\n- Extended range of 9,070 km\n- Advanced engine technology with reduced noise\n- Lower carbon emissions per ton-kilometer\n\n\"These aircraft represent the future of air cargo,\" said Fleet Director Thomas Mueller. \"They allow us to serve more routes nonstop while significantly reducing our environmental footprint.\"\n\nThe new freighters will be deployed on transpacific and Asia-Europe routes, where demand for air cargo capacity continues to grow.", i: "https://images.unsplash.com/photo-1559268950-2d7ceb2efa3c?w=800&h=500&fit=crop", cat: "Aviation" },
    { t: "Digital Warehouse Management: How Automation Is Changing the Game", s: "Robotic sorting, AI inventory management, and predictive analytics are reshaping modern warehouses.", c: "The modern warehouse is undergoing a technological revolution. Diplomatic Xpress has invested $150 million in automating its top 10 distribution centers worldwide.\n\nKey automation technologies deployed:\n- Autonomous mobile robots (AMRs) for goods-to-person picking\n- AI-powered inventory prediction and restocking\n- Computer vision quality inspection systems\n- Automated packaging and labeling machines\n- Digital twin technology for warehouse optimization\n\nResults so far:\n- Order accuracy improved to 99.97%\n- Processing speed increased by 60%\n- Labor costs reduced by 35%\n- Warehouse space utilization improved by 40%\n\n\"Automation isn't about replacing people — it's about empowering them to focus on higher-value tasks,\" said VP of Operations Lisa Chang.", i: "https://images.unsplash.com/photo-1553413077-190dd305871c?w=800&h=500&fit=crop", cat: "Technology" },
    { t: "Diplomatic Xpress Launches Same-Day Delivery in 15 Major Cities", s: "Need it there today? Our new same-day service covers New York, London, Dubai, Singapore, and more.", c: "Diplomatic Xpress has launched its premium same-day delivery service in 15 major cities worldwide. The service guarantees delivery within 8 hours of pickup.\n\nLaunch cities:\n1. New York City\n2. London\n3. Dubai\n4. Singapore\n5. Tokyo\n6. Sydney\n7. Frankfurt\n8. Hong Kong\n9. São Paulo\n10. Mumbai\n11. Toronto\n12. Paris\n13. Shanghai\n14. Johannesburg\n15. Los Angeles\n\nPricing starts at $49 for documents and $89 for packages up to 5 kg. Same-day delivery is available for shipments booked before 2 PM local time.\n\n\"Speed is no longer a luxury — it's an expectation,\" said Head of Premium Services Kevin Park. \"Our same-day service meets the demands of today's fast-paced business environment.\"", i: "https://images.unsplash.com/photo-1566576721346-d4a3b4eaeb55?w=800&h=500&fit=crop", cat: "Company News" },
    { t: "The Future of Drone Delivery: Where Are We in 2026?", s: "An honest look at the current state of drone delivery technology and when it will be mainstream.", c: "Drone delivery has been one of the most talked-about innovations in logistics. But where does the technology actually stand in 2026?\n\nCurrent status:\n- Regulatory approvals granted in 23 countries\n- Diplomatic Xpress operates drone delivery trials in 5 cities\n- Maximum payload: 5 kg (most commercial drones)\n- Maximum range: 25 km from distribution center\n- Average delivery time: 30 minutes for eligible areas\n\nChallenges remaining:\n- Air traffic management for urban environments\n- Weather limitations (strong winds, rain)\n- Battery technology and range limitations\n- Privacy and noise concerns\n- Regulatory frameworks still developing\n\n\"Drone delivery will complement, not replace, traditional logistics,\" predicted CTO Diana Zhao. \"We expect widespread commercial adoption for medical supplies and lightweight packages within 3-5 years.\"", i: "https://images.unsplash.com/photo-1473968512647-3e447244af8f?w=800&h=500&fit=crop", cat: "Technology" },
    { t: "Holiday Season Staff Appreciation: Recognizing Our Global Team", s: "Behind every successful delivery is a dedicated professional making it happen.", c: "As we enter the busiest season of the year, Diplomatic Xpress wants to recognize the incredible dedication of our global team. From warehouse operators working night shifts to pilots flying through challenging weather, our team members are the backbone of our operations.\n\nThis year's recognition program includes:\n- Performance bonuses for all employees meeting delivery targets\n- Holiday appreciation events at 50+ facilities worldwide\n- Employee of the Month awards with cash prizes\n- Family appreciation packages sent to team members' homes\n- Special recognition for employees with 5+ years of service\n\n\"Our people make the impossible possible every single day,\" said CEO Marcus Reed. \"During peak season, when the world depends on logistics more than ever, our team rises to every challenge.\"", i: "https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=800&h=500&fit=crop", cat: "Company News" },
    { t: "Insurance Essentials: Protecting Your Shipments in Transit", s: "Why comprehensive cargo insurance is non-negotiable for international shipping.", c: "Every shipment carries inherent risks during transit. Whether it's damage from rough handling, theft, natural disasters, or customs seizures, cargo insurance is essential for protecting your investment.\n\nTypes of cargo insurance:\n1. All-Risk Coverage: Covers all physical loss or damage\n2. Named Perils: Covers specific risks like fire, theft, collision\n3. Institute Cargo Clauses: Industry-standard coverage levels\n\nWhat's typically NOT covered:\n- Inadequate packaging\n- Inherent vice (natural deterioration)\n- War and strikes (requires separate coverage)\n- Delay-related losses\n- Currency fluctuations\n\nDiplomatic Xpress offers integrated insurance options starting at 0.5% of declared value. Our insurance partners provide coverage up to $10 million per shipment.\n\nAlways declare accurate values — underinsurance can result in partial claim payments.", i: "https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=800&h=500&fit=crop", cat: "Customs" },
    { t: "Women in Logistics: Celebrating Female Leaders in Our Industry", s: "Highlighting the women who are shaping the future of global logistics and supply chain management.", c: "March is Women's History Month, and Diplomatic Xpress is proud to celebrate the women who lead and innovate in our organization and across the logistics industry.\n\nFeatured leaders at Diplomatic Xpress:\n- Diana Zhao, CTO: Leading our AI and automation initiatives\n- Sarah Kim, Operations Director: Managing global supply chain operations\n- Amara Okonkwo, Regional Director (Africa): Expanding operations across the continent\n- Lisa Chang, VP of Operations: Overseeing 50+ warehouses worldwide\n- Rachel Wong, Head of E-Commerce Logistics: Building the future of parcel delivery\n\nWomen now represent 38% of Diplomatic Xpress's workforce, up from 24% in 2020. The company has implemented mentorship programs, flexible work arrangements, and leadership development tracks to support gender diversity.\n\n\"Diversity isn't just the right thing to do — it makes us a stronger, more innovative company,\" said CEO Marcus Reed.", i: "https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=800&h=500&fit=crop", cat: "Company News" },
    { t: "Air vs Sea Freight: Which Should You Choose?", s: "A comprehensive comparison to help you make the right shipping decision for your needs.", c: "Choosing between air and sea freight depends on several factors. Here's a detailed comparison to help you decide:\n\nAir Freight:\n- Speed: 1-5 days internationally\n- Cost: Higher per kg\n- Best for: High-value, time-sensitive, perishable goods\n- Capacity: Limited by aircraft size\n- Reliability: Very high (98%+ on-time)\n\nSea Freight:\n- Speed: 15-45 days internationally\n- Cost: 4-6x cheaper than air per kg\n- Best for: Bulk goods, non-perishable, cost-sensitive\n- Capacity: Virtually unlimited\n- Reliability: Moderate (weather dependent)\n\nHybrid Approach:\nMany shippers use a combination — air freight for initial inventory to meet immediate demand, followed by sea freight for regular replenishment. Diplomatic Xpress can help you design a multi-modal logistics strategy that optimizes both cost and speed.", i: "https://images.unsplash.com/photo-1494412574643-ff11b0a5eb19?w=800&h=500&fit=crop", cat: "Logistics" },
    { t: "Navigating Post-Brexit Customs: Lessons Learned", s: "Key insights for businesses shipping between the UK and EU after Brexit.", c: "Nearly six years after Brexit, businesses have adapted to the new customs reality between the UK and EU. Here are the key lessons learned:\n\nWhat works now:\n- Simplified customs declarations through trusted trader schemes\n- Digital customs processing through CDS (Customs Declaration Service)\n- Mutual recognition of certain conformity assessments\n- Established customs clearance procedures at major ports\n\nOngoing challenges:\n- Rules of origin documentation requirements\n- VAT treatment on cross-border e-commerce\n- Northern Ireland Protocol compliance\n- Increased paperwork for food and agricultural products\n\nDiplomatic Xpress has helped over 5,000 businesses navigate post-Brexit customs requirements. Our UK-EU corridor team provides end-to-end support including classification, documentation, and duty optimization.\n\n\"The key to smooth UK-EU trade is preparation,\" said Brexit Trade Specialist Emma Hughes. \"Have all documentation ready before goods arrive at the border.\"", i: "https://images.unsplash.com/photo-1527482797697-8795b05a13fe?w=800&h=500&fit=crop", cat: "Customs" },
    { t: "IoT Sensors in Logistics: Real-Time Monitoring from Origin to Destination", s: "How connected sensors are transforming visibility across the supply chain.", c: "Internet of Things (IoT) sensors are revolutionizing logistics by providing real-time visibility into shipment conditions and location. Diplomatic Xpress has deployed over 500,000 IoT sensors across its network.\n\nWhat IoT sensors track:\n- Exact GPS location (updated every 30 seconds)\n- Temperature and humidity levels\n- Shock and vibration events\n- Light exposure (indicating unauthorized opening)\n- Door open/close events\n- Altitude (for air freight monitoring)\n\nBenefits:\n- Real-time exception alerts\n- Predictive maintenance for transport equipment\n- Evidence-based insurance claims\n- Quality assurance for sensitive goods\n- Route optimization based on real conditions\n\n\"IoT technology gives shippers peace of mind and actionable data,\" said IoT Program Manager Alex Rivera. \"When something goes wrong, we know immediately — not days later.\"", i: "https://images.unsplash.com/photo-1518770660439-4636190af475?w=800&h=500&fit=crop", cat: "Technology" },
    { t: "African Continental Free Trade Area: Opportunities for Logistics", s: "The AfCFTA is creating the world's largest free trade area — here's what it means for logistics.", c: "The African Continental Free Trade Area (AfCFTA) represents the largest free trade area by number of countries, connecting 1.3 billion people across 55 member states. For logistics companies, this creates enormous opportunities.\n\nKey impacts:\n- Tariff reductions on 90% of goods traded within Africa\n- Simplified customs procedures across member states\n- New trade corridors connecting previously isolated markets\n- Growing demand for cross-border logistics services\n\nDiplomatic Xpress has positioned itself as a leading logistics provider for AfCFTA trade:\n- 8 warehouse facilities across Africa\n- Partnerships with 40+ local delivery companies\n- Customs expertise in 30 African countries\n- Dedicated trade lane between East and West Africa\n\n\"Africa is the next great frontier for global trade,\" said Regional Director Amara Okonkwo. \"AfCFTA is accelerating this transformation.\"", i: "https://images.unsplash.com/photo-1516979187457-637abb4f9353?w=800&h=500&fit=crop", cat: "Industry Trends" },
    { t: "Emergency Shipping: When Every Hour Counts", s: "Our rapid response logistics solutions for urgent medical, industrial, and humanitarian shipments.", c: "Some shipments simply cannot wait. Diplomatic Xpress offers emergency logistics services for situations where every hour matters.\n\nEmergency shipping scenarios:\n- Medical equipment for hospital emergencies\n- Spare parts for critical industrial equipment\n- Replacement components for infrastructure\n- Humanitarian aid for disaster response\n- Legal documents with court deadlines\n\nOur emergency logistics features:\n- 24/7/365 emergency hotline\n- Dedicated emergency cargo aircraft on standby\n- Airport-to-airport transfers in under 4 hours\n- Customs expedited clearance partnerships\n- Real-time tracking with dedicated coordinator\n\nEmergency shipments are handled with the highest priority across our entire network. Pricing is quoted per shipment based on urgency and route.\n\n\"In an emergency, logistics is the lifeline,\" said Emergency Response Director David Park. \"Our team is trained to move fast while maintaining safety and compliance.\"", i: "https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=800&h=500&fit=crop", cat: "Logistics" },
    { t: "Warehouse Safety Protocols: Inside Our Distribution Centers", s: "A look at the comprehensive safety measures that keep our warehouses accident-free.", c: "Safety is the foundation of every Diplomatic Xpress warehouse operation. Our distribution centers follow strict protocols to protect employees, equipment, and goods.\n\nKey safety measures:\n- AI-powered forklift proximity detection systems\n- Automated speed limits in high-traffic zones\n- Mandatory PPE (personal protective equipment) at all times\n- Emergency stop buttons every 50 meters\n- Fire suppression systems with 90-second response time\n- Weekly safety drills and monthly emergency simulations\n\nTraining requirements:\n- New employee safety orientation (40 hours)\n- Equipment operator certification\n- Hazardous materials handling training\n- First aid and CPR certification for floor supervisors\n- Quarterly refresher courses for all staff\n\nOur accident rate of 0.02 per 100,000 work hours is among the lowest in the global logistics industry.", i: "https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=800&h=500&fit=crop", cat: "Safety" },
    { t: "Last-Mile Delivery Innovation: Electric Vehicles Take the Lead", s: "Our fleet of 500+ electric delivery vans is reducing emissions in urban areas.", c: "Last-mile delivery is the most visible and often the most challenging part of the logistics chain. Diplomatic Xpress is leading the transition to sustainable urban delivery with its growing fleet of electric vehicles.\n\nElectric fleet statistics:\n- 500+ electric delivery vans across 12 cities\n- Average range per charge: 250 km\n- Zero tailpipe emissions\n- 60% reduction in last-mile delivery costs\n- 40% quieter than diesel equivalents\n\nCities with electric fleet:\nLondon, Amsterdam, Berlin, Paris, Oslo, Stockholm, San Francisco, Los Angeles, Tokyo, Seoul, Singapore, Sydney\n\n\"Urban delivery accounts for 25% of transportation emissions in cities,\" said Sustainability Director James Park. \"Electric vehicles are the most impactful change we can make in last-mile logistics.\"", i: "https://images.unsplash.com/photo-1593941707882-a5bba14938c7?w=800&h=500&fit=crop", cat: "Sustainability" },
    { t: "Holiday Gift Shipping Guide: Tips for Perfect Delivery", s: "Make sure your holiday gifts arrive on time and in perfect condition with our expert tips.", c: "The holiday season is the busiest time for gift shipping. Follow Diplomatic Xpress's guide to ensure your presents arrive perfectly:\n\nTiming tips:\n- Ship international gifts 3-4 weeks before the holiday\n- Use express services for last-minute gifts\n- Check holiday closures at destination countries\n- Track your package from day one\n\nPacking tips:\n- Use original packaging when possible\n- Add extra cushioning for fragile items\n- Remove batteries from electronic devices\n- Include a gift receipt in an outer pocket\n- Don't wrap gifts (customs may need to inspect them)\n\nPopular holiday shipping destinations from our data:\n1. United States\n2. United Kingdom\n3. Germany\n4. Australia\n5. Canada\n6. Japan\n7. France\n8. Brazil\n9. UAE\n10. South Korea\n\nDiplomatic Xpress offers free gift wrapping at all drop-off locations during the holiday season.", i: "https://images.unsplash.com/photo-1549488344-1f9b8d2bd1f8?w=800&h=500&fit=crop", cat: "Logistics" },
    { t: "Green Warehousing: Solar Power and Sustainability at Our Facilities", s: "How our solar-powered warehouses are reducing energy consumption by 60%.", c: "Diplomatic Xpress is transforming its warehouse network into model sustainability facilities. Our green warehousing program has already converted 15 distribution centers to solar power.\n\nSustainability features:\n- Rooftop solar panels generating 5MW+ per facility\n- LED lighting throughout (80% energy savings)\n- Rainwater harvesting systems\n- Green roofs for natural insulation\n- Electric vehicle charging stations\n- Waste recycling rate: 92%\n\nFacilities converted:\nDubai, Singapore, Rotterdam, Los Angeles, Tokyo, Sydney, Mumbai, Frankfurt, London, Toronto, São Paulo, Johannesburg, Hong Kong, Seoul, Amsterdam\n\nEnergy savings:\n- Average 60% reduction in grid electricity\n- Annual CO2 reduction: 12,000 tons\n- Cost savings: $8 million annually\n\n\"Sustainability is not an expense — it's an investment that pays dividends for our planet and our bottom line,\" said Sustainability Director James Park.", i: "https://images.unsplash.com/photo-1509391366360-2e959784a276?w=800&h=500&fit=crop", cat: "Sustainability" },
    { t: "Smart Customs: How AI Is Speeding Up Border Clearance", s: "Artificial intelligence is reducing customs clearance times from days to hours.", c: "Artificial intelligence is transforming customs clearance, making border crossings faster and more accurate than ever before. Diplomatic Xpress has deployed AI customs tools in 28 countries.\n\nAI-powered customs features:\n- Automated HS code classification (99.2% accuracy)\n- Risk assessment for targeted inspections\n- Document verification in real-time\n- Duty and tax calculation automation\n- Predictive clearance time estimation\n\nResults:\n- Average clearance time: 8 hours (down from 72 hours)\n- Document errors reduced by 75%\n- Compliance rate: 99.4%\n- Inspection rate reduced by 50% for trusted shippers\n\n\"AI doesn't replace customs officials — it empowers them to focus on high-risk shipments,\" said Chief Customs Officer Maria Santos. \"Low-risk shipments clear almost automatically.\"", i: "https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=800&h=500&fit=crop", cat: "Technology" },
    { t: "Pharmaceutical Logistics: Maintaining the Cold Chain", s: "How we ensure vaccines and medications reach patients in perfect condition.", c: "Pharmaceutical logistics requires the highest levels of precision, compliance, and temperature control. Diplomatic Xpress is a trusted partner for leading pharmaceutical companies worldwide.\n\nPharma logistics capabilities:\n- GDP (Good Distribution Practice) certified facilities\n- Temperature range: -80°C to +25°C\n- Real-time temperature monitoring with IoT sensors\n- Dedicated pharmaceutical storage at 20 airports\n- 24/7 temperature excursion response team\n- GDP-trained handling staff\n\nKey statistics:\n- 850 million pharma doses delivered in 2025\n- Temperature excursion rate: 0.002%\n- Average transit time: 48 hours (international)\n- Compliance rate: 99.99%\n\nVaccine distribution:\nOur cold chain network played a crucial role in global vaccine distribution, delivering over 2 billion vaccine doses to 140 countries during the pandemic. This infrastructure continues to serve routine immunization programs worldwide.", i: "https://images.unsplash.com/photo-1584036561566-baf8f5f1b144?w=800&h=500&fit=crop", cat: "Logistics" },
    { t: "Container Shipping Rates Stabilize After Volatile Period", s: "Global shipping rates find new equilibrium as capacity adjustments take effect.", c: "After two years of unprecedented volatility, global container shipping rates have stabilized at sustainable levels. Here's our analysis of the current market:\n\nCurrent rate trends:\n- Asia to Europe: $3,200/TEU (down from peak of $14,000)\n- Asia to North America: $4,500/TEU (down from peak of $18,000)\n- Intra-Asia: $800/TEU (relatively stable)\n- Transatlantic: $2,800/TEU (moderate increase)\n\nMarket factors:\n- New vessel deliveries increasing capacity by 8% annually\n- Port congestion significantly improved\n- Demand returning to pre-pandemic growth patterns\n- Fuel costs stabilizing\n\n\"Shippers should take advantage of current rate stability to negotiate long-term contracts,\" advised Market Analyst Sarah Chen. \"The days of rock-bottom rates are gone, but rates are now predictable and fair.\"", i: "https://images.unsplash.com/photo-1494412651409-8963ce7935a7?w=800&h=500&fit=crop", cat: "Industry Trends" },
    { t: "Training the Next Generation: Diplomatic Xpress Academy Launches", s: "Our new training academy will develop 5,000 logistics professionals annually.", c: "Diplomatic Xpress has launched a global training academy to develop the next generation of logistics professionals. The Diplomatic Xpress Academy will train 5,000 students annually across four campuses.\n\nAcademy programs:\n- Supply Chain Management (12 weeks)\n- Customs Brokerage Certification (8 weeks)\n- Warehouse Operations Management (6 weeks)\n- Air Cargo Handling (4 weeks)\n- Digital Logistics & Technology (10 weeks)\n- Sustainability in Logistics (4 weeks)\n\nCampus locations:\n1. Dubai, UAE (opened January 2026)\n2. Singapore (opening March 2026)\n3. Rotterdam, Netherlands (opening June 2026)\n4. São Paulo, Brazil (opening September 2026)\n\n\"The logistics industry faces a global talent shortage,\" said Head of Training Dr. Michelle Adams. \"Our academy bridges this gap with practical, industry-aligned programs.\"", i: "https://images.unsplash.com/photo-1524178232363-1fb2b075b655?w=800&h=500&fit=crop", cat: "Company News" },
    { t: "Risk Management in International Shipping", s: "Identify and mitigate the risks that threaten your international shipments.", c: "International shipping involves numerous risks that can impact your bottom line. Diplomatic Xpress helps shippers identify and mitigate these risks through our comprehensive risk management framework.\n\nCommon international shipping risks:\n1. Transit damage (mitigated by proper packaging and insurance)\n2. Theft and pilferage (mitigated by tamper-evident packaging and GPS tracking)\n3. Customs delays (mitigated by accurate documentation and pre-clearance)\n4. Weather disruptions (mitigated by route monitoring and contingency planning)\n5. Geopolitical instability (mitigated by alternative routing options)\n6. Currency fluctuations (mitigated by fixed-rate contracts)\n7. Regulatory changes (mitigated by compliance monitoring)\n\nOur risk management tools:\n- Shipment risk assessment calculator\n- Real-time route risk monitoring\n- Automated insurance claims processing\n- Dedicated risk management consultants for high-value accounts\n\n\"Every risk has a solution — the key is identifying it before it becomes a problem,\" said Risk Management Director Carlos Rodriguez.", i: "https://images.unsplash.com/photo-1535320903710-d993d3d77d29?w=800&h=500&fit=crop", cat: "Logistics" },
    { t: "Carbon Neutral Shipping: Our Path to Net Zero by 2030", s: "A detailed look at our roadmap to achieving net-zero carbon emissions across all operations.", c: "Diplomatic Xpress is committed to achieving net-zero carbon emissions by 2030. Here's our detailed roadmap:\n\n2026-2027:\n- 50% of fleet converted to fuel-efficient aircraft\n- 60% of warehouse energy from renewable sources\n- Carbon offset program for all shipments\n- Launch of customer carbon footprint calculator\n\n2027-2028:\n- 75% of fleet using Sustainable Aviation Fuel\n- All ground vehicles electric or hydrogen\n- Carbon capture technology pilot programs\n- Zero-waste warehouse certification for all facilities\n\n2028-2030:\n- 100% renewable energy across all operations\n- Full fleet transition to next-gen aircraft\n- Carbon removal partnerships\n- Net-zero certification by independent auditors\n\n\"Climate change is the defining challenge of our generation,\" said CEO Marcus Reed. \"We're not just setting targets — we're building the infrastructure to achieve them.\"", i: "https://images.unsplash.com/photo-1466611653911-95081537e5b7?w=800&h=500&fit=crop", cat: "Sustainability" },
    { t: "New Digital Platform for Small Business Shippers", s: "Diplomatic Xpress launches an easy-to-use platform tailored for small and medium businesses.", c: "Diplomatic Xpress has launched a new digital platform specifically designed for small and medium-sized businesses (SMBs). The platform simplifies international shipping for businesses that don't have dedicated logistics departments.\n\nPlatform features:\n- One-click shipping label creation\n- Instant rate comparison across services\n- Customs documentation generator\n- Built-in duty and tax calculator\n- Multi-carrier tracking dashboard\n- Batch shipping for multiple packages\n- Integration with Shopify, WooCommerce, and Amazon\n\nSMB pricing:\n- Pay-per-shipment (no monthly fees)\n- Volume discounts starting at 50 shipments/month\n- Free basic account with limited features\n- Premium account at $29/month with full features\n\n\"Small businesses are the backbone of the global economy,\" said Head of SMB Sales Michael Torres. \"Our platform gives them the same logistics power that large corporations enjoy.\"", i: "https://images.unsplash.com/photo-1556761175-b413da4baf72?w=800&h=500&fit=crop", cat: "Technology" },
    { t: "Understanding HS Codes: The Universal Language of Trade", s: "Why correct Harmonized System code classification is critical for every shipment.", c: "The Harmonized System (HS) is an international nomenclature for the classification of products. Every product traded internationally must be assigned an HS code, and incorrect classification can lead to delays, fines, and compliance issues.\n\nHS code structure:\n- First 2 digits: Chapter (product category)\n- Next 2 digits: Heading (product subcategory)\n- Next 2 digits: Subheading (specific product)\n- Additional digits: Country-specific detail\n\nCommon classification mistakes:\n1. Confusing similar product categories\n2. Not accounting for product components\n3. Using outdated HS codes\n4. Ignoring country-specific requirements\n5. Assuming similar products have the same code\n\nDiplomatic Xpress offers:\n- Free HS code lookup tool on our website\n- Professional classification services\n- Binding tariff information applications\n- Regular HS code update notifications\n\n\"Correct HS classification is the foundation of trade compliance,\" said Customs Specialist Dr. Hans Weber. \"Getting it wrong can cost you thousands in penalties.\"", i: "https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=800&h=500&fit=crop", cat: "Customs" },
    { t: "Air Cargo Capacity Crisis: How the Industry Is Responding", s: "Global air cargo faces capacity constraints — here's how Diplomatic Xpress is meeting demand.", c: "The air cargo industry faces a capacity crunch as demand outpaces available freighter aircraft. Diplomatic Xpress is taking proactive steps to secure capacity for its customers.\n\nCurrent challenges:\n- Global air cargo demand growing 5.8% annually\n- Freighter aircraft production limited to 120 per year\n- E-commerce driving unprecedented parcel volumes\n- Peak season capacity at 98% utilization\n\nOur response:\n- 12 new Boeing 777F aircraft on order\n- Wet-lease agreements with partner airlines\n- Belly cargo partnerships with passenger airlines\n- Charter flights for peak season overflow\n- Route optimization to maximize existing capacity\n\n\"Capacity management is the biggest challenge in air cargo today,\" said VP of Network Planning Richard Chen. \"We're investing billions to ensure our customers always have space when they need it.\"", i: "https://images.unsplash.com/photo-1474302770737-173ee21bab63?w=800&h=500&fit=crop", cat: "Aviation" },
    { t: "Disaster Preparedness: How Logistics Companies Plan for the Unexpected", s: "Behind every disaster response is a logistics plan that was developed months or years in advance.", c: "When disaster strikes, logistics companies must respond immediately. Diplomatic Xpress maintains comprehensive disaster preparedness plans for all regions.\n\nOur preparedness framework:\n- Pre-positioned emergency supplies at 8 global hubs\n- Agreements with 15 airlines for emergency charter capacity\n- Relationships with customs authorities for expedited clearance\n- Emergency response teams on standby 24/7\n- Backup communication systems\n- Regional contingency routing plans\n\nRecent disaster responses:\n- Earthquake relief in Turkey (February 2026): Delivered 500 tons of supplies in 72 hours\n- Flood response in Southeast Asia (January 2026): Evacuated critical medical equipment\n- Wildfire logistics in California (December 2025): Coordinated 200+ emergency shipments\n\n\"Preparation is everything in disaster logistics,\" said Emergency Operations Director David Park. \"When the call comes, we need to move within minutes, not hours.\"", i: "https://images.unsplash.com/photo-1590073844006-3337973c310b?w=800&h=500&fit=crop", cat: "Safety" },
    { t: "The Rise of Nearshoring and Its Impact on Global Logistics", s: "Companies are bringing manufacturing closer to home — how this shifts global supply chains.", c: "Nearshoring — the practice of moving manufacturing closer to end markets — is reshaping global supply chains and creating new opportunities for logistics providers.\n\nNearshoring trends:\n- US companies moving from Asia to Mexico and Central America\n- European companies sourcing from Eastern Europe and North Africa\n- Japanese firms expanding in Southeast Asia\n- Chinese manufacturers establishing operations in Vietnam and Thailand\n\nImpact on logistics:\n- Shorter supply chains reduce transit times\n- New trade corridors emerging\n- Demand for cross-border road freight increasing\n- Regional warehousing becoming more important\n\nDiplomatic Xpress's nearshoring support:\n- Expanded operations in Mexico (12 new facilities)\n- Enhanced Eastern European network\n- New Southeast Asian corridors\n- Cross-border trucking partnerships\n\n\"Nearshoring isn't just a trend — it's a fundamental shift in how the world trades,\" said Chief Strategy Officer Lisa Morgan.", i: "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=800&h=500&fit=crop", cat: "Industry Trends" },
    { t: "Express Document Delivery: Secure and Trackable", s: "How Diplomatic Xpress handles sensitive legal, financial, and government documents.", c: "Sensitive documents require special handling. Diplomatic Xpress offers secure express document delivery for legal, financial, and government organizations worldwide.\n\nSecurity features:\n- Tamper-evident packaging with unique serial numbers\n- Chain of custody documentation\n- GPS tracking with real-time alerts\n- Signature required upon delivery\n- Insurance coverage up to $50,000\n- Background-checked couriers\n\nDocument types we handle:\n- Legal contracts and court filings\n- Financial instruments and bonds\n- Government documents and permits\n- Patent and trademark filings\n- Academic credentials\n- Medical records\n\nProcessing times:\n- Domestic: Same-day or next-day delivery\n- International: 1-3 business days\n- Emergency: Within 24 hours (any destination)\n\nAll document shipments receive dedicated tracking and delivery confirmation within 1 hour of delivery.", i: "https://images.unsplash.com/photo-1568234928926-0f3c30f0f85a?w=800&h=500&fit=crop", cat: "Logistics" },
    { t: "Fuel Efficiency in Aviation: How New Aircraft Save 30% on Fuel", s: "Next-generation freighter aircraft are setting new standards for fuel efficiency and environmental performance.", c: "Aviation fuel is one of the largest costs and environmental impacts in air cargo. New-generation aircraft are delivering dramatic improvements in fuel efficiency.\n\nComparative fuel efficiency:\n- Boeing 777F vs older 747-400F: 20% more fuel-efficient\n- Airbus A350F vs older A340F: 25% more fuel-efficient\n- Next-gen engines: 15% improvement over previous models\n- Aerodynamic improvements: 5-8% fuel savings\n\nTechnologies driving efficiency:\n- Advanced composite materials (lighter airframes)\n- High-bypass turbofan engines\n- Wingtip devices (sharklets/raked wingtips)\n- Lightweight cargo handling systems\n- Optimized flight routing with AI\n\nDiplomatic Xpress fuel savings:\n- 2024: Saved 45 million liters of fuel through fleet upgrades\n- 2025: Saved additional 30 million liters through route optimization\n- 2026 target: 100 million liters total annual savings\n\n\"Fuel efficiency is both an economic and environmental imperative,\" said Fleet Director Thomas Mueller.", i: "https://images.unsplash.com/photo-1540962351504-03099e0a754b?w=800&h=500&fit=crop", cat: "Aviation" },
    { t: "Customer Spotlight: How TechStart Grew 300% with Diplomatic Xpress", s: "An e-commerce startup scaled globally using our logistics infrastructure — here's their story.", c: "TechStart, a consumer electronics startup based in Berlin, credits Diplomatic Xpress with enabling their 300% growth in just 18 months. Here's how our logistics partnership made it possible.\n\nTechStart's challenge:\n- Shipping to 45 countries from a single warehouse\n- Managing returns across international borders\n- Providing fast delivery to compete with Amazon\n- Keeping shipping costs under control while growing\n\nOur solution:\n- Distributed fulfillment across 3 Diplomatic Xpress warehouses\n- Automated customs documentation for every shipment\n- Integration with our API for real-time tracking\n- Negotiated preferential rates based on volume\n\nResults:\n- Average delivery time: 3.2 days (down from 12 days)\n- Shipping cost per order: $4.50 (down from $11)\n- Customer satisfaction: 4.8/5 stars\n- Return rate: 2% (industry average: 8%)\n\n\"Diplomatic Xpress didn't just ship our products — they helped us build a global logistics strategy,\" said TechStart CEO Anna Schmidt.", i: "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=800&h=500&fit=crop", cat: "Company News" },
    { t: "Maritime Security: Protecting Cargo on the High Seas", s: "How modern security measures safeguard container ships against piracy and theft.", c: "Maritime security remains a critical concern for ocean freight. Diplomatic Xpress works with leading security partners to protect cargo throughout its sea journey.\n\nSecurity measures:\n- Armed escort services in high-risk waters\n- AIS tracking with deviation alerts\n- Sealed containers with tamper-proof devices\n- Vessel security assessments before loading\n- Coordination with naval forces in piracy zones\n- Regular security briefings for shipping partners\n\nHigh-risk areas in 2026:\n- Gulf of Aden (improved but still monitored)\n- Strait of Malacca\n- Gulf of Guinea\n- Parts of the South China Sea\n\nStatistics:\n- Cargo theft incidents reduced 40% through better security\n- Average claim processing time: 14 days\n- Insurance premium reduction for secure-shipped goods\n\n\"The safety of cargo and crew is paramount,\" said Maritime Security Director Captain James Wright. \"Modern technology has made sea freight safer than ever, but vigilance remains essential.\"", i: "https://images.unsplash.com/photo-1494412574643-ff11b0a5eb19?w=800&h=500&fit=crop", cat: "Safety" },
    { t: "Supply Chain Resilience: Lessons from Global Disruptions", s: "Building supply chains that can withstand earthquakes, pandemics, and geopolitical tensions.", c: "Recent years have taught us that supply chain disruptions are not a matter of if, but when. Diplomatic Xpress has developed a comprehensive resilience framework to protect our customers' supply chains.\n\nKey resilience strategies:\n1. Multi-source supplier networks\n2. Strategic buffer inventory positioning\n3. Alternative routing capabilities\n4. Real-time risk monitoring\n5. Rapid response protocols\n\nCase study — 2025 Taiwan earthquake:\n- Disrupted semiconductor supply chains for 3 weeks\n- Diplomatic Xpress rerouted 85% of affected shipments within 48 hours\n- Alternative air and sea corridors activated\n- Customer losses minimized to under 2%\n\nBuilding resilience:\n- $50 million investment in contingency infrastructure\n- Partnerships with alternative transportation providers\n- AI-powered risk prediction and early warning systems\n- Annual resilience testing and simulation exercises\n\n\"Resilience isn't built during a crisis — it's built before one,\" said Chief Risk Officer Patricia Santos.", i: "https://images.unsplash.com/photo-1504711434969-e33886168d5c?w=800&h=500&fit=crop", cat: "Industry Trends" },
    { t: "Free Trade Agreements: How They Reduce Your Shipping Costs", s: "Leveraging FTAs to minimize duties and reduce overall logistics costs.", c: "Free Trade Agreements (FTAs) between countries can significantly reduce the cost of international shipping by lowering or eliminating customs duties. Understanding and leveraging FTAs is a key strategy for cost-conscious shippers.\n\nMajor FTAs affecting logistics:\n- USMCA (US-Mexico-Canada): Duty-free for qualifying goods\n- EU Single Market: No duties within EU countries\n- RCEP (Asia-Pacific): Reduced duties across 15 countries\n- AfCFTA (Africa): Pan-African duty reductions\n- CPTPP (Pacific): Tariff reductions across 11 countries\n\nHow to benefit:\n1. Verify your product qualifies under rules of origin\n2. Obtain proper certificates of origin\n3. Include FTA documentation with every shipment\n4. Work with a knowledgeable customs broker\n\nDiplomatic Xpress FTA services:\n- Free FTA eligibility assessment\n- Certificate of origin preparation\n- Duty savings calculator\n- Compliance auditing\n\n\"Many businesses leave money on the table by not leveraging available FTAs,\" said Trade Compliance Director Maria Santos. \"Our team can identify savings opportunities for virtually every shipper.\"", i: "https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=800&h=500&fit=crop", cat: "Customs" },
    { t: "Micro-Warehousing: The Future of Urban Fulfillment", s: "Small-format warehouses in city centers are reducing delivery times to under 2 hours.", c: "Micro-warehouses — small fulfillment centers located in urban areas — are transforming last-mile delivery. Diplomatic Xpress has launched micro-warehouse operations in 8 major cities.\n\nMicro-warehouse features:\n- 5,000-15,000 sq ft (vs 500,000+ for traditional warehouses)\n- Located within city centers\n- AI-powered inventory optimization\n- Automated picking and packing\n- Integration with same-day delivery fleet\n\nBenefits:\n- Delivery times under 2 hours for urban customers\n- 40% reduction in last-mile costs\n- 60% lower carbon emissions per delivery\n- Better customer experience\n\nCities with micro-warehouses:\nLondon, New York, Tokyo, Singapore, Dubai, Paris, Sydney, Los Angeles\n\n\"Urbanization demands urban fulfillment,\" said VP of Innovation Kevin Park. \"Micro-warehouses bring products closer to customers than ever before.\"", i: "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=800&h=500&fit=crop", cat: "Technology" },
    { t: "Diplomatic Xpress Foundation: Building Schools Through Logistics", s: "For every 10,000 shipments delivered, we fund the construction of a classroom in underserved communities.", c: "Diplomatic Xpress is proud to announce that our corporate social responsibility initiative, \"Classrooms in Transit,\" has now funded the construction of 45 classrooms across 12 countries.\n\nProgram impact:\n- 45 classrooms built (target: 60 by end of 2026)\n- 3,600 students benefiting from improved facilities\n- 180 teachers trained and employed\n- 12 countries: Kenya, India, Philippines, Brazil, Colombia, Ghana, Tanzania, Indonesia, Bangladesh, Nepal, Peru, Cambodia\n\nHow it works:\n- For every 10,000 shipments delivered, Diplomatic Xpress donates $5,000 to fund classroom construction\n- Local contractors and materials are used to support communities\n- Each classroom includes desks, books, technology, and clean water access\n\n\"Education is the foundation of opportunity,\" said Foundation Director Grace Mwangi. \"Through this program, every shipment delivers more than a package — it delivers hope.\"", i: "https://images.unsplash.com/photo-1497486751825-1233686d5d80?w=800&h=500&fit=crop", cat: "Company News" },
    { t: "Warehouse Robotics: How Automated Systems Process 50,000 Packages Daily", s: "Inside our fully automated sorting facility where robots handle the heavy lifting.", c: "Diplomatic Xpress's newest distribution center in Singapore represents the cutting edge of warehouse automation. The facility can process 50,000 packages daily with minimal human intervention.\n\nAutomated systems:\n- Robotic arms for package sorting (120 picks/minute)\n- Automated guided vehicles (AGVs) for transport\n- Computer vision for quality control\n- Automated dimensioning and weighing\n- AI-powered sort optimization\n- Robotic packaging stations\n\nPerformance metrics:\n- Processing speed: 50,000 packages/day\n- Accuracy rate: 99.99%\n- Operating hours: 24/7\n- Staff required: 45 (vs 200+ for manual facility)\n- Energy consumption: 40% less than traditional facility\n\n\"Automation allows us to handle massive volumes while maintaining the highest quality standards,\" said Automation Director Dr. Wei Zhang. \"The Singapore facility is a blueprint for our future warehouses.\"", i: "https://images.unsplash.com/photo-1565891741441-64926e441838?w=800&h=500&fit=crop", cat: "Technology" },
    { t: "Holiday Stress-Free Shipping: A Week-by-Week Countdown", s: "Don't let holiday shipping sneak up on you — follow our 8-week countdown for stress-free deliveries.", c: "The holidays come every year, yet many people wait until the last minute to ship gifts. Follow Diplomatic Xpress's 8-week countdown for stress-free holiday shipping:\n\n8 weeks before: Start planning and list all recipients\n7 weeks: Order supplies and packaging materials\n6 weeks: Ship international gifts and heavy items\n5 weeks: Ship to remote destinations (Africa, South America)\n4 weeks: Ship to Asia-Pacific and Europe\n3 weeks: Ship domestic standard packages\n2 weeks: Ship domestic express packages\n1 week: Use same-day or next-day services\n\nPro tips:\n- Buy shipping supplies in bulk (save 30%)\n- Schedule pickups in advance (free with express)\n- Use Diplomatic Xpress wrapping service (free)\n- Track all packages from a single dashboard\n\n\"Planning ahead is the best gift you can give yourself during the holidays,\" said Customer Experience Director Michelle Adams.", i: "https://images.unsplash.com/photo-1549488344-1f9b8d2bd1f8?w=800&h=500&fit=crop", cat: "Logistics" },
    { t: "Diplomatic Xpress Fleet Reaches 200 Aircraft Milestone", s: "Our air cargo fleet now operates 200 aircraft, serving 340+ airports across 120+ countries.", c: "Diplomatic Xpress has reached a historic milestone with its fleet growing to 200 dedicated cargo aircraft. The fleet expansion reflects the company's aggressive growth strategy and commitment to meeting rising global demand for air freight.\n\nFleet composition:\n- Boeing 777F: 45 aircraft\n- Boeing 747-8F: 30 aircraft\n- Airbus A350F: 25 aircraft\n- Boeing 767F: 40 aircraft\n- Airbus A300-600F: 35 aircraft\n- Other types: 25 aircraft\n\nOperational statistics:\n- Daily flights: 850+\n- Annual flight hours: 1.2 million\n- Annual cargo carried: 4.5 million tons\n- Average fleet age: 6.8 years (industry average: 11.2)\n- On-time performance: 96.5%\n\n\"200 aircraft is more than a number — it represents our ability to serve customers virtually anywhere in the world,\" said CEO Marcus Reed.", i: "https://images.unsplash.com/photo-1559268950-2d7ceb2efa3c?w=800&h=500&fit=crop", cat: "Aviation" },
    { t: "Protecting Customer Data: Our Cybersecurity Framework", s: "How we safeguard customer information and shipment data in an age of increasing cyber threats.", c: "In today's digital world, cybersecurity is as important as physical cargo security. Diplomatic Xpress has implemented a comprehensive cybersecurity framework to protect customer data.\n\nSecurity measures:\n- SOC 2 Type II certified\n- End-to-end encryption for all data in transit and at rest\n- Multi-factor authentication for all user accounts\n- Real-time threat monitoring with AI-powered detection\n- Regular penetration testing by independent security firms\n- 24/7 Security Operations Center (SOC)\n- GDPR, CCPA, and POPIA compliance\n\nRecent achievements:\n- Zero data breaches in 5 years\n- ISO 27001 certification renewed\n- Bug bounty program with 500+ active researchers\n- Employee cybersecurity training completion: 100%\n\n\"Our customers trust us with their most sensitive shipments and data,\" said CISO Dr. Elena Vasquez. \"That trust must be protected with the highest security standards.\"", i: "https://images.unsplash.com/photo-1563013544-824ae1b704d3?w=800&h=500&fit=crop", cat: "Technology" },
    { t: "Cross-Border E-Commerce Logistics: Navigating Regulations", s: "A practical guide to handling customs, duties, and documentation for cross-border online sales.", c: "Cross-border e-commerce is booming, but navigating the regulatory landscape can be challenging. Diplomatic Xpress helps online retailers overcome cross-border logistics hurdles.\n\nKey regulations to understand:\n1. Import duty thresholds vary by country\n2. VAT/GST collection requirements (OSS in EU)\n3. Product safety and labeling requirements\n4. Restricted and prohibited items lists\n5. Returns processing across borders\n\nDiplomatic Xpress solutions:\n- Delivered Duty Paid (DDP) shipping service\n- Automated duty collection and remittance\n- Product classification assistance\n- Country-specific packaging and labeling\n- Cross-border returns management\n\nPopular cross-border routes:\n- US → UK, Germany, Australia, Canada\n- China → US, UK, France, Japan\n- UK → US, EU, UAE, Australia\n- Germany → US, UK, France, Netherlands\n\n\"Cross-border e-commerce doesn't have to be complicated,\" said Head of E-Commerce Rachel Wong. \"With the right logistics partner, it's seamless.\"", i: "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=800&h=500&fit=crop", cat: "Industry Trends" },
    { t: "Emergency Response Drill: 72-Hour Simulation Tests Our Readiness", s: "Inside our annual disaster response exercise — testing every aspect of our emergency logistics.", c: "Diplomatic Xpress conducted its annual 72-hour emergency response simulation, testing the company's ability to deliver humanitarian aid during a large-scale disaster scenario.\n\nSimulation details:\n- Scenario: Major earthquake affecting 3 countries\n- 500 team members participated\n- 15 aircraft deployed in the simulation\n- 200 tons of simulated relief supplies\n- 8 simulated customs clearance operations\n- 3 field warehouses activated\n\nKey takeaways:\n- Response time improved by 20% from last year\n- Communication systems performed flawlessly\n- Customs coordination was 35% faster\n- Identified 3 areas for improvement\n- New rapid deployment protocols validated\n\n\"Simulation is the best way to prepare for reality,\" said Emergency Operations Director David Park. \"Every drill makes us faster and more effective.\"", i: "https://images.unsplash.com/photo-1590073844006-3337973c310b?w=800&h=500&fit=crop", cat: "Safety" },
    { t: "The Future of Packaging: Sustainable Materials Taking Over", s: "From mushroom packaging to seaweed wraps — how the packaging industry is going green.", c: "Sustainable packaging is no longer a niche — it's becoming the industry standard. Diplomatic Xpress has committed to 100% sustainable packaging across all services by 2028.\n\nInnovative sustainable materials:\n- Mushroom-based packaging (mycelium foam)\n- Seaweed-based wrapping films\n- Corrugated cardboard with 90% recycled content\n- Plant-based ink for all printed materials\n- Compostable air pillows\n- Bamboo fiber packaging\n\nOur sustainable packaging journey:\n- 2024: 30% sustainable packaging adoption\n- 2025: 60% adoption across all services\n- 2026: 80% adoption (current)\n- 2027: 95% adoption target\n- 2028: 100% sustainable packaging\n\nCustomer response:\n- 78% of customers prefer sustainable packaging\n- 45% willing to pay a small premium for eco-friendly options\n- 92% customer satisfaction with new packaging\n\n\"The packaging industry is undergoing its biggest transformation in a century,\" said Sustainability Director James Park.", i: "https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?w=800&h=500&fit=crop", cat: "Sustainability" },
    { t: "How to Reduce Shipping Costs Without Sacrificing Speed", s: "Practical strategies to optimize your logistics spend while maintaining delivery performance.", c: "Reducing shipping costs doesn't always mean accepting slower delivery. Diplomatic Xpress shares strategies to optimize your logistics spend.\n\nCost reduction strategies:\n1. Consolidate shipments (combine small packages)\n2. Use zone skipping for domestic routes\n3. Negotiate volume-based contracts\n4. Optimize packaging dimensions (dimensional weight)\n5. Choose the right service level (not everything needs express)\n6. Use hybrid services (air + ground combinations)\n7. Ship during off-peak periods when possible\n\nPotential savings:\n- Shipment consolidation: 20-35% savings\n- Dimensional weight optimization: 15-25% savings\n- Volume contracts: 10-20% savings\n- Hybrid services: 25-40% savings vs pure express\n\nDiplomatic Xpress tools:\n- Free shipping cost calculator\n- Account manager consultation for volume shippers\n- Automated service level recommendations\n- Monthly spend analysis and optimization suggestions\n\n\"Most shippers can save 20-30% without any change in delivery speed,\" said VP of Sales Maria Torres. \"It's about shipping smarter, not just cheaper.\"", i: "https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?w=800&h=500&fit=crop", cat: "Logistics" },
    { t: "Global Trade Outlook 2026: What Logistics Professionals Need to Know", s: "Key trends, challenges, and opportunities shaping international trade this year.", c: "The global trade landscape in 2026 presents both challenges and opportunities for logistics professionals. Here's our comprehensive outlook:\n\nPositive trends:\n- Global trade volume expected to grow 3.2%\n- Digital customs processing expanding to 50+ countries\n- New trade corridors opening (Central Asia, East Africa)\n- Technology investment at record levels\n\nChallenges:\n- Geopolitical tensions affecting certain routes\n- Capacity constraints in air and ocean freight\n- Labor shortages in warehousing and trucking\n- Rising fuel costs and environmental regulations\n\nKey opportunities:\n- E-commerce logistics in emerging markets\n- Green logistics and carbon-neutral shipping\n- AI and automation in supply chain management\n- Nearshoring and supply chain diversification\n\n\"2026 will be a year of transformation for global trade,\" said Chief Strategy Officer Lisa Morgan. \"Companies that adapt to new realities will thrive.\"", i: "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=800&h=500&fit=crop", cat: "Industry Trends" },
    { t: "Diplomatic Xpress Mobile App Reaches 3 Million Downloads", s: "Our mobile app continues to grow with new features and an enhanced user experience.", c: "The Diplomatic Xpress mobile app has reached 3 million downloads across iOS and Android platforms. The app provides customers with complete logistics management at their fingertips.\n\nApp features:\n- Real-time shipment tracking with push notifications\n- Photo proof of delivery\n- Digital customs documentation\n- Instant rate quotes\n- Pickup scheduling\n- Invoice management\n- Customer support chat\n- Biometric login (fingerprint/face ID)\n\nDownload stats:\n- iOS: 1.8 million downloads (4.8 star rating)\n- Android: 1.2 million downloads (4.7 star rating)\n- Active monthly users: 850,000\n- Average session time: 4.2 minutes\n- App store ranking: Top 10 in Business category\n\nNew features coming soon:\n- Augmented reality package measurement\n- Voice-activated tracking\n- Integration with smart home devices\n- Group tracking for team shipments\n\n\"Our app is the fastest way to manage your shipments,\" said Mobile Product Director Alex Kim.", i: "https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?w=800&h=500&fit=crop", cat: "Technology" },
    { t: "Employee Wellness: How We Support Our 15,000 Team Members", s: "Health programs, flexible scheduling, and mental health support — our approach to employee wellness.", c: "Diplomatic Xpress believes that healthy, happy employees deliver exceptional service. Our comprehensive wellness program supports 15,000 team members across 40 countries.\n\nWellness initiatives:\n- Comprehensive health insurance for all employees\n- Mental health support and counseling services\n- On-site fitness facilities at 25 major facilities\n- Flexible scheduling options for eligible roles\n- Annual wellness stipend ($500 per employee)\n- Parental leave: 16 weeks (all parents)\n- Employee assistance program (24/7 hotline)\n\nImpact:\n- Employee satisfaction: 4.6/5 (annual survey)\n- Turnover rate: 8% (industry average: 22%)\n- Absenteeism reduced by 35%\n- 12,000+ employees used wellness programs in 2025\n\n\"Our people are our greatest asset,\" said CHRO Dr. Rebecca Adams. \"Investing in their wellbeing is investing in our company's future.\"", i: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&h=500&fit=crop", cat: "Company News" },
  ];

  const insertMany = db.transaction(() => {
    for (const n of seedNews) {
      insertNews.run(n.t, n.s, n.c, n.i, n.cat);
    }
  });
  insertMany();
  console.log(`Seeded ${seedNews.length} news articles`);
}

// Seed default admin
const seedAdmin = () => {
  const adminUser = db.prepare("SELECT * FROM users WHERE username = ?").get("admin");
  if (!adminUser) {
    db.prepare("INSERT INTO users (username, email, password, role) VALUES (?, ?, ?, ?)").run(
      "admin",
      "admin12345@gmail.com",
      "admin12345",
      "admin"
    );
    console.log("Admin user seeded successfully.");
  }
};
seedAdmin();

// Auth endpoints
app.post("/api/auth/signup", (req, res) => {
  try {
    const { username, email, password, role } = req.body;
    if (!username || !password) return res.status(400).json({ error: "Username and password are required" });

    const stmt = db.prepare("INSERT INTO users (username, email, password, role) VALUES (?, ?, ?, ?)");
    const info = stmt.run(username, email || null, password, role || 'user');
    logAction(username, "Signup", `New user registered with email: ${email || 'none'}`);
    res.status(201).json({ id: info.lastInsertRowid, username, email, role: role || 'user' });
  } catch (err: any) {
    if (err.message.includes("UNIQUE constraint failed")) {
      return res.status(400).json({ error: "Username already exists" });
    }
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/auth/login", (req, res) => {
  const { username, password } = req.body;
  const user = db.prepare("SELECT * FROM users WHERE (username = ? OR email = ?) AND password = ?")
    .get(username, username, password) as any;

  if (user) {
    const { password: _, ...userWithoutPassword } = user;
    logAction(user.username, "Login", `User logged into the system`);
    res.json(userWithoutPassword);
  } else {
    res.status(401).json({ error: "Invalid credentials" });
  }
});

// Admin verification helper
const verifyAdmin = (req: express.Request) => {
  const username = req.body?.admin_user || req.query?.admin_user || req.headers['x-admin-user'];
  const adminSecret = req.headers['x-admin-secret'] as string;
  
  console.log(`[Auth] Verifying admin: username=${username}, secret_provided=${!!adminSecret}`);

  if (ADMIN_SECRET && ADMIN_SECRET !== "") {
    if (!adminSecret) {
      console.log("[Auth] Admin verification failed: No secret provided in headers");
      return false;
    }
    
    const trimmedProvided = adminSecret.trim();
    if (trimmedProvided !== ADMIN_SECRET) {
      console.log(`[Auth] Admin verification failed: Secret mismatch.`);
      console.log(`[Auth] Provided length: ${trimmedProvided.length}, Expected length: ${ADMIN_SECRET.length}`);
      
      // Log first and last chars for debugging (safely)
      if (trimmedProvided.length > 0 && ADMIN_SECRET.length > 0) {
        console.log(`[Auth] Debug: Provided starts with '${trimmedProvided[0]}' ends with '${trimmedProvided[trimmedProvided.length-1]}'`);
        console.log(`[Auth] Debug: Expected starts with '${ADMIN_SECRET[0]}' ends with '${ADMIN_SECRET[ADMIN_SECRET.length-1]}'`);
      }
      
      // Check for common issues
      if (trimmedProvided.toLowerCase() === ADMIN_SECRET.toLowerCase()) {
        console.log(`[Auth] Debug: Secrets match if case-insensitive. Check case.`);
      }
      
      return false;
    }
  }

  if (!username) {
    console.log("[Auth] Admin verification failed: No username provided");
    return false;
  }

  try {
    const user = db.prepare("SELECT * FROM users WHERE username = ? AND role = 'admin'").get(username as string) as any;
    if (!user) {
      console.log(`[Auth] Admin verification failed: User '${username}' not found or not admin in database`);
      return false;
    }
    console.log(`[Auth] Admin verification successful for user: ${username}`);
    return true;
  } catch (err) {
    console.error("[Auth] Database error in verifyAdmin:", err);
    return false;
  }
};

// Logging helper
const logAction = (username: string, action: string, details: string | null = null) => {
  db.prepare("INSERT INTO activity_logs (username, action, details) VALUES (?, ?, ?)").run(username, action, details);
};

// Multer setup - Cloudinary for production, local for development
let storage;
if (process.env.CLOUDINARY_CLOUD_NAME || process.env.CLOUDINARY_URL) {
  console.log("Using Cloudinary for file storage");
  storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: async (req, file) => ({
      folder: "diplomatic-express",
      format: file.mimetype.split("/")[1],
      public_id: `${Date.now()}-${file.originalname.split(".")[0]}`,
    }),
  });
} else {
  console.log("Using local disk for file storage");
  storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`)
  });
}
const upload = multer({ storage });

// API Routes
app.get("/api/users", (req, res) => {
  if (!verifyAdmin(req)) {
    console.log(`[API] 403 Unauthorized for ${req.url}`);
    return res.status(403).json({ error: "Unauthorized" });
  }
  const users = db.prepare("SELECT id, username, email, role FROM users").all();
  res.json(users);
});

app.get("/api/admin/verify", (req, res) => {
  if (verifyAdmin(req)) {
    res.json({ success: true, message: "Admin secret verified successfully." });
  } else {
    res.status(403).json({ success: false, error: "Admin secret verification failed." });
  }
});

app.get("/api/admin/logs", (req, res) => {
  if (!verifyAdmin(req)) {
    console.log(`[API] 403 Unauthorized for ${req.url}`);
    return res.status(403).json({ error: "Unauthorized" });
  }
  const logs = db.prepare("SELECT * FROM activity_logs ORDER BY timestamp DESC LIMIT 100").all();
  res.json(logs);
});

app.get("/api/shipments", (req, res) => {
  const { customer_name, status } = req.query;
  let sql = "SELECT * FROM shipments WHERE 1=1";
  const params: any[] = [];

  if (customer_name) {
    sql += " AND customer_name = ?";
    params.push(customer_name);
  }
  if (status) {
    sql += " AND status = ?";
    params.push(status);
  }

  sql += " ORDER BY created_at DESC";
  const shipments = db.prepare(sql).all(...params);
  res.json(shipments.map((s: any) => ({
    ...s,
    product_photos: s.product_photos ? JSON.parse(s.product_photos) : []
  })));
});

app.post("/api/shipments", upload.fields([
  { name: 'client_photo', maxCount: 1 },
  { name: 'product_photos', maxCount: 5 }
]), (req, res) => {
  console.log("POST /api/shipments - Request received");
  
  if (!verifyAdmin(req)) {
    console.log("POST /api/shipments - Admin verification failed");
    return res.status(403).json({ error: "Unauthorized" });
  }

  const { id, customer_name, client_phone, origin, destination, admin_user, status, weight, dimensions, estimated_delivery, shipping_cost, content_description } = req.body;
  
  if (!id || !customer_name || !origin || !destination) {
    console.log("POST /api/shipments - Missing required fields", { id, customer_name, origin, destination });
    return res.status(400).json({ error: "Missing required fields (ID, Customer Name, Origin, Destination)" });
  }

  const files = req.files as { [fieldname: string]: Express.Multer.File[] };
  
  try {
    const client_photo_url = files?.['client_photo'] ? (files['client_photo'][0] as any).path || `/uploads/${files['client_photo'][0].filename}` : null;
    const product_photo_urls = files?.['product_photos'] ? files['product_photos'].map(f => (f as any).path || `/uploads/${f.filename}`) : [];

    console.log(`POST /api/shipments - Inserting shipment ${id}`);
    
    db.prepare(`
      INSERT INTO shipments (id, customer_name, client_phone, client_photo_url, origin, destination, status, product_photos, weight, dimensions, estimated_delivery, shipping_cost, content_description)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, customer_name, client_phone || null, client_photo_url, origin, destination, status || 'Warehouse', JSON.stringify(product_photo_urls), weight || null, dimensions || null, estimated_delivery || null, shipping_cost || null, content_description || null);

    if (admin_user) logAction(admin_user, `Created shipment ${id}`);
    
    wss.clients.forEach(client => {
      if (client.readyState === 1) client.send(JSON.stringify({ type: "SHIPMENT_UPDATE", data: { id, action: "CREATE" } }));
    });

    console.log(`POST /api/shipments - Shipment ${id} created successfully`);
    res.status(201).json({ id });
  } catch (err: any) {
    console.error("POST /api/shipments - Error:", err);
    res.status(400).json({ error: err.message });
  }
});

app.get("/api/shipments/:id", (req, res) => {
  const shipment = db.prepare("SELECT * FROM shipments WHERE id = ?").get(req.params.id) as any;
  if (!shipment) return res.status(404).json({ error: "Shipment not found" });
  
  const updates = db.prepare("SELECT * FROM shipment_updates WHERE shipment_id = ? ORDER BY timestamp DESC").all(req.params.id);
  res.json({ 
    ...shipment, 
    product_photos: shipment.product_photos ? JSON.parse(shipment.product_photos) : [],
    updates 
  });
});

app.put("/api/shipments/:id", (req, res) => {
  console.log(`PUT /api/shipments/${req.params.id} - Request received`);
  if (!verifyAdmin(req)) {
    console.log(`PUT /api/shipments/${req.params.id} - Admin verification failed`);
    return res.status(403).json({ error: "Unauthorized" });
  }
  const { customer_name, client_phone, origin, destination, admin_user, weight, dimensions, estimated_delivery, shipping_cost, content_description } = req.body;

  try {
    console.log(`PUT /api/shipments/${req.params.id} - Updating shipment details`);
    db.prepare(`
      UPDATE shipments SET customer_name = ?, client_phone = ?, origin = ?, destination = ?, weight = ?, dimensions = ?, estimated_delivery = ?, shipping_cost = ?, content_description = ? WHERE id = ?
    `).run(customer_name, client_phone, origin, destination, weight || null, dimensions || null, estimated_delivery || null, shipping_cost || null, content_description || null, req.params.id);

    if (admin_user) logAction(admin_user, `Edited shipment ${req.params.id}`);
    
    console.log(`PUT /api/shipments/${req.params.id} - Shipment updated successfully`);
    res.json({ success: true });
  } catch (err: any) {
    console.error(`PUT /api/shipments/${req.params.id} - Error:`, err);
    res.status(400).json({ error: err.message });
  }
});

app.post("/api/shipments/:id/updates", upload.single("photo"), (req, res) => {
  console.log(`POST /api/shipments/${req.params.id}/updates - Request received`);
  if (!verifyAdmin(req)) {
    console.log(`POST /api/shipments/${req.params.id}/updates - Admin verification failed`);
    return res.status(403).json({ error: "Unauthorized" });
  }
  const { status, location, notes, admin_user, payment_methods, customs_amount, customs_currency } = req.body;

  const photo_url = req.file ? (req.file as any).path || `/uploads/${req.file.filename}` : null;
  
  try {
    console.log(`POST /api/shipments/${req.params.id}/updates - Inserting update record`);
    db.prepare(`
      INSERT INTO shipment_updates (shipment_id, status, location, photo_url, notes)
      VALUES (?, ?, ?, ?, ?)
    `).run(req.params.id, status, location || null, photo_url, notes || null);

    let updateSql = "UPDATE shipments SET status = ?";
    const params: any[] = [status];
    if (payment_methods) {
      updateSql += ", payment_methods = ?";
      params.push(payment_methods);
    }
    if (customs_amount !== undefined && customs_amount !== null && customs_amount !== "") {
      updateSql += ", customs_amount = ?";
      params.push(customs_amount);
    }
    if (customs_currency !== undefined && customs_currency !== null && customs_currency !== "") {
      updateSql += ", customs_currency = ?";
      params.push(customs_currency);
    }
    updateSql += " WHERE id = ?";
    params.push(req.params.id);
    
    console.log(`POST /api/shipments/${req.params.id}/updates - Updating shipment status`);
    db.prepare(updateSql).run(...params);

    if (admin_user) logAction(admin_user, `Updated shipment ${req.params.id} to ${status}`);

    wss.clients.forEach(client => {
      if (client.readyState === 1) client.send(JSON.stringify({ type: "SHIPMENT_UPDATE", data: { id: req.params.id, action: "UPDATE" } }));
    });

    console.log(`POST /api/shipments/${req.params.id}/updates - Update successful`);
    res.status(201).json({ success: true });
  } catch (err: any) {
    console.error(`POST /api/shipments/${req.params.id}/updates - Error:`, err);
    res.status(400).json({ error: err.message });
  }
});

app.delete("/api/shipments/:id", (req, res) => {
  if (!verifyAdmin(req)) return res.status(403).json({ error: "Unauthorized" });
  const { admin_user } = req.query;

  db.prepare("DELETE FROM shipment_updates WHERE shipment_id = ?").run(req.params.id);
  db.prepare("DELETE FROM shipments WHERE id = ?").run(req.params.id);

  if (admin_user) logAction(admin_user as string, `Deleted shipment ${req.params.id}`);
  res.json({ success: true });
});

// Ticket Routes
app.get("/api/tickets", (req, res) => {
  const { email } = req.query;
  let sql = "SELECT * FROM tickets WHERE 1=1";
  const params = [];
  if (email) {
    sql += " AND customer_email = ?";
    params.push(email);
  }
  sql += " ORDER BY created_at DESC";
  res.json(db.prepare(sql).all(...params));
});

app.post("/api/tickets", (req, res) => {
  const { customer_email, subject, message } = req.body;
  const info = db.prepare("INSERT INTO tickets (customer_email, subject, message) VALUES (?, ?, ?)").run(customer_email, subject, message);

  // Broadcast new ticket via WebSocket
  const ticketData = { id: info.lastInsertRowid, customer_email, subject, message, status: "Open", created_at: new Date().toISOString() };
  wss.clients.forEach(client => {
    if (client.readyState === 1) client.send(JSON.stringify({ type: "NEW_TICKET", data: ticketData }));
  });

  res.status(201).json({ id: info.lastInsertRowid });
});

app.get("/api/tickets/:id/replies", (req, res) => {
  res.json(db.prepare("SELECT * FROM ticket_replies WHERE ticket_id = ? ORDER BY timestamp ASC").all(req.params.id));
});

app.post("/api/tickets/:id/replies", upload.single("image"), (req, res) => {
  const { sender_username, message } = req.body;
  const image_url = req.file ? (req.file as any).path || `/uploads/${req.file.filename}` : null;
  const info = db.prepare("INSERT INTO ticket_replies (ticket_id, sender_username, message, image_url) VALUES (?, ?, ?, ?)").run(req.params.id, sender_username, message || null, image_url);

  // Broadcast ticket reply via WebSocket with the inserted id for deduplication
  const replyData = { id: info.lastInsertRowid, ticket_id: Number(req.params.id), sender_username, message: message || null, image_url };
  wss.clients.forEach(client => {
    if (client.readyState === 1) client.send(JSON.stringify({ type: "TICKET_REPLY", data: replyData }));
  });

  res.status(201).json({ success: true, id: info.lastInsertRowid, image_url });
});

app.patch("/api/tickets/:id", (req, res) => {
  const { status } = req.body;
  if (!status) return res.status(400).json({ error: "Status is required" });
  db.prepare("UPDATE tickets SET status = ? WHERE id = ?").run(status, req.params.id);

  // Broadcast ticket update via WebSocket
  wss.clients.forEach(client => {
    if (client.readyState === 1) client.send(JSON.stringify({ type: "NEW_TICKET", data: { id: Number(req.params.id), status } }));
  });

  res.json({ success: true });
});

// Flight Routes
app.get("/api/flights", (req, res) => {
  const { origin, destination } = req.query;
  let sql = "SELECT * FROM flights WHERE 1=1";
  const params = [];
  if (origin) { sql += " AND origin = ?"; params.push(origin); }
  if (destination) { sql += " AND destination = ?"; params.push(destination); }
  sql += " ORDER BY departure_time ASC";
  res.json(db.prepare(sql).all(...params));
});

app.post("/api/flights", (req, res) => {
  if (!verifyAdmin(req)) return res.status(403).json({ error: "Unauthorized" });
  const { airline, flight_number, origin, destination, departure_time, arrival_time, price, available_seats, admin_user } = req.body;
  
  const info = db.prepare(`
    INSERT INTO flights (airline, flight_number, origin, destination, departure_time, arrival_time, price, available_seats)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(airline, flight_number, origin, destination, departure_time, arrival_time, Number(price), Number(available_seats || 100));

  if (admin_user) logAction(admin_user, `Added flight ${flight_number}`);
  res.status(201).json({ id: info.lastInsertRowid });
});

app.get("/api/flights/track/:flightNumber", (req, res) => {
  const flight = db.prepare("SELECT * FROM flights WHERE flight_number = ?").get(req.params.flightNumber) as any;
  if (!flight) return res.status(404).json({ error: "Flight not found" });
  const updates = db.prepare("SELECT * FROM flight_updates WHERE flight_id = ? ORDER BY timestamp DESC").all(flight.id);
  res.json({ ...flight, updates });
});

app.post("/api/flights/:id/updates", (req, res) => {
  if (!verifyAdmin(req)) return res.status(403).json({ error: "Unauthorized" });
  const { status, location, notes, admin_user } = req.body;
  db.prepare("INSERT INTO flight_updates (flight_id, status, location, notes) VALUES (?, ?, ?, ?)").run(req.params.id, status, location || null, notes || null);
  db.prepare("UPDATE flights SET status = ? WHERE id = ?").run(status, req.params.id);
  if (admin_user) logAction(admin_user, `Updated flight ${req.params.id} to ${status}`);
  res.status(201).json({ success: true });
});

app.post("/api/flights/:id/book", (req, res) => {
  const { user_id, passenger_name, passport_number, cabin_class, airline, flight_number, origin, destination, departure_time, arrival_time, price, duration_minutes, distance_km } = req.body;

  const flight = db.prepare("SELECT * FROM flights WHERE id = ?").get(req.params.id) as any;
  if (flight) {
    if (flight.available_seats <= 0) return res.status(400).json({ error: "Flight not available" });
    db.prepare("UPDATE flights SET available_seats = available_seats - 1 WHERE id = ?").run(req.params.id);
  }

  const flightIdForDb = flight ? req.params.id : null;

  try {
    db.prepare("INSERT INTO bookings (flight_id, user_id, passenger_name, passport_number, cabin_class, payment_status, airline, flight_number, origin, destination, departure_time, arrival_time, price, duration_minutes, distance_km) VALUES (?, ?, ?, ?, ?, 'pending', ?, ?, ?, ?, ?, ?, ?, ?, ?)").run(
      flightIdForDb, user_id, passenger_name, passport_number || null, cabin_class || "economy",
      airline || null, flight_number || null, origin || null, destination || null,
      departure_time || null, arrival_time || null, price || 0, duration_minutes || 0, distance_km || 0
    );
    res.status(201).json({ success: true });
  } catch (err: any) {
    console.error("Book flight error:", err);
    res.status(400).json({ error: err.message });
  }
});

app.get("/api/my-bookings/:userId", (req, res) => {
  const bookings = db.prepare(`
    SELECT b.* FROM bookings b WHERE b.user_id = ?
  `).all(req.params.userId);
  res.json(bookings);
});

app.delete("/api/flights/:id", (req, res) => {
  if (!verifyAdmin(req)) return res.status(403).json({ error: "Unauthorized" });
  db.prepare("DELETE FROM flight_updates WHERE flight_id = ?").run(req.params.id);
  db.prepare("DELETE FROM flights WHERE id = ?").run(req.params.id);
  res.json({ success: true });
});

app.get("/api/admin/bookings", (req, res) => {
  if (!verifyAdmin(req)) return res.status(403).json({ error: "Unauthorized" });
  const bookings = db.prepare("SELECT b.*, u.username FROM bookings b LEFT JOIN users u ON b.user_id = u.id ORDER BY b.booking_date DESC").all();
  res.json(bookings);
});

app.patch("/api/admin/bookings/:id/approve", (req, res) => {
  if (!verifyAdmin(req)) return res.status(403).json({ error: "Unauthorized" });
  const booking = db.prepare("SELECT * FROM bookings WHERE id = ?").get(req.params.id) as any;
  db.prepare("UPDATE bookings SET payment_status = 'confirmed' WHERE id = ?").run(req.params.id);
  if (booking) {
    wss.clients.forEach(client => {
      if (client.readyState === 1) client.send(JSON.stringify({ type: "BOOKING_APPROVED", data: { ...booking, payment_status: "confirmed" } }));
    });
  }
  const admin_user = req.headers["x-admin-user"] as string;
  if (admin_user) logAction(admin_user, `Approved booking #${req.params.id}`);
  res.json({ success: true });
});

app.patch("/api/admin/bookings/:id/reject", (req, res) => {
  if (!verifyAdmin(req)) return res.status(403).json({ error: "Unauthorized" });
  const booking = db.prepare("SELECT * FROM bookings WHERE id = ?").get(req.params.id) as any;
  db.prepare("UPDATE bookings SET payment_status = 'rejected' WHERE id = ?").run(req.params.id);
  if (booking) {
    wss.clients.forEach(client => {
      if (client.readyState === 1) client.send(JSON.stringify({ type: "BOOKING_REJECTED", data: { ...booking, payment_status: "rejected" } }));
    });
  }
  const admin_user = req.headers["x-admin-user"] as string;
  if (admin_user) logAction(admin_user, `Rejected booking #${req.params.id}`);
  res.json({ success: true });
});

app.get("/api/admin/setup-check", (req, res) => {
  if (!verifyAdmin(req)) return res.status(403).json({ error: "Unauthorized" });
  res.json({ firebase_active: false, sqlite_active: true, message: "Using SQLite for data persistence." });
});

app.get("/api/settings/payment-account", (_req, res) => {
  const row = db.prepare("SELECT value FROM settings WHERE key = 'payment_account'").get() as any;
  res.json(row ? JSON.parse(row.value) : {});
});

app.put("/api/settings/payment-account", (req, res) => {
  if (!verifyAdmin(req)) return res.status(403).json({ error: "Unauthorized" });
  const value = JSON.stringify(req.body);
  db.prepare("INSERT INTO settings (key, value, updated_at) VALUES ('payment_account', ?, datetime('now')) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at").run(value);
  const admin_user = req.headers["x-admin-user"] as string;
  if (admin_user) logAction(admin_user, "Updated payment account settings");
  res.json({ success: true });
});

app.delete("/api/settings/payment-account", (req, res) => {
  if (!verifyAdmin(req)) return res.status(403).json({ error: "Unauthorized" });
  db.prepare("DELETE FROM settings WHERE key = 'payment_account'").run();
  const admin_user = req.headers["x-admin-user"] as string;
  if (admin_user) logAction(admin_user, "Removed payment account settings");
  res.json({ success: true });
});

app.post("/api/shipments/:id/payment-proof", upload.single("proof"), (req, res) => {
  const { username } = req.body;
  if (!username) return res.status(400).json({ error: "Username is required" });

  const shipment = db.prepare("SELECT * FROM shipments WHERE id = ?").get(req.params.id) as any;
  if (!shipment) return res.status(404).json({ error: "Shipment not found" });

  const proof_url = req.file ? (req.file as any).path || `/uploads/${req.file.filename}` : null;
  if (!proof_url) return res.status(400).json({ error: "Proof file is required" });

  db.prepare("UPDATE shipments SET payment_proof_url = ?, payment_confirmed = 0 WHERE id = ?").run(proof_url, req.params.id);

  logAction(username, `Uploaded payment proof for shipment ${req.params.id}`);

  wss.clients.forEach(client => {
    if (client.readyState === 1) client.send(JSON.stringify({ type: "SHIPMENT_UPDATE", data: { id: req.params.id, action: "PAYMENT_PROOF" } }));
  });

  res.json({ success: true, proof_url });
});

app.patch("/api/shipments/:id/confirm-payment", (req, res) => {
  if (!verifyAdmin(req)) return res.status(403).json({ error: "Unauthorized" });

  const shipment = db.prepare("SELECT * FROM shipments WHERE id = ?").get(req.params.id) as any;
  if (!shipment) return res.status(404).json({ error: "Shipment not found" });

  db.prepare("UPDATE shipments SET payment_confirmed = 1 WHERE id = ?").run(req.params.id);

  const admin_user = req.headers["x-admin-user"] as string || req.body?.admin_user;
  if (admin_user) logAction(admin_user, `Confirmed payment for shipment ${req.params.id}`);

  wss.clients.forEach(client => {
    if (client.readyState === 1) client.send(JSON.stringify({ type: "SHIPMENT_UPDATE", data: { id: req.params.id, action: "PAYMENT_CONFIRMED" } }));
  });

  res.json({ success: true });
});

app.patch("/api/shipments/:id/reject-payment", (req, res) => {
  if (!verifyAdmin(req)) return res.status(403).json({ error: "Unauthorized" });

  const shipment = db.prepare("SELECT * FROM shipments WHERE id = ?").get(req.params.id) as any;
  if (!shipment) return res.status(404).json({ error: "Shipment not found" });

  db.prepare("UPDATE shipments SET payment_proof_url = NULL, payment_confirmed = 0 WHERE id = ?").run(req.params.id);

  const admin_user = req.headers["x-admin-user"] as string || req.body?.admin_user;
  if (admin_user) logAction(admin_user, `Rejected payment proof for shipment ${req.params.id}`);

  wss.clients.forEach(client => {
    if (client.readyState === 1) client.send(JSON.stringify({ type: "SHIPMENT_UPDATE", data: { id: req.params.id, action: "PAYMENT_REJECTED" } }));
  });

  res.json({ success: true });
});

app.post("/api/shipments/:id/claim", (req, res) => {
  const { username } = req.body;
  if (!username) return res.status(400).json({ error: "Username is required" });

  const shipment = db.prepare("SELECT * FROM shipments WHERE id = ?").get(req.params.id) as any;
  if (!shipment) return res.status(404).json({ error: "Shipment not found" });

  if (shipment.claimed_by) {
    if (shipment.claimed_by === username) {
      return res.status(200).json({ message: "You have already claimed this shipment" });
    }
    return res.status(400).json({ error: "This shipment has already been claimed by another user" });
  }

  db.prepare("UPDATE shipments SET claimed_by = ? WHERE id = ?").run(username, req.params.id);
  
  // Log the action
  logAction("System", `Shipment ${req.params.id} claimed by ${username}`);

  res.json({ success: true });
});

// News Routes
app.get("/api/news", (req, res) => {
  const { category } = req.query;
  let sql = "SELECT * FROM news WHERE is_published = 1";
  const params: any[] = [];
  if (category && category !== "All") {
    sql += " AND category = ?";
    params.push(category);
  }
  sql += " ORDER BY created_at DESC";
  res.json(db.prepare(sql).all(...params));
});

app.get("/api/news/all", (req, res) => {
  if (!verifyAdmin(req)) return res.status(403).json({ error: "Unauthorized" });
  res.json(db.prepare("SELECT * FROM news ORDER BY created_at DESC").all());
});

app.post("/api/news", upload.single("image"), (req, res) => {
  if (!verifyAdmin(req)) return res.status(403).json({ error: "Unauthorized" });
  const { title, summary, content, category, is_published } = req.body;
  if (!title || !content) return res.status(400).json({ error: "Title and content are required" });
  const image_url = req.file ? (req.file as any).path || `/uploads/${req.file.filename}` : null;
  const info = db.prepare("INSERT INTO news (title, summary, content, image_url, category, is_published) VALUES (?, ?, ?, ?, ?, ?)").run(
    title, summary || null, content, image_url, category || "General", is_published !== undefined ? Number(is_published) : 1
  );
  const admin_user = req.headers["x-admin-user"] as string;
  if (admin_user) logAction(admin_user, `Created news: ${title}`);
  res.status(201).json({ id: info.lastInsertRowid });
});

app.put("/api/news/:id", upload.single("image"), (req, res) => {
  if (!verifyAdmin(req)) return res.status(403).json({ error: "Unauthorized" });
  const { title, summary, content, category, is_published } = req.body;
  const image_url = req.file ? (req.file as any).path || `/uploads/${req.file.filename}` : null;
  let sql = "UPDATE news SET title = ?, summary = ?, content = ?, category = ?, is_published = ?";
  const params: any[] = [title, summary || null, content, category || "General", is_published !== undefined ? Number(is_published) : 1];
  if (image_url) { sql += ", image_url = ?"; params.push(image_url); }
  sql += " WHERE id = ?";
  params.push(req.params.id);
  db.prepare(sql).run(...params);
  const admin_user = req.headers["x-admin-user"] as string;
  if (admin_user) logAction(admin_user, `Updated news #${req.params.id}`);
  res.json({ success: true });
});

app.delete("/api/news/:id", (req, res) => {
  if (!verifyAdmin(req)) return res.status(403).json({ error: "Unauthorized" });
  db.prepare("DELETE FROM news WHERE id = ?").run(req.params.id);
  const admin_user = req.headers["x-admin-user"] as string || req.query.admin_user as string;
  if (admin_user) logAction(admin_user, `Deleted news #${req.params.id}`);
  res.json({ success: true });
});

// OG Image endpoint - generates a branded PNG for social media previews
let cachedOGImage: Buffer | null = null;
app.get("/og-image.png", (_req, res) => {
  if (!cachedOGImage) cachedOGImage = generateOGImagePNG();
  res.set("Content-Type", "image/png");
  res.set("Cache-Control", "public, max-age=86400");
  res.send(cachedOGImage);
});

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", persistence: "sqlite" });
});

// API 404 handler - catches unmatched /api routes before they fall through to SPA fallback
app.all("/api/*", (req, res) => {
  res.status(404).json({ error: `API route not found: ${req.method} ${req.url}` });
});

// Vite middleware
// Database cleanup routine - Only cleans activity logs and orphaned records
const cleanupOldData = () => {
  console.log("[Maintenance] Running data retention cleanup...");
  try {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    
    // Only clean activity logs older than 30 days
    const logResult = db.prepare("DELETE FROM activity_logs WHERE timestamp < ?").run(thirtyDaysAgo);

    // Clean any orphaned updates (updates whose parent shipment/flight was deleted by admin)
    const orphanedUpdates = db.prepare("DELETE FROM shipment_updates WHERE shipment_id NOT IN (SELECT id FROM shipments)").run();
    const orphanedFlightUpdates = db.prepare("DELETE FROM flight_updates WHERE flight_id NOT IN (SELECT id FROM flights)").run();

    console.log(`[Maintenance] Cleanup complete.`);
    console.log(`- Old Logs: ${logResult.changes}`);
    console.log(`- Orphaned Records: ${orphanedUpdates.changes + orphanedFlightUpdates.changes}`);
  } catch (err) {
    console.error("[Maintenance] Cleanup error:", err);
  }
};

// Start server
async function startServer() {
  // Run initial cleanup
  cleanupOldData();
  // Schedule cleanup every 30 days
  setInterval(cleanupOldData, 30 * 24 * 60 * 60 * 1000);

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static("dist"));

    app.get("*", (req, res) => res.sendFile(path.resolve("dist/index.html")));
  }

  server.listen(Number(PORT), "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || "development"}`);
  });
}

// Start the server - always run for Railway compatibility
startServer();

// Export for Netlify Functions
export const handler = serverless(app);

// Global error handler to ensure JSON responses - must be LAST
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error("Global Error Handler:", err);
  res.status(err.status || 500).json({ 
    error: err.message || "Internal Server Error"
  });
});
