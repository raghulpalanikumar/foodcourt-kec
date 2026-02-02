try {
    console.log('Requiring reservationController...');
    const controller = require('./controllers/reservationController');
    console.log('Exported functions:', Object.keys(controller));
} catch (err) {
    console.error('CRASH ON REQUIRE:', err);
}
