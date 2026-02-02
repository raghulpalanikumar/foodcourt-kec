const mongoose = require('mongoose');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '.env') });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/kec_foodcourt';

const productSchema = new mongoose.Schema({
    name: { type: String, required: true },
    description: { type: String, required: true },
    price: { type: Number, required: true },
    category: { type: String, required: true },
    image: { type: String, required: true },
    stock: { type: Number, default: 99 },
    rating: { type: Number, default: 4.5 },
    numReviews: { type: Number, default: 15 },
    isVeg: { type: Boolean, default: true }
}, { timestamps: true });

const Product = mongoose.models.Product || mongoose.model('Product', productSchema);

const hdProducts = [
    // --- BREAKFAST ---
    {
        name: 'Ghee Roast Masala Dosa',
        description: 'Ultra-crispy golden crepe roasted with pure cow ghee, served with potato masala and trio of chutneys.',
        price: 65,
        category: 'breakfast',
        image: 'https://images.unsplash.com/photo-1668236543090-82eba5ee5976?auto=format&fit=crop&w=800&q=80',
        isVeg: true
    },
    {
        name: 'Fluffy Idli Sambar (3 pcs)',
        description: 'Pillowy soft steamed rice cakes served with aromatic lentil sambar and creamy coconut chutney.',
        price: 45,
        category: 'breakfast',
        image: 'https://images.unsplash.com/photo-1589301890074-9a008d515822?auto=format&fit=crop&w=800&q=80',
        isVeg: true
    },
    {
        name: 'Classic Ven Pongal',
        description: 'Creamy melted rice and lentil porridge tempered with black pepper, cumin, and ghee-roasted cashews.',
        price: 55,
        category: 'breakfast',
        image: 'https://images.unsplash.com/photo-1626200419199-341ae65f514b?auto=format&fit=crop&w=800&q=80',
        isVeg: true
    },
    {
        name: 'Crispy Medu Vada (2 pcs)',
        description: 'Golden-brown savory donuts made from black lentil batter with a crispy exterior and soft center.',
        price: 40,
        category: 'breakfast',
        image: 'https://images.unsplash.com/photo-1626132646535-61849646402f?auto=format&fit=crop&w=800&q=80',
        isVeg: true
    },

    // --- LUNCH ---
    {
        name: 'Grand South Indian Thali',
        description: 'A complete festive meal featuring Rice, Sambar, Rasam, Kootu, Poriyal, Curd, Sweet, and Appalam.',
        price: 110,
        category: 'lunch',
        image: 'https://images.unsplash.com/photo-1626776878848-03889073611d?auto=format&fit=crop&w=800&q=80',
        isVeg: true
    },
    {
        name: 'Heritage Lemon Rice',
        description: 'Zesty and aromatic tempering of mustard, peanuts, and curry leaves mixed with premium basmati rice.',
        price: 60,
        category: 'lunch',
        image: 'https://images.unsplash.com/photo-1596797038530-2c107229654b?auto=format&fit=crop&w=800&q=80',
        isVeg: true
    },
    {
        name: 'Curd Rice with Pomegranate',
        description: 'Creamy, soothing curd rice tempered with ginger and mustard, topped with fresh pomegranate pearls.',
        price: 55,
        category: 'lunch',
        image: 'https://images.unsplash.com/photo-1644722513430-e0ced98f3cc3?auto=format&fit=crop&w=800&q=80',
        isVeg: true
    },
    {
        name: 'Mushroom Pulao',
        description: 'Fragrant basmati rice slow-cooked with fresh button mushrooms and secret whole spices.',
        price: 85,
        category: 'lunch',
        image: 'https://images.unsplash.com/photo-1633945274405-b6c8069047b0?auto=format&fit=crop&w=800&q=80',
        isVeg: true
    },

    // --- SNACKS ---
    {
        name: 'Tandoori Paneer Tikka',
        description: 'Succulent cubes of paneer marinated in yogurt and spices, charred to perfection in a clay oven.',
        price: 140,
        category: 'snacks',
        image: 'https://images.unsplash.com/photo-1567184109191-378ec2420ca9?auto=format&fit=crop&w=800&q=80',
        isVeg: true
    },
    {
        name: 'Garden Fresh Samosas (2 pcs)',
        description: 'The ultimate tea-time snack – crispy flaky pastry filled with spiced peas and potato mash.',
        price: 30,
        category: 'snacks',
        image: 'https://images.unsplash.com/photo-1601050690597-df056fb1779f?auto=format&fit=crop&w=800&q=80',
        isVeg: true
    },
    {
        name: 'Onion Pakora Bucket',
        description: 'Thinly sliced onions coated in a spiced gram flour batter and deep-fried until dangerously crunchy.',
        price: 45,
        category: 'snacks',
        image: 'https://images.unsplash.com/photo-1626132646555-520e5e019f20?auto=format&fit=crop&w=800&q=80',
        isVeg: true
    },
    {
        name: 'Bombay Bhel Puri',
        description: 'A vibrant mix of puffed rice, tangy chutneys, fresh veggies, and crunchy sev.',
        price: 50,
        category: 'snacks',
        image: 'https://images.unsplash.com/photo-1511690656952-34342bb7c2f2?auto=format&fit=crop&w=800&q=80',
        isVeg: true
    },

    // --- JUICES ---
    {
        name: 'Sunshine Orange Juice',
        description: '100% pure cold-pressed oranges with pulp, served chilled for an instant energy boost.',
        price: 45,
        category: 'juices',
        image: 'https://images.unsplash.com/photo-1613478223719-2ab802602423?auto=format&fit=crop&w=800&q=80',
        isVeg: true
    },
    {
        name: 'Exotic Watermelon Cooler',
        description: 'Hydrating watermelon blend with a splash of lime and fresh mint leaves.',
        price: 40,
        category: 'juices',
        image: 'https://images.unsplash.com/photo-1525385133512-2f3bdd039054?auto=format&fit=crop&w=800&q=80',
        isVeg: true
    },
    {
        name: 'Tropical Pineapple Zest',
        description: 'Freshly extracted sweet pineapple juice with a hint of black salt and roasted cumin.',
        price: 50,
        category: 'juices',
        image: 'https://images.unsplash.com/photo-1550507992-eb63ffee0847?auto=format&fit=crop&w=800&q=80',
        isVeg: true
    },
    {
        name: 'Virgin Mint Mojito',
        description: 'Classic refreshment with muddled mint, lime wedges, and sparkling soda.',
        price: 65,
        category: 'juices',
        image: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&w=800&q=80',
        isVeg: true
    },

    // --- BIRYANI ---
    {
        name: 'Hyderabadi Shahi Biryani',
        description: 'Our signature dum-cooked basmati rice layered with melt-in-the-mouth chicken and aromatic spices.',
        price: 180,
        category: 'biryani',
        image: 'https://images.unsplash.com/photo-1589302168068-964664d93dc0?auto=format&fit=crop&w=800&q=80',
        isVeg: false
    },
    {
        name: 'Royal Paneer Dum Biryani',
        description: 'Fragrant long-grain rice slow-cooked with marinated paneer cubes and caramelized onions.',
        price: 160,
        category: 'biryani',
        image: 'https://images.unsplash.com/photo-1563379091339-03b21bc4a6f8?auto=format&fit=crop&w=800&q=80',
        isVeg: true
    },
    {
        name: 'Spicy Egg Biryani',
        description: 'Traditional biryani with whole boiled eggs roasted in a spicy masala base.',
        price: 130,
        category: 'biryani',
        image: 'https://images.unsplash.com/photo-1589302168068-964664d93dc0?auto=format&fit=crop&w=800&q=80&sig=123',
        isVeg: false
    },
    {
        name: 'Veg Garden Biryani',
        description: 'Loaded with seasonal vegetables and aromatic herbs, cooked in a traditional brass pot.',
        price: 120,
        category: 'biryani',
        image: 'https://images.unsplash.com/photo-1645177623570-52a161988874?auto=format&fit=crop&w=800&q=80',
        isVeg: true
    },

    // --- NORTH INDIAN ---
    {
        name: 'Creamy Paneer Butter Masala',
        description: 'Rich tomato-cream gravy with soft paneer cubes, finished with a dollop of fresh butter.',
        price: 150,
        category: 'north-indian',
        image: 'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?auto=format&fit=crop&w=800&q=80',
        isVeg: true
    },
    {
        name: 'Classic Chole Bhature',
        description: 'Puffy deep-fried sourdough bread served with spicy chickpea curry and pickled onions.',
        price: 90,
        category: 'north-indian',
        image: 'https://images.unsplash.com/photo-1634496994539-eb5db90fbf3b?auto=format&fit=crop&w=800&q=80',
        isVeg: true
    },
    {
        name: 'Smoky Dal Makhani',
        description: 'Black lentils slow-cooked for 12 hours with cream, butter, and wood-smoke flavor.',
        price: 120,
        category: 'north-indian',
        image: 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?auto=format&fit=crop&w=800&q=80',
        isVeg: true
    },
    {
        name: 'Amritsari Kulcha with Chole',
        description: 'Potato-stuffed tandoori bread with a crispy crust, served with traditional Amritsari chickpeas.',
        price: 110,
        category: 'north-indian',
        image: 'https://images.unsplash.com/photo-1547240335-962453606626?auto=format&fit=crop&w=800&q=80',
        isVeg: true
    },

    // --- SOUTH INDIAN ---
    {
        name: 'Madurai Chicken Salna & Parotta',
        description: 'Layered, flaky Malabar parottas served with a spicy, aromatic Madurai-style chicken gravy.',
        price: 120,
        category: 'south-indian',
        image: 'https://images.unsplash.com/photo-1626074353765-517a681e40be?auto=format&fit=crop&w=800&q=80',
        isVeg: false
    },
    {
        name: 'Chettinad Masala Paniyaram',
        description: 'Golden fermented rice dumplings tempered with mustard, onions, and spicy Chettinad herbs.',
        price: 60,
        category: 'south-indian',
        image: 'https://images.unsplash.com/photo-1667299041903-886981881b2a?auto=format&fit=crop&w=800&q=80',
        isVeg: true
    },
    {
        name: 'Appam with Coconut Stew',
        description: 'Lacy rice pancakes with a soft center, served with a mild, creamy vegetable coconut stew.',
        price: 85,
        category: 'south-indian',
        image: 'https://images.unsplash.com/photo-1650730037302-3f19e4879ba2?auto=format&fit=crop&w=800&q=80',
        isVeg: true
    },
    {
        name: 'Podhi Idli Toss',
        description: 'Mini idlis tossed in a fiery gunpowder (milagai podhi) and hot ghee.',
        price: 70,
        category: 'south-indian',
        image: 'https://images.unsplash.com/photo-1589301890074-9a008d515822?auto=format&fit=crop&w=800&q=80&sig=podhi',
        isVeg: true
    },

    // --- BEVERAGES ---
    {
        name: 'Traditional Filter Coffee',
        description: 'Strong, frothy decoction coffee brewed in the traditional South Indian brass filter.',
        price: 30,
        category: 'beverages',
        image: 'https://images.unsplash.com/photo-1541167760496-162955ed8aef?auto=format&fit=crop&w=800&q=80',
        isVeg: true
    },
    {
        name: 'Masala Chai',
        description: 'Robust black tea brewed with crushed ginger, cardamom, and fresh milk.',
        price: 20,
        category: 'beverages',
        image: 'https://images.unsplash.com/photo-1594631252845-29fc458631b6?auto=format&fit=crop&w=800&q=80',
        isVeg: true
    },
    {
        name: 'Belgium Cold Coffee',
        description: 'Rich blended coffee with premium chocolate and a scoop of vanilla ice cream.',
        price: 80,
        category: 'beverages',
        image: 'https://images.unsplash.com/photo-1517701604599-bb29b565090c?auto=format&fit=crop&w=800&q=80',
        isVeg: true
    },
    {
        name: 'Fresh Lime Soda',
        description: 'Zesty lime juice with your choice of salt/sweet/mix in chilled carbonated water.',
        price: 35,
        category: 'beverages',
        image: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&w=800&q=80&sig=lime',
        isVeg: true
    },

    // --- DESSERTS ---
    {
        name: 'Warm Gulab Jamun (2 pcs)',
        description: 'Melt-in-mouth khoya balls deep-fried to golden brown and soaked in rose syrup.',
        price: 35,
        category: 'desserts',
        image: 'https://images.unsplash.com/photo-1589119908995-c6837fa14848?auto=format&fit=crop&w=800&q=80',
        isVeg: true
    },
    {
        name: 'Rich Saffron Rasmalai',
        description: 'Soft cottage cheese discs immersed in thickened, saffron-infused milk and pistachios.',
        price: 65,
        category: 'desserts',
        image: 'https://images.unsplash.com/photo-1626776878848-03889073611d?auto=format&fit=crop&w=800&q=80&sig=rasmalai',
        isVeg: true
    },
    {
        name: 'Fudgy Brownie Sundae',
        description: 'Double chocolate warm brownie topped with liquid chocolate and premium vanilla scoop.',
        price: 95,
        category: 'desserts',
        image: 'https://images.unsplash.com/photo-1551024506-0bccd828d307?auto=format&fit=crop&w=800&q=80',
        isVeg: true
    },
    {
        name: 'Gajar ka Halwa',
        description: 'Traditional winter special made with fresh grated carrots, khoya, and generous dry fruits.',
        price: 55,
        category: 'desserts',
        image: 'https://images.unsplash.com/photo-1632233033256-f64f899e9063?auto=format&fit=crop&w=800&q=80',
        isVeg: true
    }
];

async function seedHDProducts() {
    try {
        console.log('Connecting to MongoDB for HD Seeding...');
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Connected.');

        // Remove ALL items first for a clean strict mapping
        await Product.deleteMany({});
        console.log('🗑️  Old menu cleared.');

        for (const p of hdProducts) {
            await Product.create(p);
            console.log(`✨ Created HD Item: ${p.name}`);
        }

        const finalCount = await Product.countDocuments();
        console.log(`\n🚀 HD Menu Seeding Successful! Total Dishes: ${finalCount}`);
        process.exit(0);
    } catch (err) {
        console.error('❌ Seeding Failed:', err.message);
        process.exit(1);
    }
}

seedHDProducts();
