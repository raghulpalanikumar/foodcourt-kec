const express = require('express');
const {
  getAvailableSlots,
  getNextAvailableTime,
  getTablesForSlot,
  getAllReservationsAdmin
} = require('../controllers/reservationController');

const router = express.Router();

router.get('/availability', getAvailableSlots);
router.get('/next-available', getNextAvailableTime);
router.get('/tables', getTablesForSlot);
router.get('/admin/all', getAllReservationsAdmin);

module.exports = router;
