const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const Product = require('./models/Product');

async function seed() {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Using DB:', mongoose.connection.name);

    const biryanis = [
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

    for (const b of biryanis) {
        await Product.findOneAndUpdate({ name: b.name }, b, { upsert: true });
        console.log('Saved:', b.name);
    }
    process.exit();
}

seed().catch(err => {
    console.error(err);
    process.exit(1);
});
