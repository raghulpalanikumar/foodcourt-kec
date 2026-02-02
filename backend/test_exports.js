function model() { console.log('I am a model'); }
module.exports = model;
module.exports.RESERVATION_DURATION_MINS = 30;
module.exports.TOTAL_TABLES = 5;

console.log('Testing exports...');
console.log('RESERVATION_DURATION_MINS:', module.exports.RESERVATION_DURATION_MINS);
console.log('TOTAL_TABLES:', module.exports.TOTAL_TABLES);
