const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/kec_foodcourt';

async function clean() {
    await mongoose.connect(MONGODB_URI);
    const Product = mongoose.model('Product', new mongoose.Schema({ name: String, category: String }));
    const products = await Product.find();
    for (const p of products) {
        const oldCat = p.category;
        const newCat = oldCat.trim().toLowerCase();
        if (oldCat !== newCat) {
            p.category = newCat;
            await p.save();
            console.log(`Cleaned ${p.name}: ${oldCat} -> ${newCat}`);
        }
    }
    process.exit();
}

clean();
