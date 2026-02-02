const mongoose = require('mongoose');
const path = require('path');
const dotenv = require('dotenv');
const fs = require('fs');

const logFile = path.join(__dirname, 'seed_log.txt');
const log = (msg) => {
    console.log(msg);
    fs.appendFileSync(logFile, msg + '\n');
};

fs.writeFileSync(logFile, 'Starting seed...\n');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '.env') });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/kec_foodcourt';

const productSchema = new mongoose.Schema({
    name: { type: String, required: true },
    description: { type: String, required: true },
    price: { type: Number, required: true },
    category: { type: String, required: true },
    image: { type: String, required: true },
    stock: { type: Number, default: 50 },
    rating: { type: Number, default: 4.5 },
    numReviews: { type: Number, default: 10 },
    isVeg: { type: Boolean, default: true }
}, { timestamps: true });

const Product = mongoose.model('Product', productSchema);

const sampleProducts = [
    // Breakfast
    {
        name: 'Masala Dosa',
        description: 'Crispy rice crepe filled with spiced potato masala, served with chutney and sambar.',
        price: 45,
        category: 'breakfast',
        image: 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?auto=format&fit=crop&w=600&q=80',
        isVeg: true,
        stock: 99
    },
    {
        name: 'Idli Sambar (2 pcs)',
        description: 'Steamed rice cakes served with flavorful lentil soup (sambar) and coconut chutney.',
        price: 35,
        category: 'breakfast',
        image: 'https://images.unsplash.com/photo-1589301890074-9a008d515822?auto=format&fit=crop&w=600&q=80',
        isVeg: true,
        stock: 99
    },
    // Lunch
    {
        name: 'South Indian Thali',
        description: 'Complete meal with rice, sambar, rasam, kootu, poriyal, curd, and papad.',
        price: 80,
        category: 'lunch',
        image: 'https://static.vecteezy.com/system/resources/previews/040/703/949/non_2x/ai-generated-royal-feast-master-the-art-of-chicken-biryani-at-home-generative-ai-photo.jpg',
        isVeg: true,
        stock: 99
    },
    // Biryani
    {
        name: 'Hyderabadi Chicken Biryani',
        description: 'Long-grain basmati rice cooked with tender chicken and aromatic spices.',
        price: 150,
        category: 'biryani',
        image: 'https://images.unsplash.com/photo-1589302168068-964664d93dc0?auto=format&fit=crop&w=800&q=80',
        isVeg: false,
        stock: 99
    },
    {
        name: 'Paneer Dum Biryani',
        description: 'Fragrant rice layered with spiced paneer and slow-cooked in dum style.',
        price: 130,
        category: 'biryani',
        image: 'https://images.unsplash.com/photo-1563379091339-03b21bc4a6f8?auto=format&fit=crop&w=800&q=80',
        isVeg: true,
        stock: 99
    }
];

const seedDB = async () => {
    try {
        log('Connecting to MongoDB: ' + MONGODB_URI);
        await mongoose.connect(MONGODB_URI);
        log('✅ Connected to MongoDB');

        for (const productData of sampleProducts) {
            await Product.findOneAndUpdate(
                { name: productData.name },
                productData,
                { upsert: true, new: true }
            );
            log(`✅ Synced product: ${productData.name}`);
        }

        const count = await Product.countDocuments();
        log(`🚀 Seeding completed. Total products in DB: ${count}`);
        process.exit(0);
    } catch (error) {
        log('❌ Error seeding database: ' + error.message);
        process.exit(1);
    }
};

seedDB();
