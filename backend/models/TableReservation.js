const mongoose = require('mongoose');

const RESERVATION_DURATION_MINS = 30;
const TOTAL_TABLES = 5;

const tableReservationSchema = new mongoose.Schema({
  tableNumber: {
    type: Number,
    required: true,
    min: 1,
    max: TOTAL_TABLES
  },
  slotStart: {
    type: Date,
    required: true
  },
  order: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    required: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, { timestamps: true });

tableReservationSchema.index({ slotStart: 1 });
tableReservationSchema.index({ order: 1 }, { unique: true });

module.exports = mongoose.model('TableReservation', tableReservationSchema);
module.exports.RESERVATION_DURATION_MINS = RESERVATION_DURATION_MINS;
module.exports.TOTAL_TABLES = TOTAL_TABLES;
