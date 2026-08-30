const fs = require('fs');
const path = require('path');

// 1. Read .env file manually
const envPath = path.join(__dirname, 'backend', '.env');
if (!fs.existsSync(envPath)) {
  console.error("Error: Could not find backend/.env file.");
  process.exit(1);
}

const envContent = fs.readFileSync(envPath, 'utf8');
let mongoUri = '';
const lines = envContent.split(/\r?\n/);
for (const line of lines) {
  const match = line.match(/^\s*MONGODB_URI\s*=\s*(.+)$/);
  if (match) {
    mongoUri = match[1].trim();
  }
}

if (!mongoUri) {
  console.error("Error: MONGODB_URI not found in backend/.env");
  process.exit(1);
}

// Remove surrounding quotes if present
if ((mongoUri.startsWith('"') && mongoUri.endsWith('"')) || (mongoUri.startsWith("'") && mongoUri.endsWith("'"))) {
  mongoUri = mongoUri.slice(1, -1);
}

// 2. Load mongoose from backend node_modules
const mongoosePath = path.join(__dirname, 'backend', 'node_modules', 'mongoose');
if (!fs.existsSync(mongoosePath)) {
  console.error("Error: mongoose module not found. Please run 'npm install' inside the backend folder first.");
  process.exit(1);
}

const mongoose = require(mongoosePath);

async function run() {
  const maskedUri = mongoUri.replace(/:([^:@]+)@/, ':****@');
  console.log(`Connecting to MongoDB: ${maskedUri}`);
  
  try {
    await mongoose.connect(mongoUri);
    console.log("Connected successfully.");

    const db = mongoose.connection.db;
    const collections = [
      'drones',
      'survivors',
      'building_inspections',
      'network_topologies',
      'hazards'
    ];

    for (const name of collections) {
      const collection = db.collection(name);
      const count = await collection.countDocuments({});
      if (count > 0) {
        await collection.deleteMany({});
        console.log(`Cleared ${count} documents from '${name}'`);
      } else {
        console.log(`Collection '${name}' is already empty.`);
      }
    }

    console.log("Database cleanup finished successfully.");
  } catch (err) {
    console.error("Error running database cleanup:", err);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

run();
