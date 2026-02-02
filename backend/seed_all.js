const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');

const logFile = path.join(__dirname, 'seed_final_log.txt');
const log = (msg) => fs.appendFileSync(logFile, msg + '\n');

fs.writeFileSync(logFile, 'Starting final seed...\n');

const productSchema = new mongoose.Schema({
    name: { type: String, required: true },
    description: { type: String, required: true },
    price: { type: Number, required: true },
    category: { type: String, required: true },
    image: { type: String, required: true },
    stock: { type: Number, default: 99 },
    rating: { type: Number, default: 4.5 },
    numReviews: { type: Number, default: 10 },
    isVeg: { type: Boolean, default: true }
}, { timestamps: true });

const sampleProducts = [
    {
        name: 'Masala Dosa',
        description: 'Crispy rice crepe filled with spiced potato masala, served with chutney and sambar.',
        price: 45,
        category: 'breakfast',
        image: 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?auto=format&fit=crop&w=600&q=80',
        isVeg: true
    },
    {
        name: 'South Indian Thali',
        description: 'Complete meal with rice, sambar, rasam, kootu, poriyal, curd, and papad.',
        price: 80,
        category: 'lunch',
        image: 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?auto=format&fit=crop&w=800&q=80',
        isVeg: true
    },
    {
        name: 'Hyderabadi Chicken Biryani',
        description: 'Long-grain basmati rice cooked with tender chicken and aromatic spices.',
        price: 150,
        category: 'biryani',
        image: 'https://images.unsplash.com/photo-1589302168068-964664d93dc0?auto=format&fit=crop&w=800&q=80',
        isVeg: false
    },
    {
        name: 'Paneer Dum Biryani',
        description: 'Fragrant rice layered with spiced paneer and slow-cooked in dum style.',
        price: 130,
        category: 'biryani',
        image: 'https://images.unsplash.com/photo-1563379091339-03b21bc4a6f8?auto=format&fit=crop&w=800&q=80',
        isVeg: true
    }
];

async function seed(uri) {
    log('Connecting to ' + uri);
    const conn = await mongoose.createConnection(uri).asPromise();
    const Product = conn.model('Product', productSchema);
    for (const p of sampleProducts) {
        await Product.findOneAndUpdate({ name: p.name }, p, { upsert: true });
        log('Synced ' + p.name + ' to ' + uri);
    }
    await conn.close();
}

async function start() {
    try {
        await seed('mongodb://localhost:27017/kec_foodcourt');
        await seed('mongodb://localhost:27017/ecommerce');
        log('All seeds finished');
    } catch (err) {
        log('Error: ' + err.message);
    }
    process.exit();
}

start();
