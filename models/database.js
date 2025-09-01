// backend/models/database.js - Add better error handling
const sqlite3 = require("sqlite3").verbose();
const path = require("path");
const fs = require("fs");

const dbPath =
  process.env.DB_PATH || path.join(__dirname, "../database/customers.db");

// Ensure the database directory exists
const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
  console.log("📁 Created database directory:", dbDir);
}

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error("❌ Error opening database:", err.message);
    console.error("📁 Database path:", dbPath);
    return;
  }

  console.log("✅ Connected to SQLite database:", dbPath);

  // Enable foreign keys
  db.run("PRAGMA foreign_keys = ON");

  // Create tables if they don't exist
  db.run(
    `CREATE TABLE IF NOT EXISTS customers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    firstName TEXT NOT NULL,
    lastName TEXT NOT NULL,
    email TEXT UNIQUE,
    phone TEXT NOT NULL UNIQUE,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
  )`,
    (err) => {
      if (err) {
        console.error("❌ Error creating customers table:", err);
      } else {
        console.log("✅ Customers table ready");
      }
    }
  );

  db.run(
    `CREATE TABLE IF NOT EXISTS addresses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customerId INTEGER NOT NULL,
    addressLine1 TEXT NOT NULL,
    addressLine2 TEXT,
    city TEXT NOT NULL,
    state TEXT NOT NULL,
    pinCode TEXT NOT NULL,
    isPrimary BOOLEAN DEFAULT 0,
    FOREIGN KEY (customerId) REFERENCES customers (id) ON DELETE CASCADE
  )`,
    (err) => {
      if (err) {
        console.error("❌ Error creating addresses table:", err);
      } else {
        console.log("✅ Addresses table ready");
      }
    }
  );
});

module.exports = db;
