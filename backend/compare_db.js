const mongoose = require('mongoose');
const fs = require('fs');
const logFile = 'db_compare.txt';

async function check(uri) {
    try {
        const conn = await mongoose.createConnection(uri).asPromise();
        const Product = conn.model('Product', new mongoose.Schema({ name: String, category: String }));
        const count = await Product.countDocuments();
        const categories = await Product.distinct('category');
        fs.appendFileSync(logFile, `URI: ${uri}\nCount: ${count}\nCategories: ${categories.join(', ')}\n\n`);
        await conn.close();
    } catch (err) {
        fs.appendFileSync(logFile, `URI: ${uri}\nError: ${err.message}\n\n`);
    }
}

async function start() {
    fs.writeFileSync(logFile, 'Comparing DBs...\n');
    await check('mongodb://localhost:27017/kec_foodcourt');
    await check('mongodb://localhost:27017/ecommerce');
    process.exit();
}

start();
