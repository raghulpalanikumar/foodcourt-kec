const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

async function cleanup() {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/kec_foodcourt');
    const Product = mongoose.models.Product || mongoose.model('Product', new mongoose.Schema({ name: String, category: String, image: String }));

    // Get all products
    const products = await Product.find();

    // Define names we just seeded
    const validNames = [
        'Ghee Roast Masala Dosa', 'Fluffy Idli Sambar (3 pcs)', 'Classic Ven Pongal', 'Crispy Medu Vada (2 pcs)',
        'Grand South Indian Thali', 'Heritage Lemon Rice', 'Curd Rice with Pomegranate', 'Mushroom Pulao',
        'Tandoori Paneer Tikka', 'Garden Fresh Samosas (2 pcs)', 'Onion Pakora Bucket', 'Bombay Bhel Puri',
        'Sunshine Orange Juice', 'Exotic Watermelon Cooler', 'Tropical Pineapple Zest', 'Virgin Mint Mojito',
        'Hyderabadi Shahi Biryani', 'Royal Paneer Dum Biryani', 'Spicy Egg Biryani', 'Veg Garden Biryani',
        'Creamy Paneer Butter Masala', 'Classic Chole Bhature', 'Smoky Dal Makhani', 'Amritsari Kulcha with Chole',
        'Madurai Chicken Salna & Parotta', 'Chettinad Masala Paniyaram', 'Appam with Coconut Stew', 'Podhi Idli Toss',
        'Traditional Filter Coffee', 'Masala Chai', 'Belgium Cold Coffee', 'Fresh Lime Soda',
        'Warm Gulab Jamun (2 pcs)', 'Rich Saffron Rasmalai', 'Fudgy Brownie Sundae', 'Gajar ka Halwa'
    ];

    let deleted = 0;
    for (const p of products) {
        if (!validNames.includes(p.name)) {
            await Product.deleteOne({ _id: p._id });
            deleted++;
        }
    }

    console.log(`Cleanup finished. Deleted ${deleted} old/invalid products.`);
    process.exit();
}

cleanup();
