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

dotenv.config();

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
    booking_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(flight_id) REFERENCES flights(id)
  );

  CREATE TABLE IF NOT EXISTS activity_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT,
    action TEXT,
    details TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

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
// Migrate old bookings with status 'Confirmed' to payment_status 'confirmed'
db.prepare("UPDATE bookings SET payment_status = 'confirmed' WHERE status = 'Confirmed' AND payment_status = 'pending'").run();

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
  const { status, location, notes, admin_user, payment_methods } = req.body;

  const photo_url = req.file ? (req.file as any).path || `/uploads/${req.file.filename}` : null;
  
  try {
    console.log(`POST /api/shipments/${req.params.id}/updates - Inserting update record`);
    db.prepare(`
      INSERT INTO shipment_updates (shipment_id, status, location, photo_url, notes)
      VALUES (?, ?, ?, ?, ?)
    `).run(req.params.id, status, location || null, photo_url, notes || null);

    let updateSql = "UPDATE shipments SET status = ?";
    const params = [status];
    if (payment_methods) {
      updateSql += ", payment_methods = ?";
      params.push(payment_methods);
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

app.post("/api/tickets/:id/replies", (req, res) => {
  const { sender_username, message } = req.body;
  db.prepare("INSERT INTO ticket_replies (ticket_id, sender_username, message) VALUES (?, ?, ?)").run(req.params.id, sender_username, message);

  // Broadcast ticket reply via WebSocket
  wss.clients.forEach(client => {
    if (client.readyState === 1) client.send(JSON.stringify({ type: "TICKET_REPLY", data: { ticket_id: req.params.id, sender_username, message } }));
  });

  res.status(201).json({ success: true });
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

  db.prepare("INSERT INTO bookings (flight_id, user_id, passenger_name, passport_number, cabin_class, payment_status, airline, flight_number, origin, destination, departure_time, arrival_time, price, duration_minutes, distance_km) VALUES (?, ?, ?, ?, ?, 'pending', ?, ?, ?, ?, ?, ?, ?, ?, ?)").run(
    req.params.id, user_id, passenger_name, passport_number || null, cabin_class || "economy",
    airline || null, flight_number || null, origin || null, destination || null,
    departure_time || null, arrival_time || null, price || 0, duration_minutes || 0, distance_km || 0
  );
  res.status(201).json({ success: true });
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
