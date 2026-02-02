const Model = require('./models/TableReservation');
console.log('RESERVATION_DURATION_MINS:', Model.RESERVATION_DURATION_MINS);
console.log('TOTAL_TABLES:', Model.TOTAL_TABLES);

const { RESERVATION_DURATION_MINS: r, TOTAL_TABLES: t } = Model;
console.log('Destructured R:', r);
console.log('Destructured T:', t);
