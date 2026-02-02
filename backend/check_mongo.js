const mongoose = require('mongoose');
const uri = 'mongodb://localhost:27017/kec_foodcourt';
console.log('Connecting to:', uri);
mongoose.connect(uri)
    .then(() => {
        console.log('✅ MongoDB UP');
        process.exit(0);
    })
    .catch(err => {
        console.error('❌ MongoDB DOWN:', err.message);
        process.exit(1);
    });
