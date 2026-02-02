const mongoose = require('mongoose');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '.env') });

async function checkDb() {
    try {
        const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/kec_foodcourt';
        await mongoose.connect(uri);
        console.log('Connected to DB:', uri);

        // Check TableReservation model
        const TableReservation = require('./models/TableReservation');
        const count = await TableReservation.countDocuments();
        console.log('Total TableReservations:', count);

        if (count > 0) {
            const sample = await TableReservation.find().limit(5);
            console.log('Sample reservations:', JSON.stringify(sample, null, 2));
        }

        const Product = require('./models/Product');
        const pCount = await Product.countDocuments();
        console.log('Total Products:', pCount);

        process.exit(0);
    } catch (err) {
        console.error('Error:', err.message);
        process.exit(1);
    }
}

checkDb();
