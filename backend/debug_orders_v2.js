const mongoose = require('mongoose');
const Order = require('./models/Order');
const Product = require('./models/Product');
const User = require('./models/User');
require('dotenv').config();

const run = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);

        const orders = await Order.find().sort({ createdAt: -1 }).limit(5).populate('items.foodId');

        const debugData = orders.map(o => ({
            id: o._id,
            tokenNumber: o.tokenNumber,
            totalAmount: o.totalAmount,
            items: o.items.map(i => ({
                name: i.foodName,
                price: i.price,
                qty: i.quantity
            }))
        }));

        console.log(JSON.stringify(debugData, null, 2));

        process.exit();
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
};

run();
