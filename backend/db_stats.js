const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/kec_foodcourt';

async function check() {
    try {
        await mongoose.connect(MONGODB_URI);
        const db = mongoose.connection.db;
        const collections = await db.listCollections().toArray();
        const info = collections.map(c => c.name);

        let stats = `Collections: ${info.join(', ')}\n`;

        for (const name of info) {
            const count = await db.collection(name).countDocuments();
            stats += `Collection ${name}: ${count} docs\n`;
        }

        fs.writeFileSync('db_stats.txt', stats);
    } catch (err) {
        fs.writeFileSync('db_stats.txt', 'Error: ' + err.message);
    }
    process.exit();
}

check();
