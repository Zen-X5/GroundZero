const mongoose = require('mongoose');
require('dotenv').config({ path: './backend/.env' }); // Load the DB URI

async function clearDB() {
    console.log("⏳ Connecting to MongoDB Atlas...");
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log("✅ Connected!");

        console.log("🗑️  Clearing all telemetry and detections...");
        await mongoose.connection.collection('drones').deleteMany({});
        await mongoose.connection.collection('survivors').deleteMany({});
        await mongoose.connection.collection('buildings').deleteMany({});

        console.log("✨ All data cleared! The simulation is fresh.");
        process.exit(0);
    } catch (err) {
        console.error("❌ Failed:", err);
        process.exit(1);
    }
}

clearDB();
